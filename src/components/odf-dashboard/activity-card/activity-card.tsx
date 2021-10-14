import * as React from 'react';
import { FirehoseResource } from '@openshift-console/dynamic-plugin-sdk';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
  DashboardCardTitle,
  RecentEventsBody,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { EventKind } from '@openshift-console/dynamic-plugin-sdk-internal/lib/api/internal-types';
import { useTranslation } from 'react-i18next';
import './activity-card.scss';

const eventsResource: FirehoseResource = {
  isList: true,
  kind: 'Event',
  prop: 'events',
};

const ActivityCard: React.FC = () => {
  const { t } = useTranslation('plugin__odf-console');
  const [data, loaded, loadError] =
    useK8sWatchResource<EventKind[]>(eventsResource);

  return (
    <DashboardCard>
      <DashboardCardHeader>
        <DashboardCardTitle>{t('Activity')}</DashboardCardTitle>
      </DashboardCardHeader>
      <DashboardCardBody className="odf-activityCard">
        <RecentEventsBody
          events={{
            data,
            loaded,
            loadError,
          }}
        />
      </DashboardCardBody>
    </DashboardCard>
  );
};

export default ActivityCard;
