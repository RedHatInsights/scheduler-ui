import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SchedulerPanelContent from './SchedulerPanelContent';
import * as schedulerApi from '../../api/scheduler/schedulerApi';
import * as exportMetadata from '../../api/metadata/exportMetadata';

// The real export-metadata module hydrates a module-level cache from a network
// fetch that never resolves usefully under jsdom, so the URN<->id transforms
// return empty. Mock it and drive the lookups deterministically (inventory /
// export-systems, matching the seeded jobs + wizard stub).
jest.mock('../../api/metadata/exportMetadata');

const APP_URN = 'urn:redhat:application:inventory';
const RES_URN = 'urn:redhat:application:inventory:export:systems';

// Stub the wizard so the save (create/update) path is reachable without walking
// all five wizard steps. It exposes the props the panel cares about.
jest.mock('../ScheduleReportWizard/ScheduleReportWizard', () => ({
  __esModule: true,
  default: ({ isOpen, isEditing, onSave, onClose }: {
    isOpen: boolean;
    isEditing: boolean;
    onSave: (data: unknown) => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="wizard-stub">
        <span>editing:{String(isEditing)}</span>
        <button
          onClick={() =>
            onSave({
              reportName: 'Stub report',
              fileType: 'CSV',
              jobs: [{ service: 'inventory', task: 'export-systems' }],
              cronExpression: '0 9 * * 1',
              timezone: 'UTC',
            })
          }
        >
          stub-save
        </button>
        <button onClick={onClose}>stub-close</button>
      </div>
    ) : null,
}));

// A job whose payload sources resolve against the mocked export metadata
// (config/jest.setup.js -> inventory / export-systems).
const validJob = (o: Record<string, unknown> = {}) => ({
  id: 'job-1',
  name: 'RHEL usage report',
  schedule: '0 9 * * 1',
  timezone: 'UTC',
  type: 'export',
  status: 'scheduled',
  payload: {
    format: 'csv',
    sources: [
      {
        application: 'urn:redhat:application:inventory',
        resource: 'urn:redhat:application:inventory:export:systems',
      },
    ],
  },
  ...o,
});

const openRowKebab = (rowIndex = 0) => {
  fireEvent.click(screen.getAllByRole('button', { name: /kebab toggle/i })[rowIndex]);
};

const clickKebabItem = (label: string) => {
  fireEvent.click(screen.getByText(label));
};

// Wait for metadata + the first report row to render.
const waitForList = () => screen.findByRole('button', { name: 'RHEL usage report' });

describe('SchedulerPanelContent — row actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (exportMetadata.getApplicationURN as jest.Mock).mockImplementation((s) => (s === 'inventory' ? APP_URN : ''));
    (exportMetadata.getResourceURN as jest.Mock).mockImplementation((s, t) =>
      s === 'inventory' && t === 'export-systems' ? RES_URN : ''
    );
    (exportMetadata.getVariantFilters as jest.Mock).mockReturnValue(undefined);
    (exportMetadata.findVariantIdFromFilters as jest.Mock).mockReturnValue('');
    (exportMetadata.findServiceIdFromApplicationURN as jest.Mock).mockImplementation((u) =>
      u === APP_URN ? 'inventory' : ''
    );
    (exportMetadata.findTaskIdFromResourceURN as jest.Mock).mockImplementation((u) =>
      u === RES_URN ? 'export-systems' : ''
    );
    (exportMetadata.getServiceDisplayName as jest.Mock).mockImplementation((s) => (s === 'inventory' ? 'Inventory' : s));
    (exportMetadata.getTaskDisplayName as jest.Mock).mockReturnValue('Export Systems');
  });

  describe('view report', () => {
    it('opens the detail modal with the run history', async () => {
      (schedulerApi.getJobRuns as jest.Mock).mockResolvedValueOnce([
        { id: 'run-1', job_id: 'job-1', status: 'completed', start_time: '2026-09-17T12:00:00Z' },
      ]);

      render(<SchedulerPanelContent />);
      fireEvent.click(await waitForList());

      expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument();
      expect(await screen.findByText('Completed')).toBeInTheDocument();
    });

    it('shows an error toast when fetching runs fails', async () => {
      (schedulerApi.getJobRuns as jest.Mock).mockRejectedValueOnce(new Error('boom'));

      render(<SchedulerPanelContent />);
      fireEvent.click(await waitForList());

      expect(await screen.findByText('Failed to load report runs')).toBeInTheDocument();
    });
  });

  describe('edit + update report', () => {
    it('opens the wizard in editing mode and updates on save', async () => {
      (schedulerApi.getJob as jest.Mock).mockResolvedValueOnce(validJob());
      (schedulerApi.patchJob as jest.Mock).mockResolvedValueOnce(validJob({ name: 'Stub report' }));

      render(<SchedulerPanelContent />);
      await waitForList();
      openRowKebab();
      clickKebabItem('Edit');

      const wizard = await screen.findByTestId('wizard-stub');
      expect(within(wizard).getByText('editing:true')).toBeInTheDocument();

      fireEvent.click(within(wizard).getByText('stub-save'));

      expect(await screen.findByText('Report updated successfully.')).toBeInTheDocument();
      expect(schedulerApi.patchJob).toHaveBeenCalled();
    });

    it('shows an error toast when the job details cannot be fetched', async () => {
      (schedulerApi.getJob as jest.Mock).mockRejectedValueOnce(new Error('offline'));

      render(<SchedulerPanelContent />);
      await waitForList();
      openRowKebab();
      clickKebabItem('Edit');

      expect(await screen.findByText('Failed to load report details')).toBeInTheDocument();
    });

    it('shows an error toast when a source no longer resolves', async () => {
      (schedulerApi.getJob as jest.Mock).mockResolvedValueOnce(
        validJob({
          payload: {
            format: 'csv',
            sources: [{ application: 'urn:redhat:application:bogus', resource: 'urn:redhat:bogus' }],
          },
        })
      );

      render(<SchedulerPanelContent />);
      await waitForList();
      openRowKebab();
      clickKebabItem('Edit');

      expect(await screen.findByText('Failed to load report details')).toBeInTheDocument();
      expect(screen.queryByTestId('wizard-stub')).not.toBeInTheDocument();
    });
  });

  describe('pause / resume report', () => {
    it('pauses a scheduled report', async () => {
      (schedulerApi.pauseJob as jest.Mock).mockResolvedValueOnce(validJob({ status: 'paused' }));

      render(<SchedulerPanelContent />);
      await waitForList();
      openRowKebab();
      clickKebabItem('Pause');

      expect(await screen.findByText('Report paused successfully.')).toBeInTheDocument();
      expect(schedulerApi.pauseJob).toHaveBeenCalledWith('job-1');
    });

    it('shows an error toast when pausing fails', async () => {
      (schedulerApi.pauseJob as jest.Mock).mockRejectedValueOnce(new Error('nope'));

      render(<SchedulerPanelContent />);
      await waitForList();
      openRowKebab();
      clickKebabItem('Pause');

      expect(await screen.findByText('Failed to pause report')).toBeInTheDocument();
    });

    it('resumes a paused report', async () => {
      // Once, not permanent: clearAllMocks keeps implementations, so a permanent
      // override here would bleed the paused fixture into later tests.
      (schedulerApi.listJobs as jest.Mock).mockResolvedValueOnce({ data: [validJob({ status: 'paused' })], total: 1 });
      (schedulerApi.resumeJob as jest.Mock).mockResolvedValueOnce(validJob({ status: 'scheduled' }));

      render(<SchedulerPanelContent />);
      await waitForList();
      openRowKebab();
      clickKebabItem('Resume');

      expect(await screen.findByText('Report resumed successfully.')).toBeInTheDocument();
      expect(schedulerApi.resumeJob).toHaveBeenCalledWith('job-1');
    });
  });

  describe('delete report', () => {
    it('deletes a report after confirmation', async () => {
      (schedulerApi.deleteJob as jest.Mock).mockResolvedValueOnce(undefined);

      render(<SchedulerPanelContent />);
      await waitForList();
      openRowKebab();
      clickKebabItem('Delete');

      fireEvent.click(await screen.findByTestId('delete-confirm-button'));

      expect(await screen.findByText('Recurring report deleted successfully.')).toBeInTheDocument();
      expect(schedulerApi.deleteJob).toHaveBeenCalledWith('job-1');
    });

    it('closes the modal without deleting when cancelled', async () => {
      render(<SchedulerPanelContent />);
      await waitForList();
      openRowKebab();
      clickKebabItem('Delete');

      await screen.findByTestId('delete-confirm-button');
      // Scope Cancel to the confirmation dialog so we don't hit another control.
      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(screen.queryByTestId('delete-confirm-button')).not.toBeInTheDocument());
      expect(schedulerApi.deleteJob).not.toHaveBeenCalled();
    });

    it('shows an error toast when deletion fails', async () => {
      (schedulerApi.deleteJob as jest.Mock).mockRejectedValueOnce(new Error('boom'));

      render(<SchedulerPanelContent />);
      await waitForList();
      openRowKebab();
      clickKebabItem('Delete');
      fireEvent.click(await screen.findByTestId('delete-confirm-button'));

      expect(await screen.findByText('Failed to delete report')).toBeInTheDocument();
    });
  });

  describe('create report', () => {
    it('creates a report from the wizard', async () => {
      (schedulerApi.createJob as jest.Mock).mockResolvedValueOnce(validJob());

      render(<SchedulerPanelContent />);
      await waitForList();
      fireEvent.click(screen.getByRole('button', { name: /create new/i }));

      const wizard = await screen.findByTestId('wizard-stub');
      expect(within(wizard).getByText('editing:false')).toBeInTheDocument();
      fireEvent.click(within(wizard).getByText('stub-save'));

      expect(await screen.findByText('Report scheduled successfully.')).toBeInTheDocument();
      expect(schedulerApi.createJob).toHaveBeenCalled();
    });

    it('shows an error toast when creation fails', async () => {
      (schedulerApi.createJob as jest.Mock).mockRejectedValueOnce(new Error('server error'));

      render(<SchedulerPanelContent />);
      await waitForList();
      fireEvent.click(screen.getByRole('button', { name: /create new/i }));

      fireEvent.click(within(await screen.findByTestId('wizard-stub')).getByText('stub-save'));

      expect(await screen.findByText('Failed to create report')).toBeInTheDocument();
    });
  });

  describe('alert dismissal', () => {
    it('removes a toast when its close button is clicked', async () => {
      (schedulerApi.deleteJob as jest.Mock).mockResolvedValueOnce(undefined);

      render(<SchedulerPanelContent />);
      await waitForList();
      openRowKebab();
      clickKebabItem('Delete');
      fireEvent.click(await screen.findByTestId('delete-confirm-button'));

      await screen.findByText('Recurring report deleted successfully.');
      // The success toast is the only alert present; close it via its role/name.
      fireEvent.click(screen.getByRole('button', { name: /close .*alert/i }));

      await waitFor(() =>
        expect(screen.queryByText('Recurring report deleted successfully.')).not.toBeInTheDocument()
      );
    });
  });
});
