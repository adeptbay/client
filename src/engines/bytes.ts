/**
 * Byte formatting. Its own module because it is used by client
 * components that have no business importing a JSON parser.
 */

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(decimals)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(decimals + 1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(decimals + 1)} GB`;
}
