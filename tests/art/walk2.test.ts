import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, LOOK_CHOICES } from '../../src/art/character';
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
  characterGear2,
  characterIdle2,
  characterIdlePicture2,
  characterPicture2,
  characterWalk2,
  characterWalkPicture2,
  forgetWalks2,
  townsfolkIdlePicture2,
  townsfolkPicture2,
  townsfolkWalk2,
  townsfolkWalkPicture2,
  type Facing2,
} from '../../src/art/character2';
import { FIST2, GRIP_X } from '../../src/art/figure2/body';
import { WARDROBE2 } from '../../src/art/figure2/dress';
import { pixels } from '../../src/art/figure2/engine';
import { FEET2, sideFrame, sideWalkGrid } from '../../src/art/figure2/side';
import { SIDE_GEAR, sideDress } from '../../src/art/figure2/sideDress';
import { FOLK_SIDE } from '../../src/art/figure2/sideFolk';
import { flipLit, BACK_AXIS } from '../../src/art/figure2/views';
import { mirror, type TGrid } from '../../src/art/town2/cells';

// The walk at the C scale (docs/style-guide.md, "Figures at the C scale",
// "Walking"): toward the camera, across in true profile, and away; every look
// and wearable through every frame of every facing, the hand rule in each,
// the feet on the anchor's row, the sword in the right hand whichever way the
// hero walks.

const FACINGS: readonly Facing2[] = ['down', 'right', 'left', 'up'];
const SLOW = { timeout: 300000 };
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

/** A frame stands on the canvas: inside it, the soles' line the lowest row, a sole near the walker. */
function standsOnAnchor(g: TGrid, what: string) {
  const b = box(g);
  expect([g.w, g.h], what).toEqual([56, 72]);
  expect(b.x0, `${what} left`).toBeGreaterThanOrEqual(0);
  expect(b.x1, `${what} right`).toBeLessThanOrEqual(55);
  expect(b.y0, `${what} top`).toBeGreaterThanOrEqual(0);
  expect(b.y1, `${what} feet`).toBe(FIGURE2_SOLE_Y);
  const sole = [...Array(56).keys()].filter((x) => at(g, x, FIGURE2_SOLE_Y));
  expect(
    sole.some((x) => Math.abs(x - FIGURE2_ANCHOR_X) <= 20),
    `${what} planted`,
  ).toBe(true);
}

/** Every wearable as worn alone, the knight, and the iron rung whole. */
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

const itemFor = (gear: string) => Object.keys(ITEM_LAYERS2).find((k) => ITEM_LAYERS2[k] === gear);
/** Every held thing with and without every shield, as items (or the knight's gear ids). */
const HELD = WARDROBE2.gear.filter((g) => g.slot === 'weapon');
const SHIELDS = [null, ...WARDROBE2.gear.filter((g) => g.slot === 'shield')];
const armed = HELD.flatMap((h) =>
  SHIELDS.map((s) => {
    const ids = [h.id, ...(s ? [s.id] : [])];
    return {
      name: ids.join(' + '),
      held: h,
      shield: s,
      items: ids.map(itemFor).filter((x): x is string => !!x),
      extra: ids.filter((id) => !itemFor(id)),
    };
  }),
);

/** Where a pattern of cells sits whole in a grid, or null. */
function find(
  g: TGrid,
  pattern: readonly (readonly [number, number, number])[],
): [number, number] | null {
  const [, , c0] = pattern[0]!;
  const [px, py] = pattern[0]!;
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      if (at(g, x, y) !== c0) continue;
      const dx = x - px;
      const dy = y - py;
      if (pattern.every(([a, b, c]) => at(g, a + dx, b + dy) === c)) return [dx, dy];
    }
  return null;
}

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
    expect(characterWalk2(DEFAULT_LOOK, ['iron_sword'], 'day', 'up', 3).width).toBe(56);
    expect(characterIdle2(DEFAULT_LOOK, [], 'day', 1).width).toBe(56);
    expect(townsfolkWalk2('smith', 'day', 'down', 0)?.width).toBe(56);
    expect(townsfolkWalk2('smith', 'day', 'up', 0)?.width).toBe(56);
    expect(townsfolkWalk2('nobody', 'day', 'down', 0)).toBeNull();
    expect(townsfolkWalkPicture2('nobody', 'left', 0)).toBeNull();
    expect(townsfolkWalkPicture2('nobody', 'up', 0)).toBeNull();
  });

  it('keeps a picture until told to forget, then draws the same again', () => {
    const a = characterWalkPicture2(DEFAULT_LOOK, ['iron_sword'], 'up', 2);
    expect(characterWalkPicture2(DEFAULT_LOOK, ['iron_sword'], 'up', 2)).toBe(a);
    forgetWalks2();
    const b = characterWalkPicture2(DEFAULT_LOOK, ['iron_sword'], 'up', 2);
    expect(b).not.toBe(a);
    expect(same(a.grid, b.grid)).toBe(true);
  });

  it('never throws on an unknown look or item', () => {
    for (const facing of FACINGS)
      expect(() =>
        characterWalkPicture2({ skin: 'teal', hair: 'mohawk' }, ['nonsense'], facing, -3),
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

  it('stands every frame across and away on the anchor in every look', SLOW, () => {
    for (const skin of LOOK_CHOICES.skin)
      for (const hair of LOOK_CHOICES.hair)
        for (const hairColour of LOOK_CHOICES.hairColour)
          for (const facing of ['right', 'up'] as const)
            for (const f of [0, 2, 5])
              standsOnAnchor(
                characterWalkPicture2(
                  { skin: skin.id, hair: hair.id, hairColour: hairColour.id },
                  ['iron_helmet'],
                  facing,
                  f,
                ).grid,
                `${skin.id} ${hair.id} ${hairColour.id} ${facing} ${f}`,
              );
  });

  it('draws every wearable and the knight in true profile, none falling back to the sheared walk', () => {
    for (const o of OUTFITS) {
      const gear = characterGear2(DEFAULT_LOOK, o.items, o.extra);
      expect(sideDress(gear), o.name).not.toBeNull();
    }
    // Every gear id in the wardrobe has a profile drawing (hair and held things are drawn by their own tables).
    for (const g of WARDROBE2.gear)
      if (!['hair', 'weapon', 'shield'].includes(g.slot))
        expect(SIDE_GEAR[g.id], g.id).toBeDefined();
  });

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

  it('turns to walk away: the back of the head, never the face', () => {
    for (const o of OUTFITS)
      for (let f = 0; f < WALK2_FRAMES; f++) {
        const g = characterWalkPicture2(DEFAULT_LOOK, o.items, 'up', f, o.extra).grid;
        // No eye anywhere: the face is turned away.
        expect(eyes(g), `${o.name} up ${f}`).toBe(0);
        // Across, one eye shows (the profile); toward the camera, two.
        const side = characterWalkPicture2(DEFAULT_LOOK, o.items, 'right', f, o.extra).grid;
        expect(eyes(side), `${o.name} right ${f}`).toBeGreaterThan(0);
        expect(eyes(side), `${o.name} right ${f}`).toBeLessThan(
          eyes(characterPicture2(DEFAULT_LOOK, o.items, o.extra).grid),
        );
      }
  });

  it('never walks left as a mirror of right when something is held: the sword stays in the right hand', () => {
    for (const a of armed)
      for (let f = 0; f < WALK2_FRAMES; f++) {
        const r = characterWalkPicture2(DEFAULT_LOOK, a.items, 'right', f, a.extra).grid;
        const l = characterWalkPicture2(DEFAULT_LOOK, a.items, 'left', f, a.extra).grid;
        expect(same(l, mirror(r)), `${a.name} ${f}`).toBe(false);
      }
  });

  /**
   * How the test knows the hand: the sword is in the hero's right hand. Toward
   * the camera that hand is on the viewer's left of the anchor; from behind,
   * on the viewer's right; walking right it is the arm nearer the viewer, in
   * front of the body; walking left it is the arm beyond the body, behind it,
   * and a shield (on the left forearm) is the one in front. Across, the frame
   * is built with its pixels tagged by what drew them, so the test reads the
   * fist and the weapon straight off the picture.
   */
  it(
    'keeps the weapon in the same anatomical hand in every facing, and the hand rule in every frame',
    SLOW,
    () => {
      for (const a of armed) {
        const gear = characterGear2(DEFAULT_LOOK, a.items, a.extra);
        const dress = sideDress(gear)!;
        for (let f = 0; f < WALK2_FRAMES; f++) {
          const what = `${a.name} ${f}`;
          // Toward the camera: the whole fist, on the viewer's left, the grip under it, the weapon above and below.
          const down = characterWalkPicture2(DEFAULT_LOOK, a.items, 'down', f, a.extra).grid;
          const fd = find(down, pixels(FIST2));
          expect(fd, `${what} down fist`).not.toBeNull();
          handRule(down, fd!, FIST2, a.held.id, `${what} down`);
          expect(FIST2.at[0] + fd![0], `${what} down hand`).toBeLessThan(FIGURE2_ANCHOR_X);
          // From behind: the same, on the viewer's right.
          const up = characterWalkPicture2(DEFAULT_LOOK, a.items, 'up', f, a.extra).grid;
          const back = flipLit(FIST2, BACK_AXIS);
          const fu = find(up, pixels(back));
          expect(fu, `${what} up fist`).not.toBeNull();
          handRule(up, fu!, back, a.held.id, `${what} up`);
          expect(back.at[0] + fu![0], `${what} up hand`).toBeGreaterThan(FIGURE2_ANCHOR_X);
          // Walking right: the weapon's arm is the near one, its fist whole and in front.
          const right = sideWalkGrid(dress, f, WALK2_STRIDE, false);
          expect(right.weaponNear, what).toBe(true);
          const fist = right.tags.filter((t) => t === 'fist').length;
          expect(fist, `${what} right fist whole`).toBe(pixels(FIST2).length);
          sideHandRule(right, `${what} right`);
          // Walking left: the weapon's arm is beyond the body; the grip never shows without the fist over it.
          const left = sideWalkGrid(dress, f, WALK2_STRIDE, true);
          expect(left.weaponNear, what).toBe(false);
          expect(left.tags.includes('grip'), `${what} left grip`).toBe(false);
          if (a.shield && a.shield.id !== 'spyglass')
            expect(left.tags.includes('shield'), `${what} left shield shows`).toBe(true);
          // And the weapon is drawn behind the body walking left, in front walking right.
          const frR = sideFrame(dress, f, WALK2_STRIDE, false).sheet.dots;
          const frL = sideFrame(dress, f, WALK2_STRIDE, true).sheet.dots;
          const torso = Math.min(...frR.filter((d) => d.tag === 'body').map((d) => d.depth));
          expect(
            Math.min(...frR.filter((d) => d.tag === 'held').map((d) => d.depth)),
            what,
          ).toBeGreaterThan(torso);
          expect(
            Math.max(...frL.filter((d) => d.tag === 'held').map((d) => d.depth)),
            what,
          ).toBeLessThan(torso);
        }
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

describe('the side walk never slides', () => {
  it('moves a planted foot back exactly the stride each frame, heel to toe', () => {
    for (const [stride, dress] of [
      [WALK2_STRIDE, sideDress(characterGear2(DEFAULT_LOOK, []))!],
      [TOWNSFOLK2_STRIDE, FOLK_SIDE.smith!()],
    ] as const) {
      // Where each sole pixel of the near foot is on the ground row, frame by frame, while it is down.
      const soles = [0, 1, 2, 3, 4].map((f) => {
        const fr = sideFrame(dress, f, stride, false);
        return fr.sheet.dots
          .filter((d) => d.tag === 'foot' && d.depth === 12 && d.y === 69)
          .map((d) => d.x);
      });
      for (let f = 1; f < 5; f++) {
        // The same ground point (a pixel of the sole that was down in both frames) moved back by the stride.
        const before = new Set(soles[f - 1]!.map((x) => x - stride));
        expect(
          soles[f]!.some((x) => before.has(x)),
          `${stride} frame ${f}`,
        ).toBe(true);
      }
    }
  });

  it('has a sole down in every frame, and each foot pose knows its ankle', () => {
    for (const foot of Object.values(FEET2))
      expect(foot.rows[foot.ankle[1]]![foot.ankle[0]]).not.toBe('.');
  });
});

describe('the townsfolk walking', () => {
  it('stands every frame of every facing on the anchor, each frame its own', () => {
    for (const id of TOWNSFOLK2_IDS)
      for (const facing of FACINGS) {
        const frames = [...Array(WALK2_FRAMES).keys()].map(
          (f) => townsfolkWalkPicture2(id, facing, f)!.grid,
        );
        frames.forEach((g, f) => standsOnAnchor(g, `${id} ${facing} ${f}`));
        expect(new Set(frames.map((g) => g.d.join())).size, `${id} ${facing}`).toBe(WALK2_FRAMES);
      }
  });

  it('walks across in profile and away from behind, and left mirrors right (they carry no weapon)', () => {
    for (const id of TOWNSFOLK2_IDS) {
      expect(FOLK_SIDE[id], id).toBeDefined();
      for (let f = 0; f < WALK2_FRAMES; f++) {
        const r = townsfolkWalkPicture2(id, 'right', f)!.grid;
        expect(same(townsfolkWalkPicture2(id, 'left', f)!.grid, mirror(r))).toBe(true);
        expect(eyes(townsfolkWalkPicture2(id, 'up', f)!.grid), `${id} up`).toBe(0);
        expect(eyes(r), `${id} right`).toBeGreaterThan(0);
      }
    }
  });

  it('breathes', () => {
    for (const id of TOWNSFOLK2_IDS) {
      expect(townsfolkIdlePicture2(id, 0)).toEqual(townsfolkPicture2(id));
      expect(same(townsfolkIdlePicture2(id, 1)!.grid, townsfolkPicture2(id)!.grid)).toBe(false);
    }
  });
});

/** How many iris pixels a picture shows. */
function eyes(g: TGrid): number {
  const iris = pixels({ at: [0, 0], depth: 0, rows: ['I'] })[0]![2];
  return [...g.d].filter((c) => c === iris).length;
}

/** The hand rule at a fist found in a front or back frame: the grip under the fingers, the weapon above and below. */
function handRule(
  g: TGrid,
  [dx, dy]: [number, number],
  fist: typeof FIST2,
  heldId: string,
  what: string,
) {
  const held = WARDROBE2.gear.find((h) => h.id === heldId)!;
  const mats = new Set(held.parts.flatMap((p) => pixels(p).map(([, , c]) => c >> 3)));
  const isWeapon = (c: number) => c !== 0 && mats.has(c >> 3);
  const px = pixels(fist);
  const cols = new Set(px.map(([x]) => x + dx));
  const top = Math.min(...px.map(([, y]) => y)) + dy;
  const bottom = Math.max(...px.map(([, y]) => y)) + dy;
  expect(
    [...cols].some((x) => isWeapon(at(g, x, top - 1))),
    `${what} above`,
  ).toBe(true);
  expect(
    [...cols].some((x) => isWeapon(at(g, x, bottom + 1)) || isWeapon(at(g, x, bottom))),
    `${what} below`,
  ).toBe(true);
  // The grip under the fingers: the fist's middle is skin, never the weapon.
  expect(
    isWeapon(at(g, Math.min(...cols) + GRIP_X[1] - FIST2.at[0], top + 2)),
    `${what} grip`,
  ).toBe(false);
}

/** The hand rule in a tagged side frame: no grip shows, the weapon shows directly above and below the fist. */
function sideHandRule(fr: { tags: readonly (string | null)[]; grid: TGrid }, what: string) {
  const w = fr.grid.w;
  expect(fr.tags.includes('grip'), `${what} grip hidden`).toBe(false);
  const fist = fr.tags.flatMap((t, i) =>
    t === 'fist' ? [[i % w, Math.floor(i / w)] as const] : [],
  );
  const cols = new Set(fist.map(([x]) => x));
  const top = Math.min(...fist.map(([, y]) => y));
  const bottom = Math.max(...fist.map(([, y]) => y));
  const tag = (x: number, y: number) => fr.tags[y * w + x];
  expect(
    [...cols].some((x) => tag(x, top - 1) === 'held'),
    `${what} above`,
  ).toBe(true);
  expect(
    [...cols].some((x) => tag(x, bottom + 1) === 'held' || tag(x, bottom) === 'held'),
    `${what} below`,
  ).toBe(true);
}
