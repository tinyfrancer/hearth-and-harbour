import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { cameraFor } from '../../src/scene/camera';
import { DUNGEON_INSETS } from '../../src/scene/dungeonView';
import { GROTTO } from '../../src/scene/grotto';
import { FOCUS_RISE } from '../../src/scene/stage';
import { centreOf, type Point } from '../../src/scene/tileMap';
import { TOWN_HEIGHT, TOWN_WIDTH } from '../../src/scene/town';
import { BOAT_LANDING, heroAt, resetTown, runNow, townView } from '../../src/scene/townView';
import { mountApp } from '../../src/ui/app';
import type { Shell, View } from '../../src/ui/view';

// A run from the boat to the end and back, driven the way a thumb would in
// jsdom: the scene is told its size by hand (portrait or on its side) and
// tapped where things are, and the shell is a spy that records what it is asked.

let observers: ResizeObserverCallback[];
let clock: number;
/** The Town screen's size, as the scene is told it. */
let screen: { width: number; height: number };

beforeEach(() => {
  observers = [];
  clock = 1000;
  resetTown();
  localStorage.clear();
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

function shellSpy(): Shell & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    openTab: (tab) => calls.push(`tab:${tab}`),
    openSkill: (id) => calls.push(`skill:${id}`),
    pauseIdle: (on) => calls.push(`pause:${on}`),
    fullScreen: (on) => calls.push(`full:${on}`),
  };
}

/** Tells every scene on the page its size, as a phone held one way or the other does. */
function resize(width: number, height: number): void {
  screen = { width, height };
  const entry = { contentRect: { width, height } } as ResizeObserverEntry;
  for (const callback of [...observers]) callback([entry], {} as ResizeObserver);
}

function shown(shell?: Shell): View {
  const view = townView(newGame('Cody', 0), CONTENT, shell);
  document.body.append(view.el);
  resize(390, 727);
  view.update?.(newGame('Cody', 0));
  return view;
}

function wait(view: View, ms: number): void {
  for (let t = 0; t < ms; t += 50) {
    clock += 50;
    view.update?.(newGame('Cody', 0));
  }
}

/** Taps a point in the town or in the room the run is in, worked out as the stage does. */
function tap(root: ParentNode, at: Point): void {
  const k = 4 / 3;
  const run = runNow();
  let camera: Point;
  if (run) {
    const rows = GROTTO.rooms[run.room]!;
    const world = { width: rows[0]!.length * 16, height: rows.length * 16 };
    const view = { width: (screen.width * 3) / 4, height: (screen.height * 3) / 4 };
    const room = {
      top: Math.round(DUNGEON_INSETS.top / k),
      right: Math.round(DUNGEON_INSETS.right / k),
      bottom: Math.round(DUNGEON_INSETS.bottom / k),
      left: Math.round(DUNGEON_INSETS.left / k),
    };
    const hero = run.play.walker.at;
    const c = cameraFor(
      { x: hero.x, y: hero.y - FOCUS_RISE },
      {
        width: view.width - room.left - room.right,
        height: view.height - room.top - room.bottom,
      },
      world,
    );
    camera = { x: c.x - room.left, y: c.y - room.top };
  } else {
    const hero = heroAt();
    camera = cameraFor(
      { x: hero.x, y: hero.y - FOCUS_RISE },
      { width: (screen.width * 3) / 4, height: (screen.height * 3) / 4 },
      { width: TOWN_WIDTH, height: TOWN_HEIGHT },
    );
  }
  const canvas = root.querySelector('canvas')!;
  const where = {
    bubbles: true,
    clientX: (at.x - camera.x) * k,
    clientY: (at.y - camera.y) * k,
  };
  canvas.dispatchEvent(new MouseEvent('pointerdown', where));
  canvas.dispatchEvent(new MouseEvent('pointerup', where));
}

const click = (root: ParentNode, text: string): void =>
  [...root.querySelectorAll<HTMLButtonElement>('button')]
    .find((b) => b.textContent === text)!
    .click();

/** From the start of town to the boat's panel, and out in it. */
function rowOut(view: View): void {
  tap(view.el, centreOf({ col: 11, row: 17 }));
  wait(view, 3000);
  tap(view.el, { x: 130, y: 345 });
  wait(view, 3000);
  expect(view.el.querySelector('.scene-panel h2')!.textContent).toBe('Rowing boat');
  click(view.el, 'Row out to the grotto (unfinished)');
}

const prompt = (view: View) => view.el.querySelector<HTMLElement>('.dungeon-prompt')!;

describe('the way into the grotto', () => {
  it('rows out from the boat: the bars go, the idle task waits, and the phone must turn', () => {
    const shell = shellSpy();
    const view = shown(shell);
    rowOut(view);
    expect(shell.calls).toEqual(['full:true', 'pause:true']);
    expect(view.el.querySelector('.dungeon')).not.toBeNull();
    resize(390, 844);
    wait(view, 1000);
    expect(prompt(view).hidden).toBe(false);
    expect(prompt(view).textContent).toMatch(/Turn your phone/);
    // Behind the prompt the run has not begun.
    expect(runNow()!.ms).toBe(0);
    resize(844, 390);
    wait(view, 1000);
    expect(prompt(view).hidden).toBe(true);
    expect(runNow()!.ms).toBe(1000);
  });

  it('pauses the run behind the same prompt when the phone is turned back', () => {
    const shell = shellSpy();
    const view = shown(shell);
    rowOut(view);
    resize(844, 390);
    tap(view.el, centreOf({ col: 20, row: 4 }));
    wait(view, 500);
    const there = { ...runNow()!.play.walker.at };
    const ms = runNow()!.ms;
    resize(390, 844);
    wait(view, 3000);
    expect(prompt(view).hidden).toBe(false);
    expect(runNow()!.ms).toBe(ms);
    expect(runNow()!.play.walker.at).toEqual(there);
    // Nothing more was asked of the shell: the idle task still waits.
    expect(shell.calls).toEqual(['full:true', 'pause:true']);
  });

  it('asks once more before Leave acts, then gives the clock and the bars back', () => {
    const shell = shellSpy();
    const view = shown(shell);
    rowOut(view);
    resize(844, 390);
    wait(view, 200);
    view.el.querySelector<HTMLButtonElement>('.dungeon-leave')!.click();
    expect(view.el.querySelector('.dungeon-confirm')!.textContent).toMatch(/Row back to town\?/);
    expect(shell.calls).toEqual(['full:true', 'pause:true']);
    click(view.el, 'Stay');
    expect(view.el.querySelector('.dungeon-confirm')!.childElementCount).toBe(0);
    expect(view.el.querySelector<HTMLElement>('.dungeon-leave')!.hidden).toBe(false);
    view.el.querySelector<HTMLButtonElement>('.dungeon-leave')!.click();
    click(view.el, 'Row back');
    expect(shell.calls).toEqual(['full:true', 'pause:true', 'full:false', 'pause:false']);
    expect(view.el.querySelector('.dungeon')).toBeNull();
    expect(view.el.querySelector('.scene-canvas')).not.toBeNull();
    expect(runNow()).toBeNull();
    // Back on the quay by the boat.
    const hero = heroAt();
    expect([hero.x, hero.y]).toEqual([centreOf(BOAT_LANDING).x, centreOf(BOAT_LANDING).y]);
  });

  it('walks three rooms through their doors to the end, and back to town from the results', () => {
    const shell = shellSpy();
    const view = shown(shell);
    rowOut(view);
    resize(844, 390);
    wait(view, 100);
    const rooms: string[] = [runNow()!.room];
    const goTo = (col: number, row: number, ms: number) => {
      // A browser tells a new room's canvas its size as it goes on the page; jsdom is told here.
      resize(844, 390);
      tap(view.el, centreOf({ col, row }));
      wait(view, ms);
      if (rooms.at(-1) !== runNow()!.room) rooms.push(runNow()!.room);
    };
    goTo(23, 4, 6000);
    goTo(38, 0, 12_000);
    goTo(10, 2, 4000);
    expect(rooms).toEqual(['landing', 'pools', 'cove']);
    const results = view.el.querySelector('.dungeon-results')!;
    expect(results.textContent).toMatch(/You reached the end/);
    expect(results.textContent).toMatch(/Time taken: 0:\d\d/);
    // The run is over: the idle task carries on while the results are read, still full screen.
    expect(shell.calls).toEqual(['full:true', 'pause:true', 'full:true', 'pause:false']);
    expect(view.el.querySelector<HTMLElement>('.dungeon-leave')!.hidden).toBe(true);
    click(view.el, 'Back to town');
    expect(shell.calls.slice(-2)).toEqual(['full:false', 'pause:false']);
    expect(view.el.querySelector('.dungeon')).toBeNull();
  });

  it('carries on with a run when the shell rebuilds the tab, and never shows the town paused', () => {
    const shell = shellSpy();
    const first = shown(shell);
    rowOut(first);
    first.el.remove();
    shell.calls.length = 0;
    const again = shown(shell);
    expect(again.el.querySelector('.dungeon')).not.toBeNull();
    // The rebuilt tab makes sure of what the run needs, in case the shell let go of it.
    expect(shell.calls).toEqual(['full:true', 'pause:true']);
    again.el.querySelector<HTMLButtonElement>('.dungeon-leave')!.click();
    click(again.el, 'Row back');
    again.el.remove();
    shell.calls.length = 0;
    const town = shown(shell);
    expect(town.el.querySelector('.dungeon')).toBeNull();
    // Nothing was held, so nothing needs giving back.
    expect(shell.calls).toEqual([]);
  });
});

describe('the idle task during a run', () => {
  it('makes no progress while the run is on, and carries on afterwards', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const saves = new LocalStorageSaveService();
    const app = mountApp(root, { saves, content: CONTENT, now: () => clock });
    root.querySelector<HTMLInputElement>('input[name="character-name"]')!.value = 'Cody';
    root.querySelector<HTMLFormElement>('form')!.requestSubmit();
    root.querySelector<HTMLElement>('[data-skill="woodcutting"]')!.click();
    root.querySelector<HTMLElement>('[data-action="chop_pine"]')!.click();
    root.querySelector<HTMLElement>('.tab[data-tab="town"]')!.click();
    resize(390, 727);
    const frames = (ms: number) => {
      for (let t = 0; t < ms; t += 50) {
        clock += 50;
        app.tick();
      }
    };
    frames(100);
    tap(root, centreOf({ col: 11, row: 17 }));
    frames(3000);
    tap(root, { x: 130, y: 345 });
    frames(3000);
    click(root, 'Row out to the grotto (unfinished)');
    expect(root.classList.contains('fullscreen')).toBe(true);
    app.save();
    const before = saves.load()!;
    resize(844, 390);
    // A long run, frame by frame, and a stretch long enough to look like time away.
    frames(20_000);
    clock += 30 * 60_000;
    frames(1000);
    app.save();
    expect(saves.load()!.bank).toEqual(before.bank);
    expect(saves.load()!.skills).toEqual(before.skills);
    root.querySelector<HTMLButtonElement>('.dungeon-leave')!.click();
    click(root, 'Row back');
    expect(root.classList.contains('fullscreen')).toBe(false);
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    frames(6100);
    app.save();
    const logs = (state: typeof before) => state.bank.pine_logs ?? 0;
    expect(logs(saves.load()!)).toBe(logs(before) + 2);
  });
});
