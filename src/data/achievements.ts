import type { AchievementDef } from '../core/content';

type Row = Omit<AchievementDef, 'id'>;

const LOGS = ['pine_logs', 'oak_logs', 'willow_logs'];
const FISH = ['raw_shrimp', 'raw_herring', 'raw_cod'];
const ORES = ['copper_ore', 'tin_ore', 'iron_ore'];
const FINDS = ['seashells', 'flax', 'sageleaf', 'glowcap'];
const MEALS = ['cooked_shrimp', 'cooked_herring', 'cooked_cod'];
const BARS = ['bronze_bar', 'iron_bar'];
/** What a monster gives up rarely and nothing else gives at all. */
const PRIZES = ['smugglers_cutlass', 'trollstone', 'poachers_longbow', 'wyrmscale_shield'];

// The first set, across everything that exists: the first of each kind of
// thing (a skill's firsts are for doing the skill, `made`, never for owning
// what it gives: a sand crab's shells are not foraging), levels, mastery, fighting, thieving, bounties, potions, gear, the
// store, the collection log, the Tidepool Cave and the grotto. In the order the page lists them.
// Nothing is given for them yet; the house (S18) will give them a wall.
const ROWS: Record<string, Row> = {
  first_log: {
    name: 'Timber!',
    text: 'Cut your first log.',
    rule: { kind: 'made', items: LOGS },
  },
  first_catch: {
    name: 'A Bite',
    text: 'Catch your first fish.',
    rule: { kind: 'made', items: FISH },
  },
  first_ore: {
    name: 'Rock Bottom',
    text: 'Mine your first ore.',
    rule: { kind: 'made', items: ORES },
  },
  first_find: {
    name: 'Beachcomber',
    text: 'Forage your first find.',
    rule: { kind: 'made', items: FINDS },
  },
  first_meal: {
    name: 'Hot Dinner',
    text: 'Cook your first fish.',
    rule: { kind: 'made', items: MEALS },
  },
  first_bar: {
    name: 'Smelted',
    text: 'Smelt your first bar.',
    rule: { kind: 'made', items: BARS },
  },
  first_kill: {
    name: 'Pest Control',
    text: 'Win your first fight.',
    rule: { kind: 'kills', count: 1 },
  },
  first_theft: {
    name: 'Light Fingers',
    text: 'Pick your first pocket.',
    rule: { kind: 'thefts', count: 1 },
  },
  first_bounty: {
    name: 'Paid in Full',
    text: 'Hand in your first bounty.',
    rule: { kind: 'stat', stat: 'bounties', count: 1 },
  },
  first_potion: {
    name: 'Bottoms Up',
    text: 'Drink your first potion.',
    rule: { kind: 'stat', stat: 'potions', count: 1 },
  },
  first_purchase: {
    name: 'Valued Customer',
    text: 'Buy something from the general store.',
    rule: { kind: 'stat', stat: 'bought', count: 1 },
  },
  level_10: {
    name: 'Finding Your Feet',
    text: 'Reach level 10 in any skill.',
    rule: { kind: 'level', level: 10 },
  },
  level_20: {
    name: 'Old Hand',
    text: 'Reach level 20 in any skill.',
    rule: { kind: 'level', level: 20 },
  },
  gathering_20: {
    name: 'Salt of the Earth',
    text: 'Reach level 20 in every gathering skill.',
    rule: { kind: 'level', level: 20, group: 'Gathering', all: true },
  },
  total_100: {
    name: 'Jack of All Trades',
    text: 'Reach a total level of 100.',
    rule: { kind: 'total', level: 100 },
  },
  total_200: {
    name: 'Pillar of the Community',
    text: 'Reach a total level of 200.',
    rule: { kind: 'total', level: 200 },
  },
  mastery_10: {
    name: 'Practice Makes Perfect',
    text: 'Reach mastery 10 at anything.',
    rule: { kind: 'mastery', level: 10 },
  },
  mastery_20: {
    name: 'Could Do It Asleep',
    text: 'Reach mastery 20 at anything.',
    rule: { kind: 'mastery', level: 20 },
  },
  rats_100: {
    name: 'Rat Catcher',
    text: 'Defeat a hundred dock rats.',
    rule: { kind: 'kills', monster: 'dock_rat', count: 100 },
  },
  rare_prize: {
    name: 'Worth the Trip',
    text: 'Take a monster’s rarest prize.',
    rule: { kind: 'found', items: PRIZES, count: 1 },
  },
  full_iron: {
    name: 'Ironclad',
    text: 'Wear an iron helmet, breastplate, shield and sword at once.',
    rule: { kind: 'worn', items: ['iron_helmet', 'iron_breastplate', 'iron_shield', 'iron_sword'] },
  },
  full_leather: {
    name: 'Greenwood',
    text: 'Wear a leather cap, jerkin and bracers at once.',
    rule: { kind: 'worn', items: ['leather_cap', 'leather_jerkin', 'leather_bracers'] },
  },
  bounty_streak: {
    name: 'On a Roll',
    text: 'Hand in five bounties in a row without giving one up.',
    rule: { kind: 'stat', stat: 'bestStreak', count: 5 },
  },
  caught_50: {
    name: 'Caught Red-Handed',
    text: 'Get caught fifty times.',
    hidden: true,
    rule: { kind: 'thefts', count: 50, caught: true },
  },
  coins_100k: {
    name: 'Well Heeled',
    text: 'Hold 100,000 coins at once.',
    rule: { kind: 'coins', amount: 100_000 },
  },
  collection_50: {
    name: 'Magpie',
    text: 'Find fifty different things for the collection log.',
    rule: { kind: 'collected', count: 50 },
  },
  cave_cleared: {
    name: 'Sea Legs',
    text: 'Clear the Tidepool Cave.',
    rule: { kind: 'cleared', dungeon: 'tidepool_cave' },
  },
  // Out of reach bare-handed (two and a half minutes at best on wave 16's
  // numbers); with the first clear's bronze sword, lane C's scripted player
  // takes 59 to 83 s with no lessons, so it asks for clean play on a return
  // visit (tests/scene/caveRun.test.ts holds the median under it).
  cave_quick: {
    name: 'Quick Study',
    text: 'Clear the Tidepool Cave in under a minute and a half.',
    rule: { kind: 'cleared', dungeon: 'tidepool_cave', withinMs: 90_000 },
  },
  // S16: going back. Clears by hand, the "no damage" clear (now that a run
  // reports what it took), every challenge, every kind of day, and runs idle.
  cave_10: {
    name: 'Regular',
    text: 'Clear the Tidepool Cave ten times.',
    rule: { kind: 'cleared', dungeon: 'tidepool_cave', count: 10 },
  },
  cave_50: {
    name: 'Part of the Furniture',
    text: 'Clear the Tidepool Cave fifty times.',
    rule: { kind: 'cleared', dungeon: 'tidepool_cave', count: 50 },
  },
  cave_untouched: {
    name: 'Not a Scratch',
    text: 'Clear the Tidepool Cave without taking a single point of damage.',
    rule: { kind: 'cleared', dungeon: 'tidepool_cave', damageAtMost: 0 },
  },
  cave_challenges: {
    name: 'Top of the Class',
    text: 'Meet every one of the Tidepool Cave’s challenges.',
    rule: { kind: 'challenges', dungeon: 'tidepool_cave' },
  },
  cave_weathers: {
    name: 'Fair Weather Sailor',
    text: 'Clear the Tidepool Cave on each of its kinds of day.',
    rule: { kind: 'underModifiers', dungeon: 'tidepool_cave' },
  },
  grotto_cleared: {
    name: 'Low Tide',
    text: 'Clear Brinebeard’s Grotto.',
    rule: { kind: 'cleared', dungeon: 'brinebeards_grotto' },
  },
  grotto_10: {
    name: 'Old Salt',
    text: 'Clear Brinebeard’s Grotto ten times.',
    rule: { kind: 'cleared', dungeon: 'brinebeards_grotto', count: 10 },
  },
  grotto_50: {
    name: 'Scourge of the Grotto',
    text: 'Clear Brinebeard’s Grotto fifty times.',
    rule: { kind: 'cleared', dungeon: 'brinebeards_grotto', count: 50 },
  },
  grotto_challenges: {
    name: 'Shipshape',
    text: 'Meet every one of Brinebeard’s Grotto’s challenges.',
    rule: { kind: 'challenges', dungeon: 'brinebeards_grotto' },
  },
  grotto_weathers: {
    name: 'All Weathers',
    text: 'Clear Brinebeard’s Grotto on each of its six kinds of day.',
    rule: { kind: 'underModifiers', dungeon: 'brinebeards_grotto' },
  },
  // Wave 20: Thistlewood Burrow, as the grotto's: the first clear, going back,
  // every challenge, and every kind of day.
  burrow_cleared: {
    name: 'Lights Out',
    text: 'Clear Thistlewood Burrow.',
    rule: { kind: 'cleared', dungeon: 'thistlewood_burrow' },
  },
  burrow_10: {
    name: 'Knows Every Tunnel',
    text: 'Clear Thistlewood Burrow ten times.',
    rule: { kind: 'cleared', dungeon: 'thistlewood_burrow', count: 10 },
  },
  burrow_challenges: {
    name: 'By Royal Appointment',
    text: 'Meet every one of Thistlewood Burrow’s challenges.',
    rule: { kind: 'challenges', dungeon: 'thistlewood_burrow' },
  },
  burrow_weathers: {
    name: 'Rain or Spores',
    text: 'Clear Thistlewood Burrow on each of its five kinds of day.',
    rule: { kind: 'underModifiers', dungeon: 'thistlewood_burrow' },
  },
  idle_1: {
    name: 'Sent Ahead',
    text: 'Finish a dungeon run idle.',
    rule: { kind: 'idleRuns', count: 1 },
  },
  idle_100: {
    name: 'Knows the Way Blindfold',
    text: 'Finish a hundred dungeon runs idle.',
    rule: { kind: 'idleRuns', count: 100 },
  },
  // Tier 2 (S22), in the same style: firsts by doing, sets worn, levels, a hunt, a rare find.
  deep_water: {
    name: 'Deep Water',
    text: 'Catch a fish from the deep water past the grotto.',
    rule: { kind: 'made', items: ['raw_mackerel', 'raw_halibut', 'raw_swordfish'] },
  },
  salt_iron: {
    name: 'Salt in the Blood',
    text: 'Smelt a bar of salt-iron.',
    rule: { kind: 'made', items: ['salt_iron_bar'] },
  },
  knight: {
    name: 'Arise',
    text: 'Wear the salt-iron helm, plate, greaves, kite shield and longsword, and the red cloak, all at once.',
    rule: {
      kind: 'worn',
      items: [
        'salt_iron_helm',
        'salt_iron_plate',
        'salt_iron_greaves',
        'salt_iron_shield',
        'salt_iron_sword',
        'red_cloak',
      ],
    },
  },
  ranger: {
    name: 'Into the Green',
    text: 'Wear the ranger’s hood, bracers and coat at once.',
    rule: { kind: 'worn', items: ['ranger_hood', 'ranger_bracers', 'ranger_coat'] },
  },
  level_40: {
    name: 'Over the Hill',
    text: 'Reach level 40 in any skill.',
    rule: { kind: 'level', level: 40 },
  },
  gathering_40: {
    name: 'Shore to Forest',
    text: 'Reach level 40 in every gathering skill.',
    rule: { kind: 'level', level: 40, group: 'Gathering', all: true },
  },
  ogres_25: {
    name: 'The Bigger They Are',
    text: 'Fell twenty-five hill ogres.',
    rule: { kind: 'kills', count: 25, monster: 'hill_ogre' },
  },
  maul: {
    name: 'Most of a Tree',
    text: 'Find an ogre’s maul.',
    hidden: true,
    rule: { kind: 'found', items: ['ogre_maul'] },
  },
  doubloon: {
    name: 'Pieces of Eight',
    text: 'Find a doubloon.',
    hidden: true,
    rule: { kind: 'found', items: ['doubloon'] },
  },
  anchor: {
    name: 'Dead Weight',
    text: 'Find Brinebeard’s anchor.',
    hidden: true,
    rule: { kind: 'found', items: ['brinebeards_anchor'] },
  },
};

export const ACHIEVEMENTS: Record<string, AchievementDef> = Object.fromEntries(
  Object.entries(ROWS).map(([id, row]) => [id, { id, ...row }]),
);
