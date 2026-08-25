import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SchedulerPanelContent from './SchedulerPanelContent';
import * as schedulerApi from '../../api/scheduler/schedulerApi';

const mockedListJobs = schedulerApi.listJobs as jest.Mock;

describe('SchedulerPanelContent', () => {
  describe('header', () => {
    it('renders the panel title', () => {
      render(<SchedulerPanelContent />);
      expect(screen.getByText('Global scheduler')).toBeInTheDocument();
    });

    it('renders the header menu dropdown', () => {
      render(<SchedulerPanelContent />);
      expect(screen.getByRole('button', { name: /global scheduler menu/i })).toBeInTheDocument();
    });
  });

  describe('header kebab', () => {
    it('re-queries the jobs list when "Refresh list" is clicked', async () => {
      render(<SchedulerPanelContent />);
      await screen.findByRole('button', { name: 'RHEL usage report' });

      mockedListJobs.mockClear();
      fireEvent.click(screen.getByRole('button', { name: /global scheduler menu/i }));
      fireEvent.click(screen.getByText('Refresh list'));

      await waitFor(() => expect(mockedListJobs).toHaveBeenCalled());
    });

    it('exports all matching rows as a CSV download', async () => {
      const originalCreate = window.URL.createObjectURL;
      const originalRevoke = window.URL.revokeObjectURL;
      const createObjectURL = jest.fn().mockReturnValue('blob:csv');
      window.URL.createObjectURL = createObjectURL;
      window.URL.revokeObjectURL = jest.fn();
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      try {
        render(<SchedulerPanelContent />);
        await screen.findByRole('button', { name: 'RHEL usage report' });

        fireEvent.click(screen.getByRole('button', { name: /global scheduler menu/i }));
        fireEvent.click(screen.getByText('Export'));

        // The export handler is async (it fetches every matching page), so wait.
        await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
        expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
        expect(clickSpy).toHaveBeenCalled();
        // revoke is deferred (setTimeout) — let it fire against the mock before we
        // restore the real globals, so no stray timer leaks into later tests.
        await waitFor(() => expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:csv'));
      } finally {
        clickSpy.mockRestore();
        window.URL.createObjectURL = originalCreate;
        window.URL.revokeObjectURL = originalRevoke;
      }
    });

    it('shows a danger alert when the export fails', async () => {
      render(<SchedulerPanelContent />);
      await screen.findByRole('button', { name: 'RHEL usage report' });

      // Fail the next listJobs call — the one exportReports issues.
      mockedListJobs.mockImplementationOnce(() => Promise.reject(new Error('network down')));

      fireEvent.click(screen.getByRole('button', { name: /global scheduler menu/i }));
      fireEvent.click(screen.getByText('Export'));

      expect(await screen.findByText('Failed to export reports')).toBeInTheDocument();
    });
  });

  describe('close button', () => {
    it('renders a close button when toggleDrawer is provided', () => {
      render(<SchedulerPanelContent toggleDrawer={jest.fn()} />);
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('calls toggleDrawer when the close button is clicked', () => {
      const toggleDrawer = jest.fn();
      render(<SchedulerPanelContent toggleDrawer={toggleDrawer} />);
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(toggleDrawer).toHaveBeenCalledTimes(1);
    });

    it('does not render a close button when toggleDrawer is omitted', () => {
      render(<SchedulerPanelContent />);
      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('renders the Scheduled reports tab', () => {
      render(<SchedulerPanelContent />);
      expect(screen.getByText('Scheduled reports')).toBeInTheDocument();
    });

    it('renders the Reports history tab', () => {
      render(<SchedulerPanelContent />);
      expect(screen.getByText('Reports history')).toBeInTheDocument();
    });
  });

  describe('report table', () => {
    it('renders the mock scheduled reports', async () => {
      render(<SchedulerPanelContent />);
      expect(await screen.findByRole('button', { name: 'RHEL usage report' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cost management report' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Scheduled report 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Scheduled report 3' })).toBeInTheDocument();
    });

    it('renders the Create new button', () => {
      render(<SchedulerPanelContent />);
      expect(screen.getByRole('button', { name: /create new/i })).toBeInTheDocument();
    });
  });

  describe('wizard', () => {
    it('wizard is closed by default', () => {
      render(<SchedulerPanelContent />);
      expect(screen.queryByText('Schedule recurring report')).not.toBeInTheDocument();
    });

    it('opens the wizard when Create new is clicked', () => {
      render(<SchedulerPanelContent />);
      fireEvent.click(screen.getByRole('button', { name: /create new/i }));
      expect(screen.getByText('Schedule recurring report')).toBeInTheDocument();
    });
  });

  describe('no drawer wrapper', () => {
    it('does not render a PF Drawer component', () => {
      const { container } = render(<SchedulerPanelContent />);
      expect(container.querySelector('.pf-v6-c-drawer')).not.toBeInTheDocument();
    });

    it('renders the scheduler-panel-content wrapper class', () => {
      const { container } = render(<SchedulerPanelContent />);
      expect(container.querySelector('.scheduler-panel-content')).toBeInTheDocument();
    });
  });
});
