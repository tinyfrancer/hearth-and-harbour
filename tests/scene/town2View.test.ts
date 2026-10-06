import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { TOWN2_H, TOWN2_TILE, TOWN2_W } from '../../src/art/town2/town';
import { cameraFor } from '../../src/scene/camera';
import { forgetPreview } from '../../src/scene/preview';
import { centreOf, type Point } from '../../src/scene/tileMap';
import { TOWN_START } from '../../src/scene/town';
import { BOAT_LANDING2, TOWN2_START_CELL, town2Scene } from '../../src/scene/town2';
import { heroAt, loadTown2, resetTown, town2ArtNow, townView } from '../../src/scene/townView';
import type { Shell, View } from '../../src/ui/view';

// The Town tab with ?town=2, in jsdom, driven the way a thumb would: on a
// 390-wide phone at 3x the C-scale town is 3 device pixels an art pixel, so
// one CSS pixel is one art pixel and the view is 390 x 727 of the town.

const CSS = { width: 390, height: 727 };
const RISE = 30;

let observers: ResizeObserverCallback[];
let clock: number;

function address(search: string): void {
  window.history.replaceState(null, '', `/${search}`);
  forgetPreview();
}

beforeEach(async () => {
  // The C-scale town's code is loaded on demand; the Town tab waits for it, and so do these.
  await loadTown2();
  observers = [];
  clock = 1000;
  address('?town=2');
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
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('devicePixelRatio', 3);
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  document.body.replaceChildren();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  address('');
  resetTown();
});

function shellSpy(): Shell & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    openTab: (tab) => calls.push(`tab:${tab}`),
    openSkill: (id) => calls.push(`skill:${id}`),
    pauseIdle: (on) => calls.push(`pause:${on}`),
    fullScreen: (on) => calls.push(`full:${on}`),
    settleRun: () => calls.push('settle'),
  };
}

function shown(shell?: Shell): View {
  const view = townView(newGame('Cody', 0), CONTENT, shell);
  document.body.append(view.el);
  const entry = { contentRect: { width: CSS.width, height: 727.4 } } as ResizeObserverEntry;
  for (const callback of observers) callback([entry], {} as ResizeObserver);
  view.update?.(newGame('Cody', 0));
  return view;
}

/** Taps the town at a point, seen from where the hero stands now. */
function tap(view: View, at: Point): void {
  const hero = heroAt();
  const camera = cameraFor({ x: hero.x, y: hero.y - RISE }, CSS, {
    width: TOWN2_W,
    height: TOWN2_H,
  });
  const canvas = view.el.querySelector('canvas')!;
  const where = { bubbles: true, clientX: at.x - camera.x, clientY: at.y - camera.y };
  canvas.dispatchEvent(new MouseEvent('pointerdown', where));
  canvas.dispatchEvent(new MouseEvent('pointerup', where));
}

function wait(view: View, ms: number): void {
  for (let t = 0; t < ms; t += 50) {
    clock += 50;
    view.update?.(newGame('Cody', 0));
  }
}

/** Walks up to a thing by its name, from wherever the hero is, in hops a screen long. */
function walkUpTo(view: View, id: string): HTMLElement | null {
  const thing = town2Scene().things.find((t) => t.id === id)!;
  const box = thing.tap!;
  const target = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  for (let hop = 0; hop < 12; hop++) {
    const hero = heroAt();
    const dx = target.x - hero.x;
    const dy = target.y - hero.y;
    const far = Math.max(Math.abs(dx) / 150, Math.abs(dy) / 280, 1);
    if (far === 1) {
      tap(view, target);
      wait(view, 20000);
      return view.el.querySelector('.scene-panel');
    }
    tap(view, { x: hero.x + dx / far, y: hero.y + dy / far });
    wait(view, 8000);
    view.el.querySelector<HTMLButtonElement>('.scene-panel-close')?.click();
  }
  return null;
}

const press = (panel: HTMLElement, label: string): void =>
  [...panel.querySelectorAll<HTMLButtonElement>('button')]
    .find((b) => b.textContent === label)!
    .click();

describe('the Town tab with ?town=2', () => {
  it('shows the C-scale town, the hero at its start', () => {
    const view = shown();
    expect(view.el.querySelector('canvas')!.getAttribute('aria-label')).toMatch(/Tap the ground/);
    expect(view.el.querySelector('canvas')!.style.width).toBe('390px');
    const start = centreOf(TOWN2_START_CELL, TOWN2_TILE);
    expect(heroAt()).toMatchObject({ x: start.x, y: start.y, walking: false, open: null });
    expect(town2ArtNow()).not.toBeNull();
  });

  it('walks to your crate and opens the bank through the shell', () => {
    const shell = shellSpy();
    const view = shown(shell);
    const panel = walkUpTo(view, 'crate-yours')!;
    expect(panel.querySelector('h2')!.textContent).toBe('Your crate');
    press(panel, 'Open the bank');
    expect(shell.calls).toEqual(['tab:bank']);
  });

  it('walks to the smithy’s door and offers Smithing', () => {
    const shell = shellSpy();
    const view = shown(shell);
    const panel = walkUpTo(view, 'smithy')!;
    expect(panel.querySelector('h2')!.textContent).toBe('The smithy');
    press(panel, 'Go to Smithing');
    expect(shell.calls).toEqual(['skill:smithing']);
  });

  it('walks up to the house, which is new', () => {
    const view = shown();
    const panel = walkUpTo(view, 'house')!;
    expect(panel.querySelector('h2')!.textContent).toBe('Your house');
  });

  it('opens the trader from the stall, and the oak offers Woodcutting', () => {
    const shell = shellSpy();
    const view = shown(shell);
    expect(walkUpTo(view, 'stall')!.querySelector('h2')!.textContent).toMatch(/trader/);
    view.el.querySelector<HTMLButtonElement>('.scene-panel-close')!.click();
    const oak = walkUpTo(view, 'oak')!;
    press(oak, 'Go to Woodcutting');
    expect(shell.calls).toEqual(['skill:woodcutting']);
  });

  it('rows out to the grotto from the boat and lands back beside it', () => {
    const shell = shellSpy();
    const view = shown(shell);
    const panel = walkUpTo(view, 'rowboat')!;
    expect(panel.querySelector('h2')!.textContent).toBe('Rowing boat');
    press(panel, 'Row out to Brinebeard’s Grotto');
    expect(shell.calls).toContain('pause:true');
    expect(shell.calls).toContain('full:true');
    view.el.querySelector<HTMLButtonElement>('.dungeon-leave')!.click();
    press(view.el, 'Row back');
    const landing = centreOf(BOAT_LANDING2, TOWN2_TILE);
    expect(heroAt()).toMatchObject({ x: landing.x, y: landing.y, open: null });
    expect(shell.calls.slice(-2)).toEqual(['full:false', 'pause:false']);
  });

  it('is the current town without the query, as before', () => {
    address('');
    resetTown();
    shown();
    const start = centreOf(TOWN_START);
    expect(heroAt()).toMatchObject({ x: start.x, y: start.y });
    expect(town2ArtNow()).toBeNull();
  });
});
