/*
 * One-off things the scene remembers about a player: the first visit's pan
 * to the boat has been seen, the chart has been opened, a lesson has been
 * learned, tips were put away. Kept in the save through the shell's
 * `remembered`/`remember` (lane A's save version 10: short plain keys, kept
 * once), and for the page as well, so a shell without them (a test's) still
 * remembers until the page is reloaded.
 */
import type { Shell } from '../ui/view';

/** The part of a shell that remembers: both optional, as on lane A's `Shell`. */
export interface Remembering {
  remembered?(key: string): boolean;
  remember?(key: string): void;
}

/** What was remembered this page, whatever the shell does. */
const page = new Set<string>();
let kept: Remembering | null = null;

/** Remember through this shell from now on (the Town tab's, as it is built). */
export function rememberWith(shell: Shell | Remembering | null | undefined): void {
  kept = (shell as Remembering | null | undefined) ?? null;
}

/** Whether `key` has been remembered: in the save, or this page. */
export function remembered(key: string): boolean {
  if (page.has(key)) return true;
  try {
    return kept?.remembered?.(key) === true;
  } catch {
    return false;
  }
}

/** Remembers `key`: in the save if the shell can keep it, and for the page in any case. */
export function remember(key: string): void {
  // Told to the shell once a page: a save is not written again for what it already holds.
  if (page.has(key)) return;
  page.add(key);
  try {
    kept?.remember?.(key);
  } catch {
    // The page still has it.
  }
}

/** Where things are remembered just now: in the save, or only for the page. For tests and notes. */
export function rememberingIn(): 'save' | 'page' {
  return typeof kept?.remember === 'function' && typeof kept.remembered === 'function'
    ? 'save'
    : 'page';
}

/** Forgets the page's memory and the shell. For tests. */
export function forgetRemembered(): void {
  page.clear();
  kept = null;
}

/** The keys this scene uses, in one place. */
export const KEYS = {
  /** The first visit's pan to the boat has played (or the chart has been opened). */
  pan: 'town.pan',
  /** The harbour chart has been opened: the edge-of-screen pointer to the boat is done. */
  chart: 'town.chart',
  /** A lesson learned, by its dungeon's short name and the lesson's id. */
  lesson: (dungeon: string, id: string) => `${dungeon}.lesson.${id}`,
  /** "Skip tips" pressed in a dungeon, by its short name. */
  tipsOff: (dungeon: string) => `${dungeon}.tips.off`,
  /** The challenges' tracker folded in a run: it starts folded from then on. */
  trackerOff: 'run.tracker.off',
} as const;
