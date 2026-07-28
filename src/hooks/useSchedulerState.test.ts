import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useSchedulerState } from './useSchedulerState';

describe('useSchedulerState — report history', () => {
  it('initialises history page to 1', () => {
    const { result } = renderHook(() => useSchedulerState());
    expect(result.current.historyPage).toBe(1);
  });

  it('setHistoryFilterName resets page back to 1', async () => {
    const { result } = renderHook(() => useSchedulerState());

    // advance to page 2
    await act(async () => result.current.onHistorySetPage(null, 2));
    expect(result.current.historyPage).toBe(2);

    // setting a name filter resets page
    await act(async () => result.current.setHistoryFilterName('RHEL'));
    expect(result.current.historyPage).toBe(1);
    expect(result.current.historyFilterName).toBe('RHEL');
  });

  it('setHistoryFilterTimeRange resets page back to 1', async () => {
    const { result } = renderHook(() => useSchedulerState());

    await act(async () => result.current.onHistorySetPage(null, 3));
    expect(result.current.historyPage).toBe(3);

    await act(async () => result.current.setHistoryFilterTimeRange('24'));
    expect(result.current.historyPage).toBe(1);
    expect(result.current.historyFilterTimeRange).toBe('24');
  });

  it('filteredHistory filters by name (case-insensitive)', async () => {
    const { result } = renderHook(() => useSchedulerState());

    await waitFor(() => expect(result.current.reportHistory).toHaveLength(5));

    await act(async () => result.current.setHistoryFilterName('rhel'));
    expect(result.current.filteredHistory).toHaveLength(2);
    expect(result.current.filteredHistory.every((r) => r.reportName.toLowerCase().includes('rhel'))).toBe(true);
  });

  it('filteredHistory filters by time range', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-17T12:30:00Z').getTime());

    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reportHistory).toHaveLength(5));

    // 1-hour filter: cutoff 11:30Z, keeps run-1 and run-2 (both at 12:00Z)
    await act(async () => result.current.setHistoryFilterTimeRange('1'));
    expect(result.current.filteredHistory).toHaveLength(2);

    // Clearing returns all entries
    await act(async () => result.current.setHistoryFilterTimeRange(null));
    expect(result.current.filteredHistory).toHaveLength(5);

    jest.restoreAllMocks();
  });

  it('filteredHistory filters by before-date', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reportHistory).toHaveLength(5));

    // before:2026-09-11 keeps run-3 (09-11), run-4 (09-10), run-5 (09-04)
    await act(async () => result.current.setHistoryFilterTimeRange('before:2026-09-11'));
    expect(result.current.filteredHistory).toHaveLength(3);
  });

  it('filteredHistory applies both name and time range filters', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-17T12:30:00Z').getTime());

    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reportHistory).toHaveLength(5));

    // 'RHEL' matches run-1 and run-5; 1-hour filter keeps only run-1
    await act(async () => {
      result.current.setHistoryFilterName('RHEL');
      result.current.setHistoryFilterTimeRange('1');
    });
    expect(result.current.filteredHistory).toHaveLength(1);
    expect(result.current.filteredHistory[0].reportName).toBe('RHEL usage report');

    jest.restoreAllMocks();
  });

  it('filteredHistory returns all entries when no filters set', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.filteredHistory).toHaveLength(5));
  });

  it('clearing name filter returns unfiltered results', async () => {
    const { result } = renderHook(() => useSchedulerState());

    await act(async () => result.current.setHistoryFilterName('Cost'));
    expect(result.current.filteredHistory).toHaveLength(1);

    await act(async () => result.current.setHistoryFilterName(null));
    expect(result.current.filteredHistory).toHaveLength(5);
  });

  it('onHistoryPerPageSelect resets page to 1', async () => {
    const { result } = renderHook(() => useSchedulerState());

    await act(async () => result.current.onHistorySetPage(null, 2));
    expect(result.current.historyPage).toBe(2);

    await act(async () => result.current.onHistoryPerPageSelect(null, 5));
    expect(result.current.historyPage).toBe(1);
    expect(result.current.historyPerPage).toBe(5);
  });
});
