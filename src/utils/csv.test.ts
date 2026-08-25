import { toCsv, type CsvColumn } from './csv';

interface Row {
  name: string;
  status: string;
  note?: string | null;
}

const COLUMNS: CsvColumn<Row>[] = [
  { header: 'Name', value: (r) => r.name },
  { header: 'Status', value: (r) => r.status },
  { header: 'Note', value: (r) => r.note },
];

describe('toCsv', () => {
  it('renders a header row even with no data', () => {
    expect(toCsv(COLUMNS, [])).toBe('Name,Status,Note');
  });

  it('renders one CRLF-delimited line per row', () => {
    const csv = toCsv(COLUMNS, [
      { name: 'A', status: 'Scheduled', note: 'ok' },
      { name: 'B', status: 'Paused', note: 'later' },
    ]);
    expect(csv).toBe('Name,Status,Note\r\nA,Scheduled,ok\r\nB,Paused,later');
  });

  it('quotes values containing commas, quotes, or newlines and doubles embedded quotes', () => {
    const csv = toCsv(COLUMNS, [
      { name: 'Report, v2', status: 'Say "hi"', note: 'line1\nline2' },
    ]);
    expect(csv).toBe('Name,Status,Note\r\n"Report, v2","Say ""hi""","line1\nline2"');
  });

  it('treats null/undefined values as empty cells', () => {
    const csv = toCsv(COLUMNS, [{ name: 'A', status: 'Scheduled', note: null }]);
    expect(csv).toBe('Name,Status,Note\r\nA,Scheduled,');
  });
});
