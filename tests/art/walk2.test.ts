import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from '../../src/art/character';
import {
  FIGURE2_ANCHOR_X,
  FIGURE2_SOLE_Y,
  IDLE2_FRAMES,
  IDLE2_FRAME_MS,
  ITEM_LAYERS2,
  KNIGHT_GEAR2,
  TOWNSFOLK2_FRAME_MS,
  TOWNSFOLK2_IDS,
  TOWNSFOLK2_STRIDE,
  WALK2_FRAMES,
  WALK2_FRAME_MS,
  WALK2_STRIDE,
  characterIdle2,
  characterIdlePicture2,
  characterPicture2,
  characterWalk2,
  characterWalkPicture2,
  townsfolkIdlePicture2,
  townsfolkPicture2,
  townsfolkWalk2,
  townsfolkWalkPicture2,
  type Facing2,
} from '../../src/art/character2';
import { FIST2, GRIP_X } from '../../src/art/figure2/body';
import { WARDROBE2 } from '../../src/art/figure2/dress';
import { pixels } from '../../src/art/figure2/engine';
import { HERO_RIG, handShift, walkKey } from '../../src/art/figure2/walk';
import { isMat, mirror, type TGrid } from '../../src/art/town2/cells';
import { DEPTH } from '../../src/art/depth';

// The walk cycle and the breath at the C scale (docs/style-guide.md, "Figures
// at the C scale", walking): every look and wearable through every frame, the
// hand rule in each, the feet on the anchor's row, left an exact mirror of
// right.

const FACINGS: readonly Facing2[] = ['down', 'right', 'left'];
const SLOW = { timeout: 120000 };
const at = (g: TGrid, x: number, y: number) => g.d[y * g.w + x]!;
const same = (a: TGrid, b: TGrid) => a.d.every((c, i) => c === b.d[i]);

/** The drawn box of a grid. */
function box(g: TGrid) {
  let x0 = 99;
  let x1 = -1;
  let y0 = 99;
  let y1 = -1;
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++)
      if (at(g, x, y)) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  return { x0, x1, y0, y1 };
}

/** A frame stands on the canvas: inside it with a pixel of margin, the soles' line the lowest row, under the walker. */
function standsOnAnchor(g: TGrid, what: string) {
  const b = box(g);
  expect([g.w, g.h], what).toEqual([56, 72]);
  expect(b.x0, `${what} left`).toBeGreaterThanOrEqual(0);
  expect(b.x1, `${what} right`).toBeLessThanOrEqual(55);
  expect(b.y0, `${what} top`).toBeGreaterThanOrEqual(0);
  expect(b.y1, `${what} feet`).toBe(FIGURE2_SOLE_Y);
  const sole = [...Array(56).keys()].filter((x) => at(g, x, FIGURE2_SOLE_Y));
  // A planted foot is near the anchor (within a half step across).
  expect(
    sole.some((x) => Math.abs(x - FIGURE2_ANCHOR_X) <= 20),
    `${what} planted`,
  ).toBe(true);
}

/** Every wearable as worn alone, and the knight. */
const OUTFITS: readonly { name: string; items: string[]; extra: readonly string[] }[] = [
  { name: 'nothing', items: [], extra: [] },
  ...Object.keys(ITEM_LAYERS2).map((id) => ({ name: id, items: [id], extra: [] })),
  { name: 'knight', items: [], extra: KNIGHT_GEAR2 },
  {
    name: 'iron with heater',
    items: ['iron_helmet', 'iron_breastplate', 'iron_shield', 'iron_sword'],
    extra: [],
  },
];

describe('the walk door', () => {
  it('says how many frames, how long each, and how far the ground passes', () => {
    expect(WALK2_FRAMES).toBe(8);
    expect(IDLE2_FRAMES).toBe(2);
    expect(WALK2_STRIDE).toBe(7);
    // A walker at the scene's speed (88 art pixels a second) does not slide.
    expect(Math.abs((WALK2_STRIDE / WALK2_FRAME_MS) * 1000 - 88)).toBeLessThanOrEqual(1);
    expect((TOWNSFOLK2_STRIDE / TOWNSFOLK2_FRAME_MS) * 1000).toBe(40);
    expect(IDLE2_FRAME_MS).toBeGreaterThan(400);
  });

  it('keeps each frame once drawn, a canvas per look, outfit, time, facing and frame', () => {
    const a = characterWalk2(DEFAULT_LOOK, ['iron_sword'], 'day', 'right', 3);
    expect(characterWalk2(DEFAULT_LOOK, ['iron_sword'], 'day', 'right', 3)).toBe(a);
    expect(characterWalk2(DEFAULT_LOOK, ['iron_sword'], 'day', 'right', 11)).toBe(a);
    expect(characterWalk2(DEFAULT_LOOK, ['iron_sword'], 'dusk', 'right', 3)).not.toBe(a);
    expect([a.width, a.height]).toEqual([56, 72]);
    expect(characterIdle2(DEFAULT_LOOK, [], 'day', 1).width).toBe(56);
    expect(townsfolkWalk2('smith', 'day', 'down', 0)?.width).toBe(56);
    expect(townsfolkWalk2('nobody', 'day', 'down', 0)).toBeNull();
    expect(townsfolkWalkPicture2('nobody', 'left', 0)).toBeNull();
  });

  it('never throws on an unknown look or item', () => {
    expect(() =>
      characterWalkPicture2({ skin: 'teal', hair: 'mohawk' }, ['nonsense'], 'left', -3),
    ).not.toThrow();
  });
});

describe('the hero walking', () => {
  it(
    'stands every frame of every facing on the anchor, inside the canvas, in every wearable',
    SLOW,
    () => {
      for (const o of OUTFITS)
        for (const facing of FACINGS)
          for (let f = 0; f < WALK2_FRAMES; f++)
            standsOnAnchor(
              characterWalkPicture2(DEFAULT_LOOK, o.items, facing, f, o.extra).grid,
              `${o.name} ${facing} ${f}`,
            );
    },
  );

  it('makes every frame of a cycle its own picture, and none the standing one', () => {
    for (const o of OUTFITS.slice(0, 8))
      for (const facing of FACINGS) {
        const frames = [...Array(WALK2_FRAMES).keys()].map(
          (f) => characterWalkPicture2(DEFAULT_LOOK, o.items, facing, f, o.extra).grid,
        );
        expect(new Set(frames.map((g) => g.d.join())).size, `${o.name} ${facing}`).toBe(
          WALK2_FRAMES,
        );
        const stand = characterPicture2(DEFAULT_LOOK, o.items, o.extra).grid;
        for (const g of frames) expect(same(g, stand)).toBe(false);
      }
  });

  it('walks left as the exact mirror of right', () => {
    for (const o of OUTFITS)
      for (let f = 0; f < WALK2_FRAMES; f++) {
        const r = characterWalkPicture2(DEFAULT_LOOK, o.items, 'right', f, o.extra).grid;
        const l = characterWalkPicture2(DEFAULT_LOOK, o.items, 'left', f, o.extra).grid;
        expect(same(l, mirror(r)), `${o.name} ${f}`).toBe(true);
      }
  });

  it(
    'keeps the hand rule in every frame: the whole fist, the grip under it, the weapon above and below',
    SLOW,
    () => {
      const held = WARDROBE2.gear.filter((g) => g.slot === 'weapon');
      const shields = [null, ...WARDROBE2.gear.filter((g) => g.slot === 'shield')];
      const item = (gear: string) =>
        Object.keys(ITEM_LAYERS2).find((k) => ITEM_LAYERS2[k] === gear);
      for (const h of held)
        for (const s of shields)
          for (const facing of ['down', 'right'] as const)
            for (let f = 0; f < WALK2_FRAMES; f++) {
              const ids = [h.id, ...(s ? [s.id] : [])];
              const items = ids.map(item).filter((x): x is string => !!x);
              const extra = ids.filter((id) => !item(id));
              const g = characterWalkPicture2(DEFAULT_LOOK, items, facing, f, extra).grid;
              const [dx, dy] = handShift(HERO_RIG, walkKey(facing, f), 'near');
              const what = `${ids} ${facing} ${f}`;
              // The fist shows whole, wherever the hand has swung.
              for (const [x, y, c] of pixels(FIST2)) expect(at(g, x + dx, y + dy), what).toBe(c);
              // Something of the weapon directly above the fist and directly below it.
              const front = h.parts.filter((p) => p.depth >= DEPTH.HELD_FRONT);
              const cols = new Set(pixels(FIST2).map(([x]) => x + dx));
              const top = Math.min(...pixels(FIST2).map(([, y]) => y)) + dy;
              const bottom = Math.max(...pixels(FIST2).map(([, y]) => y)) + dy;
              const mats = new Set(front.flatMap((p) => pixels(p).map(([, , c]) => c >> 3)));
              const isWeapon = (c: number) => c !== 0 && mats.has(c >> 3);
              expect(
                [...cols].some((x) => isWeapon(at(g, x, top - 1))),
                `${what} above`,
              ).toBe(true);
              expect(
                [...cols].some((x) => isWeapon(at(g, x, bottom + 1)) || isWeapon(at(g, x, bottom))),
                `${what} below`,
              ).toBe(true);
              // The grip runs down the fist's grip columns, under the fingers.
              for (const x of GRIP_X)
                expect(isMat(at(g, x + dx, top + 2), 'skin'), what).toBe(true);
            }
    },
  );

  it('breathes: the first frame is the standing picture, the second lifts the chest a row', () => {
    for (const o of OUTFITS.slice(0, 12)) {
      const stand = characterPicture2(DEFAULT_LOOK, o.items, o.extra);
      expect(characterIdlePicture2(DEFAULT_LOOK, o.items, 0, o.extra)).toBe(stand);
      const breath = characterIdlePicture2(DEFAULT_LOOK, o.items, 1, o.extra).grid;
      expect(same(breath, stand.grid), o.name).toBe(false);
      standsOnAnchor(breath, `${o.name} breath`);
      // The legs and feet do not move.
      for (let y = 58; y < 72; y++)
        for (let x = 0; x < 56; x++) expect(at(breath, x, y)).toBe(at(stand.grid, x, y));
    }
  });
});

describe('the townsfolk walking', () => {
  it('stands every frame on the anchor, each frame its own, left mirroring right', () => {
    for (const id of TOWNSFOLK2_IDS)
      for (const facing of FACINGS) {
        const frames = [...Array(WALK2_FRAMES).keys()].map(
          (f) => townsfolkWalkPicture2(id, facing, f)!.grid,
        );
        frames.forEach((g, f) => standsOnAnchor(g, `${id} ${facing} ${f}`));
        expect(new Set(frames.map((g) => g.d.join())).size, `${id} ${facing}`).toBe(WALK2_FRAMES);
        if (facing === 'left')
          frames.forEach((g, f) =>
            expect(same(g, mirror(townsfolkWalkPicture2(id, 'right', f)!.grid))).toBe(true),
          );
      }
  });

  it('breathes', () => {
    for (const id of TOWNSFOLK2_IDS) {
      expect(townsfolkIdlePicture2(id, 0)).toEqual(townsfolkPicture2(id));
      expect(same(townsfolkIdlePicture2(id, 1)!.grid, townsfolkPicture2(id)!.grid)).toBe(false);
    }
  });
});
