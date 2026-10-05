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
// thing, levels, mastery, fighting, thieving, bounties, potions, gear, the
// store, the collection log and the grotto. In the order the page lists them.
// Nothing is given for them yet; the house (S18) will give them a wall.
const ROWS: Record<string, Row> = {
  first_log: {
    name: 'Timber!',
    text: 'Cut your first log.',
    rule: { kind: 'found', items: LOGS, count: 1 },
  },
  first_catch: {
    name: 'A Bite',
    text: 'Catch your first fish.',
    rule: { kind: 'found', items: FISH, count: 1 },
  },
  first_ore: {
    name: 'Rock Bottom',
    text: 'Mine your first ore.',
    rule: { kind: 'found', items: ORES, count: 1 },
  },
  first_find: {
    name: 'Beachcomber',
    text: 'Forage your first find.',
    rule: { kind: 'found', items: FINDS, count: 1 },
  },
  first_meal: {
    name: 'Hot Dinner',
    text: 'Cook your first fish.',
    rule: { kind: 'found', items: MEALS, count: 1 },
  },
  first_bar: {
    name: 'Smelted',
    text: 'Smelt your first bar.',
    rule: { kind: 'found', items: BARS, count: 1 },
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
    text: 'Hand in five bounties in a row without a swap.',
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
  grotto_cleared: {
    name: 'Low Tide',
    text: 'Clear Brinebeard’s Grotto.',
    rule: { kind: 'cleared', dungeon: 'brinebeards_grotto' },
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
