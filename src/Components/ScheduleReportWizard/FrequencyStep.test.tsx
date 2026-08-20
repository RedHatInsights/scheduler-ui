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

// Wrapper to test isCronMode toggle behavior
const FrequencyStepWithToggle = ({
  initialIsCronMode = false,
  initialCronExpression = '0 9 * * 1',
  initialTimezone = 'America/New_York',
}: {
  initialIsCronMode?: boolean;
  initialCronExpression?: string;
  initialTimezone?: string;
}) => {
  const [isCronMode, setIsCronMode] = React.useState(initialIsCronMode);
  const [cronExpression, setCronExpression] = React.useState(initialCronExpression);
  const [timezone, setTimezone] = React.useState(initialTimezone);

  return (
    <FrequencyStep
      cronExpression={cronExpression}
      setCronExpression={setCronExpression}
      timezone={timezone}
      setTimezone={setTimezone}
      isCronMode={isCronMode}
      setIsCronMode={setIsCronMode}
    />
  );
};

describe('FrequencyStep', () => {
  const mockSetCronExpression = jest.fn();
  const mockSetTimezone = jest.fn();
  const mockSetIsCronMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetIsCronMode.mockClear();
  });

  it('renders friendly mode by default', () => {
    render(
      <FrequencyStep
        cronExpression="0 9 */1 * *"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
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
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
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
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
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
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
      />
    );

    await waitFor(() => {
      const repeatSelect = screen.getByTestId('repeat-select');
      expect(repeatSelect).toHaveTextContent('Monthly');
    });
  });

  it('switches to cron mode when toggle is clicked', () => {
    render(
      <FrequencyStepWithToggle
        initialCronExpression="0 9 * * 1"
        initialTimezone="America/New_York"
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
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
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
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
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
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
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
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
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
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
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

  it('updates timezone when changed', async () => {
    render(
      <FrequencyStep
        cronExpression="0 9 * * 1"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
      />
    );

    const timezoneSelect = screen.getByTestId('timezone-select');
    await waitFor(() => {
      fireEvent.click(timezoneSelect);
    });

    // UTC option should be in the select list
    const utcOption = screen.getByRole('option', { name: /UTC/ });
    await waitFor(() => {
      fireEvent.click(utcOption);
    });

    expect(mockSetTimezone).toHaveBeenCalledWith('UTC');
  });

  it('shows user timezone as current', () => {
    // Mock user timezone
    const realOptions = new Intl.DateTimeFormat().resolvedOptions();
    jest.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      ...realOptions,
      timeZone: 'America/Los_Angeles',
    });

    render(
      <FrequencyStep
        cronExpression="0 9 * * 1"
        setCronExpression={mockSetCronExpression}
        timezone="America/Los_Angeles"
        setTimezone={mockSetTimezone}
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
      />
    );

    const timezoneSelect = screen.getByTestId('timezone-select');
    expect(timezoneSelect).toHaveTextContent('America/Los_Angeles (Current)');
  });

  it('validates invalid cron expression', async () => {
    render(
      <FrequencyStepWithToggle
        initialIsCronMode={true}
        initialCronExpression="0 25 * * 1"
        initialTimezone="America/New_York"
      />
    );

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
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
      />
    );

    const timezoneSelect = screen.getByTestId('timezone-select');
    await waitFor(() => {
      fireEvent.click(timezoneSelect);
    });

    // Find search input
    const searchInput = screen.getByPlaceholderText('Search timezones...');
    await waitFor(() => {
      fireEvent.change(searchInput, { target: { value: 'Tokyo' } });
    });

    // Wait for filter to apply
    await waitFor(() => {
      // Tokyo should be visible
      expect(screen.getByRole('option', { name: /Asia\/Tokyo/ })).toBeInTheDocument();
    });

    // London should be filtered out
    await waitFor(() => {
      expect(screen.queryByRole('option', { name: /Europe\/London/ })).not.toBeInTheDocument();
    });
  });

  it('preserves state when switching between modes', async () => {
    render(
      <FrequencyStepWithToggle
        initialCronExpression="0 9 * * 1,3"
        initialTimezone="America/New_York"
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

  it('preserves cleared field positions in cron mode', async () => {
    render(
      <FrequencyStepWithToggle
        initialIsCronMode={true}
        initialCronExpression="0 9 * * 1"
        initialTimezone="America/New_York"
      />
    );

    // Wait for cron mode to render
    await waitFor(() => {
      expect(screen.getByPlaceholderText('0-59, *, -, /')).toBeInTheDocument();
    });

    // Verify initial state
    expect(screen.getByPlaceholderText('0-59, *, -, /')).toHaveValue('0');
    expect(screen.getByPlaceholderText('0-23, *, -, /')).toHaveValue('9');
    expect(screen.getByPlaceholderText('1-31, *, -, /')).toHaveValue('*');

    // Clear minute field
    const minuteInput = screen.getByPlaceholderText('0-59, *, -, /');
    fireEvent.change(minuteInput, { target: { value: '' } });

    // Verify minute cleared but other fields unchanged
    await waitFor(() => {
      expect(minuteInput).toHaveValue('');
      expect(screen.getByPlaceholderText('0-23, *, -, /')).toHaveValue('9');
      expect(screen.getByPlaceholderText('1-31, *, -, /')).toHaveValue('*');
    });

    // Clear hour field
    const hourInput = screen.getByPlaceholderText('0-23, *, -, /');
    fireEvent.change(hourInput, { target: { value: '' } });

    // Verify hour cleared, minute still empty, other fields unchanged
    await waitFor(() => {
      expect(minuteInput).toHaveValue('');
      expect(hourInput).toHaveValue('');
      expect(screen.getByPlaceholderText('1-31, *, -, /')).toHaveValue('*');
    });
  });

  it('rejects cron with non-numeric minute/hour fields', () => {
    render(
      <FrequencyStep
        cronExpression="*/15 9 * * 1"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
      />
    );

    // parseCronToFriendly should return null for */15 minute
    // Component should fall back to defaults rather than parsing invalid time
    const repeatSelect = screen.getByTestId('repeat-select');
    expect(repeatSelect).toHaveTextContent('Daily');
  });

  it('rejects cron with malformed DOW tokens', () => {
    render(
      <FrequencyStep
        cronExpression="0 9 * * 1MON"
        setCronExpression={mockSetCronExpression}
        timezone="America/New_York"
        setTimezone={mockSetTimezone}
        isCronMode={false}
        setIsCronMode={mockSetIsCronMode}
      />
    );

    // parseCronToFriendly should return null for "1MON" (parseInt would accept it as 1)
    // Component should fall back to defaults
    const repeatSelect = screen.getByTestId('repeat-select');
    expect(repeatSelect).toHaveTextContent('Daily');
  });
});
