/** Base path for the export service's completed-export files. */
export const EXPORTS_URL = '/api/export/v1/exports';

/**
 * Error thrown when an export download request fails. Preserves the HTTP
 * status so callers can distinguish "not found / expired" (404) from other
 * failures.
 */
export class ExportDownloadError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ExportDownloadError';
    this.status = status;
  }
}

/**
 * Fetch a completed export's file by its export id.
 *
 * Uses plain `fetch` (not the axios client) so the browser/chrome session
 * credentials are used — matching how the scheduler panel downloads exports.
 *
 * @throws {ExportDownloadError} when the response is not ok; the HTTP status
 *   is preserved on the error.
 */
export async function fetchExport(exportId: string): Promise<Response> {
  const resp = await fetch(`${EXPORTS_URL}/${encodeURIComponent(exportId)}`);
  if (!resp.ok) {
    let detail = '';
    try {
      const body = await resp.json();
      detail = typeof body?.message === 'string' ? body.message : JSON.stringify(body);
    } catch {
      // Response body was not JSON — fall back to a status-based message.
    }
    throw new ExportDownloadError(
      detail || `Failed to download export (status ${resp.status})`,
      resp.status
    );
  }
  return resp;
}
