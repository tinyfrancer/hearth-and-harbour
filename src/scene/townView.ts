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
import { closePanel, startPlay, type Play } from './play';
import { loadingScene } from './loadingScene';
import { stage } from './stage';
import type { Cell } from './tileMap';
import { BOAT_LANDING2, town2Scene } from './town2';
import { Hero2, type Town2Art } from './town2Art';
import { roomLook } from './grottoArt';
import { groundInAWorker, type WorkerPainter } from './grottoPainter';
import { tideStateOf } from './fightArt';
import {
  LANDING2,
  START2,
  art2Now,
  forget2,
  prepareTown,
  town2Stage,
  townLoading,
  townProgress,
  townReady,
  wear2,
} from './town2Place';

/**
 * Where the hero was and what was open when the Town tab was last on screen.
 * The shell rebuilds the tab on a level-up or when an action stops, and
 * coming back to the tab should find things as they were left. It lasts as
 * long as the page does; a position in town is not part of the save.
 */
let play: Play | null = null;

/** Day or dusk chosen with the sun-and-moon button, for this session; null follows the clock. */
let chosen: TimeOfDay | null = null;

/**
 * The player's character as the dungeons draw him, at the C scale as the
 * town does but lit by each room's lanterns, kept until his look or gear
 * changes: made the first time a boat rows out, not before. The town draws
 * him itself (`town2Place.ts`).
 */
let hero: Hero2 | null = null;

/** The run's worker for painting its rooms' grounds, while a run lasts. */
let painter: WorkerPainter | null = null;

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

/** Where the boat leaves from and lands: on the quay beside it, looking at it (24-pixel tiles). */
export const BOAT_LANDING: Cell = BOAT_LANDING2;

let grotto: Dungeon | null = null;
const dungeons = (id: string): Dungeon | null => {
  if (id !== GROTTO.id) return null;
  grotto ??= buildDungeon(GROTTO);
  return grotto;
};

const now = (): TimeOfDay => chosen ?? timeOfDayAt(new Date().getHours());

/** The longest the town waits, as a boat rows out, for the first room's ground to come from the worker. */
export const ROW_OUT_WAIT_MS = 1500;

/**
 * Starts painting a dungeon's first room, every state of its tide, in the
 * run's worker while the town is still up: the boat's panel is open, so a
 * run is near. Rowing out then finds its ground in, and the room is never
 * dark for its first moment.
 */
function paintAhead(dungeon: Dungeon): void {
  painter ??= groundInAWorker();
  if (!painter.offThread) return;
  const look = roomLook(dungeon.rooms[dungeon.first]!, painter);
  look.paintWith(painter);
  look.warm();
}

/** Whether a run's room has any of its ground in to show. */
function groundIn(dungeon: Dungeon, next: Run): boolean {
  const look = roomLook(dungeon.rooms[next.room]!);
  const s = tideStateOf(dungeon, next);
  return look.nearestIn(s.level, s.warn) !== null;
}

/** The Town tab's own: which dungeon's first room has been asked for ahead, so it is asked once. */
let paintedAhead: string | null = null;

// The town is worked out in a worker as soon as the page has loaded, so it is
// usually ready before the Town tab is first opened. Only where there are
// workers: without one (tests) it is worked out when the tab asks.
if (typeof Worker === 'function' && typeof window !== 'undefined')
  setTimeout(() => prepareTown(now()), 0);

/**
 * What shows while the town is still coming: a little harbour scene with the
 * boat pulling in as the work's real steps are done, the town's name, a line
 * and a bar (`loadingScene.ts`). Never a dark empty scene.
 */
function loadingCard(): { el: HTMLElement; update(): void } {
  const card = loadingScene(now());
  return { el: card.el, update: () => card.update(townProgress(), performance.now()) };
}

/**
 * What the Town tab shows: the town, or a dungeon run reached from it. This
 * is the scene lane's one door into the app: `src/ui/app.ts` calls it and
 * knows nothing else about scenes, so everything behind it can change without
 * touching the shell.
 */
export function townView(state: GameState, content: Content, shell?: Shell): View {
  prepareTown(now());
  /** The state as of the last frame: what a run starts from. */
  let latest = state;
  hero?.wear(state);
  wear2(state);
  /** The dungeons' hero, made when first needed. */
  const dungeonHero = (): Hero2 => {
    hero ??= new Hero2();
    hero.wear(latest);
    return hero;
  };

  const host = h('div', { class: 'scene-host' });
  let current: View;
  /** Over the town until its first picture is in. */
  let loading: ReturnType<typeof loadingCard> | null = null;

  /** Tells the shell what a run needs, and remembers what was asked. */
  const tell = (paused: boolean, full: boolean): void => {
    if (!shell) return;
    // The bars first: pausing brings the game up to date, which may draw a frame.
    shell.fullScreen(full);
    asked.full = full;
    shell.pauseIdle(paused);
    asked.paused = paused;
  };

  /** The loading card on its own, while the town's facts are not yet in. */
  const showComing = (): void => {
    loading ??= loadingCard();
    current = { el: h('div', { class: 'scene' }) };
    host.replaceChildren(current.el, loading.el);
  };

  const showTown = (): void => {
    if (!townReady()) {
      showComing();
      return;
    }
    play ??= startPlay(START2);
    current = stage({
      ...town2Stage(),
      play: play!,
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
        play = closePanel(shownPlay());
        if ('tab' in opens) shell?.openTab(opens.tab);
        else if ('skill' in opens) shell?.openSkill(opens.skill);
        else enter(opens.dungeon);
      },
      label: 'Gullwick, the town. Tap the ground to walk there, or tap something to walk up to it.',
      fallback: 'The town needs a browser that can draw on a canvas.',
    });
    if (townLoading()) {
      loading ??= loadingCard();
      host.replaceChildren(current.el, loading.el);
    } else {
      loading = null;
      host.replaceChildren(current.el);
    }
  };

  const showDungeon = (dungeon: Dungeon): void => {
    current = dungeonView({
      dungeon,
      content,
      run: () => run!,
      keep: (next) => {
        run = next;
      },
      hero: dungeonHero(),
      painter: (painter ??= groundInAWorker()),
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

  /**
   * A run rowing out, waiting for its first room's ground: the town stays up
   * meanwhile (`ROW_OUT_WAIT_MS` at most), so the room is never shown dark.
   */
  let rowing: { run: Run; dungeon: Dungeon; since: number } | null = null;

  /** Rows out: the idle task waits and the scene takes the whole screen until the run ends. */
  const enter = (id: string): void => {
    const dungeon = dungeons(id);
    if (!dungeon || rowing) return;
    // A run reads the character as they row out, and rolls its own dice, never the save's.
    const next = startRun(dungeon, {
      fighter: fighterOf(latest, content),
      // The grotto's own cast fights by its rows here; the tables' monsters by theirs.
      monsters: { ...(content.monsters ?? {}), ...GROTTO_CAST },
      seed: seedFrom(Date.now()),
      // Loot the game's tables do not know yet is not dropped.
      known: Object.keys(content.items),
    });
    paintAhead(dungeon);
    rowing = { run: next, dungeon, since: performance.now() };
    rowOn();
  };

  /** Out in the boat once the first room's ground is in, or the wait is over. */
  const rowOn = (): void => {
    if (!rowing) return;
    const waited = performance.now() - rowing.since;
    // Without a worker the room is worked out on the spot as it is shown: nothing to wait for.
    const waiting = !!painter?.offThread && !groundIn(rowing.dungeon, rowing.run);
    if (waiting && waited < ROW_OUT_WAIT_MS) return;
    const { dungeon } = rowing;
    run = rowing.run;
    rowing = null;
    settled = false;
    tell(true, true);
    showDungeon(dungeon);
  };

  /** The boat's panel open in town: its dungeon's first room is painted ahead. */
  const boatOpen = (): void => {
    const open = play?.open ?? play?.heading;
    if (!open) return;
    const thing = town2Scene().things.find((t) => t.id === open);
    const opens = thing?.use?.button?.opens;
    if (!opens || !('dungeon' in opens) || paintedAhead === opens.dungeon) return;
    const dungeon = dungeons(opens.dungeon);
    if (!dungeon) return;
    paintedAhead = opens.dungeon;
    paintAhead(dungeon);
  };

  /** Back to town by any way out of a run: the clock and the bars come back, the hero by the boat. */
  const leave = (): void => {
    // What was picked up comes home with you, before the clock starts again.
    settle();
    // The shell first: starting the clock again draws a frame, and that frame is still the run's.
    tell(false, false);
    run = null;
    painter?.close();
    painter = null;
    paintedAhead = null;
    hero?.forget();
    play = {
      ...(play ?? startPlay(START2)),
      walker: { at: LANDING2, path: [] },
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
        hero?.wear(next);
        wear2(next);
        // The facts came in: the town can be walked, under the loading card until its picture comes.
        if (!run && loading && !current.update && townReady()) showTown();
        current.update?.(next);
        if (!run) {
          boatOpen();
          rowOn();
        }
        if (loading) {
          loading.update();
          if (!run && !townLoading()) {
            loading.el.remove();
            loading = null;
          }
        }
      } finally {
        busy = false;
      }
    },
  };
}

/** Puts the hero back at the start with nothing open, no run, and the clock in charge. For tests. */
export function resetTown(): void {
  play = null;
  chosen = null;
  hero = null;
  painter?.close();
  painter = null;
  paintedAhead = null;
  forget2();
  run = null;
  settled = false;
  asked.paused = false;
  asked.full = false;
}

/** Where the hero is, whether he is on his way somewhere, and what is open. For tests. */
export function heroAt(): { x: number; y: number; walking: boolean; open: string | null } {
  const play = shownPlay();
  return {
    x: play.walker.at.x,
    y: play.walker.at.y,
    walking: play.walker.path.length > 0 || play.heading !== null,
    open: play.open,
  };
}

/** Where things stand in town: as left, or the start before the tab has been shown. */
function shownPlay(): Play {
  return play ?? startPlay(START2);
}

/** The town's look, once it is coming. For tests and the frame-rate check. */
export function town2ArtNow(): Town2Art | null {
  return art2Now();
}

/** The dungeon run under way, if any. For tests and screenshot scripts. */
export function runNow(): Run | null {
  return run;
}

/** Puts `next` in place of the run under way, to jump it about. For tests and screenshot scripts. */
export function keepRun(next: Run): void {
  if (run) run = next;
}

/** The dungeons' hero, for tests: how many times he has been drawn afresh. Null until a boat rows out. */
export function heroNow(): Hero2 | null {
  return hero;
}
