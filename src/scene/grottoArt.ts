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
  DUNGEON2_LIGHT,
  GROUND2_SHADOW,
  aroundOf,
  dungeonDoor2,
  dungeonProp2,
  dungeonTile2,
  flicker2,
  dungeonTheme2,
  lightAt,
  lightGround2,
  type CavePalette,
  type DoorPiece2Picture,
  type DungeonTheme2,
  type Light2,
  type PropPicture2,
  type Tile2Kind,
} from '../art/dungeonArt2';
import { addGlow, shines, type Glow } from '../art/raster';
import {
  at,
  cell,
  darker,
  hash,
  isMat,
  stamp,
  tgrid,
  type Picture2,
  type TGrid,
} from '../art/town2/cells';
import { noise } from '../art/town2/texture';
import { rasterize2 } from '../art/town2/raster';
import type { Image, Placed, Standing } from './draw';
import type { Room } from './dungeon';
import { DUNGEON, far } from './dungeonMetrics';
import { tileAt, type RoomTile } from './ground';
import type { Life, StillPicture } from './stage';
import type { Box, Scene } from './things';
import { HIGH_WATER } from './tide';
import { cellAt, type Cell, type Point, type TileMap } from './tileMap';
import { WALK_SPEED } from './walker';
import { lampPicture, propArtId } from './fromLaneB';
import { DARKER_HERO, LAMP_POOL, lampFoot, poolMiddle } from './light';

/** A tile's side, in art pixels. */
const T = DUNGEON.tile;

/**
 * A room's look as the art lane themes it (B15): the grotto's by default, the
 * tide-pool cave's (`'tidepool'`: its own tiles and doors, lit by day, its
 * own palette, the hero drawn by day) for a room whose plan says so.
 */
export function themeOf(room: Room): DungeonTheme2 {
  return dungeonTheme2(room.theme ?? 'grotto');
}

/** A cell's variant, as the art lane asks for it: its index in the room, so neighbours differ. */
export const cellVariant = (cols: number, col: number, row: number): number => row * cols + col;

/** Whether a kind is a door, in a face or a side wall. */
const isDoor = (k: Tile2Kind | 'rock' | undefined): boolean => !!k && k.startsWith('door_');

/** Whether a kind is ground a wall's face looks out over: anything but rock and doors. */
const open = (k: Tile2Kind | 'rock' | undefined): boolean =>
  k !== undefined && k !== 'rock' && !isDoor(k);

/**
 * The tile a door is drawn with, open or barred: a door in a side wall (the
 * room's first or last column) is the art lane's side-wall door, seen from
 * above as side walls are, and turned to the room by the open ground beside
 * it (`around`); any other is set in the face of the wall the viewer faces.
 */
export function doorTile(room: Room, col: number, barred: boolean): Tile2Kind {
  const side = col === 0 || col === room.ground.cols - 1;
  if (side) return barred ? 'door_side_barred' : 'door_side_open';
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
  const add = (
    id: string,
    key: string,
    x: number,
    y: number,
    given?: PropPicture2 | null,
  ): void => {
    // A prop lane B has not drawn yet stands in another's picture (`propArtId`); its id is its own.
    const art = given === undefined ? dungeonProp2(propArtId(id)) : given;
    if (!art) return;
    const w = art.picture.grid.w;
    // As the art lane's sample room has it: nothing under a lantern's post or a coil of rope.
    const shadow =
      id === 'lantern' || id === 'rope_coil' || id === 'light_shaft' ? 0 : Math.floor(w / 2.4);
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
  // In the tide-pool cave the day comes in through cracks above (B15): a shaft of sun for each
  // lantern, stood on the floor spot it lights, two rows down from the wall it would hang on.
  const tidepool = themeOf(room).theme === 'tidepool';
  room.ground.lanterns.forEach((c, i) =>
    tidepool
      ? add('light_shaft', `light_shaft ${i}`, c.col * T + T / 2, c.row * T + 3 * T + 6)
      : add('lantern', `lantern ${i}`, c.col * T + T / 2, (c.row + 1) * T + LANTERN_FOOT),
  );
  room.perches.forEach((p, i) => {
    const c = cellAt(p, T);
    add('perch', `perch ${i}`, c.col * T + T / 2, c.row * T + T - 2);
  });
  // Lanterns on posts (the Burrow's), burning or out as this look of the room has them.
  room.ground.lamps.forEach((l, i) => {
    const foot = lampFoot(l.cell);
    const lit = lampLit(room, i);
    add(lit ? 'post_lantern' : 'post_lantern_out', `lamp ${i}`, foot.x, foot.y, lampPicture(lit));
  });
  placings.set(room, made);
  return made;
}

/** Whether a room's lantern on a post burns as this look of the room shows it (`Room.lit`). */
export function lampLit(room: Room, i: number): boolean {
  return room.lit === undefined
    ? (room.ground.lamps[i]?.lit ?? false)
    : (room.lit & (1 << i)) !== 0;
}

/** Which of a room's lanterns on posts burn, as a look's key: bit `i` for lantern `i`. */
export function lampMask(lit: readonly boolean[]): number {
  return lit.reduce((m, on, i) => (on ? m | (1 << i) : m), 0);
}

const litLooks = new WeakMap<Room, Map<number, Room>>();

/**
 * A room as it looks with these of its lanterns burning (`lampMask`): the
 * same room, ground and doors, drawn with only those lit. Made once each.
 */
export function litRoom(room: Room, mask: number): Room {
  if (room.ground.lamps.length === 0) return room;
  let byMask = litLooks.get(room);
  if (!byMask) {
    byMask = new Map();
    litLooks.set(room, byMask);
  }
  let made = byMask.get(mask);
  if (!made) {
    made = { ...room, lit: mask };
    byMask.set(mask, made);
  }
  return made;
}

/** Every look of a room by its lanterns made so far: for letting their pictures go. */
export function litRooms(room: Room): readonly Room[] {
  return [...(litLooks.get(room)?.values() ?? [])];
}

/**
 * How much of its light a room has as it is drawn: a darker day's share
 * (`Room.dim`); in a room whose light is a rule, all of it (a darker day
 * there makes lanterns slow to light, not dim: `DARKER_LIGHTING`), so what is drawn
 * lit is what the rules call lit.
 */
export function lightKeptIn(room: Room): number {
  return room.ground.lamps.length > 0 ? 1 : (room.dim ?? 1);
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

/**
 * Each lantern's light, placed in the room: the pool it lays and the glow it
 * gives. A lantern on a post that burns lays exactly the pool the rules call
 * lit (`light.ts`): its middle by its foot, its half-width the rules' (lit
 * out to its edge band, as a darker day's pools are); one that is out, none.
 */
export function lightsOf(room: Room): Light2[] {
  const k = lightKeptIn(room);
  return propsOf(room).flatMap((p) => {
    if (!p.art.light) return [];
    const placed = lightAt(p.art.light, p.topLeft.x, p.topLeft.y);
    if (p.key.startsWith('lamp ')) {
      const middle = poolMiddle(room.ground.lamps[Number(p.key.slice(5))]!.cell);
      return [{ ...placed, drop: middle.y - placed.y, pool: LAMP_POOL }];
    }
    // A darker day: every pool smaller, so more of the room lies beyond them, in the dark.
    return [k === 1 ? placed : { ...placed, radius: placed.radius * k, pool: placed.pool * k }];
  });
}

/** Every glow in a room, in its pixels: what lights whoever stands near a lantern. */
export function glowsOf(room: Room): Glow[] {
  const k = lightKeptIn(room);
  return propsOf(room).flatMap((p) =>
    p.art.picture.glows.map((g) => ({
      ...g,
      x: g.x + p.topLeft.x,
      y: g.y + p.topLeft.y,
      ...(k === 1 ? {} : { radius: g.radius * k }),
    })),
  );
}

/* ----- A darker day (S16 `darker`) ----- */

/**
 * How much of its colour a darker day leaves a pixel at a pool's edge (1)
 * and in the dark beyond it (2): taken toward the cave's night
 * (`NIGHT_RGB`), so the floor keeps its own colours, only far down in
 * value, and nothing anyone must see is drawn under it.
 */
export const IN_THE_DARK = { 1: 0.6, 2: 0.3 } as const;

/** The night a darker day takes things toward: a deep blue-violet (shadows lean cool, by the style guide). */
export const NIGHT_RGB = [14, 12, 30] as const;

/** How far out a pool's edge reaches on a darker day, as a share of its half-width. */
export const POOL_EDGE = 1.5;

/** How dark a darker day leaves a point: 0 in a pool of light, 1 at its edge, 2 in the dark. */
export type Shade = 0 | 1 | 2;

/** The hero's own pool of light on a darker day: its half-width across the floor, art pixels. */
export const HERO_POOL = 36;

/** How far above his feet the middle of his pool lies, art pixels, so it lies round him. */
export const HERO_POOL_RISE = 4;

/** The shade at a point from how far into the nearest pool it is (0 its middle, 1 its edge). */
const shadeOf = (u: number): Shade => (u < 1 ? 0 : u < POOL_EDGE ? 1 : 2);

/** How far into the nearest of `lights`' pools a point is, by lane B's pools (flattened on the floor). */
function intoPools(lights: readonly Light2[], x: number, y: number): number {
  const L = DUNGEON2_LIGHT;
  let t = Infinity;
  for (const l of lights)
    t = Math.min(t, Math.hypot((x - l.x) / l.pool, (y - (l.y + l.drop)) / (l.pool * L.squash)));
  return t;
}

/** How far into the hero's own pool (`pool` its half-width) a point is. */
function intoHero(hero: Point, x: number, y: number, pool = HERO_POOL): number {
  return Math.hypot(
    (x - hero.x) / pool,
    (y - (hero.y - HERO_POOL_RISE)) / (pool * DUNGEON2_LIGHT.squash),
  );
}

/** Lane B's ragged edge for a pool (`lightGround2`), at a pixel: rings broken into clumps, never a dither. */
const ragged = (x: number, y: number): number =>
  (noise(x, y, 4, 211) - 0.5) * 2 * DUNGEON2_LIGHT.ragged + (hash(x, y, 7) - 0.5) * 0.04;

/** A pixel's shade on a darker day: in, at the edge of, or beyond every pool, edges ragged. */
export function shadeAt(
  lights: readonly Light2[],
  x: number,
  y: number,
  hero?: Point,
  pool = HERO_POOL,
): Shade {
  const t = Math.min(
    intoPools(lights, x + 0.5, y + 0.5),
    hero ? intoHero(hero, x + 0.5, y + 0.5, pool) : Infinity,
  );
  return shadeOf(t + ragged(x, y));
}

/**
 * Whether someone standing at `p` is lit on a darker day (by lane B's pools,
 * and by the hero's own when he is given): a figure is shaded whole, by
 * where its feet are.
 */
export function litness(
  lights: readonly Light2[],
  hero: Point | null,
  p: Point,
  pool = HERO_POOL,
): Shade {
  return shadeOf(
    Math.min(intoPools(lights, p.x, p.y), hero ? intoHero(hero, p.x, p.y, pool) : Infinity),
  );
}

/** A colour taken toward the night by a shade. */
function nightOf(d: Uint8ClampedArray, i: number, shade: Shade): void {
  if (!shade) return;
  const k = IN_THE_DARK[shade];
  d[i] = d[i]! * k + NIGHT_RGB[0] * (1 - k);
  d[i + 1] = d[i + 1]! * k + NIGHT_RGB[1] * (1 - k);
  d[i + 2] = d[i + 2]! * k + NIGHT_RGB[2] * (1 - k);
}

/**
 * Pixels of a picture whose top-left is at (`ox`, `oy`) in the room, each
 * taken toward the night by its shade (`shade(x, y)`, room pixels). In place.
 */
export function darkenPixels(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  ox: number,
  oy: number,
  shade: (x: number, y: number) => Shade,
): void {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3]) nightOf(data, i, shade(ox + x, oy + y));
    }
}

/** A canvas placed at (`ox`, `oy`) in the room, darkened in place by its pixels' shades. */
export function darkenCanvas(
  canvas: HTMLCanvasElement | null,
  ox: number,
  oy: number,
  shade: (x: number, y: number) => Shade,
): void {
  const ctx = canvas?.getContext('2d', { willReadFrequently: true });
  if (!canvas || !ctx || !(canvas.width > 0)) return;
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height);
  darkenPixels(px.data, px.width, px.height, ox, oy, shade);
  ctx.putImageData(px, 0, 0);
}

/**
 * Whether a room is drawn dark beyond its pools: on a darker day, and always
 * in a room whose light is a rule (it has lanterns on posts).
 */
export const isDark = (room: Room): boolean => (room.dim ?? 1) < 1 || (room.ground.lamps.length > 0 && !(globalThis as {NODARK?: boolean}).NODARK);

/** The hero's own pool's half-width in a room: in a room of lanterns on a darker day, smaller. */
export const heroPoolIn = (room: Room): number =>
  room.ground.lamps.length > 0 && (room.dim ?? 1) < 1 ? HERO_POOL * DARKER_HERO : HERO_POOL;

/* ----- Doors ----- */

/**
 * A door as the art lane draws it (B13, `dungeonDoor2`): a piece three tiles
 * tall over its cell and the rock either side, and for a side door a column
 * beyond the room's edge as well, where the passage runs on out of the map.
 * The door is still one walkable cell (`Door.cell`); the piece is only
 * drawn, and is where a thumb may tap to go through it.
 */
export interface DoorAt {
  readonly letter: string;
  readonly cell: Cell;
  /** The open piece, lit from beyond with its lantern burning; and the barred one, dark behind iron. */
  readonly open: DoorPiece2Picture;
  readonly barred: DoorPiece2Picture;
  /** The piece's box in the room, in art pixels: it may reach a column past the room's edge. */
  readonly box: Box;
  /** The open door's light from beyond, laid on the floor as a lantern's, placed in the room. */
  readonly light: Light2 | null;
  /** The open door's glows (its lantern, the light beyond), placed in the room. */
  readonly glows: readonly Glow[];
}

const doorPlacings = new WeakMap<Room, DoorAt[]>();

/** Every door in a room as its piece, placed: told its neighbours so a side door turns to the room. */
export function doorPieces(room: Room): DoorAt[] {
  const known = doorPlacings.get(room);
  if (known) return known;
  const kinds = tileKindsAt(room, 0, false);
  const made: DoorAt[] = [];
  for (const d of room.doors) {
    const { col, row } = d.cell;
    const around = aroundOf(kinds, col, row);
    const theme = themeOf(room).theme;
    const open = dungeonDoor2(doorTile(room, col, false), around, { col, row }, theme);
    const barred = dungeonDoor2(doorTile(room, col, true), around, { col, row }, theme);
    if (!open || !barred) continue;
    const x = col * T + open.dx;
    const y = row * T + open.dy;
    made.push({
      letter: d.letter,
      cell: d.cell,
      open,
      barred,
      box: { x, y, w: open.picture.grid.w, h: open.picture.grid.h },
      light: open.light ? lightAt(open.light, x, y) : null,
      glows: open.picture.glows.map((g) => ({ ...g, x: g.x + x, y: g.y + y })),
    });
  }
  doorPlacings.set(room, made);
  return made;
}

/**
 * The door whose piece is under `point` (art pixels in the room), its box
 * grown to `min` across and tall where it is smaller and by a few pixels
 * all round, or null: the whole piece is the door's tap target, though only
 * its one cell is walked through.
 */
export function doorUnder(room: Room, point: Point, min = 0): DoorAt | null {
  for (const d of doorPieces(room)) {
    const padX = Math.max(4, (min - d.box.w) / 2);
    const padY = Math.max(4, (min - d.box.h) / 2);
    if (
      point.x >= d.box.x - padX &&
      point.x < d.box.x + d.box.w + padX &&
      point.y >= d.box.y - padY &&
      point.y < d.box.y + d.box.h + padY
    )
      return d;
  }
  return null;
}

/** Every glow in a room with its doors open: what lights whoever stands near one once it is. */
const openGlowLists = new WeakMap<Room, Glow[]>();
export function openGlowsOf(room: Room): Glow[] {
  let list = openGlowLists.get(room);
  if (!list) {
    list = [...glowsOf(room), ...doorPieces(room).flatMap((d) => d.glows)];
    openGlowLists.set(room, list);
  }
  return list;
}

/**
 * What a door changes on the ground when it opens, at a state of the tide:
 * the cells over `box` (in the room's art pixels, reaching past its edge where
 * the passage runs on) barred and open, each lit as the room is. The ground
 * itself is painted with its doors barred; the open cells are laid over it,
 * fading in, as the room is cleared.
 */
export interface DoorPaint {
  readonly letter: string;
  readonly box: Box;
  readonly barred: TGrid;
  readonly open: TGrid;
}

/**
 * How many steps a cell past the room's edge is lit or darkened by `lights`,
 * by the art lane's rule (`lightGround2`) less its ragged edge: there is no
 * neighbour out there for a seam to show against.
 */
function litOffMap(c: number, x: number, y: number, lights: readonly Light2[]): number {
  if (!c || (c & 7) === 6) return c;
  const L = DUNGEON2_LIGHT;
  let t = Infinity;
  for (const l of lights) {
    const dx = (x + 0.5 - l.x) / l.pool;
    const dy = (y + 0.5 - (l.y + l.drop)) / (l.pool * L.squash);
    t = Math.min(t, Math.hypot(dx, dy));
  }
  if (t < L.heart) return (c & ~7) | Math.max(0, (c & 7) - L.heartSteps);
  if (t < 1) return c;
  return darker(c, t > L.deep ? L.darkSteps + 1 : L.darkSteps);
}

/**
 * As far as an open door can change the ground: its light's pool and the
 * dark it lifts round it are well inside four tiles across and three up and
 * down (half-width 26, the dark's edge at 2.2 of that, ragged by a sixth).
 */
function doorReach(d: DoorAt): Box {
  const cx = d.cell.col * T + T / 2;
  const cy = d.cell.row * T + T / 2;
  return { x: cx - 4 * T, y: cy - 3 * T, w: 8 * T, h: 6 * T };
}

/**
 * Each door's cells barred and open, from the room's ground lit both ways:
 * the box is the piece and every cell of the room the open door changes
 * (its light's pool on the floor), with its glows' reach. Pure.
 */
export function doorPaints(room: Room, barredLit: TGrid, openLit: TGrid): DoorPaint[] {
  const W = barredLit.w;
  const H = barredLit.h;
  const doors = doorPieces(room);
  const lights = lightsOf(room);
  const openLights = [...lights, ...doors.flatMap((d) => (d.light ? [d.light] : []))];
  return doors.map((d) => {
    // Grown to every cell the open door changes near it (never across to the far door).
    let x0 = d.box.x;
    let y0 = d.box.y;
    let x1 = d.box.x + d.box.w;
    let y1 = d.box.y + d.box.h;
    const reach = doorReach(d);
    for (let y = Math.max(0, reach.y); y < Math.min(H, reach.y + reach.h); y++)
      for (let x = Math.max(0, reach.x); x < Math.min(W, reach.x + reach.w); x++) {
        const i = y * W + x;
        if (barredLit.d[i] === openLit.d[i]) continue;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x + 1);
        y1 = Math.max(y1, y + 1);
      }
    for (const g of d.glows) {
      x0 = Math.min(x0, Math.floor(g.x - g.radius));
      y0 = Math.min(y0, Math.floor(g.y - g.radius));
      x1 = Math.max(x1, Math.ceil(g.x + g.radius));
      y1 = Math.max(y1, Math.ceil(g.y + g.radius));
    }
    x0 = Math.max(-T, x0);
    x1 = Math.min(W + T, x1);
    y0 = Math.max(0, y0);
    y1 = Math.min(H, y1);
    const box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    // Past the room's edge only the passage shows, with its jambs: where the two pieces differ
    // (the way through), and a few pixels above and below. The rock round it would stand out
    // of the room's edge into the dark like a block.
    const og = d.open.picture.grid;
    const bg = d.barred.picture.grid;
    const passage = new Uint8Array(og.w * og.h);
    const JAMB = 4;
    for (let py = 0; py < og.h; py++)
      for (let px = 0; px < og.w; px++) {
        if (og.d[py * og.w + px] === bg.d[py * og.w + px]) continue;
        for (let j = Math.max(0, py - JAMB); j <= Math.min(og.h - 1, py + JAMB); j++)
          passage[j * og.w + px] = 1;
      }
    const crop = (lit: TGrid, piece: DoorPiece2Picture, ls: readonly Light2[]): TGrid => {
      const out = tgrid(box.w, box.h);
      const pg = piece.picture.grid;
      for (let j = 0; j < box.h; j++)
        for (let i = 0; i < box.w; i++) {
          const x = box.x + i;
          const y = box.y + j;
          let c: number;
          // Inside the room, the ground as lit (the barred ground where the open was not worked out).
          if (x >= 0 && x < W) c = lit.d[y * W + x]! || barredLit.d[y * W + x]!;
          else {
            // Past the room's edge: the piece alone, where the passage runs on into the rock.
            const px = x - d.box.x;
            const py = y - d.box.y;
            const inPiece =
              px >= 0 && py >= 0 && px < pg.w && py < pg.h && passage[py * pg.w + px] === 1;
            c = inPiece ? litOffMap(pg.d[py * pg.w + px]!, x, y, ls) : 0;
          }
          out.d[j * box.w + i] = c;
        }
      return out;
    };
    return {
      letter: d.letter,
      box,
      barred: crop(barredLit, d.barred, lights),
      open: crop(openLit, d.open, openLights),
    };
  });
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
export function groundCells(room: Room, level: number, warn: boolean, open = false): TGrid {
  return litCells(room, tileCells(room, level, warn), level, warn, open);
}

/** The room's tiles at a state of the tide, each joined to its neighbours: before doors, overlays and light. */
function tileCells(room: Room, level: number, warn: boolean): { g: TGrid; kinds: Tile2Kind[][] } {
  const kinds = tileKindsAt(room, level, warn);
  const g = tgrid(room.ground.cols * T, room.ground.rows * T);
  kinds.forEach((line, row) =>
    line.forEach((kind, col) => {
      const tile = dungeonTile2(
        kind,
        cellVariant(room.ground.cols, col, row),
        aroundOf(kinds, col, row),
        { col, row },
        themeOf(room).theme,
      );
      if (tile) stamp(g, tile.grid, col * T, row * T);
    }),
  );
  return { g, kinds };
}

/**
 * The tiles with the doors' pieces laid over them (after the tiles and before
 * anything standing, as the art lane says), barred or open, this scene's
 * overlays and contact shadows, then lit: by the lanterns, and with the
 * doors open by the light from beyond them too.
 */
function litCells(
  room: Room,
  tiles: { g: TGrid; kinds: Tile2Kind[][] },
  level: number,
  warn: boolean,
  open: boolean,
  only?: readonly Box[],
): TGrid {
  const g: TGrid = { w: tiles.g.w, h: tiles.g.h, d: tiles.g.d.slice() };
  const doors = doorPieces(room);
  for (const d of doors) stamp(g, (open ? d.open : d.barred).picture.grid, d.box.x, d.box.y);
  overlays(room, g, level, warn);
  for (const p of propsOf(room)) castShadow(g, p.feet, p.shadow, shadowSteps(tiles.kinds, p.feet));
  if (only) {
    // Only these boxes are wanted: the rest left empty, which the light passes over at no cost.
    const keep = new Uint8Array(g.w * g.h);
    for (const b of only)
      for (let y = Math.max(0, b.y); y < Math.min(g.h, b.y + b.h); y++)
        keep.fill(1, y * g.w + Math.max(0, b.x), y * g.w + Math.min(g.w, b.x + b.w));
    for (let i = 0; i < g.d.length; i++) if (!keep[i]) g.d[i] = 0;
  }
  const lights = lightsOf(room);
  return lightGround2(
    g,
    open ? [...lights, ...doors.flatMap((d) => (d.light ? [d.light] : []))] : lights,
    themeOf(room).theme,
  );
}

/** The ground's cells with its doors barred (as it is painted), and each door's cells barred and open. */
export function groundWithDoors(
  room: Room,
  level: number,
  warn: boolean,
): { cells: TGrid; doors: DoorPaint[] } {
  const tiles = tileCells(room, level, warn);
  const cells = litCells(room, tiles, level, warn, false);
  // The open ground is lit only about the doors: it is all that changes.
  const near = doorPieces(room).map(doorReach);
  const doors = room.doors.length
    ? doorPaints(room, cells, litCells(room, tiles, level, warn, true, near))
    : [];
  return { cells, doors };
}

/* ----- Painting ----- */

/** Whether this browser can paint pixels (not jsdom). */
const canPaint = (): boolean => typeof ImageData !== 'undefined' && typeof document !== 'undefined';

/** Cells in a cave's palette (the grotto's dusk unless said) onto a canvas of their size, empty cells empty. */
export function paintCells(
  pic: Picture2,
  into?: HTMLCanvasElement,
  palette: CavePalette = CAVE_DUSK,
): HTMLCanvasElement | null {
  if (!canPaint()) return null;
  const image = rasterize2(pic, palette, 1);
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
export function glowsIn(
  glows: readonly Glow[],
  box: Box,
  palette: CavePalette = CAVE_DUSK,
): Glow[] {
  return glows
    .filter((g) => {
      const nx = Math.max(box.x, Math.min(g.x, box.x + box.w));
      const ny = Math.max(box.y, Math.min(g.y, box.y + box.h));
      return shines(g, palette) && Math.hypot(g.x - nx, g.y - ny) < g.radius;
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
): { cells: TGrid; data: Uint8ClampedArray; doors: DoorPaint[] } {
  const { cells, doors } = groundWithDoors(room, level, warn);
  const data = rasterize2({ grid: cells, glows: steadyGlows(room) }, themeOf(room).palette, 1).data;
  // A darker day: beyond the (smaller) pools the floor goes down toward the night.
  if (isDark(room)) {
    const lights = lightsOf(room);
    darkenPixels(data, cells.w, cells.h, 0, 0, (x, y) => shadeAt(lights, x, y));
  }
  return { cells, data, doors };
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
  /**
   * `doors`, each door's cells barred and open (`DoorPaint`), may be left
   * out: they are then worked out from the room when first shown.
   */
  paint(
    room: Room,
    state: TideState,
    urgent: boolean,
    done: (cells: TGrid, data: Uint8ClampedArray | null, doors?: readonly DoorPaint[]) => void,
  ): void;
}

/** On the spot, before returning: no worker (tests). No pixels where nothing can be painted. */
export const groundOnTheSpot: GroundPainter = {
  paint(room, state, _urgent, done) {
    if (!canPaint()) {
      const { cells, doors } = groundWithDoors(room, state.level, state.warn);
      done(cells, null, doors);
    } else {
      const { cells, data, doors } = groundPixels(room, state.level, state.warn);
      done(cells, data, doors);
    }
  },
};

/** A door as a room shows it at a state of the tide: its box, and its pictures barred and open. */
export interface DoorShown {
  readonly letter: string;
  readonly box: Box;
  readonly barred: HTMLCanvasElement | null;
  readonly open: HTMLCanvasElement | null;
}

/** What a dungeon room needs to be shown on the stage, made once a page and kept. */
export interface RoomLook {
  /** The room as this look draws it (a look of it by its lanterns, `litRoom`, has its own). */
  readonly room: Room;
  /** The ground to walk on as the run has it now (set by the view each frame), and nothing tappable. */
  readonly scene: Scene;
  readonly lock: { map: TileMap<RoomTile> };
  /**
   * The room at a state of the tide, painted, with its props standing in it;
   * asked for at once if it is not, and null until it is (or where nothing
   * can be painted).
   */
  stillAt(level: number, warn: boolean): StillPicture | null;
  /**
   * The nearest state to this one whose ground is in (the same, if it is;
   * else the nearest level of the water), or null if none of the room's is:
   * shown for the moment the exact one is still being painted, so the room
   * is never dark while its ground comes.
   */
  nearestIn(level: number, warn: boolean): TideState | null;
  /**
   * Works a state out here and now, before returning, if it is not in yet:
   * for a moment when a pause cannot be seen (the dark of a door).
   */
  paintNow(level: number, warn: boolean): void;
  /**
   * The cells of the ground at a state of the tide, lit; null until worked
   * out. `open`: with the doors open (their cells laid over), as they are
   * once the room is cleared.
   */
  cellsAt(level: number, warn: boolean, open?: boolean): TGrid | null;
  /**
   * The doors at a state of the tide (or the nearest state that is in), each
   * barred and open, to lay over the ground: barred while the room is shut,
   * open fading in over it as it is cleared. Empty until any ground is in.
   */
  doorsAt(level: number, warn: boolean): readonly DoorShown[];
  /** The glows with the doors open: the lanterns' and the doors'. */
  readonly openGlows: readonly Glow[];
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
  /** The room's theme, as the art lane draws it: its palette, and the hero's time of day. */
  readonly theme: DungeonTheme2;
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
  const palette = themeOf(room).palette;
  const glows = glowsOf(room);
  const props = propsOf(room);
  const dark = isDark(room);
  const lights = lightsOf(room);
  const openLights = [...lights, ...doorPieces(room).flatMap((d) => (d.light ? [d.light] : []))];
  let painterNow = painter;
  /**
   * What has come back for each state: its cells, the still once painted,
   * its doors' cells (worked out here if the painter left them out), and,
   * once asked for, the doors painted and the cells with the doors open.
   */
  const done = new Map<
    string,
    {
      cells: TGrid;
      still: StillPicture | null;
      doors: readonly DoorPaint[] | null;
      shown?: readonly DoorShown[];
      openCells?: TGrid;
    }
  >();
  const openGlows = openGlowsOf(room);
  const doorPaintsOf = (s: TideState, d: { cells: TGrid; doors: readonly DoorPaint[] | null }) => {
    d.doors ??= room.doors.length
      ? doorPaints(room, d.cells, groundCells(room, s.level, s.warn, true))
      : [];
    return d.doors;
  };
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
        const image = paintCells(
          {
            grid: p.art.picture.grid,
            glows: [...p.art.picture.glows, ...glowsIn(glows, box, palette)],
          },
          undefined,
          palette,
        );
        // On a darker day, as dark as the ground where it stands; a lantern is its own light.
        if (image && dark && !p.art.light)
          darkenCanvas(image, box.x, box.y, (x, y) => shadeAt(lights, x, y));
        if (image) standing.push({ image, x: box.x, y: box.y, base: p.feet.y });
      }
      standing.sort((a, b) => a.base - b.base);
    }
    return standing;
  };
  const arrive = (
    s: TideState,
    cells: TGrid,
    data: Uint8ClampedArray | null,
    doors?: readonly DoorPaint[],
  ): void => {
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
    done.set(key(s), { cells, still, doors: doors ?? null });
  };
  const ask = (s: TideState, urgent: boolean): void => {
    const k = key(s);
    if (asked.has(k)) return;
    asked.add(k);
    painterNow.paint(room, s, urgent, (cells, data, doors) => {
      if (asked.has(k)) arrive(s, cells, data, doors);
    });
  };
  /** The nearest state to `s` that is in, or null: what is shown while `s` is still coming. */
  const nearest = (s: TideState): TideState | null => {
    if (done.has(key(s))) return s;
    let best: TideState | null = null;
    let far = Infinity;
    for (const o of states) {
      if (!done.has(key(o))) continue;
      // The nearest water first; a warning's darkened sand only breaks a tie.
      const d = Math.abs(o.level - s.level) * 2 + (o.warn === s.warn ? 0 : 1);
      if (d < far) {
        far = d;
        best = o;
      }
    }
    return best;
  };
  // A door's pictures are lit as the ground under them is: the lanterns at their weakest, and the doors' own glows.
  const steady = steadyGlows(room);
  const openSteady = [...steady, ...doorPieces(room).flatMap((d) => d.glows)];
  const shownDoors = (
    d: {
      cells: TGrid;
      doors: readonly DoorPaint[] | null;
      shown?: readonly DoorShown[];
    },
    s: TideState,
  ): readonly DoorShown[] => {
    d.shown ??= doorPaintsOf(s, d).map((p) => {
      const barred = paintCells(
        { grid: p.barred, glows: glowsIn(steady, p.box, palette) },
        undefined,
        palette,
      );
      const open = paintCells(
        { grid: p.open, glows: glowsIn(openSteady, p.box, palette) },
        undefined,
        palette,
      );
      // A darker day: barred, as dark as the ground; open, lit by the light from beyond.
      if (dark) {
        darkenCanvas(barred, p.box.x, p.box.y, (x, y) => shadeAt(lights, x, y));
        darkenCanvas(open, p.box.x, p.box.y, (x, y) => shadeAt(openLights, x, y));
      }
      return { letter: p.letter, box: p.box, barred, open };
    });
    return d.shown;
  };
  /** The cells with each door's open cells laid over its box: for contact shadows once it is open. */
  const openCellsOf = (
    d: { cells: TGrid; doors: readonly DoorPaint[] | null; openCells?: TGrid },
    s: TideState,
  ): TGrid => {
    if (d.openCells) return d.openCells;
    const g: TGrid = { w: d.cells.w, h: d.cells.h, d: d.cells.d.slice() };
    for (const p of doorPaintsOf(s, d))
      for (let j = 0; j < p.box.h; j++)
        for (let i = 0; i < p.box.w; i++) {
          const x = p.box.x + i;
          const y = p.box.y + j;
          if (x >= 0 && x < g.w && y >= 0 && y < g.h) g.d[y * g.w + x] = p.open.d[j * p.box.w + i]!;
        }
    d.openCells = g;
    return g;
  };
  const tidal = room.ground.tidal || room.ground.ownTide;
  const states: TideState[] = [];
  for (let l = 0; l <= (tidal ? HIGH_WATER : 0); l++) {
    states.push({ level: l, warn: false });
    if (tidal && l < HIGH_WATER) states.push({ level: l, warn: true });
  }
  made = {
    room,
    theme: themeOf(room),
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
    nearestIn(level, warn) {
      return nearest(stateOf(room, level, warn));
    },
    paintNow(level, warn) {
      const s = stateOf(room, level, warn);
      const k = key(s);
      if (done.has(k)) return;
      asked.add(k);
      groundOnTheSpot.paint(room, s, true, (cells, data, doors) => arrive(s, cells, data, doors));
    },
    cellsAt(level, warn, open = false) {
      const s = stateOf(room, level, warn);
      const d = done.get(key(s));
      if (!d) return null;
      return open && room.doors.length ? openCellsOf(d, s) : d.cells;
    },
    doorsAt(level, warn) {
      const s = nearest(stateOf(room, level, warn));
      const d = s && done.get(key(s));
      return d && s ? shownDoors(d, s) : [];
    },
    openGlows,
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
      for (const d of done.values()) {
        if (d.still) release(d.still.still);
        for (const s of d.shown ?? []) for (const c of [s.barred, s.open]) if (c) release(c);
      }
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
    palette: CavePalette = CAVE_DUSK,
    shade?: (x: number, y: number) => Shade,
    shadeKey = '',
  ): Placed | null {
    const fx = Math.round(feet.x);
    const fy = Math.round(feet.y);
    const ry = Math.max(2, Math.round(rx / 4));
    const key = `${fx} ${fy} ${rx} ${shadeKey}`;
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
    this.canvas = paintCells(
      { grid: dark, glows: glowsIn(glows, box, palette) },
      this.canvas ?? undefined,
      palette,
    );
    // On a darker day, as dark as the ground it falls on.
    if (shade) darkenCanvas(this.canvas, box.x, box.y, shade);
    this.placed = this.canvas && { image: this.canvas, x: box.x, y: box.y };
    return this.placed;
  }

  private lastCells: TGrid | null = null;
}

/**
 * The hero's own pool of light on a darker day, laid on the ground round his
 * feet over the room's dark: the floor as lane B's light leaves it, its
 * heart a step lighter, its edge a ring half as dark as the dark beyond,
 * ragged by lane B's rule for a pool's. Only where it is lighter than the
 * ground already is (a lantern's pool needs nothing of it). Painted on one
 * small canvas kept for him and painted again only when he moves a pixel
 * or the ground changes.
 */
export class HeroLight {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';
  private placed: Placed | null = null;
  private lastCells: TGrid | null = null;

  at(
    cells: TGrid,
    lights: readonly Light2[],
    glows: readonly Glow[],
    feet: Point,
    palette: CavePalette = CAVE_DUSK,
    pool = HERO_POOL,
  ): Placed | null {
    const L = DUNGEON2_LIGHT;
    const hero = { x: Math.round(feet.x), y: Math.round(feet.y) };
    const key = `${hero.x} ${hero.y} ${lights.length} ${pool}`;
    if (key === this.key && cells === this.lastCells) return this.placed;
    this.key = key;
    this.lastCells = cells;
    const rx = Math.ceil(pool * POOL_EDGE) + 2;
    const ry = Math.ceil(pool * POOL_EDGE * L.squash) + 2;
    const cy = hero.y - HERO_POOL_RISE;
    const box = { x: hero.x - rx, y: cy - ry, w: 2 * rx + 1, h: 2 * ry + 1 };
    const out = tgrid(box.w, box.h);
    const shades = new Uint8Array(box.w * box.h);
    let any = false;
    for (let j = 0; j < box.h; j++)
      for (let i = 0; i < box.w; i++) {
        const x = box.x + i;
        const y = box.y + j;
        if (x < 0 || y < 0 || x >= cells.w || y >= cells.h) continue;
        const c = cells.d[y * cells.w + x]!;
        if (!c) continue;
        const rag = ragged(x, y);
        const own = shadeOf(intoHero(hero, x + 0.5, y + 0.5, pool) + rag);
        const ground = shadeOf(intoPools(lights, x + 0.5, y + 0.5) + rag);
        if (own >= ground) continue;
        const u = intoHero(hero, x + 0.5, y + 0.5, pool) + rag;
        out.d[j * box.w + i] =
          u < L.heart && (c & 7) !== 6 && !isMat(c, 'wood')
            ? (c & ~7) | Math.max(0, (c & 7) - L.heartSteps)
            : c;
        shades[j * box.w + i] = own;
        any = true;
      }
    if (!any) {
      this.placed = null;
      return null;
    }
    this.canvas = paintCells(
      { grid: out, glows: glowsIn(glows, box, palette) },
      this.canvas ?? undefined,
      palette,
    );
    darkenCanvas(
      this.canvas,
      box.x,
      box.y,
      (x, y) => shades[(y - box.y) * box.w + (x - box.x)] as Shade,
    );
    this.placed = this.canvas && { image: this.canvas, x: box.x, y: box.y };
    return this.placed;
  }
}
