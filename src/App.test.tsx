import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Incomplete /download links (missing runId, or both params) must render
// DownloadPage's invalid-link state rather than falling through to
// SchedulerLanding. The invalid-link path returns before any scheduler API
// call, so the global mocks in config/jest.setup.js are sufficient.
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('App routing', () => {
  it('shows the invalid-link state for /download with no params', async () => {
    renderAt('/download');
    expect(
      await screen.findByRole('heading', { name: 'Invalid download link' })
    ).toBeInTheDocument();
  });

  it('shows the invalid-link state for /download/:jobId with no runId', async () => {
    renderAt('/download/job-1');
    expect(
      await screen.findByRole('heading', { name: 'Invalid download link' })
    ).toBeInTheDocument();
  });

  it('renders the scheduler landing for unrelated paths', async () => {
    renderAt('/');
    expect(
      await screen.findByRole('heading', { name: 'Your scheduled reports' })
    ).toBeInTheDocument();
  });
});
