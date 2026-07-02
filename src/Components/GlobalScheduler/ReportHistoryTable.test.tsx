import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReportHistoryTable from './ReportHistoryTable';
import { MOCK_REPORT_HISTORY } from './reportHistoryMocks';

const DEFAULT_PROPS = {
  reports: MOCK_REPORT_HISTORY,
  page: 1,
  perPage: 10,
  onSetPage: jest.fn(),
  onPerPageSelect: jest.fn(),
  filterName: null,
  onFilterNameChange: jest.fn(),
  filterDate: null,
  onFilterDateChange: jest.fn(),
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

    it('renders formatted run dates from ISO values', () => {
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

    it('auto-dismisses toast after timeout', () => {
      jest.useFakeTimers();
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      fireEvent.click(downloadButtons[0]);
      expect(screen.getByText('Report downloaded successfully')).toBeInTheDocument();
      act(() => {
        jest.advanceTimersByTime(4000);
      });
      expect(screen.queryByText('Report downloaded successfully')).not.toBeInTheDocument();
      jest.useRealTimers();
    });
  });

  describe('toolbar', () => {
    it('renders the pagination with the correct item count', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    });

    it('renders the filter by name input', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      expect(screen.getByPlaceholderText('Filter by name')).toBeInTheDocument();
    });

    it('renders the date picker filter', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} />);
      expect(screen.getByRole('textbox', { name: /filter by run date/i })).toBeInTheDocument();
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
    it('shows empty state when reports array is empty', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} reports={[]} />);
      expect(screen.getByText('No report history found')).toBeInTheDocument();
      expect(screen.getByText('No report history available.')).toBeInTheDocument();
    });

    it('shows filter empty state when reports empty with active filters', () => {
      render(<ReportHistoryTable {...DEFAULT_PROPS} reports={[]} filterName="nonexistent" />);
      expect(screen.getByText('No report history found')).toBeInTheDocument();
      expect(screen.getByText('No results match your filters.')).toBeInTheDocument();
    });
  });
});
