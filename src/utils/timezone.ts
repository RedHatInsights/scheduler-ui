/**
 * Get user's timezone from browser Intl API.
 * Falls back to 'UTC' if detection fails.
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    console.warn('Failed to detect user timezone, falling back to UTC:', e);
    return 'UTC';
  }
};
