/*
 * A dungeon room's ground as written, and what it is at any moment: the
 * tide's level decides which sand is dry, which is shallows and which is
 * deep water; a fight bars the doors; a brig's cells open in waves. Each of
 * those is a plain tile map for walking and pathing, made once and kept.
 *
 * In a room's rows of characters:
 *
 *   #  rock              .  rock floor        :  dry sand
 *   =  planks            ~  deep water        ,  shallows
 *   0 1 2 3  sand the tide reaches, by height (see `tide.ts`)
 *   s  where the boat puts you ashore (dry sand)
 *   x  the end of the run (rock floor)
 *   B  the bars of a cell that opens first     D  of one that opens second
 *   K  powder kegs   C  crates   T  a chest   A  an anchor
 *   R  a coil of rope   N  a cannon   (each stands on its tile, which is solid)
 *   L  a lantern hung on the rock
 *   any other lower-case letter: a door, joined to the door with the same
 *   letter in exactly one other room.
 */
import { HIGH_WATER, waterAt } from './tide';
import { type Cell, type TileKind, type TileMap } from './tileMap';

export type RoomTile =
  'rock' | 'floor' | 'sand' | 'planks' | 'shallows' | 'water' | 'door' | 'end' | 'prop' | 'bars';

export const ROOM_KINDS: Readonly<Record<RoomTile, TileKind>> = {
  rock: { solid: true },
  floor: { solid: false },
  sand: { solid: false },
  planks: { solid: false },
  shallows: { solid: false },
  water: { solid: true },
  // A door is walked into: stepping onto it takes you through.
  door: { solid: false },
  end: { solid: false },
  prop: { solid: true },
  bars: { solid: true },
};

/** The same, with the doors barred: while something in the room still stands. */
export const SHUT_KINDS: Readonly<Record<RoomTile, TileKind>> = {
  ...ROOM_KINDS,
  door: { solid: true },
};

/** The props a room's rows can place, by their letter: the art lane's ids for them. */
export const PROP_LETTERS: Readonly<Record<string, string>> = {
  K: 'powder_keg',
  C: 'crate',
  T: 'treasure_chest',
  A: 'anchor',
  R: 'rope_coil',
  N: 'cannon',
};

const FIXED: Readonly<Record<string, RoomTile>> = {
  '#': 'rock',
  '.': 'floor',
  ':': 'sand',
  '=': 'planks',
  '~': 'water',
  ',': 'shallows',
  s: 'sand',
  x: 'end',
  L: 'rock',
};

const DOOR_LETTER = /^[a-z]$/;

/** Whether `ch` in a room's rows is a door. */
export const isDoorLetter = (ch: string): boolean => DOOR_LETTER.test(ch) && !(ch in FIXED);

/** Something standing in a room, by the art lane's id, on its tile. */
export interface PropSpot {
  readonly id: string;
  readonly cell: Cell;
}

export interface Ground {
  readonly cols: number;
  readonly rows: number;
  /** Each tile as written, the tide's sand as dry sand and cell bars as bars. */
  readonly tiles: readonly (readonly RoomTile[])[];
  /** The tide's sand: each tile's height, or -1 where the tide makes no difference. */
  readonly heights: readonly (readonly number[])[];
  /** What each solid prop tile stands on, for drawing: sand, rock floor or planks. */
  readonly under: readonly (readonly RoomTile[])[];
  readonly props: readonly PropSpot[];
  readonly lanterns: readonly Cell[];
  /** The bars of each wave's cells, first wave first. */
  readonly bars: readonly (readonly Cell[])[];
  /** Whether the room keeps its own tide (the captain's), not the shared one. */
  readonly ownTide: boolean;
  /** Whether the ground the tide reaches is stone (a flooded floor), not a beach. */
  readonly stone: boolean;
  /** Whether any of its ground is the tide's. */
  readonly tidal: boolean;
}

const BAR_LETTERS = ['B', 'D'];

/** Reads a room's rows into its ground. Every character must be known: a typo is an error, not a hole. */
export function readGround(rows: readonly string[], ownTide = false, stone = false): Ground {
  if (rows.length === 0) throw new Error('A room needs at least one row.');
  const cols = rows[0]!.length;
  const props: PropSpot[] = [];
  const lanterns: Cell[] = [];
  const bars: Cell[][] = BAR_LETTERS.map(() => []);
  let tidal = false;
  const heights: number[][] = [];
  const tiles = rows.map((line, row) => {
    if (line.length !== cols) {
      throw new Error(`Row ${row} is ${line.length} tiles wide; the first row is ${cols}.`);
    }
    const height: number[] = [];
    heights.push(height);
    return [...line].map((ch, col): RoomTile => {
      height.push(-1);
      if (ch >= '0' && ch <= '3') {
        height[col] = Number(ch);
        tidal = true;
        return 'sand';
      }
      if (ch in PROP_LETTERS) {
        props.push({ id: PROP_LETTERS[ch]!, cell: { col, row } });
        return 'prop';
      }
      const wave = BAR_LETTERS.indexOf(ch);
      if (wave >= 0) {
        bars[wave]!.push({ col, row });
        return 'bars';
      }
      if (ch === 'L') lanterns.push({ col, row });
      const fixed = FIXED[ch];
      if (fixed) return fixed;
      if (isDoorLetter(ch)) return 'door';
      throw new Error(`Unknown tile '${ch}' at column ${col}, row ${row}.`);
    });
  });
  // A prop or a cell's bars stand on whatever open ground is most about them.
  const under = tiles.map((line, row) =>
    line.map((tile, col): RoomTile => {
      if (tile !== 'prop' && tile !== 'bars') return tile;
      const count = new Map<RoomTile, number>();
      for (const [dc, dr] of AROUND) {
        const t = tiles[row + dr]?.[col + dc];
        if (t === 'sand' || t === 'floor' || t === 'planks') count.set(t, (count.get(t) ?? 0) + 1);
      }
      let best: RoomTile = 'floor';
      let most = 0;
      for (const [t, n] of count) {
        if (n > most) {
          best = t;
          most = n;
        }
      }
      return best;
    }),
  );
  while (bars.length > 0 && bars.at(-1)!.length === 0) bars.pop();
  return {
    cols,
    rows: rows.length,
    tiles,
    heights,
    under,
    props,
    lanterns,
    bars,
    ownTide,
    stone,
    tidal,
  };
}

const AROUND: readonly [number, number][] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** The moment's ground: how high the water is, whether the doors are barred, how many waves of cells are open. */
export interface GroundState {
  readonly level: number;
  readonly shut: boolean;
  readonly released: number;
}

const made = new WeakMap<Ground, Map<string, TileMap<RoomTile>>>();

/** The tile one written tile is at a moment. */
export function tileAt(g: Ground, col: number, row: number, state: GroundState): RoomTile {
  const tile = g.tiles[row]![col]!;
  const height = g.heights[row]![col]!;
  if (height >= 0) {
    const water = waterAt(height, state.level);
    return water === 'dry' ? 'sand' : water === 'shallow' ? 'shallows' : 'water';
  }
  if (tile === 'bars') {
    for (let wave = 0; wave < state.released && wave < g.bars.length; wave++) {
      if (g.bars[wave]!.some((c) => c.col === col && c.row === row)) return g.under[row]![col]!;
    }
  }
  return tile;
}

/** The room as a map to walk on at a moment. Made once for each moment that comes up, and kept. */
export function groundMap(g: Ground, state: GroundState): TileMap<RoomTile> {
  let maps = made.get(g);
  if (!maps) {
    maps = new Map();
    made.set(g, maps);
  }
  const level = g.tidal || g.ownTide ? Math.max(0, Math.min(HIGH_WATER, state.level)) : 0;
  const released = Math.max(0, Math.min(g.bars.length, state.released));
  const key = `${level} ${state.shut ? 1 : 0} ${released}`;
  let map = maps.get(key);
  if (!map) {
    const at = { level, shut: state.shut, released };
    map = {
      cols: g.cols,
      rows: g.rows,
      tiles: g.tiles.map((line, row) => line.map((_, col) => tileAt(g, col, row, at))),
      kinds: state.shut ? SHUT_KINDS : ROOM_KINDS,
    };
    maps.set(key, map);
  }
  return map;
}

/** Whether ground of this kind slows whoever walks it: the shallows. */
export const wading = (tile: RoomTile | undefined): boolean => tile === 'shallows';

/** Whether something can stand on this kind of ground (at all, doors aside). */
export const standable = (tile: RoomTile | undefined): boolean =>
  tile === 'floor' ||
  tile === 'sand' ||
  tile === 'planks' ||
  tile === 'shallows' ||
  tile === 'end' ||
  tile === 'door';
