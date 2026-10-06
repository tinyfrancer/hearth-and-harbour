import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOWN2_H, TOWN2_TILE, TOWN2_W } from '../../src/art/town2/town';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { cameraFor } from '../../src/scene/camera';
import { SCENE_BUTTONS } from '../../src/scene/stage';
import { centreOf, type Point } from '../../src/scene/tileMap';
import {
  BOAT_LANDING2,
  STANDING2,
  STROLLERS2,
  TOWN2_START_CELL,
  TOWNSFOLK2_AT,
  town2Scene,
} from '../../src/scene/town2';
import { STEPS, town2Facts, type TownAnswer, type TownRequest } from '../../src/scene/town2Facts';
import { FOCUS_RISE2, hero2Now, strollersAt } from '../../src/scene/town2Place';
import { heroAt, heroNow, resetTown, town2ArtNow, townView } from '../../src/scene/townView';
import type { Shell, View } from '../../src/ui/view';

// The Town tab in jsdom, driven the way a thumb would. jsdom has no canvas to
// draw on and lays nothing out, so these tell the scene its size by hand and
// tap it, then check what the player can see beside the picture: the panel,
// its button, the time, the loading state. On a 390-wide phone at 3x the town
// is 3 device pixels an art pixel, so one CSS pixel is one art pixel and the
// view is 390 x 727 of the town.

const CSS = { width: 390, height: 727 };

let observers: ResizeObserverCallback[];
let clock: number;
let frames: number;
let character: GameState;

beforeEach(() => {
  observers = [];
  clock = 1000;
  frames = 0;
  character = newGame('Cody', 0);
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

/** Tells every scene on the page its size. */
function layOut(): void {
  const entry = { contentRect: { width: CSS.width, height: 727.4 } } as ResizeObserverEntry;
  for (const callback of observers) callback([entry], {} as ResizeObserver);
}

/** A Town tab on the page, laid out at phone size. */
function shown(shell?: Shell): View {
  const view = townView(character, CONTENT, shell);
  document.body.append(view.el);
  layOut();
  view.update?.(character);
  return view;
}

/** Taps the town at a point, seen from where the hero stands now. */
function tap(view: View, at: Point): void {
  const hero = heroAt();
  const camera = cameraFor({ x: hero.x, y: hero.y - FOCUS_RISE2 }, CSS, {
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
    view.update?.(character);
  }
}

const thing = (id: string) => town2Scene().things.find((t) => t.id === id)!;

/** Where to tap a thing, or someone strolling where they are now. */
function middleOf(id: string): Point {
  const box = thing(id).tap;
  if (box) return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  const feet = strollersAt()[STROLLERS2.findIndex((p) => p.id === id)]!;
  return { x: feet.x, y: feet.y - 30 };
}

/** Walks up to a thing by its name, from wherever the hero is, in hops a screen long. */
function walkUpTo(view: View, id: string): HTMLElement | null {
  for (let hop = 0; hop < 12; hop++) {
    const target = middleOf(id);
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

const press = (root: HTMLElement, label: string): void =>
  [...root.querySelectorAll<HTMLButtonElement>('button')]
    .find((b) => b.textContent === label)!
    .click();

const start = centreOf(TOWN2_START_CELL, TOWN2_TILE);

describe('the Town tab', () => {
  it('is the town with no query string: a canvas scene that says what it is, the hero at its start', () => {
    window.history.replaceState(null, '', '/');
    const view = shown();
    expect(view.el.querySelector('canvas')!.getAttribute('aria-label')).toMatch(/Tap the ground/);
    expect(view.el.querySelector('.scene-light')).not.toBeNull();
    expect(heroAt()).toMatchObject({ x: start.x, y: start.y, walking: false, open: null });
    expect(town2ArtNow()).not.toBeNull();
    // Nothing to wait for where nothing can be painted.
    expect(view.el.querySelector('.scene-loading')).toBeNull();
  });

  it('is the same town whatever the address says', () => {
    window.history.replaceState(null, '', '/?town=1');
    shown();
    expect(heroAt()).toMatchObject({ x: start.x, y: start.y });
    window.history.replaceState(null, '', '/');
  });

  it('runs on the shell’s frames, with no loop of its own', () => {
    const view = shown();
    wait(view, 500);
    expect(frames).toBe(0);
  });

  it('sizes its canvas to whole CSS and device pixels, and puts its button where the reach test looks', () => {
    const view = shown();
    const canvas = view.el.querySelector('canvas')!;
    expect(canvas.style.width).toBe('390px');
    expect(canvas.style.height).toBe('727px');
    const light = view.el.querySelector<HTMLElement>('.scene-light')!;
    expect(light.style.left).toBe(`${SCENE_BUTTONS.light.left}px`);
    expect(light.style.top).toBe(`${SCENE_BUTTONS.light.top}px`);
    expect(light.style.width).toBe(`${SCENE_BUTTONS.light.width}px`);
  });

  it('walks to your crate and opens the bank through the shell', () => {
    const shell = shellSpy();
    const view = shown(shell);
    const panel = walkUpTo(view, 'crate-yours')!;
    expect(panel.querySelector('h2')!.textContent).toBe('Your crate');
    press(panel, 'Open the bank');
    expect(shell.calls).toEqual(['tab:bank']);
  });

  it('closes the panel with its close button or a tap on the ground, and keeps it over a rebuild', () => {
    const view = shown();
    walkUpTo(view, 'crate-yours');
    view.el.querySelector<HTMLButtonElement>('.scene-panel-close')!.click();
    expect(view.el.querySelector('.scene-panel')).toBeNull();
    walkUpTo(view, 'well');
    expect(view.el.querySelector('.scene-panel h2')!.textContent).toBe('The well');
    view.el.remove();
    const again = shown();
    expect(again.el.querySelector('.scene-panel h2')!.textContent).toBe('The well');
    tap(again, { x: heroAt().x - 60, y: heroAt().y + 10 });
    expect(again.el.querySelector('.scene-panel')).toBeNull();
  });

  it('walks to the smithy’s door and offers Smithing', () => {
    const shell = shellSpy();
    const view = shown(shell);
    const panel = walkUpTo(view, 'smithy')!;
    expect(panel.querySelector('h2')!.textContent).toBe('The smithy');
    press(panel, 'Go to Smithing');
    expect(shell.calls).toEqual(['skill:smithing']);
  });

  it('walks up to the house', () => {
    const view = shown();
    expect(walkUpTo(view, 'house')!.querySelector('h2')!.textContent).toBe('Your house');
  });

  it('opens the trader from the stall, and the oak offers Woodcutting', () => {
    const shell = shellSpy();
    const view = shown(shell);
    const stall = walkUpTo(view, 'stall')!;
    expect(stall.querySelector('h2')!.textContent).toMatch(/trader/);
    view.el.querySelector<HTMLButtonElement>('.scene-panel-close')!.click();
    press(walkUpTo(view, 'oak')!, 'Go to Woodcutting');
    expect(shell.calls).toEqual(['skill:woodcutting']);
  });

  it('walks up to the smith, who says something new each visit, and an evening line after dark', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 4, 12, 0));
    const view = shown();
    const panel = () => view.el.querySelector('.scene-panel')!;
    walkUpTo(view, 'smith');
    expect(panel().querySelector('h2')!.textContent).toMatch(/smith/);
    const first = panel().querySelector('.scene-say')!.textContent;
    view.el.querySelector<HTMLButtonElement>('.scene-panel-close')!.click();
    walkUpTo(view, 'smith');
    const second = panel().querySelector('.scene-say')!.textContent;
    expect(second).not.toBe(first);
    view.el.querySelector<HTMLButtonElement>('.scene-light')!.click();
    expect(panel().querySelector('.scene-say')!.textContent).not.toBe(second);
    vi.useRealTimers();
  });

  it('walks up to each villager, who has a name and a line of their own', () => {
    const view = shown();
    const heard = new Set<string>();
    for (const id of ['alewife', 'market', 'docker', 'elder']) {
      const panel = walkUpTo(view, id);
      expect(panel, id).not.toBeNull();
      const name = panel!.querySelector('h2')!.textContent!;
      expect(name).toBe(TOWNSFOLK2_AT.find((p) => p.id === id)!.use.name);
      const said = panel!.querySelector('.scene-say')!.textContent!;
      expect(said.length).toBeGreaterThan(10);
      heard.add(said);
      // Nobody but the townsfolk with work offers a button.
      expect(panel!.querySelector('.btn')).toBeNull();
      view.el.querySelector<HTMLButtonElement>('.scene-panel-close')!.click();
    }
    expect(heard.size).toBe(4);
  });

  it('stops someone strolling when they are tapped, and they wait for the hero to talk', () => {
    const view = shown();
    const i = STROLLERS2.findIndex((p) => p.id === 'elder');
    // Wait until the old man is on his way somewhere.
    let before = strollersAt()[i]!;
    for (let k = 0; k < 400; k++) {
      wait(view, 100);
      const now = strollersAt()[i]!;
      const moving = now.x !== before.x || now.y !== before.y;
      before = now;
      if (moving) break;
    }
    tap(view, middleOf('elder'));
    const stopped = strollersAt()[i]!;
    expect(heroAt().walking).toBe(true);
    wait(view, 6000);
    expect(strollersAt()[i]).toEqual(stopped);
    expect(view.el.querySelector('.scene-panel h2')!.textContent).toBe(STROLLERS2[i]!.use.name);
    // Closed, he goes on his way.
    view.el.querySelector<HTMLButtonElement>('.scene-panel-close')!.click();
    wait(view, 3000);
    expect(strollersAt()[i]).not.toEqual(stopped);
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
    view.el.remove();
    expect(shown().el.querySelector<HTMLElement>('.scene-light')!.dataset.time).toBe('day');
    vi.useRealTimers();
  });

  it('steers while a finger is held on the ground, re-aiming as it moves', () => {
    const view = shown();
    const canvas = view.el.querySelector('canvas')!;
    const camera = cameraFor({ x: start.x, y: start.y - FOCUS_RISE2 }, CSS, {
      width: TOWN2_W,
      height: TOWN2_H,
    });
    const at = (p: Point) => ({ bubbles: true, clientX: p.x - camera.x, clientY: p.y - camera.y });
    canvas.dispatchEvent(new MouseEvent('pointerdown', at({ x: start.x + 150, y: start.y })));
    wait(view, 400);
    expect(heroAt().x).toBeGreaterThan(start.x);
    canvas.dispatchEvent(new MouseEvent('pointermove', at({ x: start.x - 150, y: start.y - 40 })));
    wait(view, 4000);
    expect(heroAt().x).toBeLessThan(start.x - 24);
    canvas.dispatchEvent(new MouseEvent('pointerup', at({ x: start.x - 150, y: start.y - 40 })));
    wait(view, 3000);
    expect(heroAt().walking).toBe(false);
  });

  it('dresses the hero in what the character wears, as soon as it changes', () => {
    const view = shown();
    const plain = hero2Now()!.dressKey;
    character = { ...newGame('Cody', 0), equipment: { main_hand: { item: 'iron_sword', qty: 1 } } };
    view.update?.(character);
    expect(hero2Now()!.dressKey).not.toBe(plain);
    expect(hero2Now()!.dressKey).toMatch(/iron_sword/);
    // The dungeons' hero, at their own scale, is not drawn until a boat rows out.
    expect(heroNow()).toBeNull();
  });

  it('rows out to the grotto from the boat and lands back beside it', () => {
    const shell = shellSpy();
    const view = shown(shell);
    const panel = walkUpTo(view, 'rowboat')!;
    expect(panel.querySelector('h2')!.textContent).toBe('Rowing boat');
    press(panel, 'Row out to Brinebeard’s Grotto');
    expect(shell.calls).toEqual(['full:true', 'pause:true']);
    expect(heroNow()).not.toBeNull();
    view.el.querySelector<HTMLButtonElement>('.dungeon-leave')!.click();
    press(view.el, 'Row back');
    const landing = centreOf(BOAT_LANDING2, TOWN2_TILE);
    expect(heroAt()).toMatchObject({ x: landing.x, y: landing.y, open: null });
    expect(shell.calls.slice(-2)).toEqual(['full:false', 'pause:false']);
    expect(view.el.querySelector('.scene-canvas')).not.toBeNull();
  });
});

describe('the town coming into view', () => {
  /** A stand-in for the town's worker: answers only when the test says. */
  class FakeWorker {
    static made: FakeWorker[] = [];
    onmessage: ((event: MessageEvent<TownAnswer>) => void) | null = null;
    onerror: (() => void) | null = null;
    asked: TownRequest | null = null;
    ended = false;
    constructor() {
      FakeWorker.made.push(this);
    }
    postMessage(request: TownRequest): void {
      this.asked = request;
    }
    terminate(): void {
      this.ended = true;
    }
    answer(a: TownAnswer): void {
      this.onmessage?.({ data: a } as MessageEvent<TownAnswer>);
    }
    /** The town painted, as a worker that can draw sends it: on bitmaps, composed. */
    town(): void {
      const facts = town2Facts();
      const bitmap = (): ImageBitmap => ({ width: 8, height: 8, close() {} }) as ImageBitmap;
      this.answer({
        kind: 'town',
        paint: {
          time: this.asked!.time,
          composed: true,
          still: bitmap(),
          pieces: [bitmap()],
          standing: [{ piece: 0, x: 10, y: 10, base: 18 }],
          foam: { x: 0, y: 0, image: bitmap() },
          smoke: facts.smoke.map(() => [bitmap(), bitmap()]),
          gull: { right: bitmap(), left: bitmap() },
          folk: STANDING2.map(() => [0, 1].map(() => ({ right: bitmap(), left: bitmap() }))),
          cells: new Int16Array(TOWN2_W * TOWN2_H),
        },
      });
    }
  }

  beforeEach(() => {
    FakeWorker.made = [];
    vi.stubGlobal('Worker', FakeWorker);
    // Pixels can be made (so there is something to wait for), but jsdom has no 2D context.
    vi.stubGlobal('ImageData', class {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  const card = (view: View) => view.el.querySelector<HTMLElement>('.scene-loading');
  const fill = (view: View) =>
    view.el.querySelector<HTMLElement>('.scene-loading-fill')!.style.transform;

  it('shows the town’s name and a bar of the work done at once, never an empty scene', () => {
    const view = shown();
    expect(card(view)).not.toBeNull();
    expect(card(view)!.getAttribute('role')).toBe('status');
    expect(card(view)!.textContent).toMatch(/Gullwick/);
    expect(view.el.querySelector('canvas.scene-canvas')).toBeNull();
    const worker = FakeWorker.made[0]!;
    expect(worker.asked).toEqual({ time: expect.any(String), facts: true });
    expect(fill(view)).toBe('scaleX(0)');

    // The facts: the town can be walked, under the card until its picture comes.
    worker.answer({ kind: 'facts', facts: town2Facts() });
    worker.answer({ kind: 'step', step: 2 });
    wait(view, 50);
    expect(view.el.querySelector('canvas.scene-canvas')).not.toBeNull();
    expect(card(view)).not.toBeNull();
    expect(fill(view)).toBe(`scaleX(${Math.round(((2 + 1) / (STEPS + 1)) * 4) / 4})`);

    // The picture: the card goes, and the worker is let go.
    worker.town();
    worker.terminate();
    wait(view, 50);
    expect(card(view)).toBeNull();
    expect(town2ArtNow()!.held()).toBe(worker.asked!.time);
  });

  it('asks for the town once a page, however often the tab is opened', () => {
    shown().el.remove();
    shown().el.remove();
    expect(FakeWorker.made).toHaveLength(1);
  });

  it('keeps the old picture up on a flip until the other time of day is painted', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 4, 12, 0));
    const view = shown();
    const first = FakeWorker.made[0]!;
    first.answer({ kind: 'facts', facts: town2Facts() });
    first.town();
    wait(view, 50);
    // The stage came with the facts: a browser tells it its size as it goes on the page.
    layOut();
    expect(town2ArtNow()!.held()).toBe('day');
    view.el.querySelector<HTMLButtonElement>('.scene-light')!.click();
    wait(view, 50);
    const second = FakeWorker.made[1]!;
    expect(second.asked).toEqual({ time: 'dusk', facts: false });
    expect(town2ArtNow()!.held()).toBe('day');
    expect(card(view)).toBeNull();
    second.town();
    wait(view, 50);
    expect(town2ArtNow()!.held()).toBe('dusk');
    vi.useRealTimers();
  });
});
