import type { RunSpoils } from '../core/run';
import type { GameState, SavedRun } from '../core/state';
import type { TabId } from './tabs';

/**
 * One screen's worth of DOM. It is built once when shown; `update` then moves
 * only what time moves (bars, counts), many times a second, so buttons are
 * never torn out from under a thumb.
 *
 * `update` is called once a frame for as long as the view is on screen,
 * whether or not anything in the game is happening. `now` is the app's own
 * clock for that frame (the same `now()` the game is paid by), for what moves
 * on screen by time alone, such as the hero breathing; a view never reads a
 * clock of its own. It may be left out (a view updated outside a frame).
 */
export interface View {
  el: HTMLElement;
  update?(state: GameState, now?: number): void;
  /**
   * Whether something that happened by itself (time passing: a kill, a level,
   * a potion wearing off, a night away) changed what this screen is built of,
   * so that `update` cannot show it and the screen must be built again. It is
   * built again in place, scrolled where it was. Left out, or false, the
   * screen is never rebuilt by the game, only by the player: a kill must not
   * throw away an open card, a picker or a half-typed code.
   */
  stale?(before: GameState, after: GameState): boolean;
}

/**
 * What a scene may ask of the app around it: a door in town that opens the
 * bank, a tree that takes you to Woodcutting. Scenes get this and nothing else
 * of the shell.
 */
export interface Shell {
  openTab(tab: TabId): void;
  /** Open the Skills tab on one skill's page. An unknown id opens the list. */
  openSkill(skillId: string): void;
  /**
   * Stop the idle game's clock, or start it again. While a dungeon run is on,
   * the idle task waits: no time passes for it and none is owed afterwards.
   * Leaving the Town tab always starts the clock again.
   */
  pauseIdle(paused: boolean): void;
  /**
   * Hide the top bar and the tabs so a scene has the whole screen (dungeons
   * are played sideways, where the bars would take half the height). Leaving
   * the Town tab always brings them back; a full-screen scene must offer its
   * own way out.
   */
  fullScreen(on: boolean): void;
  /**
   * Bring a dungeon run's spoils home: XP, loot and coins in, food eaten and
   * arrows shot out, kills to the bestiary and a bounty held, a clear and its
   * time kept (`settleRun` in `src/core/run.ts`), saved at once. Call
   * it exactly once when a run ends, however it ends. This is the only way a
   * scene changes the save.
   */
  settleRun(spoils: RunSpoils): void;
  /**
   * Open the notice board's page: the bounty held, or one to take, and the
   * bounty shop (the Skills tab's Bounties page). Optional so that a scene's
   * own stand-in shells need not have it; call it as `shell.openBounties?.()`.
   */
  openBounties?(): void;
  /**
   * Keep the dungeon run under way so a reload or a dropped page takes it up
   * again: the scene's own snapshot (`savedRunOf` in src/scene/runSave.ts),
   * on entering a room, every few seconds and when the page is hidden; null
   * once the run is over (settling it clears it too). It is written with the
   * app's next save and never advanced by the idle game. Optional, like
   * `openBounties`, so stand-in shells need not have it.
   */
  keepRun?(run: SavedRun | null): void;
  /**
   * The run kept from before a reload, for the scene to take up when it is
   * built, or null. Only a run left less than a minute ago comes back: one
   * left longer is settled from its spoils as if rowed home early, before the
   * time away is paid, so nothing picked up is lost. The scene restores it if
   * it can read its `scene` version, and settles its spoils if it cannot.
   */
  savedRun?(): SavedRun | null;
  /**
   * What the menus have asked the town to open, taken once: `'chart'` when a
   * menu's "To the harbour" wants the harbour chart open (the Town tab is
   * opened with it), and null otherwise. The scene asks when it is built and
   * on each update; the first call after a request returns it and clears it,
   * so it is acted on once. A request not taken before the Town tab is left
   * is dropped. Optional, like `openBounties`.
   */
  takeRequest?(): ShellRequest | null;
  /**
   * The scene opened the harbour chart (by the boat, or for a request): the
   * menus stop pointing the player at it (the Town tab's marker). Call it
   * each time the chart opens; it is cheap. Optional, like `openBounties`.
   */
  chartOpened?(): void;
  /**
   * Whether this character has had `key` remembered (`remember`), on this
   * phone or any other the save has been on: for things shown once, such as
   * the town's first-visit pan (`'town.pan'`) or a dungeon's lessons
   * (`'cave.lesson.attack'`). Keys are the caller's: letters and digits in
   * parts joined by `.`, `_` or `-`, at most 48 characters. A key of any other
   * shape is never remembered. Optional, like `openBounties`.
   */
  remembered?(key: string): boolean;
  /**
   * Remember `key` for good, in the save, saved at once so a reload straight
   * after keeps it. Cheap to call again for a key already kept. A key of the
   * wrong shape is ignored, as is a new one once the save holds 256. Optional,
   * like `openBounties`.
   */
  remember?(key: string): void;
}

/** What the menus may ask the town to open (`Shell.takeRequest`). */
export type ShellRequest = 'chart';
