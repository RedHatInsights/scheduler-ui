import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SchedulerPage from './SchedulerPage';

describe('SchedulerPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the page title', () => {
    render(<SchedulerPage />);
    expect(screen.getByText('Report Scheduler')).toBeInTheDocument();
  });

  it('renders the welcome message', () => {
    render(<SchedulerPage />);
    expect(screen.getByText('Welcome to Report Scheduler')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<SchedulerPage />);
    expect(
      screen.getByText(
        /Create and manage report schedules to receive automated reports via email/i
      )
    ).toBeInTheDocument();
  });

  it('renders the SchedulerDownloadButton export toggle', () => {
    render(<SchedulerPage />);
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('triggers handleDownload when a download option is selected', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    render(<SchedulerPage />);

    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }));

    expect(consoleSpy).toHaveBeenCalledWith('Download format:', 'csv');
  });

  it('opens the scheduling wizard when Schedule export is clicked', () => {
    render(<SchedulerPage />);

    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Schedule export' }));

    // Wizard modal should be visible with pre-filled service value
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /wizard/i })).toBeInTheDocument();
  });
});
