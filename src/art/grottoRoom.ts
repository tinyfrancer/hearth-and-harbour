/**
 * A room of Brinebeard's Grotto assembled from its tiles, props and cast, as
 * the gallery shows it: the art judged where it will be seen, together and
 * at dusk, not one tile at a time. Lane C lays out the real rooms; this is
 * the art lane's own test room, and the picture of how the pieces join.
 */
import { DEFAULT_LOOK, characterPicture } from './character';
import { dungeonProp, dungeonTile, foePicture } from './dungeonArt';
import { blit, ellipse, grid, type Grid } from './grid';
import type { Shade } from './palette';
import { picture, type Glow, type Picture } from './raster';
import { TILE_SIZE, type GrottoTileKind } from './grottoTiles';

/**
 * What each character in a room's rows is. `#` is rock: its front face where
 * open ground is below it, its top otherwise.
 */
const KEY: Readonly<Record<string, GrottoTileKind | 'rock'>> = {
  '#': 'rock',
  '.': 'sand',
  ',': 'wet_sand',
  r: 'rock_floor',
  '~': 'shallows',
  '=': 'deep_water',
  p: 'planks',
  D: 'door_barred',
  O: 'door_open',
};

/**
 * The step a standing thing's ground shadow is drawn in on each kind of
 * ground: one darker than the ground's own. None on deep water.
 */
export const GROTTO_SHADOW: Readonly<Partial<Record<GrottoTileKind, Shade>>> = {
  sand: 'cavesand3',
  wet_sand: 'cavesand4',
  rock_floor: 'stone3',
  shallows: 'shoal3',
  planks: 'wood3',
};

/** The test room: rock floor and sand, the tide's wet edge, shallows, deep water and a pier. */
export const TEST_ROOM: readonly string[] = [
  '########################',
  '####O###########D#######',
  '#rrrrrrr##.............#',
  '#rrrrrrr##.............#',
  '#rrr.rr.......###......#',
  '#rr..r........###......D',
  '#r.............#.......#',
  '#.........,,,,,,,......#',
  '#,,,,,,,,,,~~~~~,,,,,,,#',
  '#~~~~~,,~~~~~===~~~~,,~#',
  '#~~~~~~~~~=====p====~~~#',
  '#====~~~=======p=======#',
  '#==============p=======#',
  '########################',
];

/**
 * Who and what stands in the test room for the gallery: the whole cast,
 * spread out so each is seen whole, two lanterns lit, the props about.
 */
export const TEST_ROOM_PLACED: readonly Placed[] = [
  { kind: 'prop', id: 'lantern', x: 40, y: 62 },
  { kind: 'prop', id: 'lantern', x: 290, y: 66 },
  { kind: 'prop', id: 'brig_bars', x: 108, y: 63 },
  { kind: 'prop', id: 'cannon', x: 205, y: 56 },
  { kind: 'prop', id: 'treasure_chest', x: 256, y: 50 },
  { kind: 'prop', id: 'powder_keg', x: 340, y: 50 },
  { kind: 'prop', id: 'powder_keg', x: 352, y: 56 },
  { kind: 'prop', id: 'anchor', x: 92, y: 140 },
  { kind: 'prop', id: 'rope_coil', x: 40, y: 138 },
  { kind: 'foe', id: 'smuggler', x: 58, y: 104 },
  { kind: 'foe', id: 'dock_rat', x: 100, y: 120 },
  { kind: 'foe', id: 'deckhand', x: 222, y: 92 },
  { kind: 'foe', id: 'sand_crab', x: 168, y: 134 },
  { kind: 'foe', id: 'ships_parrot', x: 250, y: 124 },
  { kind: 'foe', id: 'brinebeard', x: 305, y: 120 },
  { kind: 'foe', id: 'powder_monkey', x: 352, y: 104 },
  { kind: 'foe', id: 'giant_crab', x: 120, y: 170 },
];

/** Each cell's tile kind, rock resolved to its face or its top. */
export function roomKinds(rows: readonly string[]): GrottoTileKind[][] {
  const at = (c: number, r: number): string => rows[r]?.[c] ?? '#';
  return rows.map((row, r) =>
    [...row].map((ch, c) => {
      const kind = KEY[ch];
      if (!kind) throw new Error(`Unknown room character "${ch}".`);
      if (kind !== 'rock') return kind;
      return at(c, r + 1) === '#' ? 'wall_top' : 'wall_face';
    }),
  );
}

/** Someone or something standing in the room: feet (or base) at (x, y) in art pixels. */
export interface Placed {
  readonly kind: 'foe' | 'prop' | 'picture';
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** For `picture`: the picture and its feet. */
  readonly pic?: Picture;
  readonly feet?: { readonly x: number; readonly y: number };
  readonly mirror?: boolean;
}

function mirrored(g: Grid): Grid {
  const m = grid(g.w, g.h);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) m.d[y * g.w + (g.w - 1 - x)] = g.d[y * g.w + x] ?? null;
  return m;
}

/**
 * The room's ground from its tiles, each cell's variant its own index, then
 * everything standing in it sorted by its feet, each on a ground shadow, with
 * the lights of whatever glows.
 */
export function roomPicture(
  rows: readonly string[],
  placed: readonly Placed[] = [],
  shadows = true,
): Picture {
  const kinds = roomKinds(rows);
  const cols = Math.max(...rows.map((r) => r.length));
  const g = grid(cols * TILE_SIZE, rows.length * TILE_SIZE);
  kinds.forEach((row, r) =>
    row.forEach((kind, c) => {
      const t = dungeonTile('grotto', kind, r * 97 + c * 31);
      if (t) blit(g, t.grid, c * TILE_SIZE, r * TILE_SIZE);
    }),
  );
  const glows: Glow[] = [];
  const standing: { pic: Grid; x: number; y: number; base: number }[] = [];
  for (const p of placed) {
    let pic: Picture | null = null;
    let fx = 0;
    let fy = 0;
    let shadowW = 0;
    if (p.kind === 'foe') {
      const f = foePicture(p.id);
      if (!f) continue;
      pic = f.picture;
      fx = f.feet.x;
      fy = f.feet.y;
      shadowW = Math.max(5, Math.round(f.picture.grid.w * 0.3));
    } else if (p.kind === 'prop') {
      const f = dungeonProp('grotto', p.id);
      if (!f) continue;
      pic = f.picture;
      fx = Math.floor(f.picture.grid.w / 2);
      fy = f.base;
      shadowW = Math.round(f.picture.grid.w * 0.45);
    } else if (p.pic && p.feet) {
      pic = p.pic;
      fx = p.feet.x;
      fy = p.feet.y;
      shadowW = 10;
    }
    if (!pic) continue;
    const grd = p.mirror ? mirrored(pic.grid) : pic.grid;
    if (p.mirror) fx = pic.grid.w - 1 - fx;
    const x = p.x - fx;
    const y = p.y - fy;
    standing.push({ pic: grd, x, y, base: p.y });
    for (const glow of pic.glows) {
      const gx = p.mirror ? pic.grid.w - glow.x : glow.x;
      glows.push({ ...glow, x: x + gx, y: y + glow.y });
    }
    if (shadows) {
      const cell = kinds[Math.floor(p.y / TILE_SIZE)]?.[Math.floor(p.x / TILE_SIZE)];
      const shade = cell && GROTTO_SHADOW[cell];
      if (shade) ellipse(g, p.x, p.y, shadowW, 2.4, shade);
    }
  }
  standing.sort((a, b) => a.base - b.base);
  for (const s of standing) blit(g, s.pic, s.x, s.y);
  return picture(g, glows);
}

/** The hero as the gallery stands him among the cast: a town guard in iron. */
const heroInIron = (): Picture =>
  characterPicture(DEFAULT_LOOK, ['iron_sword', 'iron_helmet', 'iron_breastplate']);

/** The test room with the whole cast in it, the hero among them and the lanterns lit. */
export function grottoRoomPlate(): Picture {
  return roomPicture(TEST_ROOM, [
    ...TEST_ROOM_PLACED,
    { kind: 'picture', id: 'hero', x: 158, y: 108, pic: heroInIron(), feet: { x: 20, y: 47 } },
  ]);
}

/** Each tile kind laid three by two, every cell a different variant, with a gap between kinds. */
export function grottoTilesPlate(): Picture {
  const kinds = [
    'sand',
    'wet_sand',
    'rock_floor',
    'shallows',
    'deep_water',
    'wall_top',
    'wall_face',
    'planks',
    'door_barred',
    'door_open',
  ] as const;
  const fieldW = 3 * TILE_SIZE;
  const fieldH = 2 * TILE_SIZE;
  const gap = 6;
  const g = grid(5 * fieldW + 4 * gap, 2 * fieldH + gap);
  kinds.forEach((kind, k) => {
    const x0 = (k % 5) * (fieldW + gap);
    const y0 = Math.floor(k / 5) * (fieldH + gap);
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 3; c++) {
        const t = dungeonTile('grotto', kind, k * 13 + r * 3 + c);
        if (t) blit(g, t.grid, x0 + c * TILE_SIZE, y0 + r * TILE_SIZE);
      }
  });
  return picture(g);
}

/** The hero and then the cast, standing on one line, each facing right. */
export function grottoCastPlate(ids: readonly string[]): Picture {
  const hero = heroInIron();
  const foes = ids.map((id) => foePicture(id)).filter((f): f is NonNullable<typeof f> => !!f);
  const ground = Math.max(47, ...foes.map((f) => f.feet.y));
  const w = 42 + foes.reduce((n, f) => n + f.picture.grid.w + 4, 0);
  const g = grid(w, ground + 3);
  const glows: Glow[] = [];
  blit(g, hero.grid, 0, ground - 47);
  let x = 42;
  for (const f of foes) {
    const y = ground - f.feet.y;
    blit(g, f.picture.grid, x, y);
    for (const l of f.picture.glows) glows.push({ ...l, x: l.x + x, y: l.y + y });
    x += f.picture.grid.w + 4;
  }
  return picture(g, glows);
}

/** Every prop on one line, standing on its base. */
export function grottoPropsPlate(ids: readonly string[]): Picture {
  const props = ids.map((id) => dungeonProp('grotto', id)).filter((p) => !!p);
  const ground = Math.max(...props.map((p) => p.base));
  const w = props.reduce((n, p) => n + p.picture.grid.w + 4, 0);
  const g = grid(w, ground + 2);
  const glows: Glow[] = [];
  let x = 0;
  for (const p of props) {
    const y = ground - p.base;
    blit(g, p.picture.grid, x, y);
    for (const l of p.picture.glows) glows.push({ ...l, x: l.x + x, y: l.y + y, radius: 14 });
    x += p.picture.grid.w + 4;
  }
  return picture(g, glows);
}
