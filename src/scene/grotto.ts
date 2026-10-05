/*
 * Brinebeard's Grotto: five rooms, drawn by hand, each using the tide its
 * own way. The key to the rows is in `ground.ts`; the tide's heights are in
 * `tide.ts` (a 1 is dry at low water, shallows at the first rise and under
 * after that; a 3 only ever gets its feet wet).
 *
 * The run goes pools -> store -> bridge -> brig -> cove. Every room bars its
 * doors while anything in it stands. Every room was drawn on paper first;
 * the sketch is above its rows, and `tests/scene/grotto.test.ts` checks that
 * nothing in it can strand the hero at any state of the tide.
 */
import type { DungeonPlan } from './dungeon';

export const GROTTO: DungeonPlan = {
  id: 'brinebeards_grotto',
  first: 'pools',
  rooms: {
    /*
     * The tide pools: the tide, taught with crabs.
     *
     *    cliff  ledge path round the channel's head (always dry)  cliff
     *    boat > beach   [ sandbar across the channel ]   beach, pools  > store
     *    sea          channel            channel              sea
     *
     * At low water the sandbar is the short way over; at the first rise it is
     * shallows (slow); after that it is gone and the way is the ledge along
     * the top. The crabs wait on the far side and come at you over the bar.
     */
    pools: [
      '######################################',
      '####L####.........###L####........####',
      '###::::.....................:::::...##',
      '##:::::::.....,,.....##.......:::::..#',
      '#::::::::::::,,,,::222~~~22:::::::::.#',
      '#::::::::::::::,,22221~~~~122:::,,:::#',
      '#:s::::::::::::::22211111112222:,,,::a',
      '#:::::::::::::::222111111111222:,,:::#',
      '#~::::::::::::::::2211111111222::::::#',
      '#~~::::::,,,::::::221~~~~~~122:::::::#',
      '#~~~::::::,,:::::2221~~~~~~1222:::22:#',
      '#~~~~:::::::::::22210~~~~~~0122::2112#',
      '#~~~~~~222222222221000~~~~0001222211~#',
      '######################################',
    ],
    /*
     * The smugglers' store: deckhands among crates and kegs, a powder monkey
     * at the back.
     *
     *    wall  lanterns                                   wall
     *    > plank deck with crates and kegs for cover           >
     *    sand floor below the deck, lower towards the inlet
     *    inlet  (the sea comes in here)
     *
     * The deck never floods. The sand below it goes to shallows as the tide
     * comes in: slow going, but a lit keg that lands in water goes out. Stand
     * in the wet to be safe from the kegs, and pay for it in speed.
     */
    store: [
      '####################################',
      '###L#######L########L########L######',
      '##===CC====KK=======CC====K====C==##',
      '#===C=========CC=======K=========C=#',
      '#=====K=====================KK=====#',
      'a=========CC=======CC==============b',
      '#===K===============C======C=======#',
      '#::::::::::=====:::::=====:::::::::#',
      '#:::33333::::::::::333333::::333:::#',
      '#::3333333333:::::333333333333333::#',
      '#:333322223333:::3332222222333222:3#',
      '#333222222222333332221112222222221:#',
      '#2222111111122222221100011111111100#',
      '##################~~~~##############',
    ],
    /*
     * The rope-bridge cavern: a narrow way over deep water, and a parrot.
     *
     *    wall    perch (rock in the water)        wall
     *    > bank  ======= rope bridge ========  bank >
     *    bank   sandbars ~~ perch ~~ sandbars   bank
     *
     * The bridge never floods, and at high water it is the only way. At low
     * water the sandbars below make a second way over, and walk you to
     * within a blade's reach of the parrot's lower perch; at any other tide
     * a blade has to wait for it to come down.
     */
    bridge: [
      '##########################################',
      '####L#####~~~~~~~~~~~~~~~~~~~~~~#####L####',
      '##.......#~~~~~~~~~~~~~~~~~~~~~~#.......##',
      '#........~~~~~~~~~~~~~~~~~~~~~~~~.......##',
      '#........~~~~~~~~~~~~~~~~~~~~~~~~........#',
      '#........~~~~~~~~~~~~~~~~~~~~~~~~........#',
      'b........========================........c',
      '#........========================........#',
      '#........~~~~~~~~~~~~~~~~~~~~~~~~........#',
      '#.......::1112222111~~~~111222211::......#',
      '#.......:0112222221100~~0112222221100:...#',
      '#......:00111222211100000011122222111000:#',
      '#.....~~~00011111110~~~~~~0011111110~~~~~#',
      '##########################################',
    ],
    /*
     * The brig: locked in. The doors bar as you come in, and the cells open
     * two at a time, the second pair when the first is dealt with.
     *
     *    cell B                   cell D
     *    > floor  ( grating: the sea wells up )  floor >
     *    cell D        cell B
     *
     * The tide comes up through the grating in the middle, so here high water
     * pushes the fight out to the walls instead of off a beach.
     */
    brig: [
      '##################################',
      '######...###############...#######',
      '######...###############...#######',
      '###L##BBB#######L#######DDD##L####',
      '#................................#',
      '#..........3333333333333.........#',
      'c.........332222111222233........d',
      '#.........332221000122233........#',
      '#..........3333322223333.........#',
      '#................................#',
      '###########DDD#####BBB############',
      '###########...#####...############',
      '###########...#####...############',
      '##################################',
    ],
    /*
     * The captain's cove: the boss.
     *
     *    cliff  cannon  cannon  chest  cannon  cannon  cliff
     *    > beach   [ the rock in the middle never floods ]   beach
     *    sand, lower and lower to the sea
     *
     * Its tide is his: the sea stays out while he fights in person, and when
     * he is two thirds beaten he calls it in, a level every few seconds, until
     * only the rock in the middle is dry.
     */
    cove: [
      '####################################',
      '####L###N#####N###T###N#####N###L###',
      '###:::............x............:::##',
      '#33::.............................3#',
      '#333::..........................:33#',
      'd333:::........................:333#',
      '#2333:::......................:3332#',
      '#22333::::..................::33322#',
      '#122233333::::::::::::::::333332221#',
      '#1112222333333333333333333332222111#',
      '#0011112222222222222222222222111100#',
      '#~~000111111111111111111111111000~~#',
      '#~~~~~000000000000000000000000~~~~~#',
      '####################################',
    ],
  },
  foes: {
    pools: [
      { monster: 'giant_crab', at: { col: 28, row: 7 } },
      { monster: 'giant_crab', at: { col: 33, row: 10 } },
    ],
    store: [
      { monster: 'deckhand', at: { col: 12, row: 4 } },
      { monster: 'deckhand', at: { col: 22, row: 6 } },
      { monster: 'powder_monkey', at: { col: 31, row: 3 } },
    ],
    bridge: [
      { monster: 'deckhand', at: { col: 30, row: 6 } },
      { monster: 'deckhand', at: { col: 35, row: 7 } },
      { monster: 'deckhand', at: { col: 36, row: 4 } },
      { monster: 'ships_parrot', at: { col: 20, row: 3 } },
    ],
    brig: [
      { monster: 'deckhand', at: { col: 7, row: 2 }, wave: 0 },
      { monster: 'deckhand', at: { col: 20, row: 11 }, wave: 0 },
      { monster: 'deckhand', at: { col: 25, row: 2 }, wave: 1 },
      { monster: 'powder_monkey', at: { col: 12, row: 11 }, wave: 1 },
    ],
    cove: [{ monster: 'brinebeard', at: { col: 24, row: 5 } }],
  },
  perches: {
    bridge: [
      { col: 20, row: 3 },
      { col: 22, row: 10 },
    ],
  },
  spawns: {
    cove: [
      { col: 7, row: 6 },
      { col: 29, row: 6 },
    ],
  },
  ownTide: ['cove'],
  stoneTide: ['brig'],
  titles: {
    pools: 'The Tide Pools',
    store: 'The Smugglers’ Store',
    bridge: 'The Rope Bridge',
    brig: 'The Brig',
    cove: 'The Captain’s Cove',
  },
};
