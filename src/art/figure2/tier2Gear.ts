/**
 * Tier 2's wearables beside the knight (B19, docs/tier2-manifest.md): the
 * ranger's hood, coat and bracers, the four new bows, the silver bangle and
 * the gold amulet, and what the new area and the Thistlewood give up (the
 * ogre's maul, the briar charm, the mossback shield, the cap-guard helm).
 *
 * Where tier 1 already has the construction, the piece is that construction
 * in its own materials and with what only it has: the ranger's hood is the
 * villager's hood cut deep in dark leather with a seam over the crown, his
 * coat the captain's long coat in the same leather with plain leather edging
 * (no brass), his bracers the hunter's laced bracers longer, to the elbow.
 * Each is drawn front-on here; profile and back are in `sideDress.ts`,
 * `sideHeads.ts` and `views.ts` beside their tier 1 kin.
 */
import { DEPTH } from '../depth';
import type { Mat } from '../town2/ramps';
import { CAPTAINS_COAT } from './armour';
import { hold } from './clothes';
import { runs, type Gear2, type Line, type Part2, type Pins } from './engine';
import { LINEN_HOOD } from './headgear';
import { FIST_BOTTOM, FIST_TOP, bowParts, gripPart } from './held';

const { HELMET, WRIST, JEWELLERY, SHIELD, HELD_FRONT } = DEPTH;

/** A part redyed: its own material and its pins' materials swapped by `map`. */
export function dyePart(p: Part2, map: Partial<Record<Mat, Mat>>): Part2 {
  const pins = p.pins
    ? (Object.fromEntries(
        Object.entries(p.pins).map(([k, [m, s]]) => [k, [map[m] ?? m, s]]),
      ) as Pins)
    : undefined;
  return { ...p, mat: p.mat ? (map[p.mat] ?? p.mat) : p.mat, ...(pins ? { pins } : {}) };
}

// ------------------------------------------------------------- the ranger

/** The ranger's hood: the villager's hood in dark green-brown thick leather, a seam over the crown. */
const RANGER_HOOD: Gear2 = {
  id: 'ranger_hood',
  slot: 'head',
  parts: [
    ...LINEN_HOOD.parts.map((p) => dyePart(p, { linen: 'ranger' })),
    // The seam: a stitched line from the brow back over the crown, its stitches catching the light.
    {
      at: [28, 4],
      depth: HELMET + 0.1,
      mat: 'ranger',
      rows: ['4', '1', '4', '4', '1', '4'],
    },
  ],
};

/** The ranger's coat: the captain's long coat cut in the same leather, edged in plain leather. */
const LEATHER_EDGE: Partial<Record<Mat, Mat>> = { midnight: 'ranger', bronze: 'umber' };
const RANGER_COAT: Gear2 = {
  id: 'ranger_coat',
  slot: 'body',
  parts: CAPTAINS_COAT.parts.map((p) => dyePart(p, LEATHER_EDGE)),
};

/** The ranger's bracers: dark thick leather laced in linen, longer than the hunter's, to the elbow. */
const LACE: Pins = { c: ['linen', 1], s: ['linen', 2] };
const RANGER_BRACERS: Gear2 = {
  id: 'ranger_bracers',
  slot: 'wrist',
  parts: [
    // The near forearm (the bow arm, a stitched guard down its outside) in each pose of the arm.
    hold({
      at: [16, 33],
      depth: WRIST,
      mat: 'umber',
      rows: ['.1234', 's1234', '1c234', 's2c34', '1c234', 's2c35'],
      pins: LACE,
    }),
    {
      at: [36, 32],
      depth: WRIST,
      mat: 'umber',
      rows: ['...1233', '..12334', '.1c2334', '12c234', '1c234', '12c35'],
      pins: LACE,
    },
  ],
};

// ------------------------------------------------------------------ bows

/** Tips of horn at both ends of a longbow drawn by `bowParts`. */
function hornTips(top: number, bottom: number, bend: number): Part2 {
  const x = Math.round(15.5 - bend - 0.01);
  return runs(
    HELD_FRONT + 0.1,
    [
      [top, [x, '0']],
      [top + 1, [x - 1, '12']],
      [bottom - 1, [x - 1, '23']],
      [bottom, [x, '3']],
    ],
    { mat: 'sail' },
  );
}

/** Thorns along a bow's back, every few rows, clear of the hand. */
function thorns(top: number, bottom: number, bend: number): Part2 {
  const mid = (top + bottom) / 2;
  const half = (bottom - top) / 2;
  const lines: Line[] = [];
  for (let y = top + 3; y <= bottom - 3; y += 4) {
    if (y >= FIST_TOP - 2 && y <= FIST_BOTTOM + 2) continue;
    const u = (y - mid) / half;
    const x = Math.round(15.5 - bend * u * u - 0.01);
    lines.push([y, [x + 2, '3']]);
    lines.push([y - 1, [x + 3, '5']]);
  }
  return runs(HELD_FRONT + 0.1, lines, { mat: 'thorn' });
}

const bowGear = (id: string, parts: Part2[]): Gear2 => ({ id, slot: 'weapon', parts });

/** The driftwood shortbow: the shortbows' stave in bleached silver-grey wood, bound in tarred cord. */
const DRIFTWOOD_SHORTBOW = bowGear('driftwood_shortbow', bowParts('drift', 22, 60, 5, 'tar'));
/** The elm longbow: a head taller than the shortbows, warm brown, a leather grip. */
const ELM_LONGBOW = bowGear('elm_longbow', bowParts('elm', 12, 68, 3, 'leather'));
/** The yew longbow: taller, its belly the orange heartwood and its back the pale sapwood, horn tips. */
const YEW_LONGBOW = bowGear('yew_longbow', [
  ...bowParts('yew', 11, 69, 3.5, 'leather'),
  hornTips(11, 69, 3.5),
]);
/** The thornwood bow: dark and grown rather than carved, thorns along its back, green-bound. */
const THORNWOOD_BOW = bowGear('thornwood_bow', [
  ...bowParts('thorn', 12, 68, 4, 'leaf'),
  thorns(12, 68, 4),
]);

// --------------------------------------------------------------- jewellery

const at = (
  x: number,
  y: number,
  depth: number,
  mat: Mat,
  rows: readonly string[],
  pins: Pins,
): Part2 => ({
  at: [x, y],
  depth,
  mat,
  rows,
  pins,
});

/** The silver bangle: a bright band below the cuff, a green sea-glass stone at its front. */
const SILVER_BANGLE: Gear2 = {
  id: 'silver_bangle',
  slot: 'wrist',
  parts: [
    hold(at(16, 38, WRIST, 'silver', ['0122g3', '.3445G'], { g: ['leaf', 1], G: ['leaf', 3] })),
  ],
};

/** The gold amulet: a gold chain to a gold disc with a pale blue sea-glass at its heart. */
const GOLD_AMULET: Gear2 = {
  id: 'gold_amulet',
  slot: 'neck',
  parts: [
    at(
      24,
      23,
      JEWELLERY,
      'gold',
      ['k.......K', '.k.....K.', '..k...K..', '...k.K...', '...123...', '..12b34..', '...234...'],
      { k: ['gold', 2], K: ['gold', 4], b: ['blue', 0] },
    ),
  ],
};

/** The briar charm: a little wreath of dark thorns round one red berry, on a cord at the collar. */
const BRIAR_CHARM: Gear2 = {
  id: 'briar_charm',
  slot: 'neck',
  parts: [
    at(
      24,
      23,
      JEWELLERY,
      'thorn',
      ['k.......K', '.k.....K.', '..kk.KK..', '...2x3...', '..x2r3x..', '...3x4...', '....x....'],
      { k: ['leather', 4], K: ['leather', 5], x: ['thorn', 5], r: ['crimson', 1] },
    ),
  ],
};

// ------------------------------------------------- the new area's drops

/**
 * The ogre's maul, carried down like the anchor: a knob of trunk above the
 * fist, the trunk hanging from it nearly to the ground, swelling to its
 * head, bound with three rusty iron bands, a knot or two lit on its lip.
 */
function maulParts(): Part2[] {
  const lines: Line[] = [];
  const bands = [52, 53, 59, 60, 65, 66];
  for (let y = FIST_BOTTOM + 1; y <= 68; y++) {
    const w = Math.round(4 + (y - FIST_BOTTOM) * 0.2) + (y >= 67 ? -1 : 0) + (y === 68 ? -1 : 0);
    const x0 = Math.round(15.5 - w / 2);
    let s = '';
    for (let i = 0; i < w; i++) {
      const t = w === 1 ? 0 : i / (w - 1);
      let step = i === 0 ? 1 : t < 0.5 ? 2 : t < 0.85 ? 3 : 4;
      if (y >= 67) step = Math.min(5, step + 1);
      s += String(step);
    }
    if (bands.includes(y)) lines.push([y, [x0 - 1, `r${'r'.repeat(w)}R`]]);
    else lines.push([y, [x0, s]]);
  }
  // Knots: a dark hollow under a lit lip.
  lines.push([56, [15, '14']], [62, [17, '15']]);
  return [
    runs(
      HELD_FRONT,
      [
        [FIST_TOP - 2, [14, '1234']],
        [FIST_TOP - 1, [14, '1234']],
      ],
      { mat: 'bark' },
    ),
    runs(HELD_FRONT, lines, {
      mat: 'bark',
      pins: { r: ['iron', 3], R: ['iron', 5] },
    }),
    gripPart('bark'),
  ];
}
const OGRE_MAUL: Gear2 = { id: 'ogre_maul', slot: 'weapon', parts: maulParts() };

/** The mossback shield: a rough slab of grey stone grown over with moss, bound to the arm with roots. */
const MOSSBACK_SHIELD: Gear2 = {
  id: 'mossback_shield',
  slot: 'shield',
  parts: [
    {
      at: [30, 27],
      depth: SHIELD,
      mat: 'stone',
      rows: [
        '...mMm1223....',
        '.1mmMMm12233..',
        '11mMMm1222334.',
        '1112m122223344',
        'rrrrrrrrrrrrrR',
        '11222222m22344',
        '1122222mmM2344',
        '11222222mM2344',
        '1222m22222m344',
        '122mMm2222mM45',
        'rrrrrrrrrrrrrR',
        '.12mM2222223445',
        '.1222222m22345',
        '.122222mMm2345',
        '..12222222m344',
        '..1222222334..',
        '...12223344...',
        '....33445.....',
      ],
      pins: {
        m: ['moss', 2],
        M: ['moss', 4],
        r: ['bark', 3],
        R: ['bark', 5],
      },
    },
  ],
};

/**
 * The cap-guard helm: a broad red mushroom cap worn as a helmet, white spots
 * on its dome, its pale gills under the rim (above the brows), a leather
 * strap down both cheeks and under the chin.
 */
const CAPGUARD_HELM: Gear2 = {
  id: 'capguard_helm',
  slot: 'head',
  parts: [
    {
      at: [17, 1],
      depth: HELMET,
      mat: 'tile',
      rows: [
        '........1111222',
        '.....111ww11122222',
        '...111www11112ww2233',
        '..1111ww111222www2334',
        '.11ww11111222222223344',
        '11www1112ww22222233334',
        '1111111122www222233w34',
        '44444444444444444455555',
        '.gGgGgGgGgGgGgGgGgGgGg',
      ],
      pins: { w: ['sail', 0], g: ['cream', 1], G: ['cream', 3] },
    },
    runs(
      HELMET - 1,
      [
        ...Array.from({ length: 8 }, (_, i): Line => [10 + i, [20, '3'], [36, '4']]),
        [18, [21, '3'], [35, '4']],
        [19, [22, '3'], [34, '4']],
        [20, [23, '3'], [33, '4']],
        [21, [24, '334444444']],
      ],
      { mat: 'leather' },
    ),
  ],
};

export const TIER2_GEAR2: readonly Gear2[] = [
  RANGER_HOOD,
  RANGER_COAT,
  RANGER_BRACERS,
  DRIFTWOOD_SHORTBOW,
  ELM_LONGBOW,
  YEW_LONGBOW,
  THORNWOOD_BOW,
  SILVER_BANGLE,
  GOLD_AMULET,
  BRIAR_CHARM,
  OGRE_MAUL,
  MOSSBACK_SHIELD,
  CAPGUARD_HELM,
];
