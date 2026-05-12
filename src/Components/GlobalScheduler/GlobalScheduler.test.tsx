import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GlobalScheduler from './GlobalScheduler';

const renderScheduler = (props: Partial<React.ComponentProps<typeof GlobalScheduler>> = {}) =>
  render(
    <GlobalScheduler isOpen={false} onClose={jest.fn()} {...props}>
      <div>Page content</div>
    </GlobalScheduler>
  );

describe('GlobalScheduler', () => {
  describe('drawer visibility', () => {
    it('renders children regardless of isOpen', () => {
      renderScheduler({ isOpen: false });
      expect(screen.getByText('Page content')).toBeInTheDocument();
    });

    it('shows the panel title when open', () => {
      renderScheduler({ isOpen: true });
      expect(screen.getByText('Global scheduler')).toBeInTheDocument();
    });

    it('hides the panel when closed (hidden attribute set)', () => {
      const { container } = renderScheduler({ isOpen: false });
      const panel = container.querySelector('.pf-v6-c-drawer__panel');
      expect(panel).toHaveAttribute('hidden');
    });
  });

  describe('tabs', () => {
    it('renders the Scheduled reports tab', () => {
      renderScheduler({ isOpen: true });
      expect(screen.getByText('Scheduled reports')).toBeInTheDocument();
    });

    it('renders the Reports history tab', () => {
      renderScheduler({ isOpen: true });
      expect(screen.getByText('Reports history')).toBeInTheDocument();
    });
  });

  describe('close button', () => {
    it('calls onClose when the close button is clicked', () => {
      const onClose = jest.fn();
      renderScheduler({ isOpen: true, onClose });
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('initialParams', () => {
    it('auto-opens the wizard when opened with initialParams', () => {
      renderScheduler({
        isOpen: true,
        initialParams: { service: 'Cost Management', reportName: 'Monthly spend' },
      });
      // The wizard modal title should appear
      expect(screen.getByText('Schedule recurring report')).toBeInTheDocument();
    });

    it('does not auto-open the wizard when no initialParams are provided', () => {
      renderScheduler({ isOpen: true });
      expect(screen.queryByText('Schedule recurring report')).not.toBeInTheDocument();
    });

    it('does not auto-open the wizard when drawer is closed even with initialParams', () => {
      renderScheduler({
        isOpen: false,
        initialParams: { service: 'Cost Management' },
      });
      expect(screen.queryByText('Schedule recurring report')).not.toBeInTheDocument();
    });
  });

  describe('report table', () => {
    it('renders the mock scheduled reports', () => {
      renderScheduler({ isOpen: true });
      expect(screen.getByText('Scheduled report 1')).toBeInTheDocument();
      expect(screen.getByText('Scheduled report 2')).toBeInTheDocument();
      expect(screen.getByText('Scheduled report 3')).toBeInTheDocument();
    });

    it('renders the Create new button', () => {
      renderScheduler({ isOpen: true });
      expect(screen.getByRole('button', { name: /create new/i })).toBeInTheDocument();
    });

    it('opens the wizard when Create new is clicked', () => {
      renderScheduler({ isOpen: true });
      fireEvent.click(screen.getByRole('button', { name: /create new/i }));
      expect(screen.getByText('Schedule recurring report')).toBeInTheDocument();
    });
  });
});
