import { describe, expect, it } from 'vitest';
import { FOE2_SIZES } from '../../src/art/dungeonArt2';
import { APART_MOST, shownApart, type Figure } from '../../src/scene/apart';
import { MELEE_STAND, type Foe } from '../../src/scene/battle';
import type { Run } from '../../src/scene/dungeon';
import {
  FALL_MS,
  HERO_HALF,
  fightApart,
  fightArtFor,
  fightExtra,
  fightFigures,
} from '../../src/scene/fightArt';
import { roomLook } from '../../src/scene/grottoArt';
import { begin, GROTTO_DUNGEON, prepared } from './grottoBot';

// Figures drawn apart where one would be painted over another: the hero beside
// the giant crab and the captain, a deckhand against the captain's coat. Drawing
// only; the fight's places stay where the rules put them.

/** A run in `room` with the hero at `hero`, one foe of the room (its first) at `at` facing `facing`. */
function standing(
  room: string,
  hero: { x: number; y: number },
  at: { x: number; y: number },
  facing: 'left' | 'right',
  edit: Partial<Foe> = {},
): Run {
  const run = begin(prepared(), 1);
  const b = run.battle!;
  let first = true;
  return {
    ...run,
    room,
    play: { ...run.play, walker: { at: hero, path: [] } },
    battle: {
      ...b,
      foes: b.foes.map((f) => {
        if (f.room !== room) return f;
        if (!first) return { ...f, hp: 0, diedAt: -1e6 };
        first = false;
        return { ...f, at, facing, path: [], ...edit };
      }),
    },
  };
}

const crabAt = { x: 28 * 24 + 12, y: 6 * 24 + 12 };

describe('figures drawn apart', () => {
  it('shows the hero clear of the giant crab beside him, by at most half a tile, the crab where it is', () => {
    for (const side of [-1, 1]) {
      const hero = { x: crabAt.x + side * MELEE_STAND, y: crabAt.y };
      const run = standing('pools', hero, crabAt, side < 0 ? 'left' : 'right');
      const apart = fightApart(GROTTO_DUNGEON, run);
      const dx = apart.get('hero')!;
      expect(Math.sign(dx)).toBe(side);
      expect(Math.abs(dx)).toBe(APART_MOST);
      expect(apart.get('pools 0') ?? 0).toBe(0);
      // Nothing in the run moved.
      expect(run.play.walker.at).toEqual(hero);
    }
  });

  it('shows the hero clear of the captain’s coat, and a deckhand of his crew clear of him', () => {
    const cap = { x: 16 * 24 + 12, y: 6 * 24 + 12 };
    const run = standing('cove', { x: cap.x - MELEE_STAND, y: cap.y }, cap, 'left');
    const hero = fightApart(GROTTO_DUNGEON, run).get('hero')!;
    expect(hero).toBeLessThan(0);
    // His body ahead of his feet (the coat), from the art lane's sizes, less the overlap allowed.
    const s = FOE2_SIZES.brinebeard!;
    const front = Math.min(s.front, s.box.w / 2 + 8);
    expect(hero).toBe(-Math.min(APART_MOST, Math.round(HERO_HALF + front - 4 - MELEE_STAND)));

    const deck = run.battle!.foes.find((f) => f.monster === 'deckhand')!;
    const crewed: Run = {
      ...run,
      play: { ...run.play, walker: { at: { x: cap.x - 120, y: cap.y }, path: [] } },
      battle: {
        ...run.battle!,
        foes: [
          ...run.battle!.foes,
          {
            ...deck,
            key: 'cove 99',
            room: 'cove',
            at: { x: cap.x + 18, y: cap.y + 4 },
            hp: 30,
            diedAt: null,
            facing: 'left',
          },
        ],
      },
    };
    const apart = fightApart(GROTTO_DUNGEON, crewed);
    expect(apart.get('cove 99')!).toBeGreaterThan(0);
    expect(apart.get(run.battle!.foes.find((f) => f.monster === 'brinebeard')!.key) ?? 0).toBe(0);
  });

  it('moves smoothly as the hero walks away, a pixel at most for a pixel walked, and not at all once clear', () => {
    let last: number | null = null;
    for (let d = MELEE_STAND - 12; d <= MELEE_STAND + 40; d += 1) {
      const run = standing('pools', { x: crabAt.x - d, y: crabAt.y }, crabAt, 'left');
      const dx = fightApart(GROTTO_DUNGEON, run).get('hero') ?? 0;
      if (last !== null) expect(Math.abs(dx - last)).toBeLessThanOrEqual(1);
      last = dx;
    }
    expect(last).toBe(0);
  });

  it('leaves alone two who stand apart up and down the room, and lets go as a foe falls', () => {
    const below = standing(
      'pools',
      { x: crabAt.x - MELEE_STAND, y: crabAt.y + 24 },
      crabAt,
      'left',
    );
    expect(fightApart(GROTTO_DUNGEON, below).get('hero') ?? 0).toBe(0);
    // The run's clock is 0 in these: a foe that died `since` ms "ago" has diedAt -since.
    const fading = (since: number) =>
      fightApart(
        GROTTO_DUNGEON,
        standing('pools', { x: crabAt.x - MELEE_STAND, y: crabAt.y }, crabAt, 'left', {
          hp: 0,
          diedAt: -since,
        }),
      ).get('hero') ?? 0;
    expect(Math.abs(fading(0))).toBe(APART_MOST);
    expect(Math.abs(fading(FALL_MS * 0.75))).toBeLessThan(APART_MOST);
    expect(fading(FALL_MS)).toBe(0);
  });

  it('leaves out a bird in the air and anyone behind bars', () => {
    const run = begin(prepared(), 1);
    const inBrig: Run = { ...run, room: 'brig' };
    const keys = fightFigures(GROTTO_DUNGEON, inBrig).map((f) => f.key);
    // Every one in the brig waits behind its cell's bars at the start.
    expect(keys).toEqual(['hero']);
    const onBridge: Run = { ...run, room: 'bridge' };
    const birds = fightFigures(GROTTO_DUNGEON, onBridge).filter((f) =>
      f.key.startsWith('bridge 3'),
    );
    expect(birds).toEqual([]);
  });

  it('hands the stage the hero’s offset, and drawing changes nothing in the run', () => {
    const run = standing('pools', { x: crabAt.x - MELEE_STAND, y: crabAt.y }, crabAt, 'left');
    const copy = JSON.parse(JSON.stringify(run));
    const look = roomLook(GROTTO_DUNGEON.rooms.pools!);
    const extra = fightExtra(GROTTO_DUNGEON, run, look, fightArtFor(look));
    expect(extra.walkerOffset).toBe(-APART_MOST);
    expect(JSON.parse(JSON.stringify(run))).toEqual(copy);
  });

  it('adds up what one figure is sent by two, and caps it', () => {
    const f = (key: string, x: number, rank: number, half = 20): Figure => ({
      key,
      at: { x, y: 0 },
      left: half,
      right: half,
      rank,
      weight: 1,
    });
    const between = shownApart([f('a', -30, 2), f('h', 0, 0), f('b', 30, 2)]);
    // Pushed equally both ways: stays where he is.
    expect(between.get('h')).toBe(0);
    const one = shownApart([f('h', 0, 0), f('b', 20, 2)]);
    expect(one.get('h')).toBe(-APART_MOST);
    expect(one.has('b')).toBe(false);
    // Equals do not push each other about.
    expect(shownApart([f('a', 0, 1), f('b', 10, 1)]).size).toBe(0);
  });
});
