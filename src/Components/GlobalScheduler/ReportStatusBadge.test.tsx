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

  it('renders only one status at a time', () => {
    render(<ReportStatusBadge status="Running" />);
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });
});
