/**
 * Trigger a browser download of a Blob by creating a temporary object URL and
 * clicking a hidden anchor. Extracted from the pattern previously inlined in
 * the scheduler panel so the panel and the download page share one path.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = window.URL.createObjectURL(blob);
  const hiddenLink = document.createElement('a');
  hiddenLink.href = objectUrl;
  hiddenLink.download = filename;
  document.body.appendChild(hiddenLink);
  hiddenLink.click();
  window.URL.revokeObjectURL(objectUrl);
  hiddenLink.remove();
}

/**
 * Best-effort filename from a response's `Content-Disposition` header. Falls
 * back to the provided default when the header is absent or unparseable.
 */
export function filenameFromResponse(resp: Response, fallback: string): string {
  const header = resp.headers?.get?.('Content-Disposition');
  if (!header) return fallback;

  // RFC 5987 form: filename*=UTF-8''some%20name
  const utf8Match = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/^"|"$/g, '').trim());
    } catch {
      // Malformed encoding — fall through to the plain filename form.
    }
  }

  // Plain form: filename="some name"
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1]?.trim() || fallback;
}
