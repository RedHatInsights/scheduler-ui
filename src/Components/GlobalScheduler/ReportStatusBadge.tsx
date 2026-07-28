import React from 'react';
import { CheckCircleIcon, ClockIcon, ExclamationCircleIcon, InProgressIcon, PauseCircleIcon } from '@patternfly/react-icons';
import type { ScheduledReport } from '../../hooks/useSchedulerState';
import StatusPill from './StatusPill';

interface ReportStatusBadgeProps {
  status: ScheduledReport['status'];
}

const ReportStatusBadge: React.FC<ReportStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'Running':
      return (
        <StatusPill variant="running">
          <InProgressIcon className="scheduler-ui-spin-icon" aria-hidden />
          Running
        </StatusPill>
      );
    case 'Failed':
      return (
        <StatusPill variant="failed">
          <ExclamationCircleIcon aria-hidden />
          Failed
        </StatusPill>
      );
    case 'Completed':
      return (
        <StatusPill variant="completed">
          <CheckCircleIcon aria-hidden />
          Completed
        </StatusPill>
      );
    case 'Scheduled':
      return (
        <StatusPill variant="scheduled">
          <ClockIcon aria-hidden />
          Scheduled
        </StatusPill>
      );
    case 'Paused':
      return (
        <StatusPill variant="paused">
          <PauseCircleIcon aria-hidden />
          Paused
        </StatusPill>
      );
    default:
      return null;
  }
};

export default ReportStatusBadge;
