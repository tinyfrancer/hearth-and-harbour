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

/** How many wears of each floor are asked for, so a floor is not one tile repeated. */
const VARIANTS = 4;

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
    const g = flecked(
      'stone2',
      [
        ['stone1', 5],
        ['stone3', 7],
      ],
      v,
    );
    // A crack or two in the stone.
    const h = hash(v, 99, 3);
    line(g, h % 12, (h >>> 4) % 12, (h % 12) + 3, ((h >>> 4) % 12) + 2, 'stone3');
    return g;
  },
  wall_top: (v) =>
    flecked(
      'slate3',
      [
        ['slate2', 6],
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
    const g = flecked(
      'sea1',
      [
        ['sea2', 10],
        ['foam1', 3],
      ],
      v,
    );
    // Sand showing through: you could wade this.
    for (let i = 0; i < 5; i++) {
      const h = hash(v, i, 11);
      set(g, h % TILE, (h >>> 8) % TILE, 'sand2');
    }
    return g;
  },
  deep_water: (v) => {
    const g = flecked(
      'sea3',
      [
        ['navy1', 12],
        ['sea2', 3],
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

/** A tile's pixels: the art lane's if it has drawn this kind, otherwise this scene's own. Made once each. */
export function tileGrid(kind: TileKind, variant = 0): Grid {
  const v = ((variant % VARIANTS) + VARIANTS) % VARIANTS;
  const key = `${kind} ${v}`;
  let made = tiles.get(key);
  if (!made) {
    const drawn = dungeonTile(THEME, kind, v);
    made = drawn && drawn.grid.w === TILE && drawn.grid.h === TILE ? drawn.grid : OWN[kind](v);
    tiles.set(key, made);
  }
  return made;
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
      blit(out, tileGrid(kind, hash(col, row) % VARIANTS), col * TILE, row * TILE);
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
          for (let i = 0; i < TILE; i++) if (hash(col, i, level) % 3 !== 0) set(out, x + i, y, 'foam1');
        }
        const left = kinds[row]?.[col - 1];
        if (left && !isWater(left) && left !== 'wall_top' && left !== 'wall_face') {
          for (let j = 0; j < TILE; j++) if (hash(j, row, level) % 3 !== 0) set(out, x, y + j, 'foam1');
        }
        const right = kinds[row]?.[col + 1];
        if (right && !isWater(right) && right !== 'wall_top' && right !== 'wall_face') {
          for (let j = 0; j < TILE; j++)
            if (hash(j, row, level + 9) % 3 !== 0) set(out, x + TILE - 1, y + j, 'foam1');
        }
      }
      if (warn && deepening(room, col, row, level)) {
        // Shallows about to go deep: darkening in a checker, so it reads as the sea coming.
        for (let j = 0; j < TILE; j++)
          for (let i = (j % 2) * 1; i < TILE; i += 2)
            if (get(out, x + i, y + j) !== 'foam1') set(out, x + i, y + j, 'sea3');
      }
    }
  }
  return out;
}

/** A lantern's light: warm, wide enough to pool on the floor below it. */
export const LANTERN_LIGHT = { radius: 60, strength: 0.5 } as const;

/** Every lantern's glow in a room, in art pixels. */
export function roomLights(room: Room): Glow[] {
  return room.ground.lanterns.map((c) => ({
    x: c.col * TILE + TILE / 2,
    y: c.row * TILE + TILE - 2,
    radius: LANTERN_LIGHT.radius,
    strength: LANTERN_LIGHT.strength,
  }));
}

/** The things standing in a room: its props, lanterns and perches, lit by its lanterns. */
export function roomThings(room: Room, lights: readonly Glow[]): Thing[] {
  const things: Thing[] = [];
  const add = (id: string, key: string, col: number, row: number, onWall: boolean): void => {
    const art = propArt(id);
    if (!art) return;
    const { w } = art.picture.grid;
    // Stood on its tile, its foot two pixels above the tile's bottom; a lantern hangs on the wall.
    const foot = onWall ? row * TILE + 12 : row * TILE + TILE - 2;
    const at = { x: col * TILE + TILE / 2 - Math.floor(w / 2), y: foot - art.base };
    things.push({
      id: key,
      footprint: [],
      base: onWall ? row * TILE + TILE : foot,
      sprite: { picture: litBy(art.picture, at, lights), at },
    });
  };
  room.ground.props.forEach((p, i) => add(p.id, `${p.id} ${i}`, p.cell.col, p.cell.row, false));
  room.ground.lanterns.forEach((c, i) => add('lantern', `lantern ${i}`, c.col, c.row, true));
  room.perches.forEach((p, i) => {
    const c = cellAt(p);
    add('perch', `perch ${i}`, c.col, c.row, false);
  });
  return things;
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

const SHADOW_ON: Partial<Record<RoomTile, Shade>> = {
  sand: 'sand3',
  floor: 'stone3',
  end: 'stone3',
  planks: 'wood4',
};

const looks = new WeakMap<Room, RoomLook>();

export function roomLook(room: Room): RoomLook {
  let made = looks.get(room);
  if (made) return made;
  const lights = roomLights(room);
  const lock = { map: room.map };
  const grounds = new Map<string, Picture>();
  const groundAt = (level: number, warn: boolean): Picture => {
    const l = room.ground.tidal || room.ground.ownTide ? Math.max(0, Math.min(HIGH_WATER, level)) : 0;
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
      const shade = SHADOW_ON[map.tiles[cell.row]![cell.col]!];
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
