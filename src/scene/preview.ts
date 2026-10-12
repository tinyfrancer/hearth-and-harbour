/*
 * TEMPORARY (wave 19, for the Burrow's review): the one way into Thistlewood
 * Burrow while lane A's row keeps it `comingSoon` (a silhouette on the chart
 * that the boat will not row to). Only a page opened with `?burrow=1` in its
 * address sees it open on the chart, so no player can stumble into it; like
 * the old town preview switch, it goes once the Burrow opens for real (wave
 * 20: delete this file and its two uses in `chart.ts` and `townView.ts`).
 *
 * Until lane A's row is on `main`, this also stands in its place on the
 * chart (`withBurrowRow`): the first landing to come, `comingSoon`, so the
 * chart shows its silhouette exactly as lane A's row will. Deleted with it.
 */
import type { Content, DungeonDef } from '../core/content';
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

/** The Burrow's row as lane A's first pass will have it, until it is on `main`: a landing to come. */
const STAND_IN_ROW: DungeonDef = {
  id: BURROW_ID,
  name: 'Thistlewood Burrow',
  description: 'An overgrown warren under the old forest, dark but for its lanterns.',
  order: 3,
  recommended: 40,
  unlock: { kind: 'cleared', dungeon: 'brinebeards_grotto' },
  unlockText: 'Clear Brinebeard’s Grotto.',
  comingSoon: true,
  opens: { tier: 3, brings: 'the third tier' },
  loot: [],
};

/**
 * The tables with the Burrow's row in them: lane A's own once on `main`
 * (the content as it is); until then the stand-in, in the place of the first
 * landing to come (`unknown_1`).
 */
export function withBurrowRow(content: Content): Content {
  const dungeons = content.dungeons;
  if (!dungeons || Object.hasOwn(dungeons, BURROW_ID)) return content;
  const rows = Object.fromEntries(
    Object.entries(dungeons).map(([id, row]) =>
      id === 'unknown_1' ? [BURROW_ID, STAND_IN_ROW] : [id, row],
    ),
  );
  return BURROW_ID in rows ? { ...content, dungeons: rows } : content;
}
