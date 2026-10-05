import { describe, expect, it } from 'vitest';
import { DUSK } from '../../src/art/palette';
import type { Telegraph } from '../../src/scene/battle';
import { fightExtra } from '../../src/scene/fightArt';
import { begin, GROTTO_DUNGEON, prepared } from './grottoBot';

/** A canvas that only counts the pixels filled through it, by colour. */
function counting(): { ctx: CanvasRenderingContext2D; filled: Map<string, Set<string>> } {
  const filled = new Map<string, Set<string>>();
  let colour = '';
  const ctx = new Proxy(
    {},
    {
      get(_t, k) {
        if (k === 'fillRect')
          return (x: number, y: number, w: number, h: number) => {
            const set = filled.get(colour) ?? new Set<string>();
            for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) set.add(`${x + i} ${y + j}`);
            filled.set(colour, set);
          };
        if (k === 'measureText') return () => ({ width: 10 });
        return () => {};
      },
      set(_t, k, v) {
        if (k === 'fillStyle') colour = String(v);
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, filled };
}

/** The ground the fight draws with one heavy attack marked, half way through its warning. */
function marked(heavy: Telegraph) {
  const run = begin(prepared(), 1);
  const b = run.battle!;
  const boss = b.foes.find((f) => f.monster === 'brinebeard')!;
  const r = {
    ...run,
    room: 'cove',
    battle: {
      ...b,
      clock: (heavy.from + heavy.lands) / 2,
      foes: b.foes.map((f) => (f === boss ? { ...f, aware: true, heavy, at: heavy.at } : f)),
    },
  };
  const { ctx, filled } = counting();
  fightExtra(GROTTO_DUNGEON, r, DUSK).ground!(ctx, DUSK);
  return filled;
}

describe('the marks on the ground', () => {
  it('draws the anchor’s sweep over the whole of its wedge, and not behind him', () => {
    const at = { x: 300, y: 100 };
    const spread = (210 * Math.PI) / 180;
    const filled = marked({
      at,
      radius: 58,
      shape: 'arc',
      facing: Math.PI,
      spread,
      from: 0,
      lands: 1600,
      origin: null,
      damage: 1,
    });
    // The wedge's faint fill is the steel step; every pixel of it is in the wedge, and it nearly fills it.
    const steel = filled.get(DUSK.colours.metal1)!;
    const wedge = (spread / (2 * Math.PI)) * Math.PI * 58 * 58;
    expect(steel.size).toBeGreaterThan(wedge * 0.9);
    expect(steel.size).toBeLessThan(wedge * 1.1);
    // Straight behind him (he faces left): nothing.
    expect(steel.has(`${at.x + 40} ${at.y}`)).toBe(false);
    expect(steel.has(`${at.x - 40} ${at.y}`)).toBe(true);
  });
});
