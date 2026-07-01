import React, { useState } from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertGroup,
  Button,
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
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import { DownloadIcon, FilterIcon } from '@patternfly/react-icons';
import type { ReportHistoryEntry } from './reportHistoryMocks';

interface ReportHistoryTableProps {
  reports: ReportHistoryEntry[];
  page: number;
  perPage: number;
  onSetPage: (e: unknown, page: number) => void;
  onPerPageSelect: (e: unknown, perPage: number) => void;
  filterName: string | null;
  onFilterNameChange: (value: string | null) => void;
  isFilterNameOpen: boolean;
  onFilterNameOpenChange: (open: boolean) => void;
  filterDate: string | null;
  onFilterDateChange: (value: string | null) => void;
  isFilterDateOpen: boolean;
  onFilterDateOpenChange: (open: boolean) => void;
  availableNames: string[];
  availableDates: string[];
}

let alertKeyCounter = 0;

const ReportHistoryTable: React.FC<ReportHistoryTableProps> = ({
  reports,
  page,
  perPage,
  onSetPage,
  onPerPageSelect,
  filterName,
  onFilterNameChange,
  isFilterNameOpen,
  onFilterNameOpenChange,
  filterDate,
  onFilterDateChange,
  isFilterDateOpen,
  onFilterDateOpenChange,
  availableNames,
  availableDates,
}) => {
  const [alerts, setAlerts] = useState<{ key: number; name: string }[]>([]);

  const handleDownload = (report: ReportHistoryEntry) => {
    setAlerts((prev) => [...prev, { key: alertKeyCounter++, name: report.reportName }]);
  };

  const removeAlert = (key: number) => {
    setAlerts((prev) => prev.filter((a) => a.key !== key));
  };

  const paginatedReports = reports.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <AlertGroup isToast isLiveRegion>
        {alerts.map(({ key, name }) => (
          <Alert
            key={key}
            variant="success"
            title="Report downloaded successfully"
            actionClose={<AlertActionCloseButton onClose={() => removeAlert(key)} />}
          >
            {name} has been downloaded successfully.
          </Alert>
        ))}
      </AlertGroup>

      <Toolbar inset={{ default: 'insetMd', lg: 'insetLg' }}>
        <ToolbarContent>
          <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
            <ToolbarItem>
              <Select
                id="history-filter-name-select"
                isOpen={isFilterNameOpen}
                selected={filterName}
                onSelect={(_e, value) => {
                  onFilterNameChange(value === 'all' ? null : (value as string));
                  onFilterNameOpenChange(false);
                }}
                onOpenChange={onFilterNameOpenChange}
                toggle={(ref) => (
                  <MenuToggle
                    ref={ref}
                    onClick={() => onFilterNameOpenChange(!isFilterNameOpen)}
                    isExpanded={isFilterNameOpen}
                    icon={<FilterIcon />}
                  >
                    {filterName ?? 'Filter name'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="all">All</SelectOption>
                  {availableNames.map((name) => (
                    <SelectOption key={name} value={name}>
                      {name}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </ToolbarItem>
            <ToolbarItem>
              <Select
                id="history-filter-date-select"
                isOpen={isFilterDateOpen}
                selected={filterDate}
                onSelect={(_e, value) => {
                  onFilterDateChange(value === 'all' ? null : (value as string));
                  onFilterDateOpenChange(false);
                }}
                onOpenChange={onFilterDateOpenChange}
                toggle={(ref) => (
                  <MenuToggle
                    ref={ref}
                    onClick={() => onFilterDateOpenChange(!isFilterDateOpen)}
                    isExpanded={isFilterDateOpen}
                  >
                    {filterDate ?? 'Run date'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="all">All</SelectOption>
                  {availableDates.map((date) => (
                    <SelectOption key={date} value={date}>
                      {date}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
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
              <Td dataLabel="Run date">{report.runDate}</Td>
              <Td dataLabel="Download" isActionCell>
                <Button
                  variant="plain"
                  aria-label={`Download ${report.reportName}`}
                  onClick={() => handleDownload(report)}
                >
                  <DownloadIcon />
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
};

export default ReportHistoryTable;
