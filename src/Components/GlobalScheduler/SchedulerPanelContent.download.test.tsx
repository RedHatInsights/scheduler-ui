import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SchedulerPanelContent from './SchedulerPanelContent';
import * as schedulerApi from '../../api/scheduler/schedulerApi';

const mockBlob = new Blob(['test'], { type: 'application/zip' });
const mockObjectURL = 'blob:http://localhost/fake-uuid';

describe('SchedulerPanelContent — download', () => {
  const originalCreateObjectURL = window.URL.createObjectURL;
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    window.URL.createObjectURL = jest.fn().mockReturnValue(mockObjectURL);
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    window.URL.createObjectURL = originalCreateObjectURL;
    global.fetch = originalFetch;
  });

  it('shows error when run has no export_id', async () => {
    jest.spyOn(schedulerApi, 'getJobRun').mockResolvedValue({
      id: 'run-1',
      job_id: 'job-1',
      status: 'completed',
      start_time: '2026-09-17T12:00:00Z',
      end_time: '2026-09-17T12:05:00Z',
      result: null,
      result_type: 'export',
    });

    render(<SchedulerPanelContent />);

    const historyTab = screen.getByText('Reports history');
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getAllByText('RHEL usage report').length).toBeGreaterThan(0);
    });

    const downloadButtons = screen.getAllByRole('button', { name: /download/i });
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Download not available')).toBeInTheDocument();
      expect(screen.getByText('This report does not have an export ID.')).toBeInTheDocument();
    });
  });

  it('fetches blob and triggers download when export_id exists', async () => {
    jest.spyOn(schedulerApi, 'getJobRun').mockResolvedValue({
      id: 'run-1',
      job_id: 'job-1',
      status: 'completed',
      start_time: '2026-09-17T12:00:00Z',
      end_time: '2026-09-17T12:05:00Z',
      result: { export_id: 'exp-123' },
      result_type: 'export',
    });

    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    } as Response);

    render(<SchedulerPanelContent />);

    const historyTab = screen.getByText('Reports history');
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getAllByText('RHEL usage report').length).toBeGreaterThan(0);
    });

    const downloadButtons = screen.getAllByRole('button', { name: /download/i });
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/export/v1/exports/exp-123');
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    });
  });

  it('shows error toast when fetch fails', async () => {
    jest.spyOn(schedulerApi, 'getJobRun').mockResolvedValue({
      id: 'run-1',
      job_id: 'job-1',
      status: 'completed',
      start_time: '2026-09-17T12:00:00Z',
      end_time: '2026-09-17T12:05:00Z',
      result: { export_id: 'exp-123' },
      result_type: 'export',
    });

    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'not found' }),
    } as Response);

    render(<SchedulerPanelContent />);

    const historyTab = screen.getByText('Reports history');
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getAllByText('RHEL usage report').length).toBeGreaterThan(0);
    });

    const downloadButtons = screen.getAllByRole('button', { name: /download/i });
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Download failed')).toBeInTheDocument();
    });
  });
});
