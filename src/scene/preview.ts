/*
 * TEMPORARY: the switch that shows the C-scale town (`town2.ts`) instead of
 * the current one, while it is previewed. Players see the current town; the
 * new one shows only on a page opened with `?town=2` in its address.
 *
 * The address is read once, the first time it is asked for, so the town
 * cannot change under a player halfway through a session.
 *
 * How it goes away: once Cody has walked the new town, `townView.ts` shows
 * it unconditionally, this file and its test are deleted, and the current
 * town's files (`town.ts`, `townArt.ts`) follow once the dungeons no longer
 * borrow from them. Nothing is saved about it, so there is nothing to migrate.
 */

let read: boolean | null = null;

/** Whether this page shows the C-scale town: true only with `town=2` in its address's query. */
export function previewTown2(): boolean {
  if (read === null) {
    try {
      read = new URLSearchParams(globalThis.location?.search ?? '').get('town') === '2';
    } catch {
      read = false;
    }
  }
  return read;
}

/** Forgets what the address said, so the next ask reads it again. For tests. */
export function forgetPreview(): void {
  read = null;
}
