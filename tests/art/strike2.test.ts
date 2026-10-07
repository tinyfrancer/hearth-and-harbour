import { describe, expect, it } from 'vitest';
import {
  FIGURE2_ANCHOR_X,
  FIGURE2_SOLE_Y,
  ITEM_LAYERS2,
  KNIGHT_GEAR2,
  STRIKE2_FRAMES,
  STRIKE2_HIT_FRAME,
  characterStrike2,
  characterStrikePicture2,
  characterStrikeTagged2,
  characterWalkPicture2,
  forgetWalks2,
  type Facing2,
} from '../../src/art/character2';
import { strikeKind } from '../../src/art/figure2/strike';
import type { TGrid } from '../../src/art/town2/cells';

// The hero's blow (docs/style-guide.md, "The blow"): four frames in every
// facing, for every weapon class and outfit, on the walk's canvas and anchor.

const FACINGS: readonly Facing2[] = ['down', 'right', 'left', 'up'];
const SLOW = { timeout: 300000 };
const W = 56;
const at = (g: TGrid, x: number, y: number) => g.d[y * g.w + x]!;
const same = (a: TGrid, b: TGrid) => a.d.every((c, i) => c === b.d[i]);

const WEAPONS = Object.keys(ITEM_LAYERS2).filter((id) =>
  /sword|axe|cutlass|cudgel|bow|anchor/.test(id),
);
const OUTFITS: { name: string; worn: string[]; extra?: string[] }[] = [
  ...WEAPONS.map((id) => ({ name: id, worn: ['linen_tunic', 'linen_trousers', id] })),
  { name: 'linen, empty-handed', worn: ['linen_tunic', 'linen_trousers'] },
  { name: 'the knight', worn: [], extra: [...KNIGHT_GEAR2] },
  {
    name: 'the knight with a bow',
    worn: ['oak_shortbow', 'iron_arrows'],
    extra: ['knight_plate', 'red_cloak'],
  },
  {
    name: 'the knight, empty-handed',
    worn: [],
    extra: ['knight_plate', 'knight_knees', 'red_cloak'],
  },
  { name: 'iron', worn: ['iron_helmet', 'iron_breastplate', 'iron_shield', 'iron_sword'] },
  { name: 'the coat', worn: ['captains_coat', 'tricorn', 'boarding_axe'] },
];

describe('the blow door', () => {
  it('says how many frames and which one lands', () => {
    expect(STRIKE2_FRAMES).toBe(4);
    expect(STRIKE2_HIT_FRAME).toBe(2);
    expect(STRIKE2_HIT_FRAME).toBeLessThan(STRIKE2_FRAMES);
  });

  it('names the kind of blow by the weapon: swung, loosed, or a punch', () => {
    expect(strikeKind('knight_sword')).toBe('swing');
    expect(strikeKind('boarding_axe')).toBe('swing');
    expect(strikeKind('brinebeards_anchor')).toBe('swing');
    expect(strikeKind('poachers_longbow')).toBe('bow');
    expect(strikeKind(null)).toBe('unarmed');
  });

  it('keeps each frame once drawn, wraps the frame number, and lets go when told', () => {
    const a = characterStrikePicture2({}, ['iron_sword'], 'right', 1);
    expect(characterStrikePicture2({}, ['iron_sword'], 'right', 1)).toBe(a);
    expect(characterStrikePicture2({}, ['iron_sword'], 'right', 1 + STRIKE2_FRAMES)).toBe(a);
    expect(characterStrikePicture2({}, ['iron_sword'], 'right', -3)).toBe(a);
    forgetWalks2();
    const b = characterStrikePicture2({}, ['iron_sword'], 'right', 1);
    expect(b).not.toBe(a);
    expect(same(a.grid, b.grid)).toBe(true);
    const canvas = characterStrike2({}, ['iron_sword'], 'dusk', 'up', 2);
    expect([canvas.width, canvas.height]).toEqual([56, 72]);
  });

  it('never throws on an unknown look or item', () => {
    for (const facing of FACINGS)
      expect(() =>
        characterStrikePicture2({ skin: 'nope', hair: 'nope' }, ['nothing'], facing, 2),
      ).not.toThrow();
  });
});

describe('the blow, in every facing', () => {
  it("stands on the walk's canvas and anchor, every frame its own, never the walk", SLOW, () => {
    for (const o of OUTFITS)
      for (const facing of FACINGS) {
        const frames = Array.from(
          { length: STRIKE2_FRAMES },
          (_, f) => characterStrikePicture2({}, o.worn, facing, f, o.extra).grid,
        );
        frames.forEach((g, f) => {
          const what = `${o.name} ${facing} ${f}`;
          expect([g.w, g.h], what).toEqual([56, 72]);
          // The feet stay planted: something on the soles' row near the anchor, nothing below it.
          let sole = false;
          for (let x = FIGURE2_ANCHOR_X - 14; x <= FIGURE2_ANCHOR_X + 14; x++)
            if (at(g, x, FIGURE2_SOLE_Y)) sole = true;
          expect(sole, `${what}: a sole on row 70`).toBe(true);
          for (let x = 0; x < W; x++) expect(at(g, x, 71), `${what}: row 71 empty`).toBe(0);
          // Nothing reaches the canvas's edge: a long weapon is foreshortened, never cut off.
          for (let y = 0; y < 72; y++) {
            expect(at(g, 0, y), `${what}: left edge`).toBe(0);
            expect(at(g, W - 1, y), `${what}: right edge`).toBe(0);
          }
          for (let x = 0; x < W; x++) expect(at(g, x, 0), `${what}: top edge`).toBe(0);
          expect(same(g, characterWalkPicture2({}, o.worn, facing, 0, o.extra).grid), what).toBe(
            false,
          );
        });
        for (let f = 1; f < STRIKE2_FRAMES; f++)
          expect(same(frames[f]!, frames[f - 1]!), `${o.name} ${facing} ${f}`).toBe(false);
      }
  });

  it(
    'keeps the hand rule: a fist closed on the weapon, the grip only under its fingers',
    SLOW,
    () => {
      for (const id of WEAPONS.filter((w) => strikeKind(ITEM_LAYERS2[w]) === 'swing'))
        for (const facing of FACINGS)
          for (let f = 0; f < STRIKE2_FRAMES; f++) {
            const t = characterStrikeTagged2({}, [id], facing, f)!;
            const tags = t.tags;
            const what = `${id} ${facing} ${f}`;
            const held = tags.filter((x) => x === 'held').length;
            // From behind at the blow, the weapon is ahead of the body and may show only past it.
            if (!(facing === 'up' && f === STRIKE2_HIT_FRAME)) {
              expect(tags.includes('fist'), `${what}: a fist`).toBe(true);
              expect(held, `${what}: the weapon shows`).toBeGreaterThan(4);
            }
            // Every grip pixel that shows has a fist pixel beside it.
            tags.forEach((x, i) => {
              if (x !== 'grip') return;
              const near = [i - 1, i + 1, i - W, i + W].some((j) => tags[j] === 'fist');
              expect(near, `${what}: grip at ${i % W},${Math.floor(i / W)} under the fingers`).toBe(
                true,
              );
            });
          }
    },
  );

  it('draws and looses a bow: the hand drawn back to the face, then flung open', () => {
    for (const facing of ['right', 'left'] as const) {
      const fistX = (f: number) => {
        const t = characterStrikeTagged2({}, ['pine_shortbow'], facing, f)!.tags;
        const xs = t.flatMap((x, i) => (x === 'fist' ? [i % W] : []));
        return facing === 'right' ? Math.min(...xs) : Math.max(...xs);
      };
      // Drawn, the string hand is nearer the back of the head than when the arrow is nocked
      // (walking left it is the far hand, behind the head once drawn).
      if (facing === 'right') expect(fistX(1), facing).toBeLessThan(fistX(0));
      // Loosed, the string hand opens.
      const loosed = characterStrikeTagged2({}, ['pine_shortbow'], facing, STRIKE2_HIT_FRAME)!.tags;
      expect(loosed.includes('hand'), facing).toBe(true);
    }
  });

  it('from behind, the blow lands ahead: the weapon is behind the body where they overlap', () => {
    for (const id of ['iron_sword', 'boarding_axe', 'knight_sword']) {
      const extra = id === 'knight_sword' ? ['knight_plate', 'red_cloak'] : [];
      const worn = id === 'knight_sword' ? [] : [id];
      const t = characterStrikeTagged2(
        {},
        worn,
        'up',
        STRIKE2_HIT_FRAME,
        id === 'knight_sword' ? [...extra, id] : extra,
      )!;
      const person = new Uint8Array(W * 72);
      for (const tag of ['body', 'arm', 'cloak', 'skirt', 'head', 'hair', 'hat', 'leg', 'foot'])
        t.cover!.get(tag)?.forEach((v, i) => (person[i] ||= v));
      const over = t.tags.filter((x, i) => (x === 'held' || x === 'grip') && person[i]).length;
      expect(over, id).toBe(0);
      expect(
        t.tags.filter((x) => x === 'held').length,
        `${id} shows past the head`,
      ).toBeGreaterThan(0);
    }
  });

  it('punches with empty hands: a closed hand out ahead at the blow', () => {
    const rest = characterStrikePicture2({}, [], 'right', 0).grid;
    const hit = characterStrikeTagged2({}, [], 'right', STRIKE2_HIT_FRAME)!.tags;
    let reach = 0;
    hit.forEach((x, i) => {
      if (x === 'hand' || x === 'fist') reach = Math.max(reach, i % W);
    });
    expect(reach).toBeGreaterThan(FIGURE2_ANCHOR_X + 12);
    expect(rest.w).toBe(56);
  });
});
