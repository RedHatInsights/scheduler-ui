import React from 'react';
import { Label } from '@patternfly/react-core';
import { ClockIcon, InProgressIcon, PauseCircleIcon } from '@patternfly/react-icons';
import type { ScheduledReport } from '../../hooks/useSchedulerState';

interface ReportStatusBadgeProps {
  status: ScheduledReport['status'];
}

const ReportStatusBadge: React.FC<ReportStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'Running':
      return (
        <Label status="info" icon={<InProgressIcon className="scheduler-ui-spin-icon" />}>
          Running
        </Label>
      );
    case 'Failed':
      return (
        <Label status="danger">
          Failed
        </Label>
      );
    case 'Completed':
      return (
        <Label status="success">
          Completed
        </Label>
      );
    case 'Scheduled':
      return (
        <Label status="info" icon={<ClockIcon />}>
          Scheduled
        </Label>
      );
    case 'Paused':
      return (
        <Label color="grey" icon={<PauseCircleIcon />}>
          Paused
        </Label>
      );
    default:
      return null;
  }
};

export default ReportStatusBadge;
