import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SchedulerReportsTable from './SchedulerReportsTable';
import type { ScheduledReport } from '../../hooks/useSchedulerState';

const MOCK_REPORTS: ScheduledReport[] = [
  {
    id: 1,
    name: 'Scheduled report 1',
    datetime: '25/07/2025 12:00 am EST',
    status: 'Running',
    services: ['Cost Management'],
    taskCreator: 'Allison Robinhood',
    frequency: 'Monthly on the last Friday at 12:00am EST',
  },
  {
    id: 2,
    name: 'Scheduled report 2',
    datetime: '25/07/2025 12:00 am EST',
    status: 'Failed',
    services: ['Advisor'],
    taskCreator: 'Bob Smith',
    frequency: 'Weekly on Monday at 8:00am EST',
  },
];

const DEFAULT_PROPS = {
  reports: MOCK_REPORTS,
  page: 1,
  perPage: 10,
  onSetPage: jest.fn(),
  onPerPageSelect: jest.fn(),
  sortBy: { index: 1, direction: 'asc' as const },
  onSort: jest.fn(),
  reportSortCol: 1,
  statusSortCol: 2,
  expandedReportIds: [],
  onToggleExpand: jest.fn(),
  isFilterNameOpen: false,
  onFilterNameOpenChange: jest.fn(),
  isFilterOpen: false,
  onFilterOpenChange: jest.fn(),
  onCreateNew: jest.fn(),
};

describe('SchedulerReportsTable', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('column headers', () => {
    it('renders the Reports column header', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('renders the Latest report instance status column header', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getByText('Latest report instance status')).toBeInTheDocument();
    });
  });

  describe('report rows', () => {
    it('renders each report name', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getByText('Scheduled report 1')).toBeInTheDocument();
      expect(screen.getByText('Scheduled report 2')).toBeInTheDocument();
    });

    it('renders each report datetime', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getAllByText('25/07/2025 12:00 am EST')).toHaveLength(2);
    });

    it('renders status badges for each report', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} />);
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  describe('expanded rows', () => {
    it('shows service, task creator and frequency when a row is expanded', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} expandedReportIds={[1]} />);
      expect(screen.getByText('Cost Management')).toBeInTheDocument();
      expect(screen.getByText('Allison Robinhood')).toBeInTheDocument();
      expect(screen.getByText('Monthly on the last Friday at 12:00am EST')).toBeInTheDocument();
    });

    it('calls onToggleExpand when the expand toggle is clicked', () => {
      const onToggleExpand = jest.fn();
      render(<SchedulerReportsTable {...DEFAULT_PROPS} onToggleExpand={onToggleExpand} />);
      const toggleButtons = screen.getAllByRole('button', { name: /details/i });
      fireEvent.click(toggleButtons[0]);
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

  describe('empty state', () => {
    it('renders no rows when reports array is empty', () => {
      render(<SchedulerReportsTable {...DEFAULT_PROPS} reports={[]} />);
      expect(screen.queryByText('Scheduled report 1')).not.toBeInTheDocument();
    });
  });
});
