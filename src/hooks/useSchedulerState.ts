import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { listJobs, deleteJob as apiDeleteJob, createJob, patchJob, pauseJob, resumeJob, listAllRuns } from '../api/scheduler/schedulerApi';
import { apiJobToUIReport, apiRunToUIHistory, uiReportDataToApiRequest } from '../api/scheduler/transforms';

export interface ReportHistoryEntry {
  id: string;
  reportName: string;
  runDate: string;
  jobId: string;
  runId: string;
  status: 'running' | 'failed' | 'completed';
  errorMessage?: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  datetime: string;
  status: 'Running' | 'Failed' | 'Completed' | 'Scheduled' | 'Paused';
  services: string[];
  taskCreator: string;
  frequency: string;
}

export interface ReportData {
  reportName: string;
  fileType: string;
  service: string;
  task: string;
  cronExpression?: string;
}

const REPORT_COL = 1;
const STATUS_COL = 2;

export function useSchedulerState() {
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
  const [filterName, setFilterName] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterService, setFilterService] = useState<string | null>(null);
  const [isFilterStatusOpen, setIsFilterStatusOpen] = useState(false);
  const [isFilterServiceOpen, setIsFilterServiceOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<{ index: number; direction: 'asc' | 'desc' }>({
    index: REPORT_COL,
    direction: 'asc',
  });
  const [expandedReportIds, setExpandedReportIds] = useState<string[]>([]);

  // API state
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobNameMapRef = useRef<Map<string, string>>(new Map());

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

  useEffect(() => {
    async function fetchAll() {
      setIsLoading(true);
      setError(null);
      try {
        const [jobs, runs] = await Promise.all([listJobs(), listAllRuns()]);

        jobNameMapRef.current = new Map(jobs.map((job) => [job.id, job.name]));

        setReports(jobs.map((job) => apiJobToUIReport(job)));
        setReportHistory(
          runs.map((run) =>
            apiRunToUIHistory(run, run.job_id, jobNameMapRef.current.get(run.job_id) || 'Unknown')
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch reports');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAll();
  }, []);

  const onSetPage = (_e: unknown, newPage: number) => setPage(newPage);

  const onPerPageSelect = (_e: unknown, newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const onSort = (_e: unknown, columnIndex: number, direction: 'asc' | 'desc') =>
    setSortBy({ index: columnIndex, direction });

  const toggleRowExpanded = (id: string, willBeExpanded: boolean) =>
    setExpandedReportIds((prev) =>
      willBeExpanded ? [...new Set([...prev, id])] : prev.filter((i) => i !== id)
    );

  const deleteReport = async (id: string) => {
    try {
      await apiDeleteJob(id);
      jobNameMapRef.current.delete(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      setExpandedReportIds((prev) => prev.filter((i) => i !== id));
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
      const uiReport = apiJobToUIReport(newJob);

      jobNameMapRef.current.set(newJob.id, newJob.name);
      setReports((prev) => [...prev, uiReport]);
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

  const setFilterServiceAndReset = (value: string | null) => {
    setFilterService(value);
    setPage(1);
  };

  const sortedReports = useMemo(() => {
    let result = [...reports];
    if (filterName) {
      result = result.filter((r) =>
        r.name.toLowerCase().includes(filterName.toLowerCase())
      );
    }
    if (filterStatus) {
      result = result.filter((r) => r.status === filterStatus);
    }
    if (filterService) {
      result = result.filter((r) => r.services.includes(filterService));
    }
    const dir = sortBy.direction === 'asc' ? 1 : -1;
    return result.sort((a, b) => {
      if (sortBy.index === REPORT_COL) return a.name.localeCompare(b.name) * dir;
      if (sortBy.index === STATUS_COL) return a.status.localeCompare(b.status) * dir;
      return 0;
    });
  }, [sortBy, reports, filterName, filterStatus, filterService]);

  // ── Report history tab state ──
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(10);
  const [historyFilterName, setHistoryFilterName] = useState<string | null>(null);
  const [historyFilterDate, setHistoryFilterDate] = useState<string | null>(null);

  const onHistorySetPage = (_e: unknown, newPage: number) => setHistoryPage(newPage);
  const onHistoryPerPageSelect = (_e: unknown, newPerPage: number) => {
    setHistoryPerPage(newPerPage);
    setHistoryPage(1);
  };

  const setHistoryFilterNameAndReset = (value: string | null) => {
    setHistoryFilterName(value);
    setHistoryPage(1);
  };

  const setHistoryFilterDateAndReset = (value: string | null) => {
    setHistoryFilterDate(value);
    setHistoryPage(1);
  };

  const filteredHistory = useMemo(() => {
    let result = [...reportHistory];
    if (historyFilterName) {
      result = result.filter((r) =>
        r.reportName.toLowerCase().includes(historyFilterName.toLowerCase())
      );
    }
    if (historyFilterDate) {
      result = result.filter((r) => r.runDate === historyFilterDate);
    }
    return result;
  }, [reportHistory, historyFilterName, historyFilterDate]);

  return {
    // tabs
    activeTabKey,
    setActiveTabKey,
    // scheduled reports filters
    filterName,
    setFilterName: setFilterNameAndReset,
    filterStatus,
    setFilterStatus: setFilterStatusAndReset,
    filterService,
    setFilterService: setFilterServiceAndReset,
    isFilterStatusOpen,
    setIsFilterStatusOpen,
    isFilterServiceOpen,
    setIsFilterServiceOpen,
    // header kebab
    isHeaderMenuOpen,
    setIsHeaderMenuOpen,
    // pagination
    page,
    perPage,
    onSetPage,
    onPerPageSelect,
    // sorting
    sortBy,
    onSort,
    REPORT_COL,
    STATUS_COL,
    // expand
    expandedReportIds,
    toggleRowExpanded,
    // data
    sortedReports,
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
    historyFilterDate,
    setHistoryFilterDate: setHistoryFilterDateAndReset,
    reportHistory,
    filteredHistory,
  };
}
