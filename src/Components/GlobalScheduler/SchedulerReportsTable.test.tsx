import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SchedulerReportsTable from './SchedulerReportsTable';
import type { ScheduledReport } from '../../hooks/useSchedulerState';

const MOCK_REPORTS: ScheduledReport[] = [
  {
    id: 'job-1',
    name: 'Scheduled report 1',
    datetime: '25/07/2025 12:00 AM EST',
    nextDatetime: '08/01/2025 12:00 AM EST',
    status: 'Running',
    services: ['Cost Management'],
    task: 'Export Systems',
    frequency: 'Monthly on the last Friday at 12:00am EST',
    fileType: 'CSV',
  },
  {
    id: 'job-2',
    name: 'Scheduled report 2',
    datetime: '25/07/2025 12:00 AM EST',
    nextDatetime: null,
    status: 'Failed',
    services: ['Advisor'],
    task: 'Subscriptions',
    frequency: 'Weekly on Monday at 8:00am EST',
    fileType: 'JSON',
  },
];

const DEFAULT_PROPS = {
  reports: MOCK_REPORTS,
  page: 1,
  perPage: 10,
  total: MOCK_REPORTS.length,
  onSetPage: jest.fn(),
  onPerPageSelect: jest.fn(),
  expandedReportIds: [],
  onToggleExpand: jest.fn(),
  filterName: null,
  onFilterNameChange: jest.fn(),
  filterStatus: null,
  onFilterStatusChange: jest.fn(),
  isFilterStatusOpen: false,
  onFilterStatusOpenChange: jest.fn(),
  sortField: null,
  sortDirection: 'asc' as const,
  onSort: jest.fn(),
  onCreateNew: jest.fn(),
  onViewReport: jest.fn(),
  onEditReport: jest.fn(),
  onPauseReport: jest.fn(),
  onDeleteReport: jest.fn(),
};

describe('SchedulerReportsTable', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('column headers', () => {
    it('renders the Reports column header', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('renders the Status column header', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('renders a Status help icon with tooltip', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getByLabelText('Status help')).toBeInTheDocument();
    });

    it('does not render a help icon in the Reports column', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.queryByLabelText('Reports help')).not.toBeInTheDocument();
    });
  });

  describe('column sorting', () => {
    it('sorts by name (asc) when the Reports header is clicked', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByRole('button', { name: 'Reports' }));
      expect(DEFAULT_PROPS.onSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('sorts by status (asc) when the Status header is clicked', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      fireEvent.click(screen.getByRole('button', { name: /Status/ }));
      expect(DEFAULT_PROPS.onSort).toHaveBeenCalledWith('status', 'asc');
    });

    it('toggles to desc when the active sort column is clicked again', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} sortField="name" sortDirection="asc" />);
      fireEvent.click(screen.getByRole('button', { name: 'Reports' }));
      expect(DEFAULT_PROPS.onSort).toHaveBeenCalledWith('name', 'desc');
    });
  });

  describe('report rows', () => {
    it('renders each report name', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getByText('Scheduled report 1')).toBeInTheDocument();
      expect(screen.getByText('Scheduled report 2')).toBeInTheDocument();
    });

    it('renders next report datetime when nextDatetime is set', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getByText('Next report: 08/01/2025 12:00 AM EST')).toBeInTheDocument();
    });

    it('falls back to "Last report:" when nextDatetime is null', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getByText('Last report: 25/07/2025 12:00 AM EST')).toBeInTheDocument();
    });

    it('renders status badges for each report', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  describe('expanded rows', () => {
    it('shows service, file type and frequency when a row is expanded', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} expandedReportIds={['job-1']} />);
      expect(screen.getAllByText('File Type').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Cost Management')).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('Monthly on the last Friday at 12:00am EST')).toBeInTheDocument();
    });

    it('calls onToggleExpand when the expand toggle is clicked', () => {
      const onToggleExpand = jest.fn();
      render(<SchedulerReportsTable {...DEFAULT_PROPS} onToggleExpand={onToggleExpand} />);
      // PatternFly labels the expand toggle via aria-labelledby -> the report name
      // (+ its default "Details" label); it is the only such button exposing aria-expanded.
      const toggleButton = screen.getByRole('button', { name: /scheduled report 1/i, expanded: false });
      fireEvent.click(toggleButton);
      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });
  });

  describe('toolbar', () => {
    it('renders the Create new button', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getByRole('button', { name: /create new/i })).toBeInTheDocument();
    });

    it('calls onCreateNew when Create new is clicked', () => {
      const onCreateNew = jest.fn();
      render(<SchedulerReportsTable {...DEFAULT_PROPS} onCreateNew={onCreateNew} />);
      fireEvent.click(screen.getByRole('button', { name: /create new/i }));
      expect(onCreateNew).toHaveBeenCalledTimes(1);
    });

    it('renders the pagination with the correct item count', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      // PF pagination renders the total count in two spots (top + bottom)
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('kebab menu', () => {
    it('renders a kebab menu for each report row', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      const kebabButtons = screen.getAllByRole('button', { name: /kebab toggle/i });
      expect(kebabButtons).toHaveLength(MOCK_REPORTS.length);
    });

    it('shows Edit, Pause, and Delete options when kebab is clicked', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      const kebabButtons = screen.getAllByRole('button', { name: /kebab toggle/i });
      fireEvent.click(kebabButtons[0]);
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Pause')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('renders all kebab actions as enabled', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      const kebabButtons = screen.getAllByRole('button', { name: /kebab toggle/i });
      fireEvent.click(kebabButtons[0]);
      const editItem = screen.getByText('Edit').closest('button');
      const pauseItem = screen.getByText('Pause').closest('button');
      const deleteItem = screen.getByText('Delete').closest('button');
      expect(editItem).not.toBeDisabled();
      expect(pauseItem).not.toBeDisabled();
      expect(deleteItem).not.toBeDisabled();
    });

    it('calls onDeleteReport with the report when Delete is clicked', () => {
      const onDeleteReport = jest.fn();
      render(<SchedulerReportsTable {...DEFAULT_PROPS} onDeleteReport={onDeleteReport} />);
      const kebabButtons = screen.getAllByRole('button', { name: /kebab toggle/i });
      fireEvent.click(kebabButtons[0]);
      fireEvent.click(screen.getByText('Delete'));
      expect(onDeleteReport).toHaveBeenCalledTimes(1);
      expect(onDeleteReport).toHaveBeenCalledWith(MOCK_REPORTS[0]);
    });
  });

  describe('empty state', () => {
    it('renders no rows when reports array is empty', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} reports={[]} />);
      expect(screen.queryByText('Scheduled report 1')).not.toBeInTheDocument();
    });
  });
});
