/*
 * Thistlewood Burrow: the second dungeon, for a hero of about level 40 in
 * tier-2 gear. Five rooms, drawn by hand, each about one thing the dark
 * does; the fifth is the boss's. Its mechanic is light (`light.ts`): every
 * room is dark but for the lanterns on posts that burn in it (`Y`) or that
 * the hero lights (`Q`), and what lives here is built round that.
 *
 * The run goes hollow -> watch -> gallery -> run -> sett. Every room bars its
 * doors while anything in it stands. The keys to the rows are in
 * `ground.ts`; the sketch of each room is above its rows, and
 * `tests/scene/burrow.test.ts` holds that every room is one floor, its doors
 * and lanterns can be reached, and nobody waits in a wall.
 *
 * Cut as the grotto's are: 34 tiles across on the C scale's 24-pixel tiles
 * (a little over two sideways screens: the camera travels), the north wall
 * two rocks deep so its face stands two tiles tall. Drawn in lane B's
 * `'burrow'` theme (B20): its tiles, props, lanterns, creatures and the dark
 * by its night ramp.
 */
import type { SayLine } from './battle';
import type { DungeonPlan } from './dungeon';

export const BURROW_ID = 'thistlewood_burrow';

export const BURROW: DungeonPlan = {
  id: BURROW_ID,
  first: 'hollow',
  mechanic: 'light',
  // Lane B's Burrow (B20): earthen walls, roots and fungus, its dark a night ramp of its own.
  theme: 'burrow',
  rooms: {
    /*
     * The root hollow: the dark, taught with spore puffs.
     *
     *    wall                                                       wall
     *    lit lantern by the start    unlit lantern    three puffs   unlit lantern
     *    > start                         (middle)       in the dark        > door
     *
     * He comes in by a burning lantern, so he sees what light is before he
     * steps out of it. The puffs wait in the dark beyond the middle lantern
     * and creep at him while he is in the dark; light it, and they stop in
     * its pool to be fought one by one.
     */
    hollow: [
      '##################################',
      '##################################',
      '#MM::.............OO.........::MM#',
      '#M:.Y...........................M#',
      '#.........................Q......#',
      '#s..............Q................#',
      '#...................OO...........a',
      '#................................#',
      '#........OO.........M............#',
      '#M::.........................V.:M#',
      '#MM::.........::...........:::::M#',
      '#VMM:::........FF::..........:MMV#',
      '##################################',
    ],
    /*
     * The toadstool watch: two cap guards behind their caps.
     *
     *    wall      toadstools in a row down the middle       wall
     *    > lit lantern    guard   [toadstools]   guard   unlit   > door
     *    puffs in the dark corners
     *
     * The guards stand in the open either side of the toadstools, so there is
     * room to step round behind one as it bashes. The puffs come out of the
     * corners while he is busy with them.
     */
    watch: [
      '##################################',
      '##################################',
      '#MMM.............M..........IMMMM#',
      '#M...Y.........................M.#',
      '#..............MM.........Q......#',
      '#..............M.................#',
      'a..............M.................b',
      '#..............MM................#',
      '#...........Q...M................#',
      '#MI.............M...............M#',
      '#MM..............M.............MM#',
      '#MMMV.......OO...........OO..VMMM#',
      '##################################',
    ],
    /*
     * The moth gallery: a long hall of lanterns, and the moths that want them.
     *
     *    wall   lit           unlit           lit          unlit    wall
     *    > door     fallen logs down the hall           guard    > door
     *    moths at the far end, puffs on the way
     *
     * Two lanterns burn as he comes in, and the moths make for them at once:
     * catch them, or fight on in the dark and light them again after.
     */
    gallery: [
      '##################################',
      '##################################',
      '#MM::...........OO...........::MM#',
      '#M..........Y...........Q.......M#',
      '#.....Q.........................M#',
      '#.........FF.........FF..........#',
      'b................................c',
      '#............................Q...#',
      '#....FF.........FF..........FF...#',
      '#M:.............................M#',
      '#MM::.........OO..........V...:MM#',
      '#VMMM:::::MM::::::::MM:::::::MMMV#',
      '##################################',
    ],
    /*
     * The bramble run: open ground for bramble hounds to charge across.
     *
     *    wall   brambles      stones        brambles     wall
     *    > door     hound              hound           > door
     *    lanterns at the edges, where a charge can end at one
     *
     * Room to step out of a lane, and walls for a hound to stick in. A
     * lantern stood in front of is a lantern a hound may run into.
     */
    run: [
      '##################################',
      '##################################',
      '#UU................UU..........UU#',
      '#U....Y..........................#',
      '#.......................Q........#',
      '#..........V.............V.......#',
      'c................................d',
      '#.....V..........................#',
      '#..........Q.........V...........#',
      '#UX.............................U#',
      '#UU.................UU.......Q.UU#',
      '#UUUV.......UU.............UUVUUU#',
      '##################################',
    ],
    /*
     * The badger king's sett: the boss.
     *
     *    wall          his throne of roots (the end in front of it)       wall
     *    > door   lit        unlit                  unlit        lit
     *    unlit                                                  unlit
     *    his court comes in at the corners
     *
     * Six lanterns round a wide floor. He puts them out with his slam, comes
     * up out of the ground under the one lighting the hero, and calls his
     * court; the hero keeps lighting them.
     */
    sett: [
      '##################################',
      '##################################',
      '#MM........OO..JJJJ..OO........MM#',
      '#M.....Y......==x==.......Y.....M#',
      '#.........============...........#',
      '#........==Q===========Q==.......#',
      'd........================........#',
      '#........================........#',
      '#.....Q...==============...Q.....#',
      '#................................#',
      '#MM:::.Z..................Z.:::MM#',
      '#VMMM::....FF..........FF..::MMMV#',
      '##################################',
    ],
  },
  foes: {
    hollow: [
      { monster: 'spore_puff', at: { col: 22, row: 4 } },
      { monster: 'spore_puff', at: { col: 25, row: 8 } },
      { monster: 'spore_puff', at: { col: 29, row: 6 } },
    ],
    watch: [
      { monster: 'cap_guard', at: { col: 11, row: 5 } },
      { monster: 'cap_guard', at: { col: 21, row: 7 } },
      { monster: 'spore_puff', at: { col: 30, row: 3 } },
      { monster: 'spore_puff', at: { col: 30, row: 10 } },
    ],
    gallery: [
      { monster: 'lantern_moth', at: { col: 29, row: 4 } },
      { monster: 'lantern_moth', at: { col: 30, row: 9 } },
      { monster: 'spore_puff', at: { col: 14, row: 7 } },
      { monster: 'spore_puff', at: { col: 18, row: 4 } },
      { monster: 'cap_guard', at: { col: 26, row: 6 } },
    ],
    run: [
      { monster: 'bramble_hound', at: { col: 18, row: 4 } },
      { monster: 'bramble_hound', at: { col: 27, row: 8 } },
      { monster: 'lantern_moth', at: { col: 30, row: 5 } },
      { monster: 'spore_puff', at: { col: 15, row: 9 } },
    ],
    sett: [{ monster: 'badger_king', at: { col: 22, row: 4 } }],
  },
  spawns: {
    sett: [
      { col: 3, row: 9 },
      { col: 30, row: 9 },
    ],
  },
  titles: {
    hollow: 'The Root Hollow',
    watch: 'The Toadstool Watch',
    gallery: 'The Moth Gallery',
    run: 'The Bramble Run',
    sett: 'The Badger King’s Sett',
  },
};

/** What the Burrow's boss says as his fight turns (`SayLine`: his second phase, third, his fall). */
export const BADGER_SAYS: Partial<Record<SayLine, string>> = {
  tide: 'Court! To your king! And who lit all these?',
  anchor: 'ENOUGH. My burrow. My dark. My lanterns.',
  down: 'This is… most irregular.',
};
