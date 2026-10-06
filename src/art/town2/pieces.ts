/**
 * The C-scale town's index: every building, prop, boat and tree by plain id,
 * with the facts a scene needs about each drawing (size, base line, layer,
 * where a person stands to use it, its ground shadow, what goes with it).
 * The ids are the current town's (src/art/town.ts) so the swap is a lookup
 * change; `house`, `oak`, `fence`, `bench`, `planter`, `bush` and
 * `boulder` are new. The current town's figures
 * (`hero`, `pirate`, `smith`, `trader`) are not here: figures are being
 * reworked separately.
 *
 * Every piece is drawn once, on first ask, and kept.
 */
import { outlined, type Picture2 } from './cells';
import { pier, rowboat, ship, wreckRock } from './harbour';
import { house } from './house';
import {
  anvil,
  asPicture,
  barrel,
  bench,
  boulder,
  planter,
  bucket,
  buoy,
  crab,
  crate,
  fence,
  gull,
  lamp,
  net,
  noticeBoard,
  signpost,
  smoke,
  stall,
  well,
  type Drawn,
} from './props';
import { m } from './scale';
import { smithy } from './smithy';
import { lowestRow, tavern, type Building } from './tavern';
import { bush, oakTree, pineTree, pineTree2, pineTree3, type Tree } from './trees';

export const TOWN2_IDS = [
  'tavern',
  'smithy',
  'house',
  'stall',
  'pier',
  'ship',
  'well',
  'notice_board',
  'signpost',
  'anvil',
  'lamp',
  'barrel',
  'crate',
  'net',
  'bucket',
  'pine',
  'pine_2',
  'pine_3',
  'oak',
  'fence',
  'bench',
  'planter',
  'bush',
  'boulder',
  'rowboat',
  'buoy',
  'wreck_rock',
  'crab',
  'gull',
  'tavern_smoke',
  'smithy_smoke',
] as const;

export type Town2Id = (typeof TOWN2_IDS)[number];

/** How a piece is drawn among others, as in the current town (src/art/town.ts). */
export type Town2Layer = 'ground' | 'stand' | 'above';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * The shadow a piece throws on the ground, laid by the town: `wall` for a
 * building (contact shadow along its foot from x0 to x1, and a wedge thrown
 * to the right, longer at dusk), `oval` for anything round-footed (centre and
 * radii, stretched to the right at dusk), `water` for things afloat (a dark
 * band under the waterline from x0 to x1).
 */
export type Shadow2 =
  | { readonly kind: 'wall'; readonly x0: number; readonly x1: number; readonly height: number }
  | { readonly kind: 'oval'; readonly cx: number; readonly rx: number; readonly ry: number }
  | { readonly kind: 'water'; readonly x0: number; readonly x1: number };

export interface Attached2 {
  readonly id: Town2Id;
  readonly x: number;
  readonly y: number;
}

export interface Town2Piece {
  readonly id: Town2Id;
  /** The drawing, outlined, with its glows (lit at dusk; the forge's also by day). */
  readonly picture: Picture2;
  readonly w: number;
  readonly h: number;
  /** The row from the top where it meets the ground or the water: sort standing pieces by `y + base`. */
  readonly base: number;
  readonly layer: Town2Layer;
  /** The middle of its foot on the base line, from its top-left: where it is placed by. */
  readonly foot: number;
  /** Where a person's feet stand to use it, from its top-left. */
  readonly spots: Readonly<Record<string, Point>>;
  readonly shadow?: Shadow2;
  /** How wide and deep (in art pixels) the ground it stands on is, for its footprint. */
  readonly ground: { readonly w: number; readonly d: number };
  /** Pieces drawn with it, at (x, y) from its top-left. */
  readonly attached: readonly Attached2[];
}

interface Meta {
  readonly layer: Town2Layer;
  readonly spots?: Readonly<Record<string, Point>>;
  readonly shadow?: Shadow2;
  readonly ground: { readonly w: number; readonly d: number };
  readonly attached?: readonly Attached2[];
  readonly foot?: number;
  readonly base?: number;
}

const SMOKE_W = m(1.3);
const SMOKE_H = m(1.7);
/** Puffs rise from 0.36 of the smoke's width, a little above its bottom. */
const smokeOver = (c: Point, id: Town2Id): Attached2 => ({
  id,
  x: c.x - Math.round(SMOKE_W * 0.36) - 1,
  y: c.y - SMOKE_H + 6,
});

function fromBuilding(b: Building, smokeId: Town2Id): [Picture2, Meta] {
  return [
    b.picture,
    {
      layer: 'stand',
      spots: b.spots,
      shadow: { kind: 'wall', x0: b.wallX0, x1: b.wallX1, height: b.base },
      ground: { w: b.wallX1 - b.wallX0, d: m(3.6) },
      attached: b.chimney ? [smokeOver(b.chimney, smokeId)] : [],
      foot: Math.round((b.wallX0 + b.wallX1) / 2),
      base: b.base,
    },
  ];
}

function fromTree(t: Tree, rx: number): [Picture2, Meta] {
  return [
    t.picture,
    {
      layer: 'stand',
      shadow: { kind: 'oval', cx: t.foot, rx, ry: rx * 0.32 },
      ground: { w: m(0.6), d: m(0.6) },
      foot: t.foot,
    },
  ];
}

const prop = (
  d: Drawn,
  ground: number,
  shadowRx: number,
  layer: Town2Layer = 'stand',
): [Picture2, Meta] => {
  const pic = asPicture(d, outlined);
  return [
    pic,
    {
      layer,
      shadow: {
        kind: 'oval',
        cx: Math.round(pic.grid.w / 2),
        rx: shadowRx,
        ry: Math.max(2, shadowRx * 0.32),
      },
      ground: { w: ground, d: Math.min(ground, m(0.8)) },
    },
  ];
};

const afloat = (d: Drawn): [Picture2, Meta] => {
  const pic = asPicture(d, outlined);
  return [
    pic,
    {
      layer: 'stand',
      shadow: { kind: 'water', x0: 2, x1: pic.grid.w - 2 },
      ground: { w: 0, d: 0 },
    },
  ];
};

/** No outline: smoke is soft, and a net's mesh would fill in. */
const unlined = (d: Drawn, layer: Town2Layer): [Picture2, Meta] => [
  { grid: d.grid, glows: d.glows },
  { layer, ground: { w: 0, d: 0 } },
];

/** The town's pier: twelve metres of boards out from the quay. */
export const PIER_LENGTH = m(12);

const MAKE: Readonly<Record<Town2Id, () => [Picture2, Meta]>> = {
  tavern: () => fromBuilding(tavern(), 'tavern_smoke'),
  smithy: () => fromBuilding(smithy(), 'smithy_smoke'),
  house: () => fromBuilding(house(), 'tavern_smoke'),
  stall: () => {
    const [pic, meta] = prop(stall(), m(3.2), m(1.8));
    return [
      pic,
      { ...meta, spots: { counter: { x: Math.round(pic.grid.w / 2), y: pic.grid.h + 2 } } },
    ];
  },
  pier: () => {
    const [pic] = unlined(pier(PIER_LENGTH), 'ground');
    return [
      pic,
      {
        layer: 'ground',
        ground: { w: 0, d: 0 },
        shadow: { kind: 'water', x0: 4, x1: pic.grid.w - 4 },
      },
    ];
  },
  ship: () => {
    // Its shadow lies under the hull at the waterline, not under the bowsprit.
    const [pic, meta] = afloat(ship());
    return [pic, { ...meta, shadow: { kind: 'water', x0: m(4.2), x1: pic.grid.w - m(0.9) } }];
  },
  well: () => prop(well(), m(1.6), m(1.0)),
  notice_board: () => prop(noticeBoard(), m(1.5), m(0.9)),
  signpost: () => prop(signpost(), m(0.5), m(0.4)),
  anvil: () => prop(anvil(), m(0.8), m(0.55)),
  lamp: () => prop(lamp(), m(0.5), m(0.35)),
  barrel: () => prop(barrel(), m(0.6), m(0.4)),
  crate: () => prop(crate(), m(0.7), m(0.45)),
  net: () => unlined(net(), 'ground'),
  bucket: () => prop(bucket(), m(0.3), m(0.22)),
  pine: () => fromTree(pineTree(), m(1.5)),
  pine_2: () => fromTree(pineTree2(), m(1.25)),
  pine_3: () => fromTree(pineTree3(), m(1.65)),
  oak: () => fromTree(oakTree(), m(2.8)),
  fence: () => {
    const [pic, meta] = prop(fence(), m(1.5), 0);
    return [
      pic,
      {
        ...meta,
        ground: { w: m(1.5), d: m(0.5) },
        shadow: { kind: 'wall', x0: 1, x1: pic.grid.w - 1, height: m(1.0) },
      },
    ];
  },
  bench: () => prop(bench(), m(1.5), m(0.9)),
  planter: () => prop(planter(), m(0.8), m(0.5)),
  bush: () => fromTree(bush(), m(0.8)),
  boulder: () => prop(boulder(), m(1.4), m(0.9)),
  rowboat: () => afloat(rowboat()),
  buoy: () => afloat(buoy()),
  wreck_rock: () => afloat(wreckRock()),
  crab: () => prop(crab(), m(0.3), m(0.25)),
  gull: () => [asPicture(gull(), outlined), { layer: 'above', ground: { w: 0, d: 0 } }],
  tavern_smoke: () => unlined(smoke(false), 'above'),
  smithy_smoke: () => unlined(smoke(true), 'above'),
};

const made = new Map<Town2Id, Town2Piece>();

/** One piece of the C-scale town by id, drawn on first ask and kept. */
export function town2Piece(id: Town2Id): Town2Piece {
  let piece = made.get(id);
  if (!piece) {
    const [picture, meta] = MAKE[id]();
    const base = meta.base ?? Math.max(0, lowestRow(picture.grid));
    piece = {
      id,
      picture,
      w: picture.grid.w,
      h: picture.grid.h,
      base,
      layer: meta.layer,
      foot: meta.foot ?? Math.round(picture.grid.w / 2),
      spots: meta.spots ?? {},
      ...(meta.shadow ? { shadow: meta.shadow } : {}),
      ground: meta.ground,
      attached: meta.attached ?? [],
    };
    made.set(id, piece);
  }
  return piece;
}
