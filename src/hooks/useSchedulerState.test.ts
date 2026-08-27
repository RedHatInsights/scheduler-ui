import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useSchedulerState } from './useSchedulerState';
import * as schedulerApi from '../api/scheduler/schedulerApi';

const mockedListJobs = schedulerApi.listJobs as jest.Mock;

describe('useSchedulerState — scheduled reports pagination/filtering', () => {
  afterEach(() => jest.clearAllMocks());

  it('fetches the first page with offset/limit once metadata is ready', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reports).toHaveLength(4));
    expect(mockedListJobs).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0, limit: 10, name: undefined, status: undefined })
    );
  });

  it('exposes the total count from the API meta', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.total).toBe(4));
  });

  it('requests a new offset when the page changes', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reports).toHaveLength(4));

    mockedListJobs.mockClear();
    await act(async () => result.current.onSetPage(null, 3));
    await waitFor(() =>
      expect(mockedListJobs).toHaveBeenCalledWith(expect.objectContaining({ offset: 20, limit: 10 }))
    );
  });

  it('maps a UI status filter to the lowercase API status and resets to page 1', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reports).toHaveLength(4));

    await act(async () => result.current.onSetPage(null, 2));
    mockedListJobs.mockClear();
    await act(async () => result.current.setFilterStatus('Paused'));

    await waitFor(() =>
      expect(mockedListJobs).toHaveBeenCalledWith(expect.objectContaining({ status: 'paused', offset: 0 }))
    );
    expect(result.current.page).toBe(1);
  });

  it('debounces the name filter into the server request', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reports).toHaveLength(4));

    mockedListJobs.mockClear();
    await act(async () => result.current.setFilterName('cost'));
    await waitFor(() =>
      expect(mockedListJobs).toHaveBeenCalledWith(expect.objectContaining({ name: 'cost' }))
    );
  });

  // Minimal API job shape that apiJobToUIReport can transform (mirrors jest.setup).
  const mockJob = (name: string) => ({
    id: name,
    name,
    schedule: '0 0 * * 0',
    type: 'export',
    payload: {
      sources: [{ application: 'urn:redhat:application:inventory', resource: 'urn:redhat:application:inventory:export:systems' }],
      format: 'csv',
    },
    status: 'scheduled',
    last_run_at: '2026-09-17T00:00:00Z',
    next_run_at: '2026-09-24T00:00:00Z',
  });

  it('ignores a stale fetch response that resolves after a newer one', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reports).toHaveLength(4));

    // Page-2 request stays pending; page-3 request resolves immediately. The
    // page-2 (stale) response resolving later must not clobber the page-3 rows.
    let resolvePage2!: (value: unknown) => void;
    const page2Promise = new Promise((resolve) => { resolvePage2 = resolve; });
    mockedListJobs
      .mockImplementationOnce(() => page2Promise)
      .mockImplementationOnce(() => Promise.resolve({ data: [mockJob('PAGE3')], total: 40 }));

    await act(async () => { result.current.onSetPage(null, 2); });
    await act(async () => { result.current.onSetPage(null, 3); });

    await waitFor(() => expect(result.current.reports[0]?.name).toBe('PAGE3'));

    await act(async () => {
      resolvePage2({ data: [mockJob('PAGE2')], total: 40 });
      await page2Promise;
    });

    // Stale page-2 response was dropped — page-3 rows remain.
    expect(result.current.reports[0]?.name).toBe('PAGE3');
  });

  it('exportReports walks every page until the total is reached', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reports).toHaveLength(4));

    const pageA = Array.from({ length: 100 }, (_, i) => mockJob(`a${i}`));
    const pageB = [mockJob('b0'), mockJob('b1')];
    mockedListJobs
      .mockImplementationOnce(() => Promise.resolve({ data: pageA, total: 102 }))
      .mockImplementationOnce(() => Promise.resolve({ data: pageB, total: 102 }));

    let rows: unknown[] = [];
    await act(async () => { rows = await result.current.exportReports(); });

    expect(rows).toHaveLength(102);
    expect(mockedListJobs).toHaveBeenCalledWith(expect.objectContaining({ offset: 0, limit: 100 }));
    expect(mockedListJobs).toHaveBeenCalledWith(expect.objectContaining({ offset: 100, limit: 100 }));
  });

  it('refetches the current page after deleting a report', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reports).toHaveLength(4));

    mockedListJobs.mockClear();
    await act(async () => { await result.current.deleteReport('job-1'); });

    expect(schedulerApi.deleteJob).toHaveBeenCalledWith('job-1');
    // Multiple rows on page 1 → refetch the page (parity with createReport).
    await waitFor(() =>
      expect(mockedListJobs).toHaveBeenCalledWith(expect.objectContaining({ offset: 0, limit: 10 }))
    );
  });

  it('refetches with the active status filter after pausing a report', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reports).toHaveLength(4));

    (schedulerApi.pauseJob as jest.Mock).mockResolvedValue(mockJob('job-1'));
    await act(async () => result.current.setFilterStatus('Scheduled'));
    await waitFor(() =>
      expect(mockedListJobs).toHaveBeenCalledWith(expect.objectContaining({ status: 'scheduled' }))
    );

    mockedListJobs.mockClear();
    await act(async () => { await result.current.togglePauseReport('job-1', 'Scheduled'); });

    expect(schedulerApi.pauseJob).toHaveBeenCalledWith('job-1');
    await waitFor(() =>
      expect(mockedListJobs).toHaveBeenCalledWith(expect.objectContaining({ status: 'scheduled', offset: 0 }))
    );
  });

  it('refetches after resuming a paused report', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reports).toHaveLength(4));

    (schedulerApi.resumeJob as jest.Mock).mockResolvedValue(mockJob('job-1'));
    mockedListJobs.mockClear();
    await act(async () => { await result.current.togglePauseReport('job-1', 'Paused'); });

    expect(schedulerApi.resumeJob).toHaveBeenCalledWith('job-1');
    await waitFor(() =>
      expect(mockedListJobs).toHaveBeenCalledWith(expect.objectContaining({ offset: 0, limit: 10 }))
    );
  });

  it('omits sortBy on the initial fetch so the server default applies', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reports).toHaveLength(4));
    expect(mockedListJobs).toHaveBeenCalledWith(expect.objectContaining({ sortBy: undefined }));
  });

  it('sends sortBy as "field:direction" and resets to page 1 when a column is sorted', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reports).toHaveLength(4));

    await act(async () => result.current.onSetPage(null, 2));
    mockedListJobs.mockClear();
    await act(async () => result.current.setSort('name', 'desc'));

    await waitFor(() =>
      expect(mockedListJobs).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'name:desc', offset: 0 }))
    );
    expect(result.current.page).toBe(1);
    expect(result.current.sortField).toBe('name');
    expect(result.current.sortDirection).toBe('desc');
  });
});

describe('useSchedulerState — report history', () => {
  afterEach(() => jest.restoreAllMocks());

  it('initialises history page to 1', () => {
    const { result } = renderHook(() => useSchedulerState());
    expect(result.current.historyPage).toBe(1);
  });

  it('names history entries from the run job_name (no separate jobs fetch)', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reportHistory).toHaveLength(5));

    // Names come straight off each run's job_name (jest.setup mock).
    expect(result.current.reportHistory.map((r) => r.reportName)).toEqual([
      'RHEL usage report',
      'Cost management report',
      'Scheduled report 2',
      'Scheduled report 3',
      'RHEL usage report',
    ]);
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
  });

  it('filteredHistory filters by before-date', async () => {
    const { result } = renderHook(() => useSchedulerState());
    await waitFor(() => expect(result.current.reportHistory).toHaveLength(5));

    // before:2026-09-11 keeps run-4 (09-10), run-5 (09-04) — excludes 09-11
    await act(async () => result.current.setHistoryFilterTimeRange('before:2026-09-11'));
    expect(result.current.filteredHistory).toHaveLength(2);
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
