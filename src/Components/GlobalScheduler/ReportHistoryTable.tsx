import React, { useState } from 'react';
import {
  Button,
  DatePicker,
  EmptyState,
  EmptyStateBody,
  MenuToggle,
  Pagination,
  Popover,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarToggleGroup,
  Tooltip,
} from '@patternfly/react-core';
import {
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import { DownloadIcon, ExclamationCircleIcon, FilterIcon, InProgressIcon, SearchIcon } from '@patternfly/react-icons';
import type { ReportHistoryEntry } from '../../hooks/useSchedulerState';
import './SchedulerPanelContent.css';

interface ReportHistoryTableProps {
  reports: ReportHistoryEntry[];
  page: number;
  perPage: number;
  onSetPage: (e: unknown, page: number) => void;
  onPerPageSelect: (e: unknown, perPage: number) => void;
  filterName: string | null;
  onFilterNameChange: (value: string | null) => void;
  filterTimeRange: string | null;
  onFilterTimeRangeChange: (value: string | null) => void;
  onDownload?: (report: ReportHistoryEntry) => void;
}

const formatRunDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatRunDateTime = (isoDateTime: string): string => {
  const date = new Date(isoDateTime);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
};

const TIME_RANGE_OPTIONS = [
  { value: '1', label: 'Last 1 hour' },
  { value: '6', label: 'Last 6 hours' },
  { value: '12', label: 'Last 12 hours' },
  { value: '24', label: 'Last 24 hours' },
] as const;

const BEFORE_DATE_VALUE = 'before-date';

const getTimeRangeLabel = (value: string | null): string => {
  if (!value) return 'Run date: All';
  if (value.startsWith('before:')) {
    return `Before ${value.slice(7)}`;
  }
  return TIME_RANGE_OPTIONS.find((o) => o.value === value)?.label ?? 'Run date: All';
};

const ReportHistoryTable: React.FC<ReportHistoryTableProps> = ({
  reports,
  page,
  perPage,
  onSetPage,
  onPerPageSelect,
  filterName,
  onFilterNameChange,
  filterTimeRange,
  onFilterTimeRangeChange,
  onDownload,
}) => {
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const paginatedReports = reports.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <Toolbar inset={{ default: 'insetMd', lg: 'insetLg' }}>
        <ToolbarContent>
          <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
            <ToolbarItem>
              <SearchInput
                aria-label="Filter by name"
                placeholder="Filter by name"
                value={filterName ?? ''}
                onChange={(_e, value) => onFilterNameChange(value || null)}
                onClear={() => onFilterNameChange(null)}
              />
            </ToolbarItem>
            <ToolbarItem>
              <Select
                aria-label="Filter by time range"
                isOpen={isTimeRangeOpen}
                onOpenChange={setIsTimeRangeOpen}
                onSelect={(_e, value) => {
                  if (value === BEFORE_DATE_VALUE) {
                    setShowDatePicker(true);
                    setIsTimeRangeOpen(false);
                    return;
                  }
                  setShowDatePicker(false);
                  onFilterTimeRangeChange(value === 'all' ? null : String(value));
                  setIsTimeRangeOpen(false);
                }}
                selected={filterTimeRange ?? 'all'}
                toggle={(toggleRef) => (
                  <MenuToggle ref={toggleRef} onClick={() => setIsTimeRangeOpen((prev) => !prev)} isExpanded={isTimeRangeOpen}>
                    {getTimeRangeLabel(filterTimeRange)}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="all">All</SelectOption>
                  {TIME_RANGE_OPTIONS.map((opt) => (
                    <SelectOption key={opt.value} value={opt.value}>{opt.label}</SelectOption>
                  ))}
                  <SelectOption value={BEFORE_DATE_VALUE}>Before date...</SelectOption>
                </SelectList>
              </Select>
            </ToolbarItem>
          </ToolbarToggleGroup>
          {showDatePicker && (
            <ToolbarItem>
              <DatePicker
                aria-label="Filter before date"
                placeholder="YYYY-MM-DD"
                value={filterTimeRange?.startsWith('before:') ? filterTimeRange.slice(7) : ''}
                onChange={(_e, value) => {
                  if (value) {
                    onFilterTimeRangeChange(`before:${value}`);
                  }
                }}
              />
            </ToolbarItem>
          )}

          <ToolbarItem align={{ default: 'alignEnd' }}>
            <Pagination
              itemCount={reports.length}
              page={page}
              perPage={perPage}
              onSetPage={onSetPage}
              onPerPageSelect={onPerPageSelect}
              variant="top"
              isCompact
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {paginatedReports.length === 0 ? (
        <EmptyState
          titleText="No report history found"
          headingLevel="h3"
          icon={SearchIcon}
          variant="sm"
        >
          <EmptyStateBody>
            {paginatedReports.length === 0 && reports.length > 0
              ? 'No results on this page. Try a different page.'
              : reports.length === 0 && (filterName || filterTimeRange)
              ? 'No results match your filters.'
              : 'No report history available.'}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="Reports history" variant={TableVariant.compact} borders>
          <Thead>
            <Tr>
              <Th>Report name</Th>
              <Th>Run date</Th>
              <Th screenReaderText="Download" />
            </Tr>
          </Thead>
          <Tbody>
            {paginatedReports.map((report) => (
              <Tr key={report.id}>
                <Td dataLabel="Report name">{report.reportName}</Td>
                <Td dataLabel="Run date">
                  <Tooltip content={formatRunDateTime(report.runDateTime)}>
                    <span tabIndex={0}>{formatRunDate(report.runDate)}</span>
                  </Tooltip>
                </Td>
                <Td dataLabel="Download" isActionCell>
                  {report.status === 'failed' ? (
                    <Popover
                      headerContent="Export failed"
                      bodyContent={report.errorMessage || 'This export failed to complete. Try scheduling a new report.'}
                    >
                      <Button
                        variant="plain"
                        aria-label="Export failed"
                        className="scheduler-ui-status scheduler-ui-status--failed"
                      >
                        <ExclamationCircleIcon />
                      </Button>
                    </Popover>
                  ) : report.status === 'running' ? (
                    <span className="scheduler-ui-status scheduler-ui-status--running">
                      <InProgressIcon
                        aria-label="Export running"
                        className="scheduler-ui-spin-icon"
                      />
                    </span>
                  ) : (
                    <Button
                      variant="plain"
                      aria-label={`Download ${report.reportName}`}
                      onClick={() => onDownload?.(report)}
                    >
                      <DownloadIcon />
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
};

export default ReportHistoryTable;
