import { renderHook } from '@testing-library/react';
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

  it('setHistoryFilterDate resets page back to 1', async () => {
    const { result } = renderHook(() => useSchedulerState());

    await act(async () => result.current.onHistorySetPage(null, 3));
    expect(result.current.historyPage).toBe(3);

    await act(async () => result.current.setHistoryFilterDate('2026-09-17'));
    expect(result.current.historyPage).toBe(1);
    expect(result.current.historyFilterDate).toBe('2026-09-17');
  });

  it('filteredHistory filters by name (case-insensitive)', async () => {
    const { result } = renderHook(() => useSchedulerState());

    await act(async () => result.current.setHistoryFilterName('rhel'));
    expect(result.current.filteredHistory).toHaveLength(2);
    expect(result.current.filteredHistory.every((r) => r.reportName.toLowerCase().includes('rhel'))).toBe(true);
  });

  it('filteredHistory filters by date', async () => {
    const { result } = renderHook(() => useSchedulerState());

    await act(async () => result.current.setHistoryFilterDate('2026-09-17'));
    expect(result.current.filteredHistory).toHaveLength(2);
    expect(result.current.filteredHistory.every((r) => r.runDate === '2026-09-17')).toBe(true);
  });

  it('filteredHistory applies both name and date filters', async () => {
    const { result } = renderHook(() => useSchedulerState());

    await act(async () => {
      result.current.setHistoryFilterName('RHEL');
      result.current.setHistoryFilterDate('2026-09-17');
    });
    expect(result.current.filteredHistory).toHaveLength(1);
    expect(result.current.filteredHistory[0].reportName).toBe('RHEL usage report');
    expect(result.current.filteredHistory[0].runDate).toBe('2026-09-17');
  });

  it('filteredHistory returns all entries when no filters set', () => {
    const { result } = renderHook(() => useSchedulerState());
    expect(result.current.filteredHistory).toHaveLength(5);
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
