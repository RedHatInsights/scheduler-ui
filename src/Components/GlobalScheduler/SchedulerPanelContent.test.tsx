import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SchedulerPanelContent from './SchedulerPanelContent';

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
      await waitFor(() => {
        expect(screen.getByText('RHEL usage report')).toBeInTheDocument();
        expect(screen.getByText('Cost management report')).toBeInTheDocument();
        expect(screen.getByText('Scheduled report 2')).toBeInTheDocument();
        expect(screen.getByText('Scheduled report 3')).toBeInTheDocument();
      });
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
