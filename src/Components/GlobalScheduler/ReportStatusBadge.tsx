import React from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, InProgressIcon } from '@patternfly/react-icons';
import type { ScheduledReport } from '../../hooks/useSchedulerState';

interface ReportStatusBadgeProps {
  status: ScheduledReport['status'];
}

const ReportStatusBadge: React.FC<ReportStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'Running':
      return (
        <span className="scheduler-ui-status scheduler-ui-status--running">
          <InProgressIcon className="scheduler-ui-spin-icon" aria-hidden />
          Running
        </span>
      );
    case 'Failed':
      return (
        <span className="scheduler-ui-status scheduler-ui-status--failed">
          <ExclamationCircleIcon aria-hidden />
          Failed
        </span>
      );
    case 'Completed':
      return (
        <span className="scheduler-ui-status scheduler-ui-status--completed">
          <CheckCircleIcon aria-hidden />
          Completed
        </span>
      );
    default:
      return null;
  }
};

export default ReportStatusBadge;
