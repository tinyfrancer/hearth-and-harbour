import type { Content } from '../core/content';
import type { GameState } from '../core/state';
import { h } from '../ui/dom';
import type { Shell, View } from '../ui/view';
import { other, timeOfDayAt, type TimeOfDay } from './daylight';
import { seedFrom } from '../core/rng';
import { fighterOf, spoilsOf } from './battle';
import { GROTTO_CAST } from './cast';
import { buildDungeon, startRun, type Dungeon, type Run } from './dungeon';
import { dungeonView } from './dungeonView';
import { GROTTO } from './grotto';
import { Hero, dressOf } from './hero';
import { closePanel, startPlay, type Play } from './play';
import { stage } from './stage';
import { TOWN_START, town } from './town';
import { centreOf, type Cell } from './tileMap';

/**
 * Where the hero was and what was open when the Town tab was last on screen.
 * The shell rebuilds the tab on a level-up or when an action stops, and
 * coming back to the tab should find things as they were left. It lasts as
 * long as the page does; a position in town is not part of the save.
 */
let play: Play = startPlay(centreOf(TOWN_START));

/** Day or dusk chosen with the sun-and-moon button, for this session; null follows the clock. */
let chosen: TimeOfDay | null = null;

/** The player's character as the town and dungeons draw him, kept until his look or gear changes. */
let hero: Hero | null = null;

/** A dungeon run under way, kept like `play` so a rebuilt tab carries on with it. */
let run: Run | null = null;

/** Whether the run's spoils have gone home: once a run, however it ends. */
let settled = false;

/**
 * What this scene last asked of the shell. The shell lets go of both when
 * the Town tab is left; a rebuilt tab checks these so the town is never shown
 * with the clock stopped or the bars gone.
 */
const asked = { paused: false, full: false };

/** Where the boat leaves from and lands: on the quay beside it, looking at it. */
export const BOAT_LANDING: Cell = { col: 9, row: 19 };

let grotto: Dungeon | null = null;
const dungeons = (id: string): Dungeon | null => {
  if (id !== GROTTO.id) return null;
  grotto ??= buildDungeon(GROTTO);
  return grotto;
};

const now = (): TimeOfDay => chosen ?? timeOfDayAt(new Date().getHours());

/**
 * What the Town tab shows: the town, or a dungeon run reached from it. This
 * is the scene lane's one door into the app: `src/ui/app.ts` calls it and
 * knows nothing else about scenes, so everything behind it can change without
 * touching the shell.
 */
export function townView(state: GameState, content: Content, shell?: Shell): View {
  const { scene, art } = town();
  /** The state as of the last frame: what a run starts from. */
  let latest = state;
  hero ??= new Hero(dressOf(state), art.lights);
  hero.wear(state);
  const me = hero;

  const host = h('div', { class: 'scene-host' });
  let current: View;

  /** Tells the shell what a run needs, and remembers what was asked. */
  const tell = (paused: boolean, full: boolean): void => {
    if (!shell) return;
    // The bars first: pausing brings the game up to date, which may draw a frame.
    shell.fullScreen(full);
    asked.full = full;
    shell.pauseIdle(paused);
    asked.paused = paused;
  };

  const showTown = (): void => {
    current = stage({
      scene,
      art: {
        ...art,
        walkerAt: (feet, facing, palette) => me.at(feet, facing, palette.lightsOn),
      },
      play,
      keep: (next) => {
        play = next;
      },
      light: {
        current: now,
        flip: () => {
          chosen = other(now());
        },
      },
      press: (opens) => {
        // Coming back to town should not find the panel still open over the square.
        play = closePanel(play);
        if ('tab' in opens) shell?.openTab(opens.tab);
        else if ('skill' in opens) shell?.openSkill(opens.skill);
        else enter(opens.dungeon);
      },
      label: 'Gullwick, the town. Tap the ground to walk there, or tap something to walk up to it.',
      fallback: 'The town needs a browser that can draw on a canvas.',
    });
    host.replaceChildren(current.el);
  };

  const showDungeon = (dungeon: Dungeon): void => {
    current = dungeonView({
      dungeon,
      content,
      run: () => run!,
      keep: (next) => {
        run = next;
      },
      hero: me,
      leave,
      // The run is over: its spoils go home, and the idle task carries on while the results are read.
      finished: () => {
        settle();
        tell(false, true);
      },
    });
    host.replaceChildren(current.el);
  };

  /**
   * The run's spoils paid in through the shell: XP, loot and coins in, food
   * and arrows out, saved. Exactly once a run, by whichever way it ends.
   */
  const settle = (): void => {
    if (!run?.battle || settled) return;
    settled = true;
    // A clear is the boss down and the end reached: the run ended by itself, cleared.
    shell?.settleRun(spoilsOf(run.battle, run.ending === 'cleared' ? run.dungeon : undefined));
  };

  /** Rows out: the idle task waits and the scene takes the whole screen until the run ends. */
  const enter = (id: string): void => {
    const dungeon = dungeons(id);
    if (!dungeon) return;
    // A run reads the character as they row out, and rolls its own dice, never the save's.
    run = startRun(dungeon, {
      fighter: fighterOf(latest, content),
      // The grotto's own cast fights by its rows here; the tables' monsters by theirs.
      monsters: { ...(content.monsters ?? {}), ...GROTTO_CAST },
      seed: seedFrom(Date.now()),
      // Loot the game's tables do not know yet is not dropped.
      known: Object.keys(content.items),
    });
    settled = false;
    tell(true, true);
    showDungeon(dungeon);
  };

  /** Back to town by any way out of a run: the clock and the bars come back, the hero by the boat. */
  const leave = (): void => {
    // What was picked up comes home with you, before the clock starts again.
    settle();
    // The shell first: starting the clock again draws a frame, and that frame is still the run's.
    tell(false, false);
    run = null;
    play = {
      ...play,
      walker: { at: centreOf(BOAT_LANDING), path: [] },
      facing: 'left',
      heading: null,
      open: null,
    };
    showTown();
  };

  const inRun = run && dungeons(run.dungeon);
  if (inRun) showDungeon(inRun);
  else showTown();

  let first = true;
  /** Set while this view is updating, so a shell call that draws a frame does not come back in. */
  let busy = false;
  return {
    el: host,
    update: (next) => {
      if (busy) return;
      busy = true;
      try {
        if (first) {
          first = false;
          // A rebuilt tab: a run carries on as it was; the town is never left paused or bare.
          if (run) tell(!run.finished, true);
          else if (asked.paused || asked.full) tell(false, false);
        }
        latest = next;
        me.wear(next);
        current.update?.(next);
      } finally {
        busy = false;
      }
    },
  };
}

/** Puts the hero back at the start with nothing open, no run, and the clock in charge. For tests. */
export function resetTown(): void {
  play = startPlay(centreOf(TOWN_START));
  chosen = null;
  hero = null;
  run = null;
  settled = false;
  asked.paused = false;
  asked.full = false;
}

/** Where the hero is, whether he is on his way somewhere, and what is open. For tests. */
export function heroAt(): { x: number; y: number; walking: boolean; open: string | null } {
  return {
    x: play.walker.at.x,
    y: play.walker.at.y,
    walking: play.walker.path.length > 0 || play.heading !== null,
    open: play.open,
  };
}

/** The dungeon run under way, if any. For tests and screenshot scripts. */
export function runNow(): Run | null {
  return run;
}

/** Puts `next` in place of the run under way, to jump it about. For tests and screenshot scripts. */
export function keepRun(next: Run): void {
  if (run) run = next;
}

/** The hero's pictures, for tests: how many times he has been drawn afresh. */
export function heroNow(): Hero | null {
  return hero;
}
