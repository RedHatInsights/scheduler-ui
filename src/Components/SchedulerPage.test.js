import React from 'react';
import { render, screen } from '@testing-library/react';
import SchedulerPage from './SchedulerPage';

describe('SchedulerPage', () => {
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
    expect(screen.getByText(/Create and manage report schedules to receive automated reports via email/i)).toBeInTheDocument();
  });
});
