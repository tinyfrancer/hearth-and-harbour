export function formatNumber(value: number): string {
  return Math.floor(value).toLocaleString('en-GB');
}

/** "3s", "4.5s", "2.98s": mastery shaves hundredths, and they should show. */
export function formatSeconds(ms: number): string {
  return `${Number((ms / 1000).toFixed(2))}s`;
}

/** "45s", "12m", "2h 14m", "1d 7h": the two largest units, rounded down. */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
  if (hours > 0) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/** "1 Dock rat", "4 Dock rats": a count of something, with an s for more than one. */
export function counted(count: number, name: string): string {
  return `${formatNumber(count)} ${name}${count === 1 ? '' : 's'}`;
}

/** "a", "a and b", "a, b and c". */
export function listed(words: readonly string[]): string {
  return words.length < 2
    ? (words[0] ?? '')
    : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** "0:48", "2:14", "1:02:09": a run's length to the second, as a stopwatch shows it. */
export function formatClock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const s = String(seconds % 60).padStart(2, '0');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}:${s}`;
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${s}`;
}
