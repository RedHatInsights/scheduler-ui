import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SchedulerDownloadButton from './SchedulerDownloadButton';

describe('SchedulerDownloadButton', () => {
  const defaultProps = {
    onSelect: jest.fn(),
    onScheduleExport: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders the export toggle button', () => {
    render(<SchedulerDownloadButton {...defaultProps} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('shows CSV and JSON options when opened', () => {
    render(<SchedulerDownloadButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    expect(screen.getByText('Export to CSV')).toBeInTheDocument();
    expect(screen.getByText('Export to JSON')).toBeInTheDocument();
  });

  it('shows the Schedule export option when opened', () => {
    render(<SchedulerDownloadButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    expect(screen.getByText('Schedule export')).toBeInTheDocument();
  });

  it('calls onScheduleExport when Schedule export is clicked', () => {
    render(<SchedulerDownloadButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByText('Schedule export'));

    expect(defaultProps.onScheduleExport).toHaveBeenCalledTimes(1);
  });

  it('renders a custom schedule export label', () => {
    render(
      <SchedulerDownloadButton
        {...defaultProps}
        scheduleExportLabel="Schedule recurring report"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    expect(screen.getByText('Schedule recurring report')).toBeInTheDocument();
  });

  it('passes onSelect through to DownloadButton', () => {
    render(<SchedulerDownloadButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByText('Export to CSV'));

    expect(defaultProps.onSelect).toHaveBeenCalledWith(
      expect.any(Object),
      'csv'
    );
  });

  it('renders additional extraItems before the scheduler option', () => {
    render(
      <SchedulerDownloadButton
        {...defaultProps}
        extraItems={
          <button key="custom" data-testid="custom-item">
            Custom action
          </button>
        }
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    expect(screen.getByTestId('custom-item')).toBeInTheDocument();
    expect(screen.getByText('Schedule export')).toBeInTheDocument();
  });
});
