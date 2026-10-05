import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { cameraFor } from '../../src/scene/camera';
import { FOCUS_RISE } from '../../src/scene/stage';
import { centreOf, type Point } from '../../src/scene/tileMap';
import { TOWN_HEIGHT, TOWN_START, TOWN_WIDTH } from '../../src/scene/town';
import { heroAt, heroNow, resetTown, townView } from '../../src/scene/townView';
import type { Shell, View } from '../../src/ui/view';

// jsdom has no canvas to draw on and lays nothing out, so these tell the
// scene its size by hand and tap it the way a thumb would, then check what
// the player can see beside the picture: the panel, its button, the time.

/** The Town screen on a 390-wide phone at 3x: 390 x 727 CSS pixels, 4 device pixels an art pixel. */
const CSS = { width: 390, height: 727 };
const K = 4 / 3;

let observers: ResizeObserverCallback[];
let clock: number;
let frames: number;

beforeEach(() => {
  observers = [];
  clock = 1000;
  frames = 0;
  resetTown();
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
  vi.stubGlobal('requestAnimationFrame', () => ++frames);
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
    settleRun: (spoils) => calls.push(`settle:${JSON.stringify(spoils)}`),
  };
}

/** A Town tab on the page, laid out at phone size. */
function shown(shell?: Shell): View {
  const view = townView(newGame('Cody', 0), CONTENT, shell);
  document.body.append(view.el);
  const entry = { contentRect: { width: CSS.width, height: 727.4 } } as ResizeObserverEntry;
  for (const callback of observers) callback([entry], {} as ResizeObserver);
  view.update?.(newGame('Cody', 0));
  return view;
}

/** Taps the scene at a point in the town, seen from where the hero stands. */
function tap(view: View, at: Point, hero: Point): void {
  const camera = cameraFor(
    { x: hero.x, y: hero.y - FOCUS_RISE },
    { width: (CSS.width * 3) / 4, height: (CSS.height * 3) / 4 },
    { width: TOWN_WIDTH, height: TOWN_HEIGHT },
  );
  const canvas = view.el.querySelector('canvas')!;
  const where = { bubbles: true, clientX: (at.x - camera.x) * K, clientY: (at.y - camera.y) * K };
  canvas.dispatchEvent(new MouseEvent('pointerdown', where));
  canvas.dispatchEvent(new MouseEvent('pointerup', where));
}

/** Lets `ms` pass a frame at a time. */
function wait(view: View, ms: number): void {
  for (let t = 0; t < ms; t += 50) {
    clock += 50;
    view.update?.(newGame('Cody', 0));
  }
}

const start = centreOf(TOWN_START);
/** The crate beside the tavern's door that opens the bank. */
const crate = { x: 168, y: 184 };

describe('townView', () => {
  it('is a canvas scene that says what it is, with a sun-and-moon button', () => {
    const view = shown();
    expect(view.el.querySelector('canvas')!.getAttribute('aria-label')).toMatch(/Tap the ground/);
    expect(view.el.querySelector('.scene-light')).not.toBeNull();
  });

  it('runs on the shell’s frames, with no loop of its own', () => {
    const view = shown();
    wait(view, 500);
    expect(frames).toBe(0);
  });

  it('sizes its canvas to whole CSS and device pixels', () => {
    const canvas = shown().el.querySelector('canvas')!;
    expect(canvas.style.width).toBe('390px');
    expect(canvas.style.height).toBe('727px');
  });

  it('walks the hero up to the crate and opens it, and its button opens the bank', () => {
    const shell = shellSpy();
    const view = shown(shell);
    tap(view, crate, start);
    expect(view.el.querySelector('.scene-panel')).toBeNull();
    wait(view, 3000);
    const panel = view.el.querySelector('.scene-panel')!;
    expect(panel.querySelector('h2')!.textContent).toBe('Your crate');
    expect(panel.querySelectorAll('p').length).toBeGreaterThan(0);
    const open = [...panel.querySelectorAll('button')].find(
      (b) => b.textContent === 'Open the bank',
    )!;
    open.click();
    expect(shell.calls).toEqual(['tab:bank']);
  });

  it('closes the panel with its close button or a tap on the ground', () => {
    const view = shown();
    tap(view, crate, start);
    wait(view, 3000);
    view.el.querySelector<HTMLButtonElement>('.scene-panel-close')!.click();
    expect(view.el.querySelector('.scene-panel')).toBeNull();

    const there = centreOf({ col: 11, row: 11 });
    tap(view, crate, there);
    wait(view, 200);
    expect(view.el.querySelector('.scene-panel')).not.toBeNull();
    tap(view, centreOf({ col: 12, row: 18 }), there);
    expect(view.el.querySelector('.scene-panel')).toBeNull();
  });

  it('keeps the hero and an open panel when the shell rebuilds the tab', () => {
    const first = shown();
    tap(first, crate, start);
    wait(first, 3000);
    first.el.remove();
    const again = shown();
    expect(again.el.querySelector('.scene-panel h2')!.textContent).toBe('Your crate');
  });

  it('offers the pine’s way to Woodcutting', () => {
    const shell = shellSpy();
    const view = shown(shell);
    // A pine on the west edge of the square, half off the map.
    tap(view, { x: 8, y: 190 }, start);
    wait(view, 4000);
    expect(view.el.querySelector('.scene-panel h2')!.textContent).toBe('Pine');
    [...view.el.querySelectorAll<HTMLButtonElement>('.scene-panel button')]
      .find((b) => b.textContent === 'Go to Woodcutting')!
      .click();
    expect(shell.calls).toEqual(['skill:woodcutting']);
  });

  it('follows the clock for day and dusk, and its button flips it for the session', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 4, 12, 0));
    const view = shown();
    const button = view.el.querySelector<HTMLButtonElement>('.scene-light')!;
    expect(button.dataset.time).toBe('day');
    vi.setSystemTime(new Date(2026, 9, 4, 19, 0));
    wait(view, 50);
    expect(button.dataset.time).toBe('dusk');
    button.click();
    expect(button.dataset.time).toBe('day');
    expect(button.getAttribute('aria-label')).toMatch(/Switch to dusk/);
    // The choice lasts while the page does, across rebuilds of the tab.
    view.el.remove();
    expect(shown().el.querySelector<HTMLElement>('.scene-light')!.dataset.time).toBe('day');
    vi.useRealTimers();
  });

  it('says something else after dark where a thing has a line for it', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 4, 12, 0));
    const view = shown();
    // The tavern door, from the step in front of it.
    const step = centreOf({ col: 8, row: 11 });
    tap(view, step, start);
    wait(view, 3000);
    tap(view, { x: 148, y: 160 }, step);
    wait(view, 600);
    const day = view.el.querySelector('.scene-panel p')!.textContent;
    view.el.querySelector<HTMLButtonElement>('.scene-light')!.click();
    const dusk = view.el.querySelector('.scene-panel p')!.textContent;
    expect(view.el.querySelector('.scene-panel h2')!.textContent).toBe('The Gull & Anchor');
    expect(dusk).not.toBe(day);
    vi.useRealTimers();
  });

  it('walks up to the smith, who says something new each visit and offers Smithing', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 4, 12, 0));
    const shell = shellSpy();
    const view = shown(shell);
    const smith = { x: 328, y: 150 };
    const away = centreOf({ col: 18, row: 13 });
    tap(view, away, start);
    wait(view, 4000);
    tap(view, smith, away);
    wait(view, 2000);
    const panel = () => view.el.querySelector('.scene-panel')!;
    expect(panel().querySelector('h2')!.textContent).toMatch(/smith/);
    const first = panel().querySelector('.scene-say')!.textContent;
    view.el.querySelector<HTMLButtonElement>('.scene-panel-close')!.click();
    const beside = centreOf({ col: 19, row: 10 });
    tap(view, smith, beside);
    wait(view, 200);
    const second = panel().querySelector('.scene-say')!.textContent;
    expect(second).not.toBe(first);
    // After dark, the round starts with an evening line, which is not one of the day's.
    view.el.querySelector<HTMLButtonElement>('.scene-light')!.click();
    expect(panel().querySelector('.scene-say')!.textContent).not.toBe(second);
    [...panel().querySelectorAll('button')]
      .find((b) => b.textContent === 'Go to Smithing')!
      .click();
    expect(shell.calls).toEqual(['skill:smithing']);
    vi.useRealTimers();
  });

  it('opens the trader from her stall’s counter, with the bank behind her button', () => {
    const shell = shellSpy();
    const view = shown(shell);
    tap(view, { x: 70, y: 250 }, start);
    wait(view, 4000);
    const panel = view.el.querySelector('.scene-panel')!;
    expect(panel.querySelector('h2')!.textContent).toMatch(/trader/);
    [...panel.querySelectorAll('button')].find((b) => b.textContent === 'Open the bank')!.click();
    expect(shell.calls).toEqual(['tab:bank']);
  });

  it('walks out along the pier to the captain', () => {
    const view = shown();
    tap(view, { x: 216, y: 345 }, start);
    wait(view, 4000);
    expect(view.el.querySelector('.scene-panel h2')!.textContent).toMatch(/Captain/);
    expect(view.el.querySelector('.scene-panel .scene-say')!.textContent!.length).toBeGreaterThan(
      0,
    );
  });
  it('steers while a finger is held on the ground, re-aiming as it moves', () => {
    const view = shown();
    const canvas = view.el.querySelector('canvas')!;
    const camera = cameraFor(
      { x: start.x, y: start.y - FOCUS_RISE },
      { width: (CSS.width * 3) / 4, height: (CSS.height * 3) / 4 },
      { width: TOWN_WIDTH, height: TOWN_HEIGHT },
    );
    const at = (p: Point) => ({
      bubbles: true,
      clientX: (p.x - camera.x) * K,
      clientY: (p.y - camera.y) * K,
    });
    // Held on the square to the east, then dragged round to the west.
    canvas.dispatchEvent(new MouseEvent('pointerdown', at(centreOf({ col: 21, row: 17 }))));
    wait(view, 400);
    expect(heroAt().x).toBeGreaterThan(start.x);
    canvas.dispatchEvent(new MouseEvent('pointermove', at(centreOf({ col: 7, row: 13 }))));
    wait(view, 4000);
    expect(heroAt().x).toBeLessThan(start.x - 16);
    canvas.dispatchEvent(new MouseEvent('pointerup', at(centreOf({ col: 7, row: 13 }))));
    wait(view, 2000);
    expect(heroAt().walking).toBe(false);
  });

  it('dresses the hero in what the character wears, as soon as it changes', () => {
    const view = shown();
    const plain = heroNow()!.dressedAs;
    const armed = {
      ...newGame('Cody', 0),
      equipment: { main_hand: { item: 'iron_sword', qty: 1 } },
    };
    view.update?.(armed);
    expect(heroNow()!.dressedAs).not.toBe(plain);
    expect(heroNow()!.dressedAs).toMatch(/iron_sword/);
  });
});
