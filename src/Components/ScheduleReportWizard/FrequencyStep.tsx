import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  FormGroup,
  TextInput,
  Switch,
  Select,
  SelectList,
  SelectOption,
  SelectGroup,
  MenuToggle,
  NumberInput,
  TimePicker,
  HelperText,
  HelperTextItem,
  Checkbox,
  Title,
} from '@patternfly/react-core';
import cronstrue from 'cronstrue';

// Get user's current timezone from browser
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    console.warn('Failed to detect user timezone, falling back to UTC:', e);
    return 'UTC';
  }
};

// Get all IANA timezones grouped by region
const getTimezonesByRegion = (userTimezone: string): Map<string, string[]> => {
  const allTimezones = Intl.supportedValuesOf('timeZone');
  const grouped = new Map<string, string[]>();

  // Extract region prefix (e.g., "America" from "America/New_York")
  for (const tz of allTimezones) {
    const parts = tz.split('/');
    const region = parts.length > 1 ? parts[0] : 'Other';

    if (!grouped.has(region)) {
      grouped.set(region, []);
    }
    grouped.get(region)!.push(tz);
  }

  // Sort regions alphabetically, but put user's region first
  const userRegion = userTimezone.split('/')[0];
  const sortedRegions = Array.from(grouped.keys()).sort((a, b) => {
    if (a === userRegion) return -1;
    if (b === userRegion) return 1;
    return a.localeCompare(b);
  });

  const result = new Map<string, string[]>();
  for (const region of sortedRegions) {
    result.set(region, grouped.get(region)!.sort());
  }

  return result;
};

type RepeatType = 'Daily' | 'Weekly' | 'Monthly';

const WEEKDAYS = [
  { id: 'dow-sun', label: 'Sun', value: 0 },
  { id: 'dow-mon', label: 'Mon', value: 1 },
  { id: 'dow-tue', label: 'Tue', value: 2 },
  { id: 'dow-wed', label: 'Wed', value: 3 },
  { id: 'dow-thu', label: 'Thu', value: 4 },
  { id: 'dow-fri', label: 'Fri', value: 5 },
  { id: 'dow-sat', label: 'Sat', value: 6 },
];

interface FrequencyStepProps {
  cronExpression: string;
  setCronExpression: (value: string) => void;
  timezone: string;
  setTimezone: (value: string) => void;
  isCronMode: boolean;
  setIsCronMode: (value: boolean) => void;
}

function buildCronFromFriendly(
  repeat: RepeatType,
  every: number,
  time: string,
  daysOfWeek: number[]
): string {
  const [hour, minute] = time.split(':').map(Number);

  switch (repeat) {
    case 'Daily':
      return `${minute} ${hour} */${every} * *`;
    case 'Weekly':
      if (daysOfWeek.length === 0) return `${minute} ${hour} * * *`;
      return `${minute} ${hour} * * ${[...daysOfWeek].sort((a, b) => a - b).join(',')}`;
    case 'Monthly':
      return `${minute} ${hour} ${every} * *`;
    default:
      return '0 0 * * 0';
  }
}

interface ParsedCron {
  repeat: RepeatType;
  every: number;
  time: string;
  daysOfWeek: number[];
}

function parseCronToFriendly(expr: string): ParsedCron | null {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return null;

  const [minute, hour, day, month, dow] = fields;

  // Validate minute and hour are plain integers before constructing time
  const minuteNum = parseInt(minute, 10);
  const hourNum = parseInt(hour, 10);
  if (!Number.isInteger(minuteNum) || !Number.isInteger(hourNum) || minute !== String(minuteNum) || hour !== String(hourNum)) {
    return null;
  }

  const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  // Monthly: specific day, wildcards for month/dow
  if (day !== '*' && !day.includes('/') && !day.includes(',') && month === '*' && dow === '*') {
    return {
      repeat: 'Monthly',
      every: parseInt(day, 10),
      time,
      daysOfWeek: [],
    };
  }

  // Weekly: specific dow, wildcards for day/month
  if (dow !== '*' && day === '*' && month === '*') {
    const tokens = dow.split(',');
    // Validate all tokens are plain integers
    for (const token of tokens) {
      const trimmed = token.trim();
      const num = parseInt(trimmed, 10);
      if (!Number.isInteger(num) || trimmed !== String(num)) {
        return null; // Reject malformed DOW like "1MON"
      }
    }
    const days = tokens.map((d) => parseInt(d.trim(), 10));
    return {
      repeat: 'Weekly',
      every: 1,
      time,
      daysOfWeek: days,
    };
  }

  // Daily: day has step value
  if (day.includes('/')) {
    const match = day.match(/^\*\/(\d+)$/);
    if (match) {
      return {
        repeat: 'Daily',
        every: parseInt(match[1], 10),
        time,
        daysOfWeek: [],
      };
    }
  }

  // Default to Daily
  return {
    repeat: 'Daily',
    every: 1,
    time,
    daysOfWeek: [],
  };
}

const FIELD_RANGES: [number, number][] = [
  [0, 59],  // minute
  [0, 23],  // hour
  [1, 31],  // day of month
  [1, 12],  // month
  [0, 7],   // day of week
];

function isValidCronField(field: string, [min, max]: [number, number]): boolean {
  return field.split(',').every((part) => {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    const base = stepMatch ? stepMatch[1] : part;
    const step = stepMatch ? Number(stepMatch[2]) : null;

    if (step !== null && (step < 1 || step > max)) return false;
    if (base === '*') return true;

    const rangeMatch = base.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const [lo, hi] = [Number(rangeMatch[1]), Number(rangeMatch[2])];
      return lo >= min && hi <= max && lo <= hi;
    }

    const num = Number(base);
    return Number.isInteger(num) && num >= min && num <= max;
  });
}

function isValidCron(expr: string): boolean {
  const fields = expr.trim().split(/\s+/);
  return fields.length === 5 && fields.every((f, i) => isValidCronField(f, FIELD_RANGES[i]));
}

export const FrequencyStep: React.FC<FrequencyStepProps> = ({
  cronExpression,
  setCronExpression,
  timezone,
  setTimezone,
  isCronMode,
  setIsCronMode,
}) => {
  const userTimezone = useMemo(() => getUserTimezone(), []);
  const timezonesByRegion = useMemo(() => getTimezonesByRegion(userTimezone), [userTimezone]);

  // Parse initial cronExpression to friendly fields for default state
  const initialParsed = useMemo(() => parseCronToFriendly(cronExpression), []);

  const [repeat, setRepeat] = useState<RepeatType>(initialParsed?.repeat ?? 'Daily');
  const [isRepeatOpen, setIsRepeatOpen] = useState(false);
  const [every, setEvery] = useState(initialParsed?.every ?? 1);
  const [time, setTime] = useState(initialParsed?.time ?? '09:00');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initialParsed?.daysOfWeek ?? []);
  const [isTimezoneOpen, setIsTimezoneOpen] = useState(false);
  const [timezoneFilter, setTimezoneFilter] = useState('');
  const prevRepeatRef = useRef<RepeatType>(repeat);

  // Memoize timezone filtering
  const filteredTimezonesByRegion = useMemo(() => {
    if (!timezoneFilter) return timezonesByRegion;

    const lowerFilter = timezoneFilter.toLowerCase();
    const filtered = new Map<string, string[]>();

    for (const [region, zones] of timezonesByRegion.entries()) {
      const filteredZones = zones.filter(tz => tz.toLowerCase().includes(lowerFilter));
      if (filteredZones.length > 0) {
        filtered.set(region, filteredZones);
      }
    }

    return filtered;
  }, [timezonesByRegion, timezoneFilter]);

  // Cron field draft: preserve cleared field positions instead of rebuilding from whitespace-collapsed expression
  const [cronFieldsDraft, setCronFieldsDraft] = useState<string[]>(() => {
    const parts = cronExpression.split(/\s+/);
    return [
      parts[0] || '',
      parts[1] || '',
      parts[2] || '',
      parts[3] || '',
      parts[4] || '',
    ];
  });

  // Sync draft from cronExpression when expression changes externally
  const prevCronExpressionRef = useRef<string>(cronExpression);
  useEffect(() => {
    if (cronExpression !== prevCronExpressionRef.current) {
      const parts = cronExpression.split(/\s+/);
      setCronFieldsDraft([
        parts[0] || '',
        parts[1] || '',
        parts[2] || '',
        parts[3] || '',
        parts[4] || '',
      ]);
      prevCronExpressionRef.current = cronExpression;
    }
  }, [cronExpression]);

  const updateCronField = (index: number, value: string) => {
    const newDraft = [...cronFieldsDraft];
    newDraft[index] = value;
    setCronFieldsDraft(newDraft);
    const newExpression = newDraft.join(' ');
    setCronExpression(newExpression);
    prevCronExpressionRef.current = newExpression;
  };

  // Track last synced cron to detect external changes
  const lastSyncedCron = useRef<string>(cronExpression);

  // Clear daysOfWeek when switching from non-Weekly to Weekly
  useEffect(() => {
    if (repeat === 'Weekly' && prevRepeatRef.current !== 'Weekly') {
      setDaysOfWeek([]);
    }
    prevRepeatRef.current = repeat;
  }, [repeat]);

  // Parse cronExpression into friendly fields when it changes externally
  useEffect(() => {
    if (cronExpression !== lastSyncedCron.current) {
      const parsed = parseCronToFriendly(cronExpression);
      if (parsed) {
        setRepeat(parsed.repeat);
        setEvery(parsed.every);
        setTime(parsed.time);
        setDaysOfWeek(parsed.daysOfWeek);
      }
      lastSyncedCron.current = cronExpression;
    }
  }, [cronExpression]);

  // Sync friendly fields to cron when in friendly mode
  // Only update if the built cron differs from current cronExpression
  useEffect(() => {
    if (!isCronMode) {
      const newCron = buildCronFromFriendly(repeat, every, time, daysOfWeek);
      // Only update parent if different from current prop AND different from last synced
      // This prevents overwriting during initial parse
      if (newCron !== cronExpression && newCron !== lastSyncedCron.current) {
        setCronExpression(newCron);
        lastSyncedCron.current = newCron;
      } else if (newCron === cronExpression) {
        // Sync ref if they match (no-op case)
        lastSyncedCron.current = newCron;
      }
    }
  }, [isCronMode, repeat, every, time, daysOfWeek, cronExpression, setCronExpression]);

  const getCronDescription = (expr: string): string => {
    try {
      return cronstrue.toString(expr);
    } catch {
      return '';
    }
  };

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const cronDesc = getCronDescription(cronExpression);
  const hasValidPreview = !isCronMode && cronDesc && (repeat !== 'Weekly' || daysOfWeek.length > 0);

  return (
    <>
      <Title headingLevel="h3" size="lg" className="pf-v6-u-mb-lg">Frequency</Title>
      
      <FormGroup>
        <Switch
          id="cron-mode-switch"
          label="Cron expression"
          isChecked={isCronMode}
          onChange={(_event, checked) => setIsCronMode(checked)}
          data-testid="cron-mode-switch"
        />
      </FormGroup>

      {isCronMode ? (
        <>
          <FormGroup label="Recurrence setting" isRequired fieldId="cron-expression" className="pf-v6-u-mt-md">
            <div className="pf-v6-u-display-flex pf-v6-u-gap-sm">
              <FormGroup label="Minute" isRequired fieldId="cron-minute" className="pf-v6-u-flex-1 pf-v6-u-mr-md">
                <TextInput
                  isRequired
                  type="text"
                  id="cron-minute"
                  placeholder="0-59, *, -, /"
                  value={cronFieldsDraft[0]}
                  onChange={(_event, value) => updateCronField(0, value)}
                  data-testid="cron-minute"
                />
              </FormGroup>

              <FormGroup label="Hour" isRequired fieldId="cron-hour" className="pf-v6-u-flex-1 pf-v6-u-mr-md">
                <TextInput
                  isRequired
                  type="text"
                  id="cron-hour"
                  placeholder="0-23, *, -, /"
                  value={cronFieldsDraft[1]}
                  onChange={(_event, value) => updateCronField(1, value)}
                  data-testid="cron-hour"
                />
              </FormGroup>

              <FormGroup label="Day of Month" isRequired fieldId="cron-day" className="pf-v6-u-flex-1 pf-v6-u-mr-md">
                <TextInput
                  isRequired
                  type="text"
                  id="cron-day"
                  placeholder="1-31, *, -, /"
                  value={cronFieldsDraft[2]}
                  onChange={(_event, value) => updateCronField(2, value)}
                  data-testid="cron-day"
                />
              </FormGroup>

              <FormGroup label="Month" isRequired fieldId="cron-month" className="pf-v6-u-flex-1 pf-v6-u-mr-md">
                <TextInput
                  isRequired
                  type="text"
                  id="cron-month"
                  placeholder="1-12, Jan-Dec, *..."
                  value={cronFieldsDraft[3]}
                  onChange={(_event, value) => updateCronField(3, value)}
                  data-testid="cron-month"
                />
              </FormGroup>

              <FormGroup label="Day of the Week" isRequired fieldId="cron-dow" className="pf-v6-u-flex-1 pf-v6-u-mr-md">
                <TextInput
                  isRequired
                  type="text"
                  id="cron-dow"
                  placeholder="0-6, Sun-Sat, *..."
                  value={cronFieldsDraft[4]}
                  onChange={(_event, value) => updateCronField(4, value)}
                  data-testid="cron-dow"
                />
              </FormGroup>
            </div>
          </FormGroup>

          <HelperText className="pf-v6-u-mt-sm">
            <HelperTextItem variant={isValidCron(cronExpression) ? 'default' : 'error'}>
              {!cronExpression.trim()
                ? 'Enter values for all 5 fields'
                : !isValidCron(cronExpression)
                ? 'Invalid cron expression'
                : 'Valid cron expression'}
            </HelperTextItem>
          </HelperText>

          {isValidCron(cronExpression) && cronExpression.trim() && (
            <Alert
              variant="info"
              isInline
              title={getCronDescription(cronExpression)}
              className="pf-v6-u-mt-md"
              data-testid="cron-mode-preview"
            />
          )}
        </>
      ) : (
        <>
          <FormGroup label="Repeat" isRequired fieldId="repeat-select" className="pf-v6-u-mt-md">
            <Select
              id="repeat-select"
              isOpen={isRepeatOpen}
              selected={repeat}
              onSelect={(_event, selection) => {
                const newRepeat = selection as RepeatType;
                setRepeat(newRepeat);
                // Clear default Sunday when user selects Weekly
                if (newRepeat === 'Weekly' && daysOfWeek.length === 1 && daysOfWeek[0] === 0) {
                  setDaysOfWeek([]);
                }
                setIsRepeatOpen(false);
              }}
              onOpenChange={(open) => setIsRepeatOpen(open)}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsRepeatOpen(!isRepeatOpen)}
                  isExpanded={isRepeatOpen}
                  data-testid="repeat-select"
                >
                  {repeat}
                </MenuToggle>
              )}
            >
              <SelectList>
                <SelectOption value="Daily">Daily</SelectOption>
                <SelectOption value="Weekly">Weekly</SelectOption>
                <SelectOption value="Monthly">Monthly</SelectOption>
              </SelectList>
            </Select>
          </FormGroup>

          <div className="pf-v6-u-display-flex pf-v6-u-gap-md pf-v6-u-mt-md">
            <FormGroup label="Every" isRequired fieldId="every-input" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <NumberInput
                  value={every}
                  min={1}
                  max={repeat === 'Daily' ? 31 : repeat === 'Weekly' ? 7 : 31}
                  onMinus={() => setEvery(Math.max(1, every - 1))}
                  onPlus={() => setEvery(every + 1)}
                  onChange={(event) => {
                    const value = Number((event.target as HTMLInputElement).value);
                    if (!isNaN(value) && value >= 1) setEvery(value);
                  }}
                  inputName="every"
                  inputAriaLabel="Every"
                  minusBtnAriaLabel="Minus"
                  plusBtnAriaLabel="Plus"
                  widthChars={4}
                />
                <span className="pf-v6-u-pl-sm">
                  {repeat === 'Daily' ? 'day(s)' : repeat === 'Weekly' ? 'week(s)' : 'day of month'}
                </span>
              </div>
            </FormGroup>

            <FormGroup label="Time" isRequired fieldId="time-input" style={{ flex: 1 }}>
              <TimePicker
                time={time}
                onChange={(_event, newTime) => setTime(newTime)}
                is24Hour
                placeholder="HH:MM"
                id="time-input"
                aria-label="Time"
              />
            </FormGroup>
          </div>

          {repeat === 'Weekly' && (
            <FormGroup label="On days" isRequired fieldId="on-days-input" className="pf-v6-u-mt-md">
              <div className="pf-v6-u-display-flex pf-v6-u-gap-md pf-v6-u-flex-wrap">
                {WEEKDAYS.map((day) => (
                  <Checkbox
                    key={day.id}
                    id={day.id}
                    className="pf-v6-u-pr-md"
                    label={day.label}
                    isChecked={daysOfWeek.includes(day.value)}
                    onChange={() => toggleDayOfWeek(day.value)}
                  />
                ))}
              </div>
            </FormGroup>
          )}
        </>
      )}

      {hasValidPreview ? (
        <Alert variant="info" isInline title={cronDesc} className="pf-v6-u-mt-md" data-testid="cron-preview" />
      ) : !isCronMode ? (
        <Alert variant="info" isInline title="Configure your schedule above to see a preview." className="pf-v6-u-mt-md" data-testid="cron-preview-placeholder" />
      ) : null}

      <FormGroup label="Time Zone" isRequired fieldId="timezone-select" className="pf-v6-u-mt-md">
        <Select
          id="timezone-select"
          isOpen={isTimezoneOpen}
          selected={timezone}
          onSelect={(_event, selection) => {
            setTimezone(selection as string);
            setTimezoneFilter('');
            setIsTimezoneOpen(false);
          }}
          onOpenChange={(open) => {
            setIsTimezoneOpen(open);
            if (!open) setTimezoneFilter('');
          }}
          isScrollable
          maxMenuHeight="20vh"
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              onClick={() => setIsTimezoneOpen(!isTimezoneOpen)}
              isExpanded={isTimezoneOpen}
              data-testid="timezone-select"
            >
              {timezone}{timezone === userTimezone ? ' (Current)' : ''}
            </MenuToggle>
          )}
        >
          <SelectList>
            <div className="pf-v6-u-p-sm">
              <TextInput
                type="search"
                placeholder="Search timezones..."
                value={timezoneFilter}
                onChange={(_event, value) => setTimezoneFilter(value)}
                aria-label="Filter timezones"
              />
            </div>
            {Array.from(filteredTimezonesByRegion.entries()).map(([region, zones]) => (
              <SelectGroup key={region} label={region}>
                {zones.map((tz) => (
                  <SelectOption key={tz} value={tz}>
                    {tz}{tz === userTimezone ? ' (Current)' : ''}
                  </SelectOption>
                ))}
              </SelectGroup>
            ))}
          </SelectList>
        </Select>
      </FormGroup>
    </>
  );
};

export default FrequencyStep;
