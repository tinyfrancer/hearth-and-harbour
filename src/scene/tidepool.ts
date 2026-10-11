/*
 * The Tidepool Cave: the first dungeon, reachable from the first minute, for
 * learning. Two short rooms and a boss's, each one screen of a phone on its
 * side (28 tiles across: the whole room in view, no camera travel), no tide,
 * and simple things to fight. Each room is laid out so what it teaches comes
 * one thing at a time, in this order (the lessons themselves are in
 * `lessons.ts`):
 *
 *   landing   tap the ground to walk; a crate with fish in it; one dock rat,
 *             far enough off that it is only met once the walk is learned;
 *             then the door, the way onward, marked.
 *   pools     three rats waiting together under the pool (the wide swing),
 *             then a sand crab further on by the door, met only once the rats
 *             are dealt with (its slam: step out of the marked ground, or
 *             brace); by then a new player is hurt (the fish).
 *   snapper   the Old Snapper: slow, and one plain slam to step out of.
 *
 * The keys to the rows are in `ground.ts`. Sand without heights has no tide,
 * so none of it ever floods; the water round the edges is only the sea.
 */
import type { SayLine } from './battle';
import type { DungeonPlan } from './dungeon';

export const TIDEPOOL_ID = 'tidepool_cave';

export const TIDEPOOL: DungeonPlan = {
  id: TIDEPOOL_ID,
  first: 'landing',
  theme: 'tidepool',
  rooms: {
    /*
     *   wall    lanterns
     *   sea  boat > sand   crate          rock floor        sand      rat     > pools
     *   sea                       sand                shallows
     */
    landing: [
      '############################',
      '####L#########L#########L###',
      '#~~:::::C::.......:::::::::#',
      '#~~:::::::::.......::::::::#',
      '#~~:s:::::::.......::::::::a',
      '#~~~::::::::......:::::::::#',
      '#~~~~::::::::.....:::::::::#',
      '#~~~~~::::::::::::::::,,:::#',
      '#~~~~~~~::::::::,,,,,,:::~~#',
      '############################',
    ],
    /*
     *   wall    lanterns
     *   > sand    [ the pool ]         sand       crab         > snapper
     *   sand       three rats under it     rock
     *   sea                                         sea
     */
    pools: [
      '############################',
      '###L##########L#########L###',
      '#.....:::::::::::::::......#',
      '#....::::::~~~~~::::::.....#',
      '#...::::::~~~~~~~:::::::...#',
      'a::::::::::~~~~::::::::::::b',
      '#::::::::::::::::::::::::::#',
      '#::::::::::::::::::::::,,::#',
      '#~~~~::::::::::::::::,,,,~~#',
      '############################',
    ],
    /*
     *   wall    lanterns           (the end, under the middle lantern)
     *   > sand           the snapper's rock floor             sand
     *   sand                                               sea
     */
    snapper: [
      '############################',
      '####L#########L#########L###',
      '#::::.........x........::::#',
      '#:::......................:#',
      '#::.......................:#',
      'b::........................#',
      '#::.......................:#',
      '#:::....................:::#',
      '#~~~~::::::::::::::::::~~~~#',
      '############################',
    ],
  },
  foes: {
    landing: [{ monster: 'dock_rat', at: { col: 22, row: 4 } }],
    pools: [
      { monster: 'dock_rat', at: { col: 12, row: 6 } },
      { monster: 'dock_rat', at: { col: 14, row: 7 } },
      { monster: 'dock_rat', at: { col: 15, row: 6 } },
      { monster: 'sand_crab', at: { col: 24, row: 4 } },
    ],
    snapper: [{ monster: 'old_snapper', at: { col: 18, row: 5 } }],
  },
  // A crate's worth of fish beside the crate, on the way from the boat: a new
  // player rows out with nothing to eat, and the cave teaches eating.
  finds: {
    landing: [{ at: { col: 8, row: 3 }, loot: { cooked_shrimp: 4 } }],
  },
  titles: {
    landing: 'The Landing',
    pools: 'The Rock Pools',
    snapper: 'The Snapper’s Pool',
  },
};

/** What the cave's boss says as its fight turns: very little, being a turtle. */
export const TIDEPOOL_SAYS: Readonly<Record<string, Partial<Record<SayLine, string>>>> = {
  old_snapper: { down: '…Hmph.' },
};
