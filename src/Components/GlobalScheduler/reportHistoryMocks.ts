export interface ReportHistoryEntry {
  id: number;
  reportName: string;
  runDate: string;
}

export const MOCK_REPORT_HISTORY: ReportHistoryEntry[] = [
  { id: 1, reportName: 'RHEL usage report', runDate: 'Sep 17, 2026' },
  { id: 2, reportName: 'Cost management report', runDate: 'Sep 17, 2026' },
  { id: 3, reportName: 'RHEL usage report', runDate: 'Sep 11, 2026' },
  { id: 4, reportName: 'Scheduled report 2', runDate: 'Sep 10, 2026' },
  { id: 5, reportName: 'Scheduled report 3', runDate: 'Sep 4, 2026' },
];
