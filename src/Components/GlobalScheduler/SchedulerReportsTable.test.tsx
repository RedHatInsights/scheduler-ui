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

    it('renders "Next report: N/A" when nextDatetime is null', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getByText('Next report: N/A')).toBeInTheDocument();
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

  describe('row actions', () => {
    // The report-name link and the expand toggle share the accessible name; the
    // toggle exposes aria-expanded, the link does not — filter on that.
    const clickNameLink = (name: RegExp) => {
      const link = screen
        .getAllByRole('button', { name })
        .find((b) => !b.hasAttribute('aria-expanded'));
      fireEvent.click(link as HTMLElement);
    };

    it('calls onViewReport when the report-name link is clicked', () => {
      const onViewReport = jest.fn();
      render(<SchedulerReportsTable {...DEFAULT_PROPS} onViewReport={onViewReport} />);
      clickNameLink(/scheduled report 1/i);
      expect(onViewReport).toHaveBeenCalledWith(MOCK_REPORTS[0]);
    });

    it('calls onEditReport when the kebab Edit item is clicked', () => {
      const onEditReport = jest.fn();
      render(<SchedulerReportsTable {...DEFAULT_PROPS} onEditReport={onEditReport} />);
      fireEvent.click(screen.getAllByRole('button', { name: /kebab toggle/i })[0]);
      fireEvent.click(screen.getByText('Edit'));
      expect(onEditReport).toHaveBeenCalledWith(MOCK_REPORTS[0]);
    });

    it('calls onPauseReport when the kebab Pause item is clicked', () => {
      const onPauseReport = jest.fn();
      render(<SchedulerReportsTable {...DEFAULT_PROPS} onPauseReport={onPauseReport} />);
      fireEvent.click(screen.getAllByRole('button', { name: /kebab toggle/i })[0]);
      fireEvent.click(screen.getByText('Pause'));
      expect(onPauseReport).toHaveBeenCalledWith(MOCK_REPORTS[0]);
    });

    it('shows Resume (not Pause) in the kebab for a paused report', () => {
      const pausedReport = { ...MOCK_REPORTS[0], status: 'Paused' as const };
      render(<SchedulerReportsTable {...DEFAULT_PROPS} reports={[pausedReport]} />);
      fireEvent.click(screen.getByRole('button', { name: /kebab toggle/i }));
      expect(screen.getByText('Resume')).toBeInTheDocument();
      expect(screen.queryByText('Pause')).not.toBeInTheDocument();
    });
  });

  describe('filters', () => {
    it('clears the name filter and reveals the status select when switching to Status', () => {
      const onFilterNameChange = jest.fn();
      render(<SchedulerReportsTable {...DEFAULT_PROPS} onFilterNameChange={onFilterNameChange} />);
      // Name filter is shown by default.
      expect(screen.getByLabelText('Filter by name')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Name' }));
      fireEvent.click(screen.getByRole('option', { name: 'Status' }));

      expect(onFilterNameChange).toHaveBeenCalledWith(null);
      // Status filter toggle ('All') now shown; name filter gone.
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.queryByLabelText('Filter by name')).not.toBeInTheDocument();
    });

    it('calls onFilterNameChange when typing in the name filter', () => {
      const onFilterNameChange = jest.fn();
      render(<SchedulerReportsTable {...DEFAULT_PROPS} onFilterNameChange={onFilterNameChange} />);
      fireEvent.change(screen.getByLabelText('Filter by name'), { target: { value: 'cost' } });
      expect(onFilterNameChange).toHaveBeenCalledWith('cost');
    });

    it('calls onFilterStatusChange when a status option is selected', () => {
      const onFilterStatusChange = jest.fn();
      const { rerender } = render(
        <SchedulerReportsTable {...DEFAULT_PROPS} onFilterStatusChange={onFilterStatusChange} />
      );
      // Switch to the status filter (internal filterType state).
      fireEvent.click(screen.getByRole('button', { name: 'Name' }));
      fireEvent.click(screen.getByRole('option', { name: 'Status' }));
      // The status Select is open-controlled by the parent; re-render it open.
      rerender(
        <SchedulerReportsTable
          {...DEFAULT_PROPS}
          onFilterStatusChange={onFilterStatusChange}
          isFilterStatusOpen
        />
      );
      fireEvent.click(screen.getByRole('option', { name: 'Scheduled' }));
      expect(onFilterStatusChange).toHaveBeenCalledWith('Scheduled');
    });
  });

  describe('empty state', () => {
    it('renders no rows when reports array is empty', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} reports={[]} />);
      expect(screen.queryByText('Scheduled report 1')).not.toBeInTheDocument();
    });
  });
});
