/*
 * The first dungeon, grey-boxed: three rooms as tile maps, the doors that
 * join them and who waits in each. A gentle first room of rats, a room of two
 * crabs among the pools, and a smuggler who throws things guarding the end,
 * with pillars to put between you and him. The grotto's own rooms, tide and
 * captain are a later session's.
 *
 * Each room is drawn sideways, for a phone on its side: wider than it is
 * tall. In the maps, `#` is rock, `.` floor, `~` water, `s` where the boat
 * puts you ashore, `x` the end of the run, and a lower-case letter a door,
 * joined to the door with the same letter in another room.
 */
import type { DungeonPlan } from './dungeon';

export const GROTTO: DungeonPlan = {
  id: 'grotto',
  first: 'landing',
  rooms: {
    // Where the boat comes in: the sea along the west, a way on to the east.
    landing: [
      '########################',
      '#~~~~~~~##.......###...#',
      '#~~~~~~~#..........#...#',
      '#~~~~~~................#',
      '#~~~~~s................a',
      '#~~~~~~.......##.......#',
      '#~~~~~~~.....####......#',
      '#~~~~~~~~.....##.......#',
      '#~~~~~~~~~.............#',
      '#~~~~~~~~~~...#####....#',
      '#~~~~~~~~~~~..#####....#',
      '########################',
    ],
    // Pools to walk round, longer than a screen, two crabs, and a way on at the far end.
    pools: [
      '########################################',
      '#.........##.....................#.....#',
      '#..~~~~...##....~~~~~.....~~~....#.....#',
      '#..~~~~~.......~~~~~~~...~~~~~.........#',
      '#...~~~~.......~~~~~~~....~~~..........#',
      'a.............~~~~~~~.........###......b',
      '#...................~~~......####......#',
      '#.......~~~~..................##...~~..#',
      '#......~~~~~~......####...........~~~~.#',
      '#.......~~~~.......####............~~..#',
      '#......................................#',
      '########################################',
    ],
    // The end: in from the south, the marked spot at the top.
    cove: [
      '######################',
      '#~~~~~#........#~~~~~#',
      '#~~~~#....x.....#~~~~#',
      '#~~~#............#~~~#',
      '#~~#..............#~~#',
      '#~#....##....##....#~#',
      '#......##....##......#',
      '#....................#',
      '#.......#....#.......#',
      '#....................#',
      '#~~..............~~~~#',
      '#~~~~............~~~~#',
      '##########b###########',
    ],
  },
  foes: {
    landing: [
      { monster: 'dock_rat', at: { col: 17, row: 3 } },
      { monster: 'dock_rat', at: { col: 20, row: 8 } },
    ],
    pools: [
      { monster: 'sand_crab', at: { col: 25, row: 5 } },
      { monster: 'sand_crab', at: { col: 27, row: 9 } },
    ],
    cove: [
      { monster: 'smuggler', at: { col: 10, row: 3 } },
      { monster: 'dock_rat', at: { col: 4, row: 8 } },
    ],
  },
};
