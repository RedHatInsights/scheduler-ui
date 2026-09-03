import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DownloadPage, { __resetDownloadGuard } from './DownloadPage';
import { getJob, getJobRun } from '../../api/scheduler/schedulerApi';

const mockGetJobRun = getJobRun as jest.Mock;
const mockGetJob = getJob as jest.Mock;

const mockBlob = new Blob(['test'], { type: 'application/zip' });
const mockObjectURL = 'blob:http://localhost/fake-uuid';

const completedRun = {
  id: 'run-1',
  job_id: 'job-1',
  job_name: 'RHEL usage report',
  status: 'completed',
  start_time: '2026-09-17T12:00:00Z',
  end_time: '2026-09-17T12:05:00Z',
  result: { export_id: 'exp-123' },
};

const job = {
  id: 'job-1',
  name: 'RHEL usage report',
  schedule: '0 0 * * 0',
  type: 'export',
  status: 'scheduled',
  payload: { format: 'csv' },
};

function renderAt(path: string, routePath = '/download/:jobId/:runId') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={<DownloadPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DownloadPage', () => {
  const originalCreateObjectURL = window.URL.createObjectURL;
  const originalRevokeObjectURL = window.URL.revokeObjectURL;
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetDownloadGuard(); // module-level auto-download guard persists across tests
    // jsdom implements neither of these object-URL helpers.
    window.URL.createObjectURL = jest.fn().mockReturnValue(mockObjectURL);
    window.URL.revokeObjectURL = jest.fn();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    // Sensible defaults; individual tests override the run.
    mockGetJob.mockResolvedValue(null);
    mockGetJobRun.mockResolvedValue(completedRun);
  });

  afterEach(() => {
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    global.fetch = originalFetch;
  });

  it('fetches the run then auto-downloads its export, showing run info', async () => {
    mockGetJob.mockResolvedValue(job);
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    } as Response);

    renderAt('/download/job-1/run-1');

    await waitFor(() => {
      expect(mockGetJobRun).toHaveBeenCalledWith('job-1', 'run-1');
      expect(mockFetch).toHaveBeenCalledWith('/api/export/v1/exports/exp-123');
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    });
    expect(await screen.findByText('Your download has started')).toBeInTheDocument();
    // Run summary is rendered.
    expect(screen.getByText('RHEL usage report')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('re-triggers only the download (not the run fetch) via the fallback link', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    } as Response);

    renderAt('/download/job-1/run-1');

    const link = await screen.findByRole('button', { name: /download again/i });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockGetJobRun).toHaveBeenCalledTimes(1);

    fireEvent.click(link);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
    // Re-download reuses the already-fetched run.
    expect(mockGetJobRun).toHaveBeenCalledTimes(1);
  });

  it('does not re-download the same link on a remount (shell unmount/remount)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    } as Response);

    const { unmount } = renderAt('/download/job-1/run-1');
    expect(await screen.findByText('Your download has started')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // insights-chrome tears down and re-mounts this landing route; the export
    // must not download a second time.
    unmount();
    renderAt('/download/job-1/run-1');

    expect(await screen.findByText('Your download has started')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('shows a failed state with the run error message and skips the download', async () => {
    mockGetJobRun.mockResolvedValue({
      ...completedRun,
      status: 'failed',
      result: null,
      error_message: 'exporter blew up',
    });

    renderAt('/download/job-1/run-1');

    expect(await screen.findByText('Export failed')).toBeInTheDocument();
    expect(screen.getByText('exporter blew up')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows a pending state while the run is still generating', async () => {
    mockGetJobRun.mockResolvedValue({
      ...completedRun,
      status: 'running',
      end_time: null,
      result: null,
    });

    renderAt('/download/job-1/run-1');

    expect(await screen.findByText('Your export is still being generated')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows "download not available" when a completed run has no export id', async () => {
    mockGetJobRun.mockResolvedValue({ ...completedRun, result: null });

    renderAt('/download/job-1/run-1');

    expect(await screen.findByText('Download not available')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows "export not available" when the run fetch 404s', async () => {
    mockGetJobRun.mockRejectedValue({ response: { status: 404 } });

    renderAt('/download/job-1/run-1');

    expect(await screen.findByText('Export not available')).toBeInTheDocument();
    // 404 is terminal — no retry offered.
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('shows a generic error with retry on a non-404 run-fetch failure', async () => {
    mockGetJobRun.mockRejectedValue(new Error('network down'));

    renderAt('/download/job-1/run-1');

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('network down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows an invalid-link error when the run id is missing', async () => {
    renderAt('/download/job-1', '/download/:jobId');

    expect(await screen.findByText('Invalid download link')).toBeInTheDocument();
    expect(mockGetJobRun).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
