import React, { Fragment } from 'react';
import {
  Button,
  Flex,
  FlexItem,
  MenuToggle,
  Pagination,
  Select,
  SelectList,
  SelectOption,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarToggleGroup,
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
  expandedReportIds: number[];
  onToggleExpand: (id: number, willBeExpanded: boolean) => void;
  // filter dropdowns
  isFilterNameOpen: boolean;
  onFilterNameOpenChange: (open: boolean) => void;
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  // actions
  onCreateNew: () => void;
}

const ROW_ACTIONS = [
  { title: 'Edit', onClick: () => undefined },
  { title: 'Delete', onClick: () => undefined },
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
  isFilterNameOpen,
  onFilterNameOpenChange,
  isFilterOpen,
  onFilterOpenChange,
  onCreateNew,
}) => (
  <div>
    <Toolbar>
      <ToolbarContent>
        <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
          <ToolbarItem>
            <Select
              id="filter-name-select"
              isOpen={isFilterNameOpen}
              onSelect={() => onFilterNameOpenChange(false)}
              onOpenChange={onFilterNameOpenChange}
              toggle={(ref) => (
                <MenuToggle
                  ref={ref}
                  onClick={() => onFilterNameOpenChange(!isFilterNameOpen)}
                  isExpanded={isFilterNameOpen}
                  icon={<FilterIcon />}
                >
                  Filter name
                </MenuToggle>
              )}
            >
              <SelectList>
                <SelectOption value="option1">Option 1</SelectOption>
                <SelectOption value="option2">Option 2</SelectOption>
              </SelectList>
            </Select>
          </ToolbarItem>
          <ToolbarItem>
            <Select
              id="filter-select"
              isOpen={isFilterOpen}
              onSelect={() => onFilterOpenChange(false)}
              onOpenChange={onFilterOpenChange}
              toggle={(ref) => (
                <MenuToggle
                  ref={ref}
                  onClick={() => onFilterOpenChange(!isFilterOpen)}
                  isExpanded={isFilterOpen}
                >
                  Filter
                </MenuToggle>
              )}
            >
              <SelectList>
                <SelectOption value="all">All</SelectOption>
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
          <Th
            sort={{ sortBy, onSort, columnIndex: statusSortCol }}
            info={{ tooltip: 'Status of the most recent run for this schedule.' }}
          >
            Latest report instance status
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
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    {report.name}
                  </a>
                  <div className="report-datetime pf-v6-u-font-size-sm pf-v6-u-mt-xs">{report.datetime}</div>
                </Td>
                <Td dataLabel="Latest report instance status">
                  <ReportStatusBadge status={report.status} />
                </Td>
                <Td isActionCell>
                  <ActionsColumn items={ROW_ACTIONS} />
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
