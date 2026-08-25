import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { listJobs, deleteJob as apiDeleteJob, createJob, patchJob, pauseJob, resumeJob, listAllRuns } from '../api/scheduler/schedulerApi';
import { apiJobToUIReport, apiRunToUIHistory, uiReportDataToApiRequest } from '../api/scheduler/transforms';
import { fetchExportMetadata } from '../api/metadata/exportMetadata';
import type { JobStatus } from '../api/scheduler/types';

export interface ReportHistoryEntry {
  id: string;
  reportName: string;
  runDate: string;
  runDateTime: string;
  jobId: string;
  runId: string;
  status: 'running' | 'failed' | 'completed';
  errorMessage?: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  datetime: string;
  nextDatetime: string | null;
  status: 'Running' | 'Failed' | 'Completed' | 'Scheduled' | 'Paused';
  services: string[];
  task: string;
  frequency: string;
  fileType: string;
  timezone?: string;
}

export type ReportData =
  | {
      reportName: string;
      fileType: string;
      jobs: Array<{ service: string; task: string }>;
      cronExpression?: string;
      timezone?: string;
    }
  | {
      reportName: string;
      fileType: string;
      service: string;
      task: string;
      cronExpression?: string;
      timezone?: string;
    };

/**
 * Map a UI status label to the API `JobStatus` (lowercase). The API has no
 * `completed` job status, so "Completed" is not offered as a server-side filter.
 * Unknown labels (incl. "all") map to `undefined` — no status filter — rather
 * than being cast blindly into a bad query param.
 */
const UI_STATUS_TO_API: Record<string, JobStatus> = {
  Scheduled: 'scheduled',
  Running: 'running',
  Failed: 'failed',
  Paused: 'paused',
};

function uiStatusToApi(status: string | null): JobStatus | undefined {
  return status ? UI_STATUS_TO_API[status] : undefined;
}

export function useSchedulerState() {
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
  const [filterName, setFilterName] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [isFilterStatusOpen, setIsFilterStatusOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [expandedReportIds, setExpandedReportIds] = useState<string[]>([]);

  // API state
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [total, setTotal] = useState(0);
  const [reportHistory, setReportHistory] = useState<ReportHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Metadata must load before jobs are transformed (service names come from it).
  const [metadataReady, setMetadataReady] = useState(false);

  // Debounced name filter — SearchInput fires per keystroke; debounce the value
  // that feeds the server request so we don't issue a request per character.
  const [debouncedFilterName, setDebouncedFilterName] = useState<string | null>(null);

  const jobNameMapRef = useRef<Map<string, string>>(new Map());
  // Monotonic request counter — only the latest fetch may commit its result,
  // so out-of-order responses from rapid paging/filtering can't clobber state.
  const fetchSeqRef = useRef(0);

  const refreshHistory = useCallback(async () => {
    try {
      const runs = await listAllRuns();
      const historyEntries = runs.map((run) =>
        apiRunToUIHistory(run, run.job_id, jobNameMapRef.current.get(run.job_id) || 'Unknown')
      );
      setReportHistory(historyEntries);
    } catch (err) {
      console.error('Failed to fetch report history:', err);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const { data, total: totalCount } = await listJobs({
        offset: (page - 1) * perPage,
        limit: perPage,
        name: debouncedFilterName || undefined,
        status: uiStatusToApi(filterStatus),
      });
      // A newer fetch started while this one was in flight — drop the stale result.
      if (seq !== fetchSeqRef.current) return;
      // Keep the name map current so the history tab can resolve report names.
      data.forEach((job) => jobNameMapRef.current.set(job.id, job.name));
      setReports(data.map((job) => apiJobToUIReport(job)));
      setTotal(totalCount);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      if (seq === fetchSeqRef.current) setIsLoading(false);
    }
  }, [page, perPage, debouncedFilterName, filterStatus]);

  // Debounce the name filter feeding the server request.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedFilterName(filterName), 300);
    return () => clearTimeout(id);
  }, [filterName]);

  // One-time bootstrap: export metadata + history runs + seed the job-name map.
  useEffect(() => {
    async function bootstrap() {
      const [metadataResult, seedResult, runsResult] = await Promise.allSettled([
        fetchExportMetadata(),
        // Seed the job-name map for the history tab. Best-effort, capped at the
        // API max of 100 jobs; history rows for jobs beyond that show "Unknown".
        listJobs({ limit: 100 }),
        listAllRuns(),
      ]);

      if (seedResult.status === 'fulfilled') {
        seedResult.value.data.forEach((job) => jobNameMapRef.current.set(job.id, job.name));
      }

      if (runsResult.status === 'fulfilled') {
        setReportHistory(
          runsResult.value.map((run) =>
            apiRunToUIHistory(run, run.job_id, jobNameMapRef.current.get(run.job_id) || 'Unknown')
          )
        );
      }

      const errors = [metadataResult, seedResult, runsResult]
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => (r.reason instanceof Error ? r.reason.message : 'Failed to fetch data'));
      if (errors.length > 0) {
        setError(errors.join('; '));
      }

      // Allow the paginated jobs fetch to proceed even if metadata failed
      // (service names just render as "Unknown" in that case).
      setMetadataReady(true);
    }

    bootstrap();
  }, []);

  // Fetch the current page of jobs whenever paging/filters change (after metadata).
  useEffect(() => {
    if (!metadataReady) return;
    fetchReports();
  }, [metadataReady, fetchReports]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchReports(), refreshHistory()]);
  }, [fetchReports, refreshHistory]);

  // Fetch every job matching the active filters (across all pages) for CSV export.
  // Walks the API in `limit`-sized pages (API max is 100) until the reported total
  // is reached or a short page signals the end.
  const exportReports = useCallback(async (): Promise<ScheduledReport[]> => {
    const LIMIT = 100;
    const collected: ScheduledReport[] = [];
    let offset = 0;
    // Loop until we've gathered `total` rows or hit a short page. `total` is read
    // from the first response; the short-page check guards against it going stale.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, total: totalCount } = await listJobs({
        offset,
        limit: LIMIT,
        name: debouncedFilterName || undefined,
        status: uiStatusToApi(filterStatus),
      });
      collected.push(...data.map((job) => apiJobToUIReport(job)));
      offset += LIMIT;
      if (data.length < LIMIT || collected.length >= totalCount) break;
    }
    return collected;
  }, [debouncedFilterName, filterStatus]);

  const onSetPage = (_e: unknown, newPage: number) => setPage(newPage);

  const onPerPageSelect = (_e: unknown, newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const toggleRowExpanded = (id: string, willBeExpanded: boolean) =>
    setExpandedReportIds((prev) =>
      willBeExpanded ? [...new Set([...prev, id])] : prev.filter((i) => i !== id)
    );

  const deleteReport = async (id: string) => {
    try {
      await apiDeleteJob(id);
      setExpandedReportIds((prev) => prev.filter((i) => i !== id));
      // If we just removed the only row on a page past the first, step back so the
      // user isn't stranded on an empty page; otherwise refetch the current page so
      // rows shift up and `total` stays accurate (parity with createReport).
      if (reports.length === 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        await fetchReports();
      }
      refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete report');
      throw err;
    }
  };

  const createReport = async (data: ReportData) => {
    try {
      setError(null);

      const request = uiReportDataToApiRequest({
        ...data,
        cronExpression: data.cronExpression || '0 0 * * 0',
      });

      const newJob = await createJob(request);

      jobNameMapRef.current.set(newJob.id, newJob.name);
      // Refetch so the new job lands on the correct page and `total` stays accurate.
      await fetchReports();
      refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create report');
      throw err;
    }
  };

  const updateReport = async (id: string, data: ReportData) => {
    try {
      setError(null);

      const request = uiReportDataToApiRequest({
        ...data,
        cronExpression: data.cronExpression || '0 0 * * 0',
      });

      const updatedJob = await patchJob(id, request);
      const uiReport = apiJobToUIReport(updatedJob);

      jobNameMapRef.current.set(updatedJob.id, updatedJob.name);
      setReports((prev) => prev.map((r) => (r.id === id ? uiReport : r)));
      refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update report');
      throw err;
    }
  };

  const togglePauseReport = async (id: string, currentStatus: string) => {
    try {
      setError(null);
      const updatedJob = currentStatus === 'Paused'
        ? await resumeJob(id)
        : await pauseJob(id);
      const uiReport = apiJobToUIReport(updatedJob);
      jobNameMapRef.current.set(updatedJob.id, updatedJob.name);
      setReports((prev) => prev.map((r) => (r.id === id ? uiReport : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update report status');
      throw err;
    }
  };

  const setFilterNameAndReset = (value: string | null) => {
    setFilterName(value);
    setPage(1);
  };

  const setFilterStatusAndReset = (value: string | null) => {
    setFilterStatus(value);
    setPage(1);
  };

  // ── Report history tab state ──
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(10);
  const [historyFilterName, setHistoryFilterName] = useState<string | null>(null);
  const [historyFilterTimeRange, setHistoryFilterTimeRange] = useState<string | null>(null);

  const onHistorySetPage = (_e: unknown, newPage: number) => setHistoryPage(newPage);
  const onHistoryPerPageSelect = (_e: unknown, newPerPage: number) => {
    setHistoryPerPage(newPerPage);
    setHistoryPage(1);
  };

  const setHistoryFilterNameAndReset = (value: string | null) => {
    setHistoryFilterName(value);
    setHistoryPage(1);
  };

  const setHistoryFilterTimeRangeAndReset = (value: string | null) => {
    setHistoryFilterTimeRange(value);
    setHistoryPage(1);
  };

  const filteredHistory = useMemo(() => {
    let result = [...reportHistory];
    if (historyFilterName) {
      result = result.filter((r) =>
        r.reportName.toLowerCase().includes(historyFilterName.toLowerCase())
      );
    }
    if (historyFilterTimeRange) {
      if (historyFilterTimeRange.startsWith('before:')) {
        const dateStr = historyFilterTimeRange.slice(7);
        result = result.filter((r) => r.runDate < dateStr);
      } else {
        const hoursAgo = parseInt(historyFilterTimeRange, 10);
        const cutoffMs = Date.now() - hoursAgo * 60 * 60 * 1000;
        result = result.filter((r) => new Date(r.runDateTime).getTime() >= cutoffMs);
      }
    }
    return result;
  }, [reportHistory, historyFilterName, historyFilterTimeRange]);

  return {
    // tabs
    activeTabKey,
    setActiveTabKey,
    // scheduled reports filters
    filterName,
    setFilterName: setFilterNameAndReset,
    filterStatus,
    setFilterStatus: setFilterStatusAndReset,
    isFilterStatusOpen,
    setIsFilterStatusOpen,
    // header kebab
    isHeaderMenuOpen,
    setIsHeaderMenuOpen,
    // pagination
    page,
    perPage,
    total,
    onSetPage,
    onPerPageSelect,
    // expand
    expandedReportIds,
    toggleRowExpanded,
    // data
    reports,
    refresh,
    exportReports,
    deleteReport,
    createReport,
    updateReport,
    togglePauseReport,
    // API state
    isLoading,
    error,
    setError,
    // report history tab
    historyPage,
    historyPerPage,
    onHistorySetPage,
    onHistoryPerPageSelect,
    historyFilterName,
    setHistoryFilterName: setHistoryFilterNameAndReset,
    historyFilterTimeRange,
    setHistoryFilterTimeRange: setHistoryFilterTimeRangeAndReset,
    reportHistory,
    filteredHistory,
  };
}
