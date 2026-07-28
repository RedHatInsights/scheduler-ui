import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReportDetailModal, { RunInstance } from './ReportDetailModal';

const renderModal = (runs: RunInstance[]) =>
  render(
    <ReportDetailModal
      isOpen={true}
      onClose={jest.fn()}
      reportName="Test Report"
      runs={runs}
      isLoading={false}
    />
  );

describe('ReportDetailModal status rendering', () => {
  it('displays Running status with running modifier class', () => {
    renderModal([{ id: '1', time: '2026-01-15T10:00:00Z', status: 'running' }]);
    const label = screen.getByText('Running');
    expect(label).toBeInTheDocument();
    expect(label.closest('.scheduler-ui-status')).toHaveClass('scheduler-ui-status--running');
  });

  it('displays Failed status with failed modifier class', () => {
    renderModal([{ id: '2', time: '2026-01-15T10:00:00Z', status: 'failed' }]);
    const label = screen.getByText('Failed');
    expect(label).toBeInTheDocument();
    expect(label.closest('.scheduler-ui-status')).toHaveClass('scheduler-ui-status--failed');
  });

  it('displays Completed status with completed modifier class', () => {
    renderModal([{ id: '3', time: '2026-01-15T10:00:00Z', status: 'completed' }]);
    const label = screen.getByText('Completed');
    expect(label).toBeInTheDocument();
    expect(label.closest('.scheduler-ui-status')).toHaveClass('scheduler-ui-status--completed');
  });
});
