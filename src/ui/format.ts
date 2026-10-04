export function formatNumber(value: number): string {
  return Math.floor(value).toLocaleString('en-GB');
}

/** "3s", "4.5s". */
export function formatSeconds(ms: number): string {
  return `${Number((ms / 1000).toFixed(1))}s`;
}
