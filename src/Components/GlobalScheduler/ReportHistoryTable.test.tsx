import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReportHistoryTable from './ReportHistoryTable';
import { MOCK_REPORT_HISTORY } from './reportHistoryMocks';

const AVAILABLE_NAMES = [...new Set(MOCK_REPORT_HISTORY.map((r) => r.reportName))];
const AVAILABLE_DATES = [...new Set(MOCK_REPORT_HISTORY.map((r) => r.runDate))];

const DEFAULT_PROPS = {
  reports: MOCK_REPORT_HISTORY,
  page: 1,
  perPage: 10,
  onSetPage: jest.fn(),
  onPerPageSelect: jest.fn(),
  filterName: null,
  onFilterNameChange: jest.fn(),
  isFilterNameOpen: false,
  onFilterNameOpenChange: jest.fn(),
  filterDate: null,
  onFilterDateChange: jest.fn(),
  isFilterDateOpen: false,
  onFilterDateOpenChange: jest.fn(),
  availableNames: AVAILABLE_NAMES,
  availableDates: AVAILABLE_DATES,
};

describe('ReportHistoryTable', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('column headers', () => {
    it('renders the Report name column header', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      expect(screen.getByText('Report name')).toBeInTheDocument();
    });

    it('renders the Run date column header', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      const headers = screen.getAllByText('Run date');
      const thHeader = headers.find((el) => el.closest('th'));
      expect(thHeader).toBeInTheDocument();
    });
  });

  describe('report rows', () => {
    it('renders each report name', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      expect(screen.getAllByText('RHEL usage report')).toHaveLength(2);
      expect(screen.getByText('Cost management report')).toBeInTheDocument();
      expect(screen.getByText('Scheduled report 2')).toBeInTheDocument();
      expect(screen.getByText('Scheduled report 3')).toBeInTheDocument();
    });

    it('renders each report run date', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      expect(screen.getAllByText('Sep 17, 2026')).toHaveLength(2);
      expect(screen.getByText('Sep 11, 2026')).toBeInTheDocument();
      expect(screen.getByText('Sep 10, 2026')).toBeInTheDocument();
      expect(screen.getByText('Sep 4, 2026')).toBeInTheDocument();
    });

    it('renders a download button for each row', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      expect(downloadButtons).toHaveLength(5);
    });
  });

  describe('download action', () => {
    it('shows a success toast when download is clicked', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      fireEvent.click(downloadButtons[0]);
      expect(screen.getByText('Report downloaded successfully')).toBeInTheDocument();
      expect(screen.getByText('RHEL usage report has been downloaded successfully.')).toBeInTheDocument();
    });

    it('toast is dismissible', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      fireEvent.click(downloadButtons[0]);
      expect(screen.getByText('Report downloaded successfully')).toBeInTheDocument();
      const closeButton = screen.getByRole('button', { name: /close.*alert/i });
      fireEvent.click(closeButton);
      expect(screen.queryByText('Report downloaded successfully')).not.toBeInTheDocument();
    });
  });

  describe('toolbar', () => {
    it('renders the pagination with the correct item count', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    });

    it('renders the filter name toggle', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      expect(screen.getByText('Filter name')).toBeInTheDocument();
    });

    it('renders the run date filter toggle', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      const matches = screen.getAllByText('Run date');
      const toggleText = matches.find((el) => el.closest('.pf-v6-c-menu-toggle'));
      expect(toggleText).toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('renders only the number of rows matching perPage', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} perPage={2} />);
      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      expect(downloadButtons).toHaveLength(2);
    });
  });

  describe('empty state', () => {
    it('renders no rows when reports array is empty', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} reports={[]} />);
      expect(screen.queryByText('RHEL usage report')).not.toBeInTheDocument();
    });
  });
});
