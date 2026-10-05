import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { cameraFor } from '../../src/scene/camera';
import { FOCUS_RISE } from '../../src/scene/stage';
import { centreOf, type Point } from '../../src/scene/tileMap';
import { TOWN_HEIGHT, TOWN_START, TOWN_WIDTH } from '../../src/scene/town';
import { resetTown, townView } from '../../src/scene/townView';
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
  canvas.dispatchEvent(
    new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: (at.x - camera.x) * K,
      clientY: (at.y - camera.y) * K,
    }),
  );
}

/** Lets `ms` pass a frame at a time. */
function wait(view: View, ms: number): void {
  for (let t = 0; t < ms; t += 50) {
    clock += 50;
    view.update?.(newGame('Cody', 0));
  }
}

const start = centreOf(TOWN_START);
/** The crate beside the tavern that opens the bank. */
const crate = { x: 136, y: 168 };

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
    wait(view, 1500);
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
    wait(view, 1500);
    view.el.querySelector<HTMLButtonElement>('.scene-panel-close')!.click();
    expect(view.el.querySelector('.scene-panel')).toBeNull();

    tap(view, crate, centreOf({ col: 8, row: 11 }));
    wait(view, 200);
    expect(view.el.querySelector('.scene-panel')).not.toBeNull();
    tap(view, centreOf({ col: 12, row: 18 }), centreOf({ col: 8, row: 11 }));
    expect(view.el.querySelector('.scene-panel')).toBeNull();
  });

  it('keeps the hero and an open panel when the shell rebuilds the tab', () => {
    const first = shown();
    tap(first, crate, start);
    wait(first, 1500);
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
    tap(view, centreOf({ col: 5, row: 11 }), start);
    wait(view, 2000);
    tap(view, { x: 94, y: 145 }, centreOf({ col: 5, row: 11 }));
    wait(view, 600);
    const day = view.el.querySelector('.scene-panel p')!.textContent;
    view.el.querySelector<HTMLButtonElement>('.scene-light')!.click();
    const dusk = view.el.querySelector('.scene-panel p')!.textContent;
    expect(view.el.querySelector('.scene-panel h2')!.textContent).toBe('The Gull & Anchor');
    expect(dusk).not.toBe(day);
    vi.useRealTimers();
  });
});
