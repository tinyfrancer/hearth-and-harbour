/*
 * Row out again (wave 18): the first room is kept painted through the run,
 * so going straight back from the results card finds it in, never painted
 * again behind the card. Rooms between are let go as before.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTENT } from '../../src/data';
import type { Run } from '../../src/scene/dungeon';
import { dungeonView } from '../../src/scene/dungeonView';
import { groundOnTheSpot, roomLook } from '../../src/scene/grottoArt';
import { Hero2 } from '../../src/scene/town2Art';
import { GROTTO_DUNGEON, begin, prepared } from './grottoBot';

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('devicePixelRatio', 3);
  document.body.replaceChildren();
});
afterEach(() => vi.unstubAllGlobals());

describe('Row out again', () => {
  it('finds the first room still painted when the run has reached the last', () => {
    const state = prepared();
    const first = GROTTO_DUNGEON.rooms[GROTTO_DUNGEON.first]!;
    const between = GROTTO_DUNGEON.rooms.bridge!;
    roomLook(first).paintNow(0, false);
    roomLook(between).paintNow(0, false);
    // The run in the cove, the last room.
    let run: Run = { ...begin(state, 3), room: 'cove' };
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
      painter: groundOnTheSpot,
      leave: () => {},
      finished: () => {},
    });
    document.body.append(view.el);
    expect(roomLook(first).ready(0, false)).toBe(true);
    // A room between is let go, as before.
    expect(roomLook(between).ready(0, false)).toBe(false);
  });
});
