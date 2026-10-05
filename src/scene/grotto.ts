/*
 * The first dungeon, grey-boxed: three rooms as tile maps and the doors that
 * join them. There is nothing to fight yet (that waits for the combat rules);
 * this is the shape of a run, to walk from the boat to the far end and back.
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
    // Pools to walk round, longer than a screen, and a way up at the far end.
    pools: [
      '######################################b#',
      '#.........##.....................#.....#',
      '#..~~~~...##....~~~~~.....~~~....#.....#',
      '#..~~~~~.......~~~~~~~...~~~~~.........#',
      '#...~~~~.......~~~~~~~....~~~..........#',
      'a.............~~~~~~~.........###......#',
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
};
