import { useMemo, useState } from 'react';
import { MOCK_REPORT_HISTORY } from '../Components/GlobalScheduler/reportHistoryMocks';

export interface ScheduledReport {
  id: number;
  name: string;
  datetime: string;
  status: 'Running' | 'Failed' | 'Completed';
  services: string[];
  taskCreator: string;
  frequency: string;
}

export interface ReportData {
  reportName: string;
  fileType: string;
  service: string;
  task: string;
}

const REPORT_COL = 1;
const STATUS_COL = 2;

export const MOCK_SCHEDULED_REPORTS: ScheduledReport[] = [
  {
    id: 1,
    name: 'Scheduled report 1',
    datetime: '25/07/2025 12:00 am EST',
    status: 'Running',
    services: ['Cost Management'],
    taskCreator: 'Allison Robinhood',
    frequency: 'Monthly on the last Friday at 12:00am EST',
  },
  {
    id: 2,
    name: 'Scheduled report 2',
    datetime: '25/07/2025 12:00 am EST',
    status: 'Failed',
    services: ['Cost Management'],
    taskCreator: 'Allison Robinhood',
    frequency: 'Monthly on the last Friday at 12:00am EST',
  },
  {
    id: 3,
    name: 'Scheduled report 3',
    datetime: '26/07/2025 12:00 am EST',
    status: 'Completed',
    services: ['Cost Management'],
    taskCreator: 'Allison Robinhood',
    frequency: 'Monthly on the last Friday at 12:00am EST',
  },
];

export function useSchedulerState() {
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
  const [isFilterNameOpen, setIsFilterNameOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<{ index: number; direction: 'asc' | 'desc' }>({
    index: REPORT_COL,
    direction: 'asc',
  });
  const [expandedReportIds, setExpandedReportIds] = useState<number[]>([3]);
  const [reports, setReports] = useState<ScheduledReport[]>(MOCK_SCHEDULED_REPORTS);

  const onSetPage = (_e: unknown, newPage: number) => setPage(newPage);

  const onPerPageSelect = (_e: unknown, newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const onSort = (_e: unknown, columnIndex: number, direction: 'asc' | 'desc') =>
    setSortBy({ index: columnIndex, direction });

  const toggleRowExpanded = (id: number, willBeExpanded: boolean) =>
    setExpandedReportIds((prev) =>
      willBeExpanded ? [...new Set([...prev, id])] : prev.filter((i) => i !== id)
    );

  const deleteReport = (id: number) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    setExpandedReportIds((prev) => prev.filter((i) => i !== id));
  };

  const sortedReports = useMemo(() => {
    const dir = sortBy.direction === 'asc' ? 1 : -1;
    return [...reports].sort((a, b) => {
      if (sortBy.index === REPORT_COL) return a.name.localeCompare(b.name) * dir;
      if (sortBy.index === STATUS_COL) return a.status.localeCompare(b.status) * dir;
      return 0;
    });
  }, [sortBy, reports]);

  // ── Report history tab state ──
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(10);
  const [historyFilterName, setHistoryFilterName] = useState<string | null>(null);
  const [historyFilterDate, setHistoryFilterDate] = useState<string | null>(null);
  const [isHistoryFilterNameOpen, setIsHistoryFilterNameOpen] = useState(false);
  const [isHistoryFilterDateOpen, setIsHistoryFilterDateOpen] = useState(false);

  const onHistorySetPage = (_e: unknown, newPage: number) => setHistoryPage(newPage);
  const onHistoryPerPageSelect = (_e: unknown, newPerPage: number) => {
    setHistoryPerPage(newPerPage);
    setHistoryPage(1);
  };

  const filteredHistory = useMemo(() => {
    let result = [...MOCK_REPORT_HISTORY];
    if (historyFilterName) {
      result = result.filter((r) => r.reportName === historyFilterName);
    }
    if (historyFilterDate) {
      result = result.filter((r) => r.runDate === historyFilterDate);
    }
    return result;
  }, [historyFilterName, historyFilterDate]);

  return {
    // tabs
    activeTabKey,
    setActiveTabKey,
    // filter dropdowns
    isFilterNameOpen,
    setIsFilterNameOpen,
    isFilterOpen,
    setIsFilterOpen,
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
    // report history tab
    historyPage,
    historyPerPage,
    onHistorySetPage,
    onHistoryPerPageSelect,
    historyFilterName,
    setHistoryFilterName,
    historyFilterDate,
    setHistoryFilterDate,
    isHistoryFilterNameOpen,
    setIsHistoryFilterNameOpen,
    isHistoryFilterDateOpen,
    setIsHistoryFilterDateOpen,
    filteredHistory,
  };
}
