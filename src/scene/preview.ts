/*
 * TEMPORARY (wave 19, for the Burrow's review): the one way into Thistlewood
 * Burrow while lane A's row keeps it `comingSoon` (a silhouette on the chart
 * that the boat will not row to). Only a page opened with `?burrow=1` in its
 * address sees it open on the chart, so no player can stumble into it; like
 * the old town preview switch, it goes once the Burrow opens for real (wave
 * 20: delete this file and its use in `chart.ts`).
 */
import { BURROW_ID } from './burrow';

/** Whether this page was opened with `?burrow=1`: read once, from its address. */
let asked: boolean | null = null;
export function burrowPreview(): boolean {
  if (asked === null) {
    try {
      asked =
        typeof location !== 'undefined' &&
        new URLSearchParams(location.search).get('burrow') === '1';
    } catch {
      asked = false;
    }
  }
  return asked;
}

/** For tests: as if the page had (or had not) been opened with `?burrow=1`. */
export function setBurrowPreview(on: boolean | null): void {
  asked = on;
}

/** Whether the chart treats a landing to come as open: only the Burrow, only with `?burrow=1`. */
export const previewOpen = (id: string): boolean => id === BURROW_ID && burrowPreview();
