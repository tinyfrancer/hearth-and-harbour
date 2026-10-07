/*
 * How a dungeon room looks at the C scale: its ground at each state of the
 * tide, the things standing in it, the lanterns that light it and the
 * contact shadows under whoever stands in it. Everything is the art lane's,
 * through its doors (`src/art/dungeonArt2.ts`): tiles by kind, each told its
 * neighbours and its place so the floor runs on without a seam; props stood
 * on their foot; the ground lit by the lanterns' pools (`lightGround2`) and
 * painted in the cave's dusk (`CAVE_DUSK`). Where things stand and what is
 * solid stay this scene's data (`grotto.ts`, `ground.ts`).
 *
 * The ground is worked out as cells first (pure, so tests read it without a
 * canvas), then painted once per state of the tide and kept; a frame copies
 * it, never paints it.
 */
import {
  CAVE_DUSK,
  GROUND2_SHADOW,
  aroundOf,
  dungeonProp2,
  dungeonTile2,
  flicker2,
  lightAt,
  lightGround2,
  type Light2,
  type PropPicture2,
  type Tile2Kind,
} from '../art/dungeonArt2';
import { addGlow, shines, type Glow } from '../art/raster';
import { at, cell, darker, stamp, tgrid, type Picture2, type TGrid } from '../art/town2/cells';
import { rasterize2 } from '../art/town2/raster';
import type { Image, Placed, Standing } from './draw';
import type { Room } from './dungeon';
import { DUNGEON, far } from './dungeonMetrics';
import { tileAt, type RoomTile } from './ground';
import type { Life, StillPicture } from './stage';
import type { Box, Scene } from './things';
import { HIGH_WATER } from './tide';
import { cellAt, type Point, type TileMap } from './tileMap';
import { WALK_SPEED } from './walker';

/** A tile's side, in art pixels. */
const T = DUNGEON.tile;

/** A cell's variant, as the art lane asks for it: its index in the room, so neighbours differ. */
export const cellVariant = (cols: number, col: number, row: number): number => row * cols + col;

/** Whether a kind is ground a wall's face looks out over: anything but rock and doors. */
const open = (k: Tile2Kind | 'rock' | undefined): boolean =>
  k !== undefined && k !== 'rock' && k !== 'door_open' && k !== 'door_barred';

/**
 * The tile a door is drawn with, open or barred. LANE B'S SIDE-WALL DOOR
 * PLUGS IN HERE: a door in a side wall (the room's first or last column)
 * will take lane B's side-wall door tiles once they are on `main`; until
 * then every door is the back wall's.
 */
export function doorTile(room: Room, col: number, barred: boolean): Tile2Kind {
  const side = col === 0 || col === room.ground.cols - 1;
  void side;
  return barred ? 'door_barred' : 'door_open';
}

/** How a tile is drawn at a state of the tide, rock left as rock for the wall rule. */
function groundKind(room: Room, col: number, row: number, level: number, warn: boolean) {
  const g = room.ground;
  const all = { level, shut: false, released: g.bars.length };
  const t: RoomTile = tileAt(g, col, row, all);
  const shown: RoomTile = t === 'prop' || t === 'bars' ? g.under[row]![col]! : t;
  switch (shown) {
    case 'rock':
      return 'rock' as const;
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
      return doorTile(room, col, false);
    case 'sand': {
      // A brig's flooded floor is stone; its warning is laid over it (`overlays`).
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

/**
 * Every tile's kind at a state of the tide (`warn` while it is about to
 * rise: sand it will cover is wet sand). Rock with open ground below is the
 * wall's face; rock above a face, or above a door, is the face's upper half,
 * so a wall stands two tiles tall; all other rock is the rock's top. The art
 * lane's rule (`roomKinds2`), on this scene's ground.
 */
export function tileKindsAt(room: Room, level: number, warn: boolean): Tile2Kind[][] {
  const g = room.ground;
  const raw = Array.from({ length: g.rows }, (_, row) =>
    Array.from({ length: g.cols }, (_, col) => groundKind(room, col, row, level, warn)),
  );
  return raw.map((line, row) =>
    line.map((k, col): Tile2Kind => {
      if (k !== 'rock') return k;
      const below = raw[row + 1]?.[col];
      if (below === 'door_open') return 'wall_face_high';
      if (open(below)) return 'wall_face';
      if (below === 'rock' && open(raw[row + 2]?.[col])) return 'wall_face_high';
      return 'wall_top';
    }),
  );
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

/* ----- What stands in a room ----- */

/** How far into the floor below its wall a lantern's post stands, in art pixels. */
export const LANTERN_FOOT = 8;

/** Something standing in a room: the art lane's picture, where its foot is, and its contact shadow. */
export interface PropAt {
  readonly key: string;
  readonly id: string;
  readonly art: PropPicture2;
  /** Where it meets the ground (the middle of its foot): it sorts by `feet.y`. */
  readonly feet: Point;
  /** Its picture's top-left. */
  readonly topLeft: Point;
  /** Half the width of its contact shadow; 0 for none. */
  readonly shadow: number;
}

const placings = new WeakMap<Room, PropAt[]>();

/**
 * Where everything standing in a room is: props on their tile, their foot
 * two pixels above its bottom; lanterns' posts at the foot of the wall they
 * hang on; perches in the water. Sizes are the pictures'; places are data.
 */
export function propsOf(room: Room): PropAt[] {
  const known = placings.get(room);
  if (known) return known;
  const made: PropAt[] = [];
  const add = (id: string, key: string, x: number, y: number): void => {
    const art = dungeonProp2(id);
    if (!art) return;
    const w = art.picture.grid.w;
    // As the art lane's sample room has it: nothing under a lantern's post or a coil of rope.
    const shadow = id === 'lantern' || id === 'rope_coil' ? 0 : Math.floor(w / 2.4);
    made.push({
      key,
      id,
      art,
      feet: { x, y },
      topLeft: { x: x - art.foot, y: y - art.base },
      shadow,
    });
  };
  room.ground.props.forEach((p, i) =>
    add(p.id, `${p.id} ${i}`, p.cell.col * T + T / 2, p.cell.row * T + T - 2),
  );
  room.ground.lanterns.forEach((c, i) =>
    add('lantern', `lantern ${i}`, c.col * T + T / 2, (c.row + 1) * T + LANTERN_FOOT),
  );
  room.perches.forEach((p, i) => {
    const c = cellAt(p, T);
    add('perch', `perch ${i}`, c.col * T + T / 2, c.row * T + T - 2);
  });
  placings.set(room, made);
  return made;
}

/**
 * How far above the middle of its perch's tile a bird sitting on it has its
 * feet: on the post's seat, as the art lane marks it.
 */
export function perchLift(room: Room, perch: Point): number {
  const c = cellAt(perch, T);
  const post = propsOf(room).find(
    (p) =>
      p.id === 'perch' && Math.floor(p.feet.x / T) === c.col && Math.floor(p.feet.y / T) === c.row,
  );
  const seat = post?.art.seat;
  if (!post || !seat) return 0;
  return perch.y - (post.topLeft.y + seat.y);
}

/** Each lantern's light, placed in the room: the pool it lays and the glow it gives. */
export function lightsOf(room: Room): Light2[] {
  return propsOf(room).flatMap((p) =>
    p.art.light ? [lightAt(p.art.light, p.topLeft.x, p.topLeft.y)] : [],
  );
}

/** Every glow in a room, in its pixels: what lights whoever stands near a lantern. */
export function glowsOf(room: Room): Glow[] {
  return propsOf(room).flatMap((p) =>
    p.art.picture.glows.map((g) => ({ ...g, x: g.x + p.topLeft.x, y: g.y + p.topLeft.y })),
  );
}

/* ----- The ground's cells ----- */

/** How many steps a contact shadow darkens the ground under `feet` by: its kind's, none on the deep or rock. */
export function shadowSteps(kinds: readonly (readonly Tile2Kind[])[], feet: Point): number {
  const kind = kinds[Math.floor(Math.round(feet.y) / T)]?.[Math.floor(Math.round(feet.x) / T)];
  return kind ? (GROUND2_SHADOW[kind] ?? 0) : 0;
}

/**
 * Darkens the cells in an ellipse `rx` wide (half) under someone's feet by
 * `n` steps at its heart and one fewer round it, in place, as the art lane
 * casts them (`roomPicture2`).
 */
export function castShadow(g: TGrid, feet: Point, rx: number, n: number): void {
  if (!n || rx <= 0) return;
  const fx = Math.round(feet.x);
  const fy = Math.round(feet.y);
  const ry = Math.max(2, Math.round(rx / 4));
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++) {
      const d = (x / rx) ** 2 + (y / ry) ** 2;
      if (d > 1) continue;
      const c = at(g, fx + x, fy + y);
      if (c) g.d[(fy + y) * g.w + fx + x] = darker(c, d < 0.45 ? n : Math.max(1, n - 1));
    }
}

/** What this scene lays over the art lane's tiles: the brig's grating, and the sea's warnings. */
function overlays(room: Room, g: TGrid, level: number, warn: boolean): void {
  const ground = room.ground;
  for (let row = 0; row < ground.rows; row++)
    for (let col = 0; col < ground.cols; col++) {
      const height = ground.heights[row]![col]!;
      if (height < 0) continue;
      const x0 = col * T;
      const y0 = row * T;
      const all = { level, shut: false, released: 0 };
      if (ground.stone && height === 0 && tileAt(ground, col, row, all) === 'sand') {
        // The grating the sea comes up through, while it is dry: iron bars over the stone, each with its shadow.
        for (let i = 2; i < T; i += 6)
          for (let j = 0; j < T; j++) {
            g.d[(y0 + j) * g.w + x0 + i] = cell('iron', 3);
            g.d[(y0 + j) * g.w + x0 + i + 1] = darker(at(g, x0 + i + 1, y0 + j), 3);
          }
      }
      const covering =
        warn &&
        ((ground.stone &&
          tileAt(ground, col, row, all) === 'sand' &&
          tileAt(ground, col, row, { ...all, level: level + 1 }) !== 'sand') ||
          deepening(room, col, row, level));
      if (covering) {
        // About to be under the sea (or to go deep): darkened in a checker, so it reads as the sea coming.
        for (let j = 0; j < T; j++)
          for (let i = j % 2; i < T; i += 2) {
            const k = (y0 + j) * g.w + x0 + i;
            g.d[k] = darker(g.d[k]!, 1);
          }
      }
    }
}

/**
 * A room's ground as cells at a state of the tide: every tile from the art
 * lane joined to its neighbours, this scene's overlays, the contact shadows
 * of what stands on it, then lit by the lanterns' pools. Pure.
 */
export function groundCells(room: Room, level: number, warn: boolean): TGrid {
  const kinds = tileKindsAt(room, level, warn);
  const g = tgrid(room.ground.cols * T, room.ground.rows * T);
  kinds.forEach((line, row) =>
    line.forEach((kind, col) => {
      const tile = dungeonTile2(
        kind,
        cellVariant(room.ground.cols, col, row),
        aroundOf(kinds, col, row),
        { col, row },
      );
      if (tile) stamp(g, tile.grid, col * T, row * T);
    }),
  );
  overlays(room, g, level, warn);
  for (const p of propsOf(room)) castShadow(g, p.feet, p.shadow, shadowSteps(kinds, p.feet));
  return lightGround2(g, lightsOf(room));
}

/* ----- Painting ----- */

/** Whether this browser can paint pixels (not jsdom). */
const canPaint = (): boolean => typeof ImageData !== 'undefined' && typeof document !== 'undefined';

/** Cells in the cave's dusk onto a canvas of their size, empty cells empty. */
export function paintCells(pic: Picture2, into?: HTMLCanvasElement): HTMLCanvasElement | null {
  if (!canPaint()) return null;
  const image = rasterize2(pic, CAVE_DUSK, 1);
  const d = pic.grid.d;
  for (let i = 0; i < d.length; i++) if (!d[i]) image.data[i * 4 + 3] = 0;
  const canvas = into ?? document.createElement('canvas');
  if (canvas.width !== pic.grid.w) canvas.width = pic.grid.w;
  if (canvas.height !== pic.grid.h) canvas.height = pic.grid.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.putImageData(
    new ImageData(image.data as Uint8ClampedArray<ArrayBuffer>, image.width, image.height),
    0,
    0,
  );
  return canvas;
}

/** The glows that reach a box, moved into its own pixels. */
export function glowsIn(glows: readonly Glow[], box: Box): Glow[] {
  return glows
    .filter((g) => {
      const nx = Math.max(box.x, Math.min(g.x, box.x + box.w));
      const ny = Math.max(box.y, Math.min(g.y, box.y + box.h));
      return shines(g, CAVE_DUSK) && Math.hypot(g.x - nx, g.y - ny) < g.radius;
    })
    .map((g) => ({ ...g, x: g.x - box.x, y: g.y - box.y }));
}

/** A state of the tide as a room shows it: the water's level, and whether it is about to rise. */
export interface TideState {
  readonly level: number;
  readonly warn: boolean;
}

/**
 * How much of a lantern's glow is laid on the ground once (its weakest, as
 * `flicker2` wavers it), the rest added a frame at a time as it flickers.
 */
const FLICKER_STEPS = 3;

/**
 * The ground's pixels at a state of the tide, in the cave's dusk, with the
 * lanterns' glows at their weakest (`steadyGlows`): what a worker sends the
 * page, or the page works out itself where there is none. Pure.
 */
export function groundPixels(
  room: Room,
  level: number,
  warn: boolean,
): { cells: TGrid; data: Uint8ClampedArray } {
  const cells = groundCells(room, level, warn);
  return { cells, data: rasterize2({ grid: cells, glows: steadyGlows(room) }, CAVE_DUSK, 1).data };
}

/** The lanterns' glows on the ground at their weakest; the rest flickers over it (`flicker`). */
export function steadyGlows(room: Room): Glow[] {
  return glowsOf(room).map((g) => ({ ...g, strength: g.strength * (1 - flickerOf(room, g)) }));
}

/** Works out a room's ground at a state of the tide, somewhere, and hands it back. */
export interface GroundPainter {
  /**
   * Whether it paints off the page's thread, so asking ahead costs the page
   * nothing; absent is on the spot, where each state is worked out only
   * when it is shown.
   */
  readonly offThread?: boolean;
  paint(
    room: Room,
    state: TideState,
    urgent: boolean,
    done: (cells: TGrid, data: Uint8ClampedArray | null) => void,
  ): void;
}

/** On the spot, before returning: no worker (tests). No pixels where nothing can be painted. */
export const groundOnTheSpot: GroundPainter = {
  paint(room, state, _urgent, done) {
    if (!canPaint()) done(groundCells(room, state.level, state.warn), null);
    else {
      const { cells, data } = groundPixels(room, state.level, state.warn);
      done(cells, data);
    }
  },
};

/** What a dungeon room needs to be shown on the stage, made once a page and kept. */
export interface RoomLook {
  /** The ground to walk on as the run has it now (set by the view each frame), and nothing tappable. */
  readonly scene: Scene;
  readonly lock: { map: TileMap<RoomTile> };
  /**
   * The room at a state of the tide, painted, with its props standing in it;
   * asked for at once if it is not, and null until it is (or where nothing
   * can be painted).
   */
  stillAt(level: number, warn: boolean): StillPicture | null;
  /** The cells of the ground at a state of the tide, lit; null until worked out. */
  cellsAt(level: number, warn: boolean): TGrid | null;
  /** The tile kinds at a state of the tide. */
  kindsAt(level: number, warn: boolean): Tile2Kind[][];
  /** Every state this room can show. */
  readonly states: readonly TideState[];
  /** Asks for every state not yet asked for, after anything already asked. */
  warm(): void;
  /** Whether a state's ground is in. */
  ready(level: number, warn: boolean): boolean;
  /** The glows that light whoever stands near a lantern, in room pixels. */
  readonly glows: readonly Glow[];
  /** The lanterns flickering: their glow wavering on the passed-in time. */
  readonly flicker: readonly Life[];
  /** Lets every picture go: the run has left this room behind. */
  forget(): void;
  /** Paints from now on with `painter` (a run's own worker). */
  paintWith(painter: GroundPainter): void;
}

/** A state's key, the tide clamped to what the room's ground can show. */
function stateOf(room: Room, level: number, warn: boolean): TideState {
  const tidal = room.ground.tidal || room.ground.ownTide;
  const l = tidal ? Math.max(0, Math.min(HIGH_WATER, level)) : 0;
  return { level: l, warn: warn && tidal && l < HIGH_WATER };
}

const looks = new WeakMap<Room, RoomLook>();

/** How a room looks, painted by `painter` (on the spot unless told otherwise); made once and kept. */
export function roomLook(room: Room, painter: GroundPainter = groundOnTheSpot): RoomLook {
  let made = looks.get(room);
  if (made) return made;
  const lock = { map: room.map };
  const glows = glowsOf(room);
  const props = propsOf(room);
  let painterNow = painter;
  /** What has come back for each state: its cells, and the still once painted. */
  const done = new Map<string, { cells: TGrid; still: StillPicture | null }>();
  const asked = new Set<string>();
  const kinds = new Map<string, Tile2Kind[][]>();
  const key = (s: TideState): string => `${s.level} ${s.warn}`;
  /** Each prop painted once, lit by the lanterns that reach it. */
  let standing: Standing[] | null = null;
  const standers = (): Standing[] => {
    if (!standing) {
      standing = [];
      for (const p of props) {
        const { w, h } = p.art.picture.grid;
        const box = { x: p.topLeft.x, y: p.topLeft.y, w, h };
        const image = paintCells({
          grid: p.art.picture.grid,
          glows: [...p.art.picture.glows, ...glowsIn(glows, box)],
        });
        if (image) standing.push({ image, x: box.x, y: box.y, base: p.feet.y });
      }
      standing.sort((a, b) => a.base - b.base);
    }
    return standing;
  };
  const arrive = (s: TideState, cells: TGrid, data: Uint8ClampedArray | null): void => {
    let still: StillPicture | null = null;
    if (data && canPaint()) {
      const canvas = document.createElement('canvas');
      canvas.width = cells.w;
      canvas.height = cells.h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(
          new ImageData(data as Uint8ClampedArray<ArrayBuffer>, cells.w, cells.h),
          0,
          0,
        );
        const list = standers();
        for (const p of list) ctx.drawImage(p.image, p.x, p.y);
        still = { still: canvas, standing: list };
      }
    }
    done.set(key(s), { cells, still });
  };
  const ask = (s: TideState, urgent: boolean): void => {
    const k = key(s);
    if (asked.has(k)) return;
    asked.add(k);
    painterNow.paint(room, s, urgent, (cells, data) => {
      if (asked.has(k)) arrive(s, cells, data);
    });
  };
  const tidal = room.ground.tidal || room.ground.ownTide;
  const states: TideState[] = [];
  for (let l = 0; l <= (tidal ? HIGH_WATER : 0); l++) {
    states.push({ level: l, warn: false });
    if (tidal && l < HIGH_WATER) states.push({ level: l, warn: true });
  }
  made = {
    scene: {
      get map() {
        return lock.map;
      },
      things: [],
      speed: DUNGEON_SPEED,
    },
    lock,
    stillAt(level, warn) {
      const s = stateOf(room, level, warn);
      ask(s, true);
      return done.get(key(s))?.still ?? null;
    },
    cellsAt(level, warn) {
      return done.get(key(stateOf(room, level, warn)))?.cells ?? null;
    },
    kindsAt(level, warn) {
      const s = stateOf(room, level, warn);
      let k = kinds.get(key(s));
      if (!k) {
        k = tileKindsAt(room, s.level, s.warn);
        kinds.set(key(s), k);
      }
      return k;
    },
    states,
    warm() {
      for (const s of states) ask(s, false);
    },
    ready: (level, warn) => done.has(key(stateOf(room, level, warn))),
    glows,
    flicker: flickering(room, glows),
    forget() {
      for (const d of done.values()) if (d.still) release(d.still.still);
      done.clear();
      asked.clear();
    },
    paintWith(p) {
      painterNow = p;
    },
  };
  looks.set(room, made);
  return made;
}

/** Lets a canvas's pixels go now rather than whenever it is collected. */
function release(image: Image): void {
  if ('close' in image) image.close();
  else {
    image.width = 0;
    image.height = 0;
  }
}

/** How fast the hero walks in a room, outside a fight's own rules: as he does in one. */
const DUNGEON_SPEED = far(WALK_SPEED);

/** How much of a glow's strength flickers away at its dimmest: its lantern's `flicker`. */
function flickerOf(room: Room, glow: Glow): number {
  const light = lightsOf(room).find((l) => l.x === glow.x && l.y === glow.y);
  return light?.flicker ?? 0;
}

/**
 * Each lantern's flicker: the part of its glow that wavers, painted in a few
 * steps of strength as light alone (nothing but the glow's own haze) and laid
 * over the ground under everyone, the step chosen by `flicker2` at the
 * scene's time. Only the lanterns' own patch is drawn again when it changes.
 */
function flickering(room: Room, glows: readonly Glow[]): Life[] {
  const lights = lightsOf(room);
  return lights.flatMap((light, k) => {
    const glow = glows.find((g) => g.x === light.x && g.y === light.y);
    if (!glow || light.flicker <= 0) return [];
    const r = Math.ceil(glow.radius);
    const x0 = Math.floor(glow.x) - r;
    const y0 = Math.floor(glow.y) - r;
    const size = 2 * r + 1;
    const steps: (Image | null)[] = [];
    const extra = glow.strength * light.flicker;
    const spot = { image: null as Image | null, x: x0, y: y0 };
    let made = false;
    const make = (): void => {
      made = true;
      if (!canPaint()) return;
      for (let i = 1; i <= FLICKER_STEPS; i++) {
        const px = new Float64Array(size * size * 4);
        addGlow(px, size, size, {
          ...glow,
          x: glow.x - x0,
          y: glow.y - y0,
          strength: (extra * i) / FLICKER_STEPS,
        });
        const data = new Uint8ClampedArray(px.length);
        for (let j = 0; j < px.length; j++) data[j] = px[j]!;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        canvas.getContext('2d')?.putImageData(new ImageData(data, size, size), 0, 0);
        steps.push(canvas);
      }
    };
    const life: Life = {
      layer: 'ground',
      at(ms) {
        if (!made) make();
        const now = flicker2(light, ms, k).strength;
        // How far above its weakest it is now, in steps: none at its weakest.
        const above = (now - glow.strength * (1 - light.flicker)) / Math.max(1e-9, extra);
        const i = Math.round(above * FLICKER_STEPS);
        const image = i > 0 ? (steps[Math.min(FLICKER_STEPS, i) - 1] ?? null) : null;
        if (!image) return null;
        spot.image = image;
        return spot as Placed;
      },
    };
    return [life];
  });
}

/**
 * Someone's contact shadow on a room's ground: the cells under their feet
 * darkened by the ground's own steps (`castShadow`), nothing elsewhere,
 * painted with the lanterns that reach it onto one small canvas kept for
 * them and painted again only when they move to another pixel or the ground
 * under them changes.
 */
export class CaveShadow {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';
  private placed: Placed | null = null;

  /** The shadow of someone `rx` wide (half) standing at `feet` on `cells`, placed; null where none falls. */
  at(
    cells: TGrid,
    kinds: readonly (readonly Tile2Kind[])[],
    glows: readonly Glow[],
    feet: Point,
    rx: number,
  ): Placed | null {
    const fx = Math.round(feet.x);
    const fy = Math.round(feet.y);
    const ry = Math.max(2, Math.round(rx / 4));
    const key = `${fx} ${fy} ${rx}`;
    if (key === this.key && this.lastCells === cells) return this.placed;
    this.key = key;
    this.lastCells = cells;
    const box = { x: fx - rx, y: fy - ry, w: 2 * rx + 1, h: 2 * ry + 1 };
    const cut = tgrid(box.w, box.h);
    for (let y = 0; y < box.h; y++)
      for (let x = 0; x < box.w; x++) cut.d[y * box.w + x] = at(cells, box.x + x, box.y + y);
    const dark = { w: cut.w, h: cut.h, d: cut.d.slice() };
    castShadow(dark, { x: rx, y: ry }, rx, shadowSteps(kinds, feet));
    let any = false;
    for (let i = 0; i < dark.d.length; i++) {
      if (dark.d[i] === cut.d[i]) dark.d[i] = 0;
      else any = true;
    }
    if (!any) {
      this.placed = null;
      return null;
    }
    this.canvas = paintCells({ grid: dark, glows: glowsIn(glows, box) }, this.canvas ?? undefined);
    this.placed = this.canvas && { image: this.canvas, x: box.x, y: box.y };
    return this.placed;
  }

  private lastCells: TGrid | null = null;
}
