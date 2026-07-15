import React, { useCallback } from 'react';
import { DropdownItem, Divider } from '@patternfly/react-core';
import { CalendarAltIcon } from '@patternfly/react-icons';
import DownloadButton from '@redhat-cloud-services/frontend-components/DownloadButton';
import type { DownloadButtonProps } from '@redhat-cloud-services/frontend-components/DownloadButton';

export interface SchedulerDownloadButtonProps extends DownloadButtonProps {
  /** Called when the user clicks "Schedule export". Typically wired to
   *  `useSchedulerModal().open()` to launch the scheduling wizard. */
  onScheduleExport: () => void;
  /** Custom label for the schedule option. Defaults to "Schedule export". */
  scheduleExportLabel?: string;
}

/**
 * SchedulerDownloadButton
 *
 * A drop-in replacement for the platform `DownloadButton` that appends a
 * "Schedule export" option at the bottom of the dropdown. When clicked,
 * it fires `onScheduleExport` so the consumer can open the scheduling
 * wizard modal (via `useSchedulerModal`).
 *
 * @example
 * ```tsx
 * import { useSchedulerModal } from 'scheduler-ui/useSchedulerModal';
 * import SchedulerDownloadButton from 'scheduler-ui/SchedulerDownloadButton';
 *
 * const wizard = useSchedulerModal();
 *
 * <SchedulerDownloadButton
 *   onSelect={(e, format) => handleDownload(format)}
 *   onScheduleExport={() => wizard.open({ service: 'Cost Management' })}
 * />
 * ```
 */
const SchedulerDownloadButton: React.FC<SchedulerDownloadButtonProps> = ({
  onScheduleExport,
  scheduleExportLabel = 'Schedule export',
  extraItems,
  ...downloadProps
}) => {
  const handleScheduleClick = useCallback(() => {
    onScheduleExport();
  }, [onScheduleExport]);

  const schedulerItems = (
    <React.Fragment>
      {extraItems}
      <Divider key="scheduler-divider" />
      <DropdownItem
        key="schedule-export"
        component="button"
        icon={<CalendarAltIcon />}
        onClick={handleScheduleClick}
        aria-label={scheduleExportLabel}
      >
        {scheduleExportLabel}
      </DropdownItem>
    </React.Fragment>
  );

  return <DownloadButton {...downloadProps} extraItems={schedulerItems} />;
};

export default SchedulerDownloadButton;
