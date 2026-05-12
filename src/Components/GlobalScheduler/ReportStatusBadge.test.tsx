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

  it('applies the running modifier class for the spin animation', () => {
    const { container } = render(<ReportStatusBadge status="Running" />);
    expect(container.querySelector('.scheduler-ui-status--running')).toBeInTheDocument();
  });

  it('applies the failed modifier class', () => {
    const { container } = render(<ReportStatusBadge status="Failed" />);
    expect(container.querySelector('.scheduler-ui-status--failed')).toBeInTheDocument();
  });

  it('applies the completed modifier class', () => {
    const { container } = render(<ReportStatusBadge status="Completed" />);
    expect(container.querySelector('.scheduler-ui-status--completed')).toBeInTheDocument();
  });

  it('renders only one status at a time', () => {
    render(<ReportStatusBadge status="Running" />);
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });
});
