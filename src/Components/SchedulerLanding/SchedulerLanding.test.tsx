import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockToggleDrawerContent = jest.fn();
let mockChrome: unknown = { drawerActions: { toggleDrawerContent: mockToggleDrawerContent } };

jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  __esModule: true,
  default: () => mockChrome,
}));

// Imported after the mock so the drawer hook picks up the mocked useChrome.
import SchedulerLanding from './SchedulerLanding';
import { __resetOpenSchedulerDrawer } from '../../hooks/useOpenSchedulerDrawer';

describe('SchedulerLanding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetOpenSchedulerDrawer(); // module-level once-guard persists across tests
    mockChrome = { drawerActions: { toggleDrawerContent: mockToggleDrawerContent } };
  });

  it('renders the empty state and opens the scheduler drawer once', async () => {
    render(<SchedulerLanding />);

    expect(await screen.findByText('Your scheduled reports')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockToggleDrawerContent).toHaveBeenCalledWith({
        scope: 'schedulerUi',
        module: './SchedulerPanelContent',
      });
    });
    expect(mockToggleDrawerContent).toHaveBeenCalledTimes(1);
  });

  it('renders without throwing when chrome drawer actions are unavailable', async () => {
    mockChrome = {}; // outside chrome runtime — no drawerActions

    render(<SchedulerLanding />);

    expect(await screen.findByText('Your scheduled reports')).toBeInTheDocument();
    expect(mockToggleDrawerContent).not.toHaveBeenCalled();
  });
});
