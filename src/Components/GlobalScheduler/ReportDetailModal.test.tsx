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
  it('displays Running status', () => {
    renderModal([{ id: '1', time: '2026-01-15T10:00:00Z', status: 'running' }]);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('displays Failed status', () => {
    renderModal([{ id: '2', time: '2026-01-15T10:00:00Z', status: 'failed' }]);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('displays Completed status', () => {
    renderModal([{ id: '3', time: '2026-01-15T10:00:00Z', status: 'completed' }]);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
