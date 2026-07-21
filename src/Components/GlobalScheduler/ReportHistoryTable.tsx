import React from 'react';
import {
  Button,
  DatePicker,
  EmptyState,
  EmptyStateBody,
  Pagination,
  Popover,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarToggleGroup,
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
  filterDate: string | null;
  onFilterDateChange: (value: string | null) => void;
  onDownload?: (report: ReportHistoryEntry) => void;
}

/** Format an ISO date string (YYYY-MM-DD) for display. */
const formatRunDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const ReportHistoryTable: React.FC<ReportHistoryTableProps> = ({
  reports,
  page,
  perPage,
  onSetPage,
  onPerPageSelect,
  filterName,
  onFilterNameChange,
  filterDate,
  onFilterDateChange,
  onDownload,
}) => {
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
              <DatePicker
                aria-label="Filter by run date"
                placeholder="YYYY-MM-DD"
                value={filterDate ?? ''}
                onChange={(_e, value) => onFilterDateChange(value || null)}
              />
            </ToolbarItem>
          </ToolbarToggleGroup>

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
              : reports.length === 0 && (filterName || filterDate)
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
                <Td dataLabel="Run date">{formatRunDate(report.runDate)}</Td>
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
