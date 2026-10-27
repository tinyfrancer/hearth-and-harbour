import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOWN2_H, TOWN2_TILE, TOWN2_W } from '../../src/art/town2/town';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { cameraFor } from '../../src/scene/camera';
import { forgetLessons } from '../../src/scene/lessons';
import { centreOf, type Point } from '../../src/scene/tileMap';
import { BOAT_LANDING2, STANDING2, town2Scene } from '../../src/scene/town2';
import { town2Facts, type TownAnswer, type TownRequest } from '../../src/scene/town2Facts';
import { FOCUS_RISE2 } from '../../src/scene/town2Place';
import { PAN_MS } from '../../src/scene/townMarks';
import { heroAt, resetTown, runNow, townCamera, townView } from '../../src/scene/townView';
import type { Shell, ShellRequest, View } from '../../src/ui/view';

// The way out of town, in jsdom, driven as a thumb would: the boat, the
// ferryman and the sign open the harbour chart; the menus' request opens it
// once; the chart rows out to the landing picked; and a new save's first look
// at the town is shown the boat.

let observers: ResizeObserverCallback[];
let clock: number;
let appNow: number;
let character: GameState;

beforeEach(() => {
  observers = [];
  clock = 1000;
  appNow = 1_700_000_000_000;
  character = newGame('Cody', 0);
  resetTown();
  forgetLessons();
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
  resetTown();
});

function shellSpy(requests: (ShellRequest | null)[] = []): Shell & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    openTab: (tab) => calls.push(`tab:${tab}`),
    openSkill: (id) => calls.push(`skill:${id}`),
    pauseIdle: (on) => calls.push(`pause:${on}`),
    fullScreen: (on) => calls.push(`full:${on}`),
    settleRun: () => calls.push('settle'),
    takeRequest: () => requests.shift() ?? null,
    chartOpened: () => calls.push('chart'),
  };
}

function layOut(width = 390, height = 727): void {
  const entry = { contentRect: { width, height } } as ResizeObserverEntry;
  for (const callback of [...observers]) callback([entry], {} as ResizeObserver);
}

function shown(shell?: Shell): View {
  const view = townView(character, CONTENT, shell);
  document.body.append(view.el);
  layOut();
  view.update?.(character, appNow);
  return view;
}

function wait(view: View, ms: number): void {
  for (let t = 0; t < ms; t += 50) {
    clock += 50;
    appNow += 50;
    view.update?.(character, appNow);
  }
}

/** A tap in town where the stage puts it: by its last frame's camera, or the hero's (3x: a CSS pixel an art pixel). */
function tap(view: View, at: Point): void {
  const seen = townCamera();
  const hero = heroAt();
  const camera =
    seen?.camera ??
    cameraFor(
      { x: hero.x, y: hero.y - FOCUS_RISE2 },
      { width: 390, height: 727 },
      {
        width: TOWN2_W,
        height: TOWN2_H,
      },
    );
  const canvas = view.el.querySelector<HTMLCanvasElement>('canvas.scene-canvas')!;
  const where = { bubbles: true, clientX: at.x - camera.x, clientY: at.y - camera.y };
  canvas.dispatchEvent(new MouseEvent('pointerdown', where));
  canvas.dispatchEvent(new MouseEvent('pointerup', where));
}

const middle = (id: string): Point => {
  const box = town2Scene().things.find((t) => t.id === id)!.tap!;
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
};
const chart = (view: View) => view.el.querySelector<HTMLElement>('.chart');

describe('the harbour chart, opened in town', () => {
  it('opens from the boat, and is closed with its own button without opening again', () => {
    const shell = shellSpy();
    const view = shown(shell);
    tap(view, middle('rowboat'));
    wait(view, 8000);
    expect(chart(view)).not.toBeNull();
    // No panel of the boat's own under it.
    expect(view.el.querySelector('.scene-panel')).toBeNull();
    expect(shell.calls).toContain('chart');
    chart(view)!.querySelector<HTMLButtonElement>('.chart-close')!.click();
    wait(view, 500);
    expect(chart(view)).toBeNull();
    expect(heroAt().open).toBeNull();
  });

  it('opens from the ferryman, with a word from him first, and from the sign', () => {
    const view = shown(shellSpy());
    tap(view, middle('ferryman'));
    wait(view, 8000);
    expect(chart(view)!.querySelector('.chart-say')!.textContent).toMatch(/^Pascoe: /);
    chart(view)!.querySelector<HTMLButtonElement>('.chart-close')!.click();
    wait(view, 200);
    tap(view, middle('boat_sign'));
    wait(view, 6000);
    expect(chart(view)).not.toBeNull();
    expect(chart(view)!.querySelector('.chart-say')).toBeNull();
  });

  it('opens once for the menus’ request: the hero cut to the boat, then left alone', () => {
    const shell = shellSpy(['chart']);
    const view = shown(shell);
    wait(view, 100);
    expect(chart(view)).not.toBeNull();
    const landing = centreOf(BOAT_LANDING2, TOWN2_TILE);
    expect(heroAt()).toMatchObject({ x: landing.x, y: landing.y });
    expect(shell.calls.filter((c) => c === 'chart')).toHaveLength(1);
    chart(view)!.querySelector<HTMLButtonElement>('.chart-close')!.click();
    wait(view, 2000);
    expect(chart(view)).toBeNull();
    expect(shell.calls.filter((c) => c === 'chart')).toHaveLength(1);
  });

  it('rows out to the landing picked, a new player with lessons, one who has cleared it without', () => {
    const shell = shellSpy(['chart']);
    const view = shown(shell);
    wait(view, 100);
    // The cave, picked first for a new save.
    expect(
      chart(view)!.querySelector('.chart-landing[aria-pressed="true"]')!.getAttribute('data-id'),
    ).toBe('tidepool_cave');
    [...chart(view)!.querySelectorAll('button')].find((b) => b.textContent === 'Row out')!.click();
    wait(view, 100);
    expect(runNow()!.dungeon).toBe('tidepool_cave');
    expect(runNow()!.lessons).toMatchObject({ off: false });
    expect(shell.calls).toContain('full:true');

    view.el.remove();
    resetTown();
    forgetLessons();
    character = { ...newGame('Cody', 0), dungeons: { tidepool_cave: { clears: 1 } } };
    const again = shown(shellSpy(['chart']));
    wait(again, 100);
    chart(again)!
      .querySelector<HTMLButtonElement>('.chart-landing[data-id="tidepool_cave"]')!
      .click();
    [...chart(again)!.querySelectorAll('button')].find((b) => b.textContent === 'Row out')!.click();
    wait(again, 100);
    expect(runNow()!.lessons).toMatchObject({ off: true });
  });

  it('has no Row out for a landing to come: what opens it instead', () => {
    const view = shown(shellSpy(['chart']));
    wait(view, 100);
    chart(view)!.querySelector<HTMLButtonElement>('.chart-landing[data-id="unknown_2"]')!.click();
    expect(chart(view)!.querySelector('.chart-detail h3')!.textContent).toBe('Uncharted waters');
    expect(chart(view)!.querySelector('.chart-unlock')!.textContent!.length).toBeGreaterThan(0);
    expect(
      [...chart(view)!.querySelectorAll('button')].some((b) => b.textContent === 'Row out'),
    ).toBe(false);
  });
});

describe('a new save’s first look at the town', () => {
  /** A stand-in for the town's worker that answers at once with a painted town. */
  class FakeWorker {
    onmessage: ((event: MessageEvent<TownAnswer>) => void) | null = null;
    onerror: (() => void) | null = null;
    postMessage(request: TownRequest): void {
      const facts = town2Facts();
      const bitmap = (): ImageBitmap => ({ width: 8, height: 8, close() {} }) as ImageBitmap;
      const answer = (a: TownAnswer) => this.onmessage?.({ data: a } as MessageEvent<TownAnswer>);
      if (request.facts) answer({ kind: 'facts', facts });
      answer({
        kind: 'town',
        paint: {
          time: request.time,
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
    terminate(): void {}
  }

  beforeEach(() => {
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('ImageData', class {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('pans to the boat and back once, and a tap skips it', () => {
    const view = shown(shellSpy());
    wait(view, 100);
    layOut();
    wait(view, 100);
    // jsdom draws nothing, so the camera is read from the stage's own frame only where it draws:
    // the pan is seen in the hero not moving while it plays, and a tap ending it doing nothing else.
    const before = heroAt();
    const canvas = view.el.querySelector<HTMLCanvasElement>('canvas.scene-canvas')!;
    canvas.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );
    wait(view, 2000);
    expect(heroAt()).toMatchObject({ x: before.x, y: before.y, walking: false });
    // Once a page: a second view does not pan again; a tap walks.
    view.el.remove();
    const again = shown(shellSpy());
    wait(again, 100);
    const c2 = again.el.querySelector<HTMLCanvasElement>('canvas.scene-canvas')!;
    c2.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
    c2.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10 }));
    wait(again, 200);
    expect(heroAt().walking || heroAt().x !== before.x || heroAt().y !== before.y).toBe(true);
    expect(PAN_MS).toBeLessThan(5000);
  });

  it('is remembered in the save through the shell: a reloaded page of the same save does not pan', () => {
    const store = new Set<string>();
    const keeping = (): Shell =>
      Object.assign(shellSpy(), {
        remembered: (key: string) => store.has(key),
        remember: (key: string) => void store.add(key),
      });
    const view = shown(keeping());
    wait(view, 200);
    expect([...store]).toEqual(['town.pan']);
    // A reload: the page forgets everything, the save does not.
    view.el.remove();
    resetTown();
    forgetLessons();
    const again = shown(keeping());
    wait(again, 100);
    const before = heroAt();
    const c2 = again.el.querySelector<HTMLCanvasElement>('canvas.scene-canvas')!;
    c2.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
    c2.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10 }));
    wait(again, 200);
    // No pan to skip: the tap walks at once.
    expect(heroAt().walking || heroAt().x !== before.x || heroAt().y !== before.y).toBe(true);
  });

  it('falls back to the page where the shell cannot remember: a reload pans again', () => {
    const view = shown(shellSpy());
    wait(view, 200);
    view.el.remove();
    resetTown();
    forgetLessons();
    const again = shown(shellSpy());
    wait(again, 200);
    const before = heroAt();
    const c2 = again.el.querySelector<HTMLCanvasElement>('canvas.scene-canvas')!;
    c2.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
    c2.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10 }));
    wait(again, 200);
    // The tap only ended the pan.
    expect(heroAt()).toMatchObject({ x: before.x, y: before.y, walking: false });
  });

  it('is not shown to a save that has rowed out before', () => {
    character = { ...newGame('Cody', 0), dungeons: { tidepool_cave: { clears: 1 } } };
    const view = shown(shellSpy());
    wait(view, 200);
    const before = heroAt();
    const canvas = view.el.querySelector<HTMLCanvasElement>('canvas.scene-canvas')!;
    canvas.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );
    canvas.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10 }));
    wait(view, 200);
    expect(heroAt().walking || heroAt().x !== before.x).toBe(true);
  });
});
