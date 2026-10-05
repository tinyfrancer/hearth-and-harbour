import type { RunSpoils } from '../core/run';
import type { GameState } from '../core/state';
import type { TabId } from './tabs';

/**
 * One screen's worth of DOM. It is built once when shown; `update` then moves
 * only what time moves (bars, counts), many times a second, so buttons are
 * never torn out from under a thumb.
 *
 * `update` is called once a frame for as long as the view is on screen,
 * whether or not anything in the game is happening.
 */
export interface View {
  el: HTMLElement;
  update?(state: GameState): void;
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
   * arrows shot out (`settleRun` in `src/core/run.ts`), saved at once. Call
   * it exactly once when a run ends, however it ends. This is the only way a
   * scene changes the save.
   */
  settleRun(spoils: RunSpoils): void;
}
