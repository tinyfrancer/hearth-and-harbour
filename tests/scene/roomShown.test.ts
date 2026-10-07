import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TGrid } from '../../src/art/town2/cells';
import { CONTENT } from '../../src/data';
import { DOOR_FADE_MS, type Run } from '../../src/scene/dungeon';
import { TITLE_MS, dungeonView, titleOpacity } from '../../src/scene/dungeonView';
import { groundCells, roomLook, type GroundPainter } from '../../src/scene/grottoArt';
import { Hero2 } from '../../src/scene/town2Art';
import { GROTTO_DUNGEON, begin, prepared } from './grottoBot';

// A room is never shown dark, and its name is never played to a dark room or a
// covered screen: the ground comes ahead or in the dark of the door, and the name
// waits until the room is seen, timed on the run's own clock.

/** A painter like the run's worker that answers only when told to: what a slow phone looks like. */
function slowPainter(): GroundPainter & { answer(): number; asked: string[] } {
  const jobs: { key: string; run: () => void }[] = [];
  const asked: string[] = [];
  return {
    offThread: true,
    asked,
    paint(room, state, _urgent, done) {
      const key = `${room.id} ${state.level} ${state.warn}`;
      asked.push(key);
      jobs.push({ key, run: () => done(groundCells(room, state.level, state.warn), null) });
    },
    answer() {
      const all = jobs.splice(0);
      for (const j of all) j.run();
      return all.length;
    },
  };
}

describe('a room’s ground, coming', () => {
  it('shows the nearest state of the tide that is in while the exact one is painted', () => {
    // A fresh plan so no other test's looks are reused.
    const store = { ...GROTTO_DUNGEON.rooms.store! };
    const painter = slowPainter();
    const look = roomLook(store, painter);
    expect(look.nearestIn(2, true)).toBeNull();
    look.stillAt(0, false);
    painter.answer();
    // Only low water is in: it stands in for any other state until that comes.
    expect(look.nearestIn(2, true)).toEqual({ level: 0, warn: false });
    expect(look.nearestIn(0, false)).toEqual({ level: 0, warn: false });
    look.stillAt(3, false);
    painter.answer();
    expect(look.nearestIn(2, true)).toEqual({ level: 3, warn: false });
  });

  it('works a state out on the spot when asked to, before returning', () => {
    const bridge = { ...GROTTO_DUNGEON.rooms.bridge! };
    const painter = slowPainter();
    const look = roomLook(bridge, painter);
    look.paintNow(1, false);
    expect(look.ready(1, false)).toBe(true);
    expect(painter.asked).toEqual([]);
  });
});

describe('the room’s name', () => {
  it('fades in, holds, and goes, on the run’s clock', () => {
    expect(titleOpacity(0)).toBe(0);
    expect(titleOpacity(TITLE_MS * 0.06)).toBeCloseTo(0.5, 5);
    expect(titleOpacity(TITLE_MS * 0.5)).toBe(1);
    expect(titleOpacity(TITLE_MS * 0.85)).toBeCloseTo(0.5, 5);
    expect(titleOpacity(TITLE_MS)).toBeNull();
  });
});

describe('a run on screen with a slow painter', () => {
  let observers: ResizeObserverCallback[];
  let clock: number;

  beforeEach(() => {
    observers = [];
    clock = 1000;
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

  const resize = (width: number, height: number): void => {
    const entry = { contentRect: { width, height } } as ResizeObserverEntry;
    for (const callback of [...observers]) callback([entry], {} as ResizeObserver);
  };

  function shown(painter: GroundPainter) {
    const state = prepared();
    let run: Run = begin(state, 3);
    const hero = new Hero2();
    hero.wear(state);
    const view = dungeonView({
      dungeon: GROTTO_DUNGEON,
      content: CONTENT,
      run: () => run,
      keep: (next) => {
        run = next;
      },
      hero,
      painter,
      leave: () => {},
      finished: () => {},
    });
    document.body.append(view.el);
    return {
      view,
      run: () => run,
      set: (next: Run) => {
        run = next;
      },
      frames(ms: number) {
        for (let t = 0; t < ms; t += 50) {
          clock += 50;
          view.update?.(state);
        }
      },
    };
  }

  const fade = (el: HTMLElement) => el.querySelector<HTMLElement>('.dungeon-fade')!.style.opacity;
  const title = (el: HTMLElement) => el.querySelector<HTMLElement>('.dungeon-title')!;

  it('never shows a room dark, the first or one through a door, though the worker is slow', () => {
    const painter = slowPainter();
    const s = shown(painter);
    resize(844, 390);
    s.frames(50);
    // Nothing came back from the worker, yet the room is there: worked out as it was shown.
    expect(fade(s.view.el)).toBe('0');
    // Through a door with the next room's ground still not back: lit again once the dark is past.
    const run = s.run();
    s.set({
      ...run,
      doorway: { room: 'store', door: 'a', ms: 0 },
      battle: {
        ...run.battle!,
        foes: run.battle!.foes.map((f) => (f.room === 'pools' ? { ...f, hp: 0, diedAt: -1e5 } : f)),
      },
    });
    let darkest = 0;
    let lit = false;
    for (let t = 0; t < 2 * DOOR_FADE_MS + 200; t += 20) {
      clock += 20;
      s.view.update?.(prepared());
      const o = Number(fade(s.view.el));
      darkest = Math.max(darkest, o);
      if (s.run().room === 'store' && !s.run().doorway) lit = o === 0;
    }
    expect(s.run().room).toBe('store');
    expect(darkest).toBe(1);
    expect(lit).toBe(true);
  });

  it('plays the room’s name only once the room is seen, and holds it while the phone is upright', () => {
    const s = shown(slowPainter());
    resize(390, 844);
    s.frames(3000);
    // Upright: the run waits behind the prompt, and so does the name.
    expect(title(s.view.el).classList.contains('shown')).toBe(false);
    expect(s.run().ms).toBe(0);
    resize(844, 390);
    s.frames(400);
    expect(title(s.view.el).classList.contains('shown')).toBe(true);
    const seen = Number(title(s.view.el).style.opacity);
    expect(seen).toBeGreaterThan(0);
    // Turned upright mid-name: it holds where it was, and carries on when turned back.
    resize(390, 844);
    s.frames(5000);
    expect(Number(title(s.view.el).style.opacity)).toBeCloseTo(seen, 1);
    resize(844, 390);
    s.frames(TITLE_MS);
    expect(title(s.view.el).classList.contains('shown')).toBe(false);
  });
});

// For the type checker: cells are what a painter hands back.
export type { TGrid };
