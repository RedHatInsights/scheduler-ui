import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReportStatusBadge from './ReportStatusBadge';

describe('ReportStatusBadge', () => {
  it('renders "Running" label', () => {
    render(<ReportStatusBadge status="Running" />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders "Failed" label', () => {
    render(<ReportStatusBadge status="Failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders "Completed" label', () => {
    render(<ReportStatusBadge status="Completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders "Scheduled" label', () => {
    render(<ReportStatusBadge status="Scheduled" />);
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('renders "Paused" label', () => {
    render(<ReportStatusBadge status="Paused" />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('applies the running modifier class for the spin animation', () => {
    render(<ReportStatusBadge status="Running" />);
    expect(screen.getByText('Running')).toHaveClass('scheduler-ui-status--running');
  });

  it('applies the failed modifier class', () => {
    render(<ReportStatusBadge status="Failed" />);
    expect(screen.getByText('Failed')).toHaveClass('scheduler-ui-status--failed');
  });

  it('applies the completed modifier class', () => {
    render(<ReportStatusBadge status="Completed" />);
    expect(screen.getByText('Completed')).toHaveClass('scheduler-ui-status--completed');
  });

  it('applies the scheduled modifier class', () => {
    render(<ReportStatusBadge status="Scheduled" />);
    expect(screen.getByText('Scheduled')).toHaveClass('scheduler-ui-status--scheduled');
  });

  it('applies the paused modifier class', () => {
    render(<ReportStatusBadge status="Paused" />);
    expect(screen.getByText('Paused')).toHaveClass('scheduler-ui-status--paused');
  });

  it('does not include pf-v6-u-gap-sm utility class on any variant', () => {
    const statuses = ['Running', 'Failed', 'Completed', 'Scheduled', 'Paused'] as const;
    for (const status of statuses) {
      const { unmount } = render(<ReportStatusBadge status={status} />);
      expect(screen.getByText(status)).not.toHaveClass('pf-v6-u-gap-sm');
      unmount();
    }
  });

  it('renders only one status at a time', () => {
    render(<ReportStatusBadge status="Running" />);
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });
});
