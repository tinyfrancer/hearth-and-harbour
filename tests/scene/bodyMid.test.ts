/*
 * A foe whose body is centred off its feet (lane B's `mid`, B16: Old Snapper's
 * shell and tail behind his front feet) is tapped, shadowed, ringed and given
 * his health bar round the middle of his body, mirrored as he turns, so his
 * 84-wide box no longer reaches over a hero standing at his head.
 */
import { describe, expect, it } from 'vitest';
import { foeSize2 } from '../../src/art/dungeonArt2';
import { MELEE_STAND, foeAt, type Foe } from '../../src/scene/battle';
import { placeOf, type Run } from '../../src/scene/dungeon';
import { combatantBoxes, HERO_BOX } from '../../src/scene/dungeonView';
import { fightArtFor, fightExtra, fightFigures, FIGHT_COLOURS } from '../../src/scene/fightArt';
import { bodyMid, foeKind } from '../../src/scene/foes';
import { roomLook } from '../../src/scene/grottoArt';
import { beginCave, CAVE, novice } from './caveBot';

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

/** The cave's boss room with the snapper at `at` facing `facing`, targeted, the hero at `hero`. */
function snapperRun(facing: 'left' | 'right', hero = { x: 200, y: 140 }): { run: Run; foe: Foe } {
  const run = beginCave(novice(), 3, false);
  const b = run.battle!;
  const foes = b.foes.map((f) =>
    f.monster === 'old_snapper' ? { ...f, at: { x: 400, y: 140 }, facing, aware: true } : f,
  );
  const foe = foes.find((f) => f.monster === 'old_snapper')!;
  return {
    run: {
      ...run,
      room: 'snapper',
      play: { ...run.play, walker: { at: hero, path: [] } },
      battle: { ...b, foes, target: foe.key },
    },
    foe,
  };
}

describe("a body centred off its feet (lane B's mid)", () => {
  it('is read from the sizes and mirrored as the foe turns', () => {
    expect(foeSize2('old_snapper')?.mid).toBe(-14);
    expect(bodyMid('old_snapper', 'right')).toBe(-14);
    expect(bodyMid('old_snapper', 'left')).toBe(14);
    // Every other foe stands over its middle.
    for (const id of ['dock_rat', 'sand_crab', 'giant_crab', 'deckhand', 'brinebeard'])
      expect(bodyMid(id, 'left')).toBe(0);
  });

  it('puts his tap box round his body, clear of a hero standing at his head', () => {
    const box = foeKind('old_snapper').box;
    expect(box.w).toBe(84);
    for (const facing of ['left', 'right'] as const) {
      const { run, foe } = snapperRun(facing);
      const b = run.battle!;
      const ahead = facing === 'left' ? -1 : 1;
      const feet = foe.at.y - box.h / 2;
      // Where a hero stands to strike him: at his head, MELEE_STAND ahead of his feet.
      const heroAt = { x: foe.at.x + ahead * MELEE_STAND, y: feet };
      expect(foeAt(b, 'snapper', heroAt)).toBeNull();
      // His tail end, behind his feet, is him.
      const tail = { x: foe.at.x - ahead * 50, y: feet };
      expect(foeAt(b, 'snapper', tail)?.key).toBe(foe.key);
      // His middle is him; the box spans exactly his body, 84 across round it.
      const mid = foe.at.x + bodyMid('old_snapper', facing);
      expect(foeAt(b, 'snapper', { x: mid - 41, y: feet })?.key).toBe(foe.key);
      expect(foeAt(b, 'snapper', { x: mid + 41, y: feet })?.key).toBe(foe.key);
      expect(foeAt(b, 'snapper', { x: mid + ahead * 43, y: feet })).toBeNull();
    }
  });

  it('keeps the spacing drawn apart ahead of him as it was', () => {
    const { run } = snapperRun('right');
    const snapper = fightFigures(CAVE, run).find((f) => f.key !== 'hero')!;
    // Ahead: his head (front 27) as before; behind: his box less the offset, plus the allowance.
    expect(snapper.right).toBe(27);
    expect(snapper.left).toBe(84 / 2 - 14 + 8);
  });

  it("rings him, shadows him and boxes him round his body's middle", () => {
    for (const facing of ['left', 'right'] as const) {
      const { run, foe } = snapperRun(facing);
      const mid = foe.at.x + bodyMid('old_snapper', facing);
      const look = roomLook(CAVE.rooms.snapper!);
      const extra = fightExtra(CAVE, run, look, fightArtFor(look));
      const { ctx, filled } = counting();
      extra.ground!(ctx, {} as never);
      // The target's gold ring under him, centred on his middle.
      const gold = [...(filled.get(FIGHT_COLOURS.gold) ?? [])].map((p) => Number(p.split(' ')[0]));
      expect(gold.length).toBeGreaterThan(0);
      const centre = (Math.min(...gold) + Math.max(...gold) + 1) / 2;
      expect(Math.abs(centre - mid)).toBeLessThanOrEqual(1);
      // The box laid over the room for the room's name to keep clear of.
      const boxes = combatantBoxes(CAVE, run, { x: 0, y: 0 }, 1);
      const his = boxes[1]!;
      expect(his.x + his.w / 2).toBeCloseTo(mid, 5);
      expect(boxes[0]!.w).toBe(HERO_BOX.w);
      expect(placeOf(CAVE, run).room).toBe('snapper');
    }
  });
});
