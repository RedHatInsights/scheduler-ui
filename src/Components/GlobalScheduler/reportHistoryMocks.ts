export interface ReportHistoryEntry {
  id: number;
  reportName: string;
  runDate: string;
}

export const MOCK_REPORT_HISTORY: ReportHistoryEntry[] = [
  { id: 1, reportName: 'RHEL usage report', runDate: '2026-09-17' },
  { id: 2, reportName: 'Cost management report', runDate: '2026-09-17' },
  { id: 3, reportName: 'RHEL usage report', runDate: '2026-09-11' },
  { id: 4, reportName: 'Scheduled report 2', runDate: '2026-09-10' },
  { id: 5, reportName: 'Scheduled report 3', runDate: '2026-09-04' },
];
