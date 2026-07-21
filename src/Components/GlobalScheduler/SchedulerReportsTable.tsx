import React, { Fragment } from 'react';
import {
  Button,
  Flex,
  FlexItem,
  MenuToggle,
  Pagination,
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
  ActionsColumn,
  ExpandableRowContent,
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import { FilterIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import ReportStatusBadge from './ReportStatusBadge';
import type { ScheduledReport } from '../../hooks/useSchedulerState';
import { getServices, getServiceDisplayName } from '../../api/metadata/exportMetadata';

interface SchedulerReportsTableProps {
  reports: ScheduledReport[];
  // pagination
  page: number;
  perPage: number;
  onSetPage: (e: unknown, page: number) => void;
  onPerPageSelect: (e: unknown, perPage: number) => void;
  // sorting
  sortBy: { index: number; direction: 'asc' | 'desc' };
  onSort: (e: unknown, index: number, direction: 'asc' | 'desc') => void;
  reportSortCol: number;
  statusSortCol: number;
  // expand
  expandedReportIds: string[];
  onToggleExpand: (id: string, willBeExpanded: boolean) => void;
  // filters
  filterName: string | null;
  onFilterNameChange: (value: string | null) => void;
  filterStatus: string | null;
  onFilterStatusChange: (value: string | null) => void;
  isFilterStatusOpen: boolean;
  onFilterStatusOpenChange: (open: boolean) => void;
  filterService: string | null;
  onFilterServiceChange: (value: string | null) => void;
  isFilterServiceOpen: boolean;
  onFilterServiceOpenChange: (open: boolean) => void;
  // actions
  onCreateNew: () => void;
  onViewReport: (report: ScheduledReport) => void;
  onEditReport: (report: ScheduledReport) => void;
  onPauseReport: (report: ScheduledReport) => void;
  onDeleteReport: (report: ScheduledReport) => void;
}

const buildRowActions = (
  report: ScheduledReport,
  onEdit: (report: ScheduledReport) => void,
  onPause: (report: ScheduledReport) => void,
  onDelete: (report: ScheduledReport) => void
) => [
  { title: 'Edit', onClick: () => onEdit(report) },
  { title: report.status === 'Paused' ? 'Resume' : 'Pause', onClick: () => onPause(report) },
  { title: 'Delete', onClick: () => onDelete(report) },
];

const COLUMN_COUNT = 4;

const SchedulerReportsTable: React.FC<SchedulerReportsTableProps> = ({
  reports,
  page,
  perPage,
  onSetPage,
  onPerPageSelect,
  sortBy,
  onSort,
  reportSortCol,
  statusSortCol,
  expandedReportIds,
  onToggleExpand,
  filterName,
  onFilterNameChange,
  filterStatus,
  onFilterStatusChange,
  isFilterStatusOpen,
  onFilterStatusOpenChange,
  filterService,
  onFilterServiceChange,
  isFilterServiceOpen,
  onFilterServiceOpenChange,
  onCreateNew,
  onViewReport,
  onEditReport,
  onPauseReport,
  onDeleteReport,
}) => (
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
              id="filter-status-select"
              isOpen={isFilterStatusOpen}
              onSelect={(_e, value) => {
                onFilterStatusChange(value === 'all' ? null : value as string);
                onFilterStatusOpenChange(false);
              }}
              onOpenChange={onFilterStatusOpenChange}
              selected={filterStatus ?? 'all'}
              toggle={(ref) => (
                <MenuToggle
                  ref={ref}
                  onClick={() => onFilterStatusOpenChange(!isFilterStatusOpen)}
                  isExpanded={isFilterStatusOpen}
                >
                  Status: {filterStatus ?? 'All'}
                </MenuToggle>
              )}
            >
              <SelectList>
                <SelectOption value="all">All</SelectOption>
                <SelectOption value="Scheduled">Scheduled</SelectOption>
                <SelectOption value="Running">Running</SelectOption>
                <SelectOption value="Completed">Completed</SelectOption>
                <SelectOption value="Failed">Failed</SelectOption>
                <SelectOption value="Paused">Paused</SelectOption>
              </SelectList>
            </Select>
          </ToolbarItem>
          <ToolbarItem>
            <Select
              id="filter-service-select"
              isOpen={isFilterServiceOpen}
              onSelect={(_e, value) => {
                onFilterServiceChange(value === 'all' ? null : value as string);
                onFilterServiceOpenChange(false);
              }}
              onOpenChange={onFilterServiceOpenChange}
              selected={filterService ?? 'all'}
              toggle={(ref) => (
                <MenuToggle
                  ref={ref}
                  onClick={() => onFilterServiceOpenChange(!isFilterServiceOpen)}
                  isExpanded={isFilterServiceOpen}
                >
                  Service: {filterService ?? 'All'}
                </MenuToggle>
              )}
            >
              <SelectList>
                <SelectOption value="all">All</SelectOption>
                {getServices().map((serviceId) => (
                  <SelectOption key={serviceId} value={getServiceDisplayName(serviceId)}>
                    {getServiceDisplayName(serviceId)}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </ToolbarItem>
        </ToolbarToggleGroup>

        <ToolbarItem>
          <Button variant="primary" onClick={onCreateNew}>
            Create new
          </Button>
        </ToolbarItem>

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

    <Table aria-label="Scheduled reports" variant={TableVariant.compact} borders>
      <Thead>
        <Tr>
          <Th screenReaderText="Expand" />
          <Th sort={{ sortBy, onSort, columnIndex: reportSortCol }}>
            <>
              Reports
              <OutlinedQuestionCircleIcon className="scheduler-ui-th-help-icon pf-v6-u-ml-xs" aria-hidden />
            </>
          </Th>
          <Th sort={{ sortBy, onSort, columnIndex: statusSortCol }}>
            <>
              Status
              <Tooltip content="Status of the most recent run for this schedule.">
                <OutlinedQuestionCircleIcon className="scheduler-ui-th-help-icon pf-v6-u-ml-xs" aria-hidden />
              </Tooltip>
            </>
          </Th>
          <Th screenReaderText="Actions" />
        </Tr>
      </Thead>
      <Tbody>
        {reports.map((report, rowIndex) => {
          const isExpanded = expandedReportIds.includes(report.id);
          return (
            <Fragment key={report.id}>
              <Tr isControlRow isContentExpanded={isExpanded}>
                <Td
                  expand={{
                    isExpanded,
                    rowIndex,
                    columnIndex: 0,
                    expandId: 'scheduler-report-expand',
                    onToggle: (_e, _rowIdx, willBeExpanded) =>
                      onToggleExpand(report.id, willBeExpanded),
                  }}
                />
                <Td dataLabel="Reports">
                  <a href="#" onClick={(e) => { e.preventDefault(); onViewReport(report); }}>
                    {report.name}
                  </a>
                  <div className="report-datetime pf-v6-u-font-size-sm pf-v6-u-mt-xs">{report.datetime}</div>
                </Td>
                <Td dataLabel="Latest report instance status">
                  <ReportStatusBadge status={report.status} />
                </Td>
                <Td isActionCell>
                  <ActionsColumn items={buildRowActions(report, onEditReport, onPauseReport, onDeleteReport)} />
                </Td>
              </Tr>
              <Tr isExpanded={isExpanded} className="scheduler-ui-expandable-detail-row">
                <Td colSpan={COLUMN_COUNT} noPadding>
                  <ExpandableRowContent>
                    <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }} className="pf-v6-u-p-lg pf-v6-u-font-size-sm">
                      <FlexItem>
                        <strong className="pf-v6-u-mb-xs pf-v6-u-display-block">Service(s)</strong>
                        <div>{report.services.join(', ')}</div>
                      </FlexItem>
                      <FlexItem>
                        <strong className="pf-v6-u-mb-xs pf-v6-u-display-block">Task creator</strong>
                        <div>{report.taskCreator}</div>
                      </FlexItem>
                      <FlexItem>
                        <strong className="pf-v6-u-mb-xs pf-v6-u-display-block">Frequency</strong>
                        <div>{report.frequency}</div>
                      </FlexItem>
                    </Flex>
                  </ExpandableRowContent>
                </Td>
              </Tr>
            </Fragment>
          );
        })}
      </Tbody>
    </Table>
  </div>
);

export default SchedulerReportsTable;
