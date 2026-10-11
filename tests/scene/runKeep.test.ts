import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunSpoils } from '../../src/core/run';
import { newGame, type GameState, type SavedRun } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { cameraFor } from '../../src/scene/camera';
import { targetFoe } from '../../src/scene/battle';
import { placeOf } from '../../src/scene/dungeon';
import { DUNGEON } from '../../src/scene/dungeonMetrics';
import { GROTTO_DUNGEON } from './grottoBot';
import { RUN_SCENE_VERSION, keptAtOf, snapshotRun } from '../../src/scene/runSave';
import { centreOf, type Point } from '../../src/scene/tileMap';
import { TOWN2_H, TOWN2_W } from '../../src/art/town2/town';
import { town2Scene } from '../../src/scene/town2';
import { FOCUS_RISE2 } from '../../src/scene/town2Place';
import {
  KEEP_EVERY_MS,
  TAKE_UP_MS,
  heroAt,
  keepRun,
  resetTown,
  runNow,
  townView,
} from '../../src/scene/townView';
import type { Shell, View } from '../../src/ui/view';

// The run kept through a reload, the scene's half (lane A's is the save, version 9):
// handed to the shell as it changes and every few seconds, taken back when the Town
// tab is built after a reload, paused behind Resume, and let go of when it ends.

vi.setConfig({ testTimeout: 60_000 });

let observers: ResizeObserverCallback[];
/** The page's frame clock, and the app's clock (`View.update`'s `now`). */
let clock: number;
let appNow: number;
let character: GameState;

const T = DUNGEON.tile;
const lvl = (n: number): number => Math.round(40 * (n - 1) ** 2.5);

beforeEach(() => {
  observers = [];
  clock = 1000;
  appNow = 1_700_000_000_000;
  resetTown();
  character = {
    ...newGame('Cody', 0),
    skills: { melee: lvl(99), defence: lvl(99), vitality: lvl(99) },
    equipment: {
      main_hand: { item: 'iron_sword', qty: 1 },
      body: { item: 'iron_breastplate', qty: 1 },
    },
    food: { item: 'cooked_cod', qty: 4 },
  };
  vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        observers.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('devicePixelRatio', 3);
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  document.body.replaceChildren();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A shell that keeps what it is handed, as the app does in `state.run`, and records the rest. */
function keeper(start: SavedRun | null = null) {
  const calls: string[] = [];
  const shell: Shell & { held: SavedRun | null; keeps: number; calls: string[] } = {
    held: start,
    keeps: 0,
    calls,
    openTab: () => {},
    openSkill: () => {},
    pauseIdle: (on) => calls.push(`pause:${on}`),
    fullScreen: (on) => calls.push(`full:${on}`),
    settleRun: (spoils: RunSpoils) => {
      calls.push(`settle:${spoils.cleared ?? ''}`);
      // As the app does: settling lets go of the kept run.
      shell.held = null;
    },
    keepRun: (run) => {
      // Through JSON, as a save keeps it.
      shell.held = run && (JSON.parse(JSON.stringify(run)) as SavedRun);
      if (run) shell.keeps++;
      else calls.push('keep:null');
    },
    savedRun: () => shell.held,
  };
  return shell;
}

function resize(width: number, height: number): void {
  const entry = { contentRect: { width, height } } as ResizeObserverEntry;
  for (const callback of [...observers]) callback([entry], {} as ResizeObserver);
}

function shown(shell: Shell): View {
  const view = townView(character, CONTENT, shell);
  document.body.append(view.el);
  resize(390, 727);
  view.update?.(character, appNow);
  return view;
}

/** Frames of 50 ms on both clocks. */
function wait(view: View, ms: number): void {
  for (let t = 0; t < ms; t += 50) {
    clock += 50;
    appNow += 50;
    view.update?.(character, appNow);
  }
}

/** A tap in town where the stage would put it (3x: one CSS pixel an art pixel). */
function tapTown(root: ParentNode, at: Point): void {
  const hero = heroAt();
  const camera = cameraFor(
    { x: hero.x, y: hero.y - FOCUS_RISE2 },
    { width: 390, height: 727 },
    { width: TOWN2_W, height: TOWN2_H },
  );
  const canvas = root.querySelector<HTMLCanvasElement>('.scene canvas.scene-canvas')!;
  const where = { bubbles: true, clientX: at.x - camera.x, clientY: at.y - camera.y };
  canvas.dispatchEvent(new MouseEvent('pointerdown', where));
  canvas.dispatchEvent(new MouseEvent('pointerup', where));
}

const click = (root: ParentNode, text: string): void =>
  [...root.querySelectorAll<HTMLButtonElement>('button')]
    .find((b) => b.textContent === text)!
    .click();

function rowOut(view: View): void {
  const box = town2Scene().things.find((t) => t.id === 'rowboat')!.tap!;
  tapTown(view.el, { x: box.x + box.w / 2, y: box.y + box.h / 2 });
  wait(view, 6000);
  click(view.el, 'Row out to Brinebeard’s Grotto');
  resize(844, 390);
  wait(view, 100);
}

/** The page reloaded: the scene's memory gone, the Town tab built again from what the shell kept. */
function reload(shell: Shell): View {
  document.body.replaceChildren();
  observers = [];
  resetTown();
  const view = shown(shell);
  resize(844, 390);
  return view;
}

describe('a run kept through a reload', () => {
  it('is handed to the shell as it rows out, when something falls, and every few seconds', () => {
    const shell = keeper();
    const view = shown(shell);
    rowOut(view);
    expect(shell.keeps).toBeGreaterThanOrEqual(1);
    expect(shell.held!.dungeon).toBe('brinebeards_grotto');
    expect(shell.held!.scene).toBe(RUN_SCENE_VERSION);
    expect(keptAtOf(shell.held!.data)).toBeGreaterThan(0);
    // Nothing worth keeping changes standing still far from the crabs: once every few seconds.
    let before = shell.keeps;
    wait(view, KEEP_EVERY_MS * 3 + 100);
    expect(shell.keeps - before).toBeGreaterThanOrEqual(3);
    expect(shell.keeps - before).toBeLessThanOrEqual(4);
    // A crab felled: kept on that frame.
    before = shell.keeps;
    const run = runNow()!;
    const crab = run.battle!.foes.find((f) => f.room === 'pools')!;
    keepRun({
      ...run,
      battle: {
        ...run.battle!,
        foes: run.battle!.foes.map((f) =>
          f.key === crab.key ? { ...f, hp: 0, diedAt: run.battle!.clock } : f,
        ),
        tally: { ...run.battle!.tally, kills: run.battle!.tally.kills + 1 },
      },
    });
    wait(view, 50);
    expect(shell.keeps).toBe(before + 1);
  });

  it('is handed over at once when the page is hidden, before the app’s own save', () => {
    const shell = keeper();
    const view = shown(shell);
    rowOut(view);
    wait(view, 1000);
    const before = shell.keeps;
    window.dispatchEvent(new Event('pagehide'));
    expect(shell.keeps).toBe(before + 1);
    expect((shell.held!.data as { ms: number }).ms).toBe(runNow()!.ms);
  });

  it('is taken up after a reload in the same room, as it stood, paused behind Resume', () => {
    const shell = keeper();
    let view = shown(shell);
    rowOut(view);
    // Walk into the fight a while: the crabs come.
    wait(view, 8000);
    window.dispatchEvent(new Event('pagehide'));
    const was = runNow()!;
    view = reload(shell);
    const back = runNow()!;
    expect(snapshotRun(back)).toEqual(snapshotRun(was));
    // Paused: the clock does not run and nothing can hit him until Resume is pressed.
    const resume = view.el.querySelector('.dungeon-resume');
    expect(resume).not.toBeNull();
    expect(resume!.textContent).toMatch(/Resume/);
    wait(view, 5000);
    expect(runNow()!.ms).toBe(was.ms);
    expect(runNow()!.battle!.hp).toBe(was.battle!.hp);
    // The bars are gone and the idle clock waits, as on rowing out.
    expect(shell.calls.slice(-2)).toEqual(['full:true', 'pause:true']);
    click(view.el, 'Resume');
    expect(view.el.querySelector('.dungeon-resume')).toBeNull();
    wait(view, 1000);
    expect(runNow()!.ms).toBeGreaterThan(was.ms);
  });

  it('goes on after Resume exactly as it would have without the reload, through the shell', () => {
    // The unbroken run: kept, then played on for 20 s.
    const shell = keeper();
    let view = shown(shell);
    rowOut(view);
    // The crabs brought to him, awake: a fight, dice and all.
    const run = runNow()!;
    keepRun({
      ...run,
      battle: {
        ...run.battle!,
        foes: run.battle!.foes.map((f, i) =>
          f.room === 'pools'
            ? { ...f, at: centreOf({ col: 5, row: 4 + 2 * i }, T), path: [], aware: true }
            : f,
        ),
      },
    });
    // And one of them his target: he fights back.
    const near = runNow()!;
    const aimed = targetFoe(
      near.battle!,
      placeOf(GROTTO_DUNGEON, near),
      near.play,
      near.battle!.foes.find((f) => f.room === 'pools')!.key,
    );
    keepRun({ ...near, battle: aimed.battle, play: aimed.play });
    wait(view, 3000);
    window.dispatchEvent(new Event('pagehide'));
    const keptRun = shell.held!;
    const keptSeed = runNow()!.battle!.seed;
    wait(view, 20_000);
    const after = runNow()!;
    // Something happened in those 20 s: blows given, and the dice rolled for them.
    const crabs = after.battle!.foes.filter((f) => f.room === 'pools');
    expect(crabs.some((f) => f.hp < after.battle!.monsters[f.monster]!.hp)).toBe(true);
    expect(after.battle!.seed).not.toBe(keptSeed);
    const unbroken = snapshotRun(after);
    // The same kept run taken up after a reload and played on for the same 20 s.
    const again = keeper(keptRun);
    view = reload(again);
    click(view.el, 'Resume');
    // The stage's first frame after it is built is a moment of no time: as in the unbroken run's.
    wait(view, 20_000);
    expect(snapshotRun(runNow()!)).toEqual(unbroken);
  });

  it('is settled, never taken up, when it was kept too long ago', () => {
    const shell = keeper();
    let view = shown(shell);
    rowOut(view);
    wait(view, 2000);
    window.dispatchEvent(new Event('pagehide'));
    appNow += TAKE_UP_MS + 1000;
    view = reload(shell);
    expect(shell.calls.filter((c) => c.startsWith('settle:'))).toEqual(['settle:']);
    expect(shell.held).toBeNull();
    expect(runNow()).toBeNull();
    expect(view.el.querySelector('.dungeon')).toBeNull();
  });

  it('settles one it cannot read from its spoils, and lets it go', () => {
    const shell = keeper();
    let view = shown(shell);
    rowOut(view);
    window.dispatchEvent(new Event('pagehide'));
    shell.held = { ...shell.held!, scene: RUN_SCENE_VERSION + 1 };
    view = reload(shell);
    expect(shell.calls).toContain('settle:');
    expect(shell.held).toBeNull();
    expect(runNow()).toBeNull();
    expect(view.el.querySelector('.dungeon')).toBeNull();
  });

  it('is let go of when the run ends, and never kept again after', () => {
    const shell = keeper();
    const view = shown(shell);
    rowOut(view);
    wait(view, 500);
    view.el.querySelector<HTMLButtonElement>('.dungeon-leave')!.click();
    click(view.el, 'Row back');
    expect(shell.calls).toContain('keep:null');
    expect(shell.held).toBeNull();
    const keeps = shell.keeps;
    wait(view, KEEP_EVERY_MS * 2);
    window.dispatchEvent(new Event('pagehide'));
    expect(shell.keeps).toBe(keeps);
    expect(shell.held).toBeNull();
    // A reload now builds the town, not an old run.
    reload(shell);
    expect(runNow()).toBeNull();
  });
});
