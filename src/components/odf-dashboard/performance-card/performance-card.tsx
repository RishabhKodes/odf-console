import * as React from 'react';
import { WatchK8sResource } from '@openshift-console/dynamic-plugin-sdk';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  DashboardCard,
  DashboardCardHeader,
  DashboardCardTitle,
  UtilizationDurationDropdown,
  usePrometheusPoll,
  useUtilizationDuration,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { SortByDirection } from '@patternfly/react-table';
import { ODFStorageSystem } from '../../../models';
import { StorageSystemKind } from '../../../types';
import { DataUnavailableError } from '../../common/generic/Error';
import LineGraph, { LineGraphProps } from '../../common/line-graph/line-graph';
import ResourceLink from '../../common/resource-link/resource-link';
import Table, { Column } from '../../common/table/table';
import {
  getDashboardLink,
  getGVK,
  referenceFor,
  referenceForModel,
} from '../../utils';
import { StorageDashboard, UTILIZATION_QUERY } from '../queries';
import './performance-card.scss';
import { generateDataFrames } from './utils';

type RowProps = {
  systemName: string;
  managedSystemKind: string;
  managedSystemName: string;
  currentLocation: string;
  iopsData: LineGraphProps;
  throughputData: LineGraphProps;
  latencyData: LineGraphProps;
  className?: string;
};

type GetRow = (
  args: RowProps
) => [React.ReactNode, React.ReactNode, React.ReactNode, React.ReactNode];

const getRow: GetRow = ({
  managedSystemKind,
  systemName,
  iopsData,
  throughputData,
  latencyData,
}) => {
  const { apiGroup, apiVersion, kind } = getGVK(managedSystemKind);
  const refKind = referenceFor(apiGroup)(apiVersion)(kind);
  return [
    <ResourceLink
      key={systemName}
      link={getDashboardLink(refKind, systemName)}
      resourceModel={ODFStorageSystem}
      resourceName={systemName}
    />,
    <LineGraph key={`${systemName}_IOPS`} {...iopsData} />,

    <LineGraph key={`${systemName}_LAT`} {...latencyData} />,

    <LineGraph key={`${systemName}_THR`} {...throughputData} />,
  ];
};

const storageSystemResource: WatchK8sResource = {
  kind: referenceForModel(ODFStorageSystem),
  namespace: 'openshift-storage',
  isList: true,
};

const nameSort = (a: RowProps, b: RowProps, c: SortByDirection) => {
  const negation = c !== SortByDirection.asc;
  const sortVal = a.systemName.localeCompare(b.systemName);
  return negation ? -sortVal : sortVal;
};

const metricsSort =
  (metric: 'iopsData' | 'throughputData' | 'latencyData') =>
  (a: RowProps, b: RowProps, c: SortByDirection) => {
    const negation = c !== SortByDirection.asc;
    const dataA = a[metric]?.data;
    const dataB = b[metric]?.data;
    const sortVal =
      dataA?.[dataA.length - 1]?.y?.value -
        dataB?.[dataB.length - 1]?.y?.value || 0;
    return negation ? -sortVal : sortVal;
  };

const PerformanceCard: React.FC = () => {
  const { t } = useTranslation('plugin__odf-console');
  const headerColumns: Column[] = [
    {
      columnName: t('Name'),
      className: 'pf-u-w-10 performanceCard--verticalAlign',
      sortFunction: nameSort,
    },
    {
      columnName: t('IOPS'),
      className: 'pf-u-w-30',
      sortFunction: metricsSort('iopsData'),
    },
    {
      columnName: t('Latency'),
      className: 'pf-u-w-30',
      sortFunction: metricsSort('latencyData'),
    },
    {
      columnName: t('Throughput'),
      className: 'pf-u-w-30',
      sortFunction: metricsSort('throughputData'),
    },
  ];

  const [systems, systemLoaded, systemLoadError] = useK8sWatchResource<
    StorageSystemKind[]
  >(storageSystemResource);
  const { duration } = useUtilizationDuration();
  const [latency, latencyError, latencyLoading] = usePrometheusPoll({
    query: UTILIZATION_QUERY[StorageDashboard.LATENCY],
    endpoint: 'api/v1/query_range' as any,
    timespan: duration,
  });
  const [throughput, throughputError, throughputLoading] = usePrometheusPoll({
    query: UTILIZATION_QUERY[StorageDashboard.THROUGHPUT],
    endpoint: 'api/v1/query_range' as any,
    timespan: duration,
  });
  const [iops, iopsError, iopsLoading] = usePrometheusPoll({
    query: UTILIZATION_QUERY[StorageDashboard.IOPS],
    endpoint: 'api/v1/query_range' as any,
    timespan: duration,
  });

  const rawRows = generateDataFrames(systems, latency, throughput, iops);
  const loading =
    !systemLoaded || latencyLoading || throughputLoading || iopsLoading;
  const error =
    !!systemLoadError || !!throughputError || !!latencyError || !!iopsError;

  return (
    <DashboardCard>
      <DashboardCardHeader>
        <DashboardCardTitle>{t('Performance')}</DashboardCardTitle>
        <UtilizationDurationDropdown />
      </DashboardCardHeader>
      {!error && !loading && (
        <Table
          columns={headerColumns}
          rawData={rawRows as []}
          rowRenderer={getRow as any}
          ariaLabel={t('Performance Card')}
        />
      )}
      {loading && !error && <PerformanceCardLoading />}
      {((error && !loading) || (!error && !loading && _.isEmpty(rawRows))) && (
        <div className="performanceCard--error">
          <DataUnavailableError />{' '}
        </div>
      )}
    </DashboardCard>
  );
};

export default PerformanceCard;

const PerformanceCardLoading: React.FC = () => (
  <div className="odf-performanceCardLoading-body">
    <div className="odf-performanceCardLoading-body__item">
      <div className="odf-performanceCardLoading-body-item__element odf-performanceCardLoading-body-item__element--header" />
      <div className="odf-performanceCardLoading-body-item__element odf-performanceCardLoading-body-item__element--header" />
      <div className="odf-performanceCardLoading-body-item__element odf-performanceCardLoading-body-item__element--header" />
      <div className="odf-performanceCardLoading-body-item__element odf-performanceCardLoading-body-item__element--header" />
    </div>
    <div className="odf-performanceCardLoading-body__item">
      <div className="odf-performanceCardLoading-body-item__element" />
      <div className="odf-performanceCardLoading-body-item__element" />
      <div className="odf-performanceCardLoading-body-item__element" />
      <div className="odf-performanceCardLoading-body-item__element" />
    </div>
    <div className="odf-performanceCardLoading-body__item">
      <div className="odf-performanceCardLoading-body-item__element" />
      <div className="odf-performanceCardLoading-body-item__element" />
      <div className="odf-performanceCardLoading-body-item__element" />
      <div className="odf-performanceCardLoading-body-item__element" />
    </div>
  </div>
);
