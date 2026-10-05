import type { TileLook } from './draw';
import { parseMap, type TileKind, type TileMap } from './tileMap';

export type RoomTile = 'grass' | 'cobble' | 'planks' | 'wall' | 'water' | 'tree' | 'crate';

export const ROOM_KINDS: Readonly<Record<RoomTile, TileKind & { readonly look: TileLook }>> = {
  grass: { solid: false, look: { base: 'grass2', fleck: 'grass3' } },
  cobble: { solid: false, look: { base: 'cobble2', fleck: 'cobble1' } },
  planks: { solid: false, look: { base: 'wood2', fleck: 'wood3' } },
  wall: { solid: true, look: { base: 'stone2', fleck: 'stone1', lip: 'stone3' } },
  water: { solid: true, look: { base: 'sea2', fleck: 'sea1' } },
  tree: { solid: true, look: { base: 'pine2', fleck: 'pine1', lip: 'pine3' } },
  crate: { solid: true, look: { base: 'wood1', fleck: 'wood2', lip: 'wood4' } },
};

const KEY: Readonly<Record<string, RoomTile>> = {
  ',': 'grass',
  '.': 'cobble',
  '=': 'planks',
  '#': 'wall',
  '~': 'water',
  T: 'tree',
  c: 'crate',
};

/**
 * The scene engine's test room: bigger than a screen both ways, with a wall
 * and a gate, a pocket and a cup to walk around, a pond, crates and a pier,
 * so walking, pathing and the camera all have something to prove themselves
 * on. The town replaces it.
 */
export const TEST_ROOM: TileMap<RoomTile> = parseMap(
  [
    '##############################',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,T,,,,,,,,T,,,,,,,,,,,T,,,,#',
    '#,,,,,,,T,,,,,,,,,T,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,T,,,#',
    '#,T,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,T,,,,,,T,,,,,,,,,,,#',
    '#,,,,T,,,,,,,,,,,,,,,,,T,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,T,,,,,,,,,,,,T,,#',
    '#,,T,,,,,,,,,,,,,,,,T,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,T,,,,,,,,,,,,,,,T,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#############...##############',
    '#............................#',
    '#............................#',
    '#....cc..............cc......#',
    '#....cc..............c.......#',
    '#............................#',
    '#.........######.............#',
    '#.........#....#.............#',
    '#.........#....#.............#',
    '#.........#....#.....cc......#',
    '#.........#....#.....cc......#',
    '#.........#....#.............#',
    '#............................#',
    '#............................#',
    '#..~~~~~.....................#',
    '#.~~~~~~~..........###########',
    '#.~~~~~~~..........#.........#',
    '#..~~~~~...........#.........#',
    '#..................#...cc....#',
    '#.....c............#.........#',
    '#.....c..............#########',
    '#............................#',
    '#............................#',
    '#............................#',
    '#~~~~~~~~~~~~~====~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~====~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~====~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~====~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '##############################',
  ],
  KEY,
  ROOM_KINDS,
);

/** Where the walker stands when the room is first shown: just inside the gate. */
export const ROOM_START = { col: 14, row: 16 } as const;
