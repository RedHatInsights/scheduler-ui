import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FrequencyStep from './FrequencyStep';

// Mock Intl.supportedValuesOf for consistent test timezone list
const mockTimezones = [
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'UTC',
];

Object.defineProperty(Intl, 'supportedValuesOf', {
  value: jest.fn((key: string) => {
    if (key === 'timeZone') return mockTimezones;
    return [];
  }),
  configurable: true,
});

describe('FrequencyStep', () => {
  const mockSetCronExpression = jest.fn();
  const mockSetTimezone = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders friendly mode by default', () => {
    render(
      <FrequencyStep
        cronExpression="0 9 * * 1"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    expect(screen.getByTestId('cron-mode-switch')).not.toBeChecked();
    expect(screen.getByText('Repeat')).toBeInTheDocument();
    expect(screen.getByText('Every')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
  });

  it('parses "At 09:00 AM, only on Monday" (0 9 * * 1) correctly', async () => {
    render(
      <FrequencyStep
        cronExpression="0 9 * * 1"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    await waitFor(() => {
      const repeatSelect = screen.getByTestId('repeat-select');
      expect(repeatSelect).toHaveTextContent('Weekly');
    });

    // Check Monday checkbox is selected
    const monCheckbox = screen.getByLabelText('Mon');
    expect(monCheckbox).toBeChecked();

    // Check other days are not selected
    expect(screen.getByLabelText('Sun')).not.toBeChecked();
    expect(screen.getByLabelText('Tue')).not.toBeChecked();
  });

  it('parses daily cron correctly', async () => {
    render(
      <FrequencyStep
        cronExpression="0 9 */2 * *"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    await waitFor(() => {
      const repeatSelect = screen.getByTestId('repeat-select');
      expect(repeatSelect).toHaveTextContent('Daily');
    });
  });

  it('parses monthly cron correctly', async () => {
    render(
      <FrequencyStep
        cronExpression="0 9 15 * *"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    await waitFor(() => {
      const repeatSelect = screen.getByTestId('repeat-select');
      expect(repeatSelect).toHaveTextContent('Monthly');
    });
  });

  it('switches to cron mode when toggle is clicked', () => {
    render(
      <FrequencyStep
        cronExpression="0 9 * * 1"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    const cronSwitch = screen.getByTestId('cron-mode-switch');
    fireEvent.click(cronSwitch);

    expect(screen.getByText('Minute')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0-59, *, -, /')).toBeInTheDocument();
  });

  it('shows day-of-week checkboxes only in Weekly mode', async () => {
    const { unmount } = render(
      <FrequencyStep
        cronExpression="0 9 */1 * *"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('repeat-select')).toHaveTextContent('Daily');
    });

    expect(screen.queryByText('On days')).not.toBeInTheDocument();

    unmount();

    render(
      <FrequencyStep
        cronExpression="0 9 * * 1,3"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('repeat-select')).toHaveTextContent('Weekly');
    });

    expect(screen.getByText('On days')).toBeInTheDocument();
  });

  it('builds cron expression from friendly fields', async () => {
    render(
      <FrequencyStep
        cronExpression="0 9 * * 1"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('repeat-select')).toHaveTextContent('Weekly');
    });

    // Toggle Wednesday
    const wedCheckbox = screen.getByLabelText('Wed');
    fireEvent.click(wedCheckbox);

    await waitFor(() => {
      expect(mockSetCronExpression).toHaveBeenCalledWith('0 9 * * 1,3');
    });
  });

  it('shows preview when valid configuration exists', async () => {
    render(
      <FrequencyStep
        cronExpression="0 9 * * 1"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/At 09:00 AM, only on Monday/i)).toBeInTheDocument();
    });
  });

  it('shows placeholder when Weekly has no days selected', async () => {
    render(
      <FrequencyStep
        cronExpression="0 9 * * 1"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('repeat-select')).toHaveTextContent('Weekly');
    });

    // Uncheck Monday to trigger empty state
    const monCheckbox = screen.getByLabelText('Mon');
    fireEvent.click(monCheckbox);

    await waitFor(() => {
      expect(screen.getByText('Configure your schedule above to see a preview.')).toBeInTheDocument();
    });
  });

  it('updates timezone when changed', () => {
    render(
      <FrequencyStep
        cronExpression="0 9 * * 1"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    const timezoneSelect = screen.getByTestId('timezone-select');
    fireEvent.click(timezoneSelect);

    // UTC option should be in the select list
    const utcOption = screen.getByRole('option', { name: /UTC/ });
    fireEvent.click(utcOption);

    expect(mockSetTimezone).toHaveBeenCalledWith('UTC');
  });

  it('shows user timezone as current', () => {
    // Mock user timezone
    jest.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'America/Los_Angeles',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <FrequencyStep
        cronExpression="0 9 * * 1"
        setCronExpression={mockSetCronExpression}
        timezone="America/Los_Angeles"
        setTimezone={mockSetTimezone}
      />
    );

    const timezoneSelect = screen.getByTestId('timezone-select');
    expect(timezoneSelect).toHaveTextContent('America/Los_Angeles (Current)');
  });

  it('validates invalid cron expression', async () => {
    render(
      <FrequencyStep
        cronExpression="0 25 * * 1"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    // Switch to cron mode
    const cronSwitch = screen.getByTestId('cron-mode-switch');
    fireEvent.click(cronSwitch);

    // Verify error message appears for invalid hour (25)
    await waitFor(() => {
      expect(screen.getByText(/Invalid cron expression/i)).toBeInTheDocument();
    });
  });

  it('allows timezone search/filter', async () => {
    render(
      <FrequencyStep
        cronExpression="0 9 * * 1"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    const timezoneSelect = screen.getByTestId('timezone-select');
    fireEvent.click(timezoneSelect);

    // Find search input
    const searchInput = screen.getByPlaceholderText('Search timezones...');
    fireEvent.change(searchInput, { target: { value: 'Tokyo' } });

    // Wait for filter to apply
    await waitFor(() => {
      // Tokyo should be visible
      expect(screen.getByText(/Asia\/Tokyo/)).toBeInTheDocument();
      // London should be filtered out
      expect(screen.queryByText(/Europe\/London/)).not.toBeInTheDocument();
    });
  });

  it('preserves state when switching between modes', async () => {
    render(
      <FrequencyStep
        cronExpression="0 9 * * 1,3"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('repeat-select')).toHaveTextContent('Weekly');
      expect(screen.getByLabelText('Mon')).toBeChecked();
      expect(screen.getByLabelText('Wed')).toBeChecked();
    });

    // Switch to cron mode
    const cronSwitch = screen.getByTestId('cron-mode-switch');
    fireEvent.click(cronSwitch);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('0-59, *, -, /')).toHaveValue('0');
    });

    // Switch back to friendly
    fireEvent.click(cronSwitch);

    // State should be preserved
    await waitFor(() => {
      expect(screen.getByLabelText('Mon')).toBeChecked();
      expect(screen.getByLabelText('Wed')).toBeChecked();
    });
  });
});
