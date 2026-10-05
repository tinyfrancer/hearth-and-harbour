/*
 * How a dungeon room looks: its ground at each state of the tide, the things
 * standing in it, and the lanterns that light it. Tiles come from the art
 * lane's `dungeonTile`, props from `dungeonProp`, each falling back to this
 * scene's own drawing while the door answers null, so the grotto can be
 * played before it is dressed and is dressed without a line changing here.
 * Sizes are taken from the pictures given (a prop can be any size); where
 * things stand and what is solid stay this scene's data.
 */
import { dungeonProp, dungeonTile } from '../art/dungeonArt';
import { GROTTO_SHADOW } from '../art/grottoRoom';
import { blit, ellipse, get, grid, line, outline, rect, set, type Grid } from '../art/grid';
import type { Shade } from '../art/palette';
import { picture, type Glow, type Picture } from '../art/raster';
import type { Room } from './dungeon';
import { tileAt, type RoomTile } from './ground';
import type { Scene, Thing } from './things';
import { HIGH_WATER } from './tide';
import { TILE, cellAt, inMap, type Point, type TileMap } from './tileMap';
import { SHADOW_MIDDLE, litBy, walkerShadow } from './townArt';

/** The grotto's theme, as the art doors know it. */
export const THEME = 'grotto';

/** The tile kinds the art lane draws for the grotto (`docs/lanes.md`). */
export type TileKind =
  | 'sand'
  | 'wet_sand'
  | 'rock_floor'
  | 'wall_top'
  | 'wall_face'
  | 'shallows'
  | 'deep_water'
  | 'planks'
  | 'door_barred'
  | 'door_open';

/** How many wears of this scene's own floors there are, so a floor is not one tile repeated. */
const VARIANTS = 4;

/** A cell's variant, as the art lane asks for it: its index in the room, so neighbours differ. */
export const cellVariant = (cols: number, col: number, row: number): number => row * cols + col;

/** A small, steady hash of a tile's place: the same tile always gets the same wear. */
export function hash(col: number, row: number, salt = 0): number {
  let h = (col * 374761393 + row * 668265263 + salt * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/* ----- This scene's own tiles, until the art lane's arrive ----- */

/** A tile filled with one step and flecked with others, steadily by its variant. */
function flecked(base: Shade, flecks: readonly [Shade, number][], variant: number): Grid {
  const g = grid(TILE, TILE);
  rect(g, 0, 0, TILE, TILE, base);
  let n = 0;
  for (const [shade, count] of flecks) {
    for (let i = 0; i < count; i++) {
      const h = hash(variant, n++, 7);
      set(g, h % TILE, (h >>> 8) % TILE, shade);
    }
  }
  return g;
}

const OWN: Readonly<Record<TileKind, (variant: number) => Grid>> = {
  sand: (v) =>
    flecked(
      'sand2',
      [
        ['sand1', 7],
        ['sand3', 6],
      ],
      v,
    ),
  wet_sand: (v) =>
    flecked(
      'sand3',
      [
        ['wood3', 6],
        ['sea3', 5],
      ],
      v,
    ),
  rock_floor: (v) => {
    // Pale worn stone: plainly floor beside the dark rock round it.
    const g = flecked(
      'stone1',
      [
        ['stone2', 9],
        ['cobble1', 4],
      ],
      v,
    );
    // A crack or two in the stone.
    const h = hash(v, 99, 3);
    line(g, h % 12, (h >>> 4) % 12, (h % 12) + 3, ((h >>> 4) % 12) + 2, 'stone3');
    return g;
  },
  wall_top: (v) =>
    // Rock seen from above: dark, so it never reads as somewhere to stand.
    flecked(
      'navy2',
      [
        ['slate3', 8],
        ['navy1', 5],
      ],
      v,
    ),
  wall_face: (v) => {
    const g = flecked(
      'slate2',
      [
        ['slate1', 4],
        ['slate3', 8],
      ],
      v,
    );
    // Courses in the rock, and a dark foot so anything standing in front reads against it.
    rect(g, 0, 5, TILE, 1, 'slate3');
    rect(g, 0, 10, TILE, 1, 'slate3');
    rect(g, 0, TILE - 3, TILE, 3, 'shade1');
    return g;
  },
  shallows: (v) => {
    // Bright water with the sand showing through: you could wade this.
    // (The sea's light step is the sunset's pink at dusk, so it is kept for crests.)
    const g = flecked(
      'sea2',
      [
        ['sand3', 14],
        ['sand2', 4],
        ['foam1', 2],
      ],
      v,
    );
    return g;
  },
  deep_water: (v) => {
    // Dark and bottomless: nobody stands in this.
    const g = flecked(
      'navy1',
      [
        ['sea3', 14],
        ['navy2', 8],
      ],
      v,
    );
    return g;
  },
  planks: (v) => {
    const g = grid(TILE, TILE);
    rect(g, 0, 0, TILE, TILE, 'wood2');
    for (const y of [0, 5, 10, 15]) rect(g, 0, y, TILE, 1, 'wood4');
    for (let i = 0; i < 3; i++) {
      const h = hash(v, i, 5);
      rect(g, h % 14, 1 + 5 * i, 2, 1, 'wood1');
      set(g, (h >>> 8) % TILE, 3 + 5 * i, 'wood3');
    }
    return g;
  },
  door_open: () => {
    const g = grid(TILE, TILE);
    rect(g, 0, 0, TILE, TILE, 'shade1');
    rect(g, 0, 0, 2, TILE, 'wood3');
    rect(g, TILE - 2, 0, 2, TILE, 'wood4');
    rect(g, 2, 0, TILE - 4, 2, 'wood3');
    return g;
  },
  door_barred: () => {
    const g = OWN.door_open(0);
    for (const x of [3, 7, 11]) rect(g, x, 0, 2, TILE, 'wood2');
    rect(g, 1, 5, TILE - 2, 2, 'wood3');
    return g;
  },
};

const tiles = new Map<string, Grid>();

/** Whether the art lane has drawn a tile kind (at the scene's tile size). */
const drawnTile = (kind: TileKind, variant = 0): Grid | null => {
  const drawn = dungeonTile(THEME, kind, variant);
  return drawn && drawn.grid.w === TILE && drawn.grid.h === TILE ? drawn.grid : null;
};

/**
 * A tile's pixels: the art lane's if it has drawn this kind (which keeps its
 * own wears, any variant number asking for one), otherwise this scene's own.
 */
export function tileGrid(kind: TileKind, variant = 0): Grid {
  const drawn = drawnTile(kind, variant);
  if (drawn) return drawn;
  const v = ((variant % VARIANTS) + VARIANTS) % VARIANTS;
  const key = `${kind} ${v}`;
  let made = tiles.get(key);
  if (!made) {
    made = OWN[kind](v);
    tiles.set(key, made);
  }
  return made;
}

/** The step a standing thing's shadow is drawn in on this scene's own tiles. */
const OWN_SHADOW: Partial<Record<TileKind, Shade>> = {
  sand: 'sand3',
  wet_sand: 'wood3',
  rock_floor: 'stone3',
  shallows: 'sea3',
  planks: 'wood4',
};

/** A shadow's step on a kind of ground, one darker than the ground drawn: none on deep water or rock. */
export function shadowShade(kind: TileKind): Shade | null {
  const shade = drawnTile(kind) ? GROTTO_SHADOW[kind] : OWN_SHADOW[kind];
  return shade ?? null;
}

/* ----- Props ----- */

/** A prop and the row of its picture that meets the ground. */
interface PropArt {
  readonly picture: Picture;
  readonly base: number;
}

function keg(): Grid {
  const g = grid(13, 14);
  ellipse(g, 6, 7, 6, 7, 'wood2');
  rect(g, 1, 3, 11, 1, 'metal3');
  rect(g, 1, 10, 11, 1, 'metal3');
  rect(g, 2, 2, 2, 10, 'wood1');
  rect(g, 4, 6, 5, 2, 'shade1');
  return g;
}

const OWN_PROPS: Readonly<Record<string, () => Grid>> = {
  powder_keg: () => {
    const g = grid(16, 18);
    blit(g, keg(), 0, 4);
    blit(g, keg(), 3, 0);
    return g;
  },
  crate: () => {
    const g = grid(15, 15);
    rect(g, 0, 0, 15, 15, 'wood2');
    rect(g, 0, 0, 15, 2, 'wood1');
    rect(g, 0, 0, 2, 15, 'wood1');
    line(g, 2, 2, 12, 12, 'wood3');
    line(g, 12, 2, 2, 12, 'wood3');
    rect(g, 0, 13, 15, 2, 'wood3');
    return g;
  },
  treasure_chest: () => {
    const g = grid(16, 13);
    rect(g, 0, 4, 16, 9, 'wood3');
    ellipse(g, 8, 4, 8, 4, 'wood2');
    rect(g, 0, 4, 16, 1, 'gold2');
    rect(g, 3, 0, 2, 13, 'gold2');
    rect(g, 11, 0, 2, 13, 'gold2');
    rect(g, 7, 6, 2, 3, 'gold1');
    return g;
  },
  anchor: () => {
    const g = grid(15, 19);
    rect(g, 6, 2, 3, 14, 'metal3');
    rect(g, 6, 2, 1, 14, 'metal2');
    ellipse(g, 7, 2, 2.5, 2, 'metal3');
    rect(g, 2, 5, 11, 2, 'metal3');
    line(g, 1, 13, 7, 17, 'metal3');
    line(g, 13, 13, 7, 17, 'metal3');
    rect(g, 0, 11, 2, 3, 'metal2');
    rect(g, 13, 11, 2, 3, 'metal2');
    return g;
  },
  rope_coil: () => {
    const g = grid(14, 8);
    ellipse(g, 7, 4, 7, 4, 'sand3');
    ellipse(g, 7, 4, 5, 2.6, 'sand2');
    ellipse(g, 7, 4, 3, 1.4, 'wood3');
    return g;
  },
  cannon: () => {
    const g = grid(20, 13);
    rect(g, 2, 2, 15, 5, 'shade1');
    rect(g, 2, 2, 15, 1, 'metal3');
    rect(g, 16, 1, 3, 7, 'shade1');
    rect(g, 3, 7, 12, 3, 'wood3');
    ellipse(g, 5, 10, 2.5, 2.5, 'wood2');
    ellipse(g, 13, 10, 2.5, 2.5, 'wood2');
    return g;
  },
  lantern: () => {
    const g = grid(7, 11);
    rect(g, 3, 0, 1, 2, 'metal3');
    rect(g, 1, 2, 5, 1, 'metal3');
    rect(g, 1, 3, 5, 6, 'glass1');
    rect(g, 2, 4, 3, 4, 'lamp1');
    rect(g, 1, 3, 1, 6, 'metal3');
    rect(g, 5, 3, 1, 6, 'metal3');
    rect(g, 1, 9, 5, 1, 'metal3');
    return g;
  },
  brig_bars: () => {
    const g = grid(TILE, TILE);
    for (const x of [1, 5, 9, 13]) rect(g, x, 0, 2, TILE, 'metal3');
    for (const x of [1, 5, 9, 13]) rect(g, x, 0, 1, TILE, 'metal2');
    rect(g, 0, 2, TILE, 2, 'metal3');
    rect(g, 0, 11, TILE, 2, 'metal3');
    return g;
  },
  // Not an art-lane id: a mooring post in the water, where a parrot sits.
  perch: () => {
    const g = grid(8, 18);
    rect(g, 2, 0, 4, 18, 'wood3');
    rect(g, 2, 0, 1, 18, 'wood2');
    rect(g, 1, 1, 6, 2, 'wood4');
    rect(g, 0, 14, 8, 2, 'foam1');
    return g;
  },
};

const props = new Map<string, PropArt | null>();

/** A prop's picture, the art lane's or this scene's own; null for an id neither knows. */
export function propArt(id: string): PropArt | null {
  if (!props.has(id)) {
    const drawn = dungeonProp(THEME, id);
    let made: PropArt | null = drawn ? { picture: drawn.picture, base: drawn.base } : null;
    if (!made && OWN_PROPS[id]) {
      const g = outline(OWN_PROPS[id]());
      made = { picture: picture(g), base: g.h - 2 };
    }
    props.set(id, made);
  }
  return props.get(id) ?? null;
}

/* ----- A room's ground ----- */

/** How the ground at a tile is drawn: which tile kind, at a state of the tide. */
export function tileKindAt(
  room: Room,
  col: number,
  row: number,
  level: number,
  warn: boolean,
): TileKind {
  const g = room.ground;
  const all = { level, shut: false, released: g.bars.length };
  const t: RoomTile = tileAt(g, col, row, all);
  const shown: RoomTile = t === 'prop' || t === 'bars' ? g.under[row]![col]! : t;
  switch (shown) {
    case 'rock': {
      const below = row + 1 < g.rows ? tileAt(g, col, row + 1, all) : 'rock';
      return below === 'rock' ? 'wall_top' : 'wall_face';
    }
    case 'floor':
    case 'end':
      return 'rock_floor';
    case 'planks':
      return 'planks';
    case 'shallows':
      return 'shallows';
    case 'water':
      return 'deep_water';
    case 'door':
      return 'door_open';
    case 'sand': {
      // A brig's flooded floor is stone; its warning is drawn over it (`paintGround`).
      if (g.stone && g.heights[row]![col]! >= 0) return 'rock_floor';
      if (warn && g.heights[row]![col]! >= 0) {
        const next = tileAt(g, col, row, { ...all, level: level + 1 });
        if (next !== 'sand') return 'wet_sand';
      }
      return 'sand';
    }
    default:
      return 'sand';
  }
}

/** Whether a tile's water is about to go deep: shallows the next rise will cover. */
function deepening(room: Room, col: number, row: number, level: number): boolean {
  const g = room.ground;
  if (g.heights[row]![col]! < 0) return false;
  const all = { level, shut: false, released: g.bars.length };
  return (
    tileAt(g, col, row, all) === 'shallows' &&
    tileAt(g, col, row, { ...all, level: level + 1 }) === 'water'
  );
}

const isWater = (k: TileKind): boolean => k === 'shallows' || k === 'deep_water';

/**
 * A room's ground at a state of the tide: every tile from the art lane or
 * this scene, foam where water meets what stands above it, and, when the sea
 * is about to rise (`warn`), the sand it will cover darkened to wet sand and
 * the shallows it will deepen darkened too.
 */
export function paintGround(room: Room, level: number, warn: boolean): Grid {
  const g = room.ground;
  const out = grid(g.cols * TILE, g.rows * TILE);
  const kinds: TileKind[][] = [];
  for (let row = 0; row < g.rows; row++) {
    const line: TileKind[] = [];
    kinds.push(line);
    for (let col = 0; col < g.cols; col++) {
      const kind = tileKindAt(room, col, row, level, warn);
      line.push(kind);
      blit(out, tileGrid(kind, cellVariant(g.cols, col, row)), col * TILE, row * TILE);
    }
  }
  for (let row = 0; row < g.rows; row++) {
    for (let col = 0; col < g.cols; col++) {
      const kind = kinds[row]![col]!;
      const x = col * TILE;
      const y = row * TILE;
      if (isWater(kind)) {
        // Foam along an edge where water meets ground: the waterline, which moves with the tide.
        const above = kinds[row - 1]?.[col];
        if (above && !isWater(above) && above !== 'wall_face' && above !== 'wall_top') {
          for (let i = 0; i < TILE; i++)
            if (hash(col, i, level) % 3 !== 0) set(out, x + i, y, 'foam1');
        }
        const left = kinds[row]?.[col - 1];
        if (left && !isWater(left) && left !== 'wall_top' && left !== 'wall_face') {
          for (let j = 0; j < TILE; j++)
            if (hash(j, row, level) % 3 !== 0) set(out, x, y + j, 'foam1');
        }
        const right = kinds[row]?.[col + 1];
        if (right && !isWater(right) && right !== 'wall_top' && right !== 'wall_face') {
          for (let j = 0; j < TILE; j++)
            if (hash(j, row, level + 9) % 3 !== 0) set(out, x + TILE - 1, y + j, 'foam1');
        }
      }
      const height = g.heights[row]![col]!;
      if (g.stone && height === 0) {
        // The grating the sea comes up through: iron bars over whatever is under them.
        for (let i = 1; i < TILE; i += 4) {
          rect(out, x + i, y, 2, TILE, 'shade1');
          rect(out, x + i, y, 1, TILE, 'metal3');
        }
      }
      const covering =
        g.stone &&
        warn &&
        height >= 0 &&
        tileAt(g, col, row, { level, shut: false, released: 0 }) === 'sand' &&
        tileAt(g, col, row, { level: level + 1, shut: false, released: 0 }) !== 'sand';
      if (covering) {
        // Stone about to be under the sea: darkened in a checker, as the shallows are.
        for (let j = 0; j < TILE; j++)
          for (let i = j % 2; i < TILE; i += 2) set(out, x + i, y + j, 'stone3');
      }
      if (warn && deepening(room, col, row, level)) {
        // Shallows about to go deep: darkening in a checker, so it reads as the sea coming.
        for (let j = 0; j < TILE; j++)
          for (let i = (j % 2) * 1; i < TILE; i += 2)
            if (get(out, x + i, y + j) !== 'foam1') set(out, x + i, y + j, 'sea3');
      }
    }
  }
  paintShadows(room, out, kinds);
  return out;
}

/** A lantern's light where its picture has none of its own: warm, wide enough to pool on the floor. */
export const LANTERN_LIGHT = { radius: 60, strength: 0.5 } as const;

/** Something standing in a room, placed: its art, the top-left it is drawn at, and its foot. */
interface Placed {
  readonly key: string;
  readonly art: PropArt;
  readonly at: Point;
  /** The row it meets the ground on, to sort by. */
  readonly base: number;
  /** Where its ground shadow goes, or null for a thing hung on the wall. */
  readonly shadow: Point | null;
}

const placings = new WeakMap<Room, Placed[]>();

/**
 * Where everything standing in a room is drawn: props stood on their tile,
 * their foot two pixels above its bottom, lanterns hung on the wall, and
 * perches. Sizes are the pictures' own; the places are this scene's data.
 */
function placed(room: Room): Placed[] {
  const known = placings.get(room);
  if (known) return known;
  const made: Placed[] = [];
  const add = (id: string, key: string, col: number, row: number, onWall: boolean): void => {
    const art = propArt(id);
    if (!art) return;
    const { w } = art.picture.grid;
    const foot = onWall ? row * TILE + 12 : row * TILE + TILE - 2;
    const at = { x: col * TILE + TILE / 2 - Math.floor(w / 2), y: foot - art.base };
    made.push({
      key,
      art,
      at,
      base: onWall ? row * TILE + TILE : foot,
      shadow: onWall ? null : { x: col * TILE + TILE / 2, y: foot },
    });
  };
  room.ground.props.forEach((p, i) => add(p.id, `${p.id} ${i}`, p.cell.col, p.cell.row, false));
  room.ground.lanterns.forEach((c, i) => add('lantern', `lantern ${i}`, c.col, c.row, true));
  room.perches.forEach((p, i) => {
    const c = cellAt(p);
    add('perch', `perch ${i}`, c.col, c.row, false);
  });
  placings.set(room, made);
  return made;
}

/**
 * Every light in a room, in art pixels: whatever glows in its things'
 * pictures (the art lane's lantern carries its own), and a lantern drawn
 * without one lit at its middle.
 */
export function roomLights(room: Room): Glow[] {
  const lights: Glow[] = [];
  for (const p of placed(room)) {
    const own = p.art.picture.glows;
    for (const glow of own) lights.push({ ...glow, x: p.at.x + glow.x, y: p.at.y + glow.y });
    if (own.length === 0 && p.key.startsWith('lantern ')) {
      lights.push({
        x: p.at.x + p.art.picture.grid.w / 2,
        y: p.at.y + p.art.picture.grid.h / 2,
        radius: LANTERN_LIGHT.radius,
        strength: LANTERN_LIGHT.strength,
      });
    }
  }
  return lights;
}

/** The things standing in a room: its props, lanterns and perches, lit by its lights. */
export function roomThings(room: Room, lights: readonly Glow[]): Thing[] {
  return placed(room).map((p) => ({
    id: p.key,
    footprint: [],
    base: p.base,
    sprite: { picture: litBy(p.art.picture, p.at, lights), at: p.at },
  }));
}

/** Each standing thing's shadow on the ground under it, as the art lane casts them. */
function paintShadows(room: Room, out: Grid, kinds: readonly (readonly TileKind[])[]): void {
  for (const p of placed(room)) {
    if (!p.shadow) continue;
    const kind = kinds[Math.floor(p.shadow.y / TILE)]?.[Math.floor(p.shadow.x / TILE)];
    const shade = kind && shadowShade(kind);
    if (shade)
      ellipse(out, p.shadow.x, p.shadow.y, Math.round(p.art.picture.grid.w * 0.45), 2.4, shade);
  }
}

/** What a dungeon room needs to be shown on the stage, made once a page and kept. */
export interface RoomLook {
  /** The ground and its things, the ground's tiles as the run has them now (set by the view each frame). */
  readonly scene: Scene;
  readonly lock: { map: TileMap<RoomTile> };
  /** The ground at a state of the tide; `warn` while it is about to rise. Each made once. */
  groundAt(level: number, warn: boolean): Picture;
  /** Every ground this room can show, to paint ahead of time. */
  readonly grounds: () => Picture[];
  readonly lights: readonly Glow[];
  shadowAt(feet: Point): { readonly picture: Picture; readonly middle: Point } | null;
}

/** The tile kind a walker's shadow falls on, from the ground as the run has it now. */
function groundKind(room: Room, tile: RoomTile): TileKind | null {
  switch (tile) {
    case 'sand':
      return room.ground.stone ? 'rock_floor' : 'sand';
    case 'floor':
    case 'end':
      return 'rock_floor';
    case 'planks':
      return 'planks';
    case 'shallows':
      return 'shallows';
    default:
      return null;
  }
}

const looks = new WeakMap<Room, RoomLook>();

export function roomLook(room: Room): RoomLook {
  let made = looks.get(room);
  if (made) return made;
  const lights = roomLights(room);
  const lock = { map: room.map };
  const grounds = new Map<string, Picture>();
  const groundAt = (level: number, warn: boolean): Picture => {
    const l =
      room.ground.tidal || room.ground.ownTide ? Math.max(0, Math.min(HIGH_WATER, level)) : 0;
    const w = warn && l < HIGH_WATER && (room.ground.tidal || room.ground.ownTide);
    const key = `${l} ${w}`;
    let pic = grounds.get(key);
    if (!pic) {
      pic = picture(paintGround(room, l, w), lights);
      grounds.set(key, pic);
    }
    return pic;
  };
  const shadows = new Map<Shade, Picture>();
  made = {
    scene: {
      get map() {
        return lock.map;
      },
      things: roomThings(room, lights),
    },
    lock,
    groundAt,
    grounds: () => {
      const all: Picture[] = [];
      const levels = room.ground.tidal || room.ground.ownTide ? HIGH_WATER : 0;
      for (let l = 0; l <= levels; l++) {
        all.push(groundAt(l, false));
        if (l < levels) all.push(groundAt(l, true));
      }
      return all;
    },
    lights,
    shadowAt(feet) {
      const cell = cellAt(feet);
      const map = lock.map;
      if (!inMap(map, cell)) return null;
      const kind = groundKind(room, map.tiles[cell.row]![cell.col]!);
      const shade = kind && shadowShade(kind);
      if (!shade) return null;
      let pic = shadows.get(shade);
      if (!pic) {
        pic = walkerShadow(shade);
        shadows.set(shade, pic);
      }
      return { picture: pic, middle: SHADOW_MIDDLE };
    },
  };
  looks.set(room, made);
  return made;
}
