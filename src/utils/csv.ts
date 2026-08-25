/**
 * Minimal, dependency-free CSV assembly.
 *
 * Values are quoted only when they contain a comma, double-quote, or newline,
 * and any embedded double-quotes are escaped by doubling them (RFC 4180).
 * Values beginning with a formula trigger (=, +, -, @) are prefixed with an
 * apostrophe to prevent CSV/formula injection when opened in Excel/Sheets.
 */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | null | undefined;
}

function escapeCell(value: string | null | undefined): string {
  let str = value ?? '';
  // Neutralize formula injection: a cell starting with =, +, -, or @ can be
  // executed by spreadsheet apps. A leading apostrophe forces it to plain text.
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(',');
  const dataLines = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(','));
  return [headerLine, ...dataLines].join('\r\n');
}
