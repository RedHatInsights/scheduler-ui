import React from 'react';
import { CheckCircleIcon, ClockIcon, ExclamationCircleIcon, InProgressIcon, PauseCircleIcon } from '@patternfly/react-icons';
import type { ScheduledReport } from '../../hooks/useSchedulerState';

interface ReportStatusBadgeProps {
  status: ScheduledReport['status'];
}

const ReportStatusBadge: React.FC<ReportStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'Running':
      return (
        <span className="scheduler-ui-status scheduler-ui-status--running pf-v6-u-gap-sm pf-v6-u-font-size-sm">
          <InProgressIcon className="scheduler-ui-spin-icon" aria-hidden />
          Running
        </span>
      );
    case 'Failed':
      return (
        <span className="scheduler-ui-status scheduler-ui-status--failed pf-v6-u-gap-sm pf-v6-u-font-size-sm">
          <ExclamationCircleIcon aria-hidden />
          Failed
        </span>
      );
    case 'Completed':
      return (
        <span className="scheduler-ui-status scheduler-ui-status--completed pf-v6-u-gap-sm pf-v6-u-font-size-sm">
          <CheckCircleIcon aria-hidden />
          Completed
        </span>
      );
    case 'Scheduled':
      return (
        <span className="scheduler-ui-status scheduler-ui-status--scheduled pf-v6-u-gap-sm pf-v6-u-font-size-sm">
          <ClockIcon aria-hidden />
          Scheduled
        </span>
      );
    case 'Paused':
      return (
        <span className="scheduler-ui-status scheduler-ui-status--paused pf-v6-u-gap-sm pf-v6-u-font-size-sm">
          <PauseCircleIcon aria-hidden />
          Paused
        </span>
      );
    default:
      return null;
  }
};

export default ReportStatusBadge;
