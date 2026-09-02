import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { getJob, getJobRun } from '../../api/scheduler/schedulerApi';

const mockToggleDrawerContent = jest.fn();
let mockChrome: unknown = { drawerActions: { toggleDrawerContent: mockToggleDrawerContent } };

jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  __esModule: true,
  default: () => mockChrome,
}));

// Imported after the mock so DownloadPage picks up the mocked useChrome.
import DownloadPage, { __resetDownloadGuard } from './DownloadPage';
import { __resetOpenSchedulerDrawer } from '../../hooks/useOpenSchedulerDrawer';

const mockGetJobRun = getJobRun as jest.Mock;
const mockGetJob = getJob as jest.Mock;

const mockBlob = new Blob(['test'], { type: 'application/zip' });

const completedRun = {
  id: 'run-1',
  job_id: 'job-1',
  job_name: 'RHEL usage report',
  status: 'completed',
  start_time: '2026-09-17T12:00:00Z',
  end_time: '2026-09-17T12:05:00Z',
  result: { export_id: 'exp-123' },
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/download/:jobId/:runId" element={<DownloadPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DownloadPage — scheduler drawer', () => {
  const originalCreateObjectURL = window.URL.createObjectURL;
  const originalRevokeObjectURL = window.URL.revokeObjectURL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetDownloadGuard(); // module-level auto-download guard persists across tests
    __resetOpenSchedulerDrawer(); // module-level once-guard persists across tests
    mockChrome = { drawerActions: { toggleDrawerContent: mockToggleDrawerContent } };
    window.URL.createObjectURL = jest.fn().mockReturnValue('blob:http://localhost/fake');
    window.URL.revokeObjectURL = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    } as Response);
    mockGetJob.mockResolvedValue(null);
    mockGetJobRun.mockResolvedValue(completedRun);
  });

  afterEach(() => {
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    global.fetch = originalFetch;
  });

  it('opens the scheduler drawer once with the expected scope/module', async () => {
    renderAt('/download/job-1/run-1');

    await waitFor(() => {
      expect(mockToggleDrawerContent).toHaveBeenCalledWith({
        scope: 'schedulerUi',
        module: './SchedulerPanelContent',
      });
    });
    expect(mockToggleDrawerContent).toHaveBeenCalledTimes(1);
  });

  it('does not throw when chrome drawer actions are unavailable (no fallback)', async () => {
    mockChrome = {}; // outside chrome runtime — no drawerActions

    renderAt('/download/job-1/run-1');

    // Download still completes; drawer open is a silent no-op.
    expect(await screen.findByText('Your download has started')).toBeInTheDocument();
    expect(mockToggleDrawerContent).not.toHaveBeenCalled();
  });
});
