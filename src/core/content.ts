import type { StatId } from './state';

/**
 * The shape of the game's tables. Core defines the shapes and the rules that
 * read them; `src/data/` fills them in. Rules take the tables as an argument,
 * so core imports nothing and tests can run on tables of their own.
 */
export interface SkillDef {
  id: string;
  name: string;
  /** The doing word for an action of this skill: "Chopping". */
  verb: string;
  /** The heading the Skills tab lists it under: "Gathering". Groups appear in table order. */
  group: string;
  /**
   * What the hero is drawn doing while an action of this skill runs (or, for
   * a combat skill, while fighting in its style): an id of the art's loops of
   * the hero at work. Named here, in the tables, so the menus never guess it
   * from a skill's name. Left out, the hero stands and breathes.
   */
  activity?: string;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  /** Coins for selling one. */
  value: number;
  /** What drinking one does, for an item that is a potion. */
  potion?: PotionDef;
  /** Where it is worn and what it gives, for an item that can be worn or wielded. */
  equip?: EquipDef;
  /** Hit points one restores, for something that can go in the food slot and be eaten. */
  heals?: number;
}

/** Where the character wears things, in the order the character sheet lists them. */
export const SLOTS = [
  'head',
  'body',
  'legs',
  'main_hand',
  'off_hand',
  'neck',
  'wrist',
  'ammo',
] as const;
export type Slot = (typeof SLOTS)[number];

/** How the character fights: decided by the weapon in the main hand, and melee without one. */
export type CombatStyle = 'melee' | 'ranged';

/**
 * What wearing an item does. The numbers are the three totals combat reads,
 * and each defaults to nothing. With a `style`, an item's attack and strength
 * count only while the character fights that way: a bow's and an arrow's are
 * ranged attack and ranged strength, a sword's are melee. Armour always counts.
 */
export interface EquipDef {
  slot: Slot;
  /** Held in both hands: wielding it empties the off hand. Only for the main hand. */
  twoHanded?: boolean;
  /** For a weapon, how it fights; for anything else, the style its numbers belong to. */
  style?: CombatStyle;
  attack?: number;
  strength?: number;
  armour?: number;
  /**
   * The level needed to put it on. Checked only when it is put on: whatever
   * a character already wears stays worn.
   */
  requires?: { skill: string; level: number };
}

/**
 * What a potion does to each completion it lasts for. Every kind is a whole
 * number per completion, so there is never a fraction left over for time cut
 * up differently to round another way.
 */
export type PotionEffect =
  /** This much more skill XP per completion, in percent, rounded once per completion. */
  | { kind: 'xp'; percent: number }
  /** Completions this much quicker, in percent, rounded to whole milliseconds. */
  | { kind: 'speed'; percent: number }
  /** A completion's items over again on the completion that uses every Nth charge. */
  | { kind: 'extra'; every: number };

/**
 * A potion lasts a number of completions, not a length of time: drinking one
 * gives `charges`, each completion of an action it helps uses one, and it ends
 * on the completion that uses the last. Counted that way it changes only on a
 * completion, as `advance` needs, so an hour away spends exactly what an hour
 * of play would.
 */
export interface PotionDef {
  charges: number;
  /** The skills whose actions it helps, by skill id. */
  skills: readonly string[];
  effect: PotionEffect;
}

/** One repeatable thing to do: the row format every idle skill is written in. */
export interface ActionDef {
  id: string;
  skill: string;
  name: string;
  /** Skill level needed to start it. */
  level: number;
  /** How long one completion takes. */
  durationMs: number;
  /** Skill XP per completion. */
  xp: number;
  /**
   * What each completion takes from the bank. An action that cannot pay for
   * its next completion stops, live or away.
   */
  uses?: readonly { item: string; qty: number }[];
  /** What each completion puts in the bank. */
  gives: readonly { item: string; qty: number }[];
  /**
   * The heading it is listed under on a skill page with many actions
   * ("Bronze"). Groups appear in table order.
   */
  group?: string;
  /**
   * For a theft: an attempt on a mark, which works by chance instead of
   * always (src/core/thieving.ts). Its `gives` is empty, its `xp` is paid for
   * a success only, and mastery of the mark makes success likelier instead
   * of making attempts quicker. Potions do not help it.
   */
  steal?: StealDef;
}

/**
 * A mark: someone (or something) to rob. An attempt takes the action's
 * `durationMs`; it succeeds with a chance set by the thief's rating against
 * `difficulty`, and pays coins and maybe something from `loot`. Failure is
 * being caught: a stun of `stunMs` in which nothing happens, and no other cost.
 */
export interface StealDef {
  description: string;
  difficulty: number;
  stunMs: number;
  /** Coins every success pays, from the first number to the second. */
  coins: readonly [number, number];
  /** What a success may also bring: each rolled on its own, one chance in `oneIn`. */
  loot: readonly (DropDef & { oneIn: number })[];
}

/** Somewhere to fight, holding the monsters whose `area` names it. Listed in table order. */
export interface AreaDef {
  id: string;
  name: string;
  description: string;
}

/** Something a monster leaves behind: between `min` and `max` of an item, each equally likely. */
export interface DropDef {
  item: string;
  min: number;
  max: number;
}

/**
 * A monster, as numbers on the same scale as the character's (src/core/combat.ts):
 * `attack` against the character's defence rating, `defence` against the
 * character's attack rating, and blows of 1 to `maxHit` every `speedMs`.
 */
export interface MonsterDef {
  id: string;
  name: string;
  description: string;
  /** The AreaDef it is found in. */
  area: string;
  /** Its combat level, to show beside it: roughly the level a character should be to take it on. */
  level: number;
  hp: number;
  attack: number;
  defence: number;
  maxHit: number;
  speedMs: number;
  /** Coins every kill drops, from the first number to the second. */
  coins: readonly [number, number];
  /** What every kill drops. */
  always: readonly DropDef[];
  /** What a kill may drop: each rolled on its own, one chance in `oneIn`. */
  rare: readonly (DropDef & { oneIn: number })[];
  /**
   * What the notice board asks for this monster (src/core/bounty.ts): between
   * the two numbers of kills, and the bounty points it pays. A monster
   * without one is never posted.
   */
  bounty?: BountyDef;
  /** Only to be fought while the bounty held names it. */
  bountyOnly?: boolean;
}

export interface BountyDef {
  kills: readonly [number, number];
  points: number;
}

/** Something the bounty shop sells for points: `qty` of an item at a time. */
export interface ShopEntry {
  id: string;
  item: string;
  qty: number;
  /** Bounty points. */
  cost: number;
  /** Sold only to a character who holds none, in the bank or worn. */
  once?: boolean;
}

/**
 * Something the general store sells for coins: either `qty` of an item at a
 * time, or a lasting `perk` that is bought once and kept.
 */
export type StoreEntry = { id: string; price: number } & (
  | {
      item: string;
      qty: number;
      /** Sold only to a character who holds none, in the bank or worn. */
      once?: boolean;
      perk?: undefined;
    }
  | { perk: PerkDef; item?: undefined; qty?: undefined; once?: undefined }
);

/**
 * The screens that show the lasting things owned that change them, by name:
 * the potion panel and a potion's card in the bank are `potions`. A new place
 * is a screen calling `perksFor` (src/core/store.ts) with its name.
 */
export type PerkPlace = 'potions';

/** A lasting thing from the store: no item, just a difference the rules make from then on. */
export interface PerkDef {
  name: string;
  /** What it is, in a line of flavour. */
  description: string;
  /**
   * What owning it does, plainly and in numbers, for the store and for every
   * place it shows: "Every potion you drink helps 50% more actions".
   */
  effect: string;
  /** Where it is shown once owned, beside what it changes. */
  shows: readonly PerkPlace[];
  /** Every potion drunk gives this many percent more charges, rounded down. */
  potionCharges?: number;
}

/**
 * A dungeon, as far as the idle rules know it: played in a scene (src/scene),
 * its clears kept in the save, and its loot listed in the collection log.
 */
export interface DungeonDef {
  id: string;
  /** Its name. Never shown while it is `comingSoon`. */
  name: string;
  /** What it is, in a line, for the harbour chart and the menus. */
  description: string;
  /** Its place on the harbour chart and in the menus' lists, from the first (1). */
  order: number;
  /** The combat level it is meant for (src/core/bounty.ts `combatLevel`): advice, never a gate. */
  recommended: number;
  /** What has to be done before the boat will take you there. */
  unlock: DungeonUnlock;
  /**
   * What unlocks it, in a line for the player: "Clear the Tidepool Cave."
   * Shown beside a locked landing; for one open from the start, says so.
   */
  unlockText: string;
  /**
   * A landing on the chart with nothing there yet: shown as a silhouette with
   * what will unlock it, its name and everything else kept back. It is never
   * open, its clears never count, and it has no loot or cast.
   */
  comingSoon?: boolean;
  /**
   * Paid into the bank once, by the run that first clears it (`settleRun`),
   * on top of whatever that run picked up.
   */
  firstClear?: readonly { item: string; qty: number }[];
  /** Item ids it can give up, in the order the collection log lists them. */
  loot: readonly string[];
  /**
   * Who is fought in it, by the ids its scene reports kills by, in the order
   * they are listed, with their numbers. Their kills are kept like any
   * monster's, and the bestiary shows their level and drops; nothing idle
   * fights them or posts a bounty on them.
   *
   * A row may share its id with a table monster (the cave's dock rats): it is
   * the same creature, met somewhere else. Its numbers here are how it fights
   * in this dungeon only; its kills, drops seen and bounty count go to the one
   * bestiary entry under that id, and the tables' row is the one the bestiary
   * shows (`foeRow`). Its drops should be among the table row's, so what it is
   * seen to drop is kept.
   */
  cast?: readonly DungeonFoe[];
  /**
   * Optional goals for a run, each paid once, the first time a clear meets it
   * (`settleRun`). Ids are `<dungeon>.<slug>` and never change: the save keeps
   * the ones done by id.
   */
  challenges?: readonly ChallengeDef[];
  /**
   * The modifiers its days are drawn from (`DUNGEON_MODIFIERS` ids), each in
   * turn in an order that is shuffled afresh each time round
   * (`dailyModifier`, src/core/progress.ts). Left out or empty, it has none.
   */
  modifiers?: readonly string[];
  /**
   * The tier of idle content its first clear opens (`tierUnlocked`), and what
   * that tier will bring, in a line for the menus while it has not come yet.
   */
  opens?: { tier: number; brings: string };
  /**
   * How the hero runs it unattended once it has been cleared by hand
   * (src/core/idleRun.ts). Left out, it cannot be run idle.
   */
  idle?: IdleDungeonDef;
}

/**
 * A dungeon as the idle game runs it: its rooms as encounters in order (who
 * is met together, from the dungeon's own `cast`, and the walk to them), the
 * trip home and back between runs, and how much of what falls is kept.
 */
export interface IdleDungeonDef {
  rooms: readonly IdleRoomDef[];
  /** Rowing home and back between runs, in milliseconds. The hero heals meanwhile. */
  tripMs: number;
  /** The chance, in percent, of each drop (and of each coin) being kept: idle is never the best way. */
  lootPercent: number;
  /** Items only ever found by hand (trophies, the rarest things): never dropped idle. */
  activeOnly?: readonly string[];
}

export interface IdleRoomDef {
  /** Cast ids, met together, struck in this order. */
  foes: readonly string[];
  /** Walking to them from where the last room was cleared (or from the boat), in milliseconds. */
  walkMs: number;
}

/**
 * What a hand-played run reports of how it went (lane C fills it as the run
 * goes). Every field is to be filled for a new run; a reader treats any that
 * is missing (an older snapshot) as not known, never as nothing, so a
 * challenge that reads it is not met by it (`challengeMet`).
 */
export interface RunStats {
  /** How long the run took, in milliseconds. */
  timeMs: number;
  /** Hit points lost to blows, all told (before anything eaten put them back). */
  damageTaken: number;
  /** Everything eaten in the run: from the food slot, and anything found on the way. */
  foodEaten: number;
  /** Heavy blows met with a brace. */
  braces: number;
  /** Heavy blows stepped out of. */
  stepOuts: number;
  /** Whether the run ended with the hero knocked out. */
  knockedOut: boolean;
  /** Foes felled, all told. */
  kills: number;
}

/** The numbers of a run's statistics, for a challenge to set a bound on. */
export type RunStatId = 'timeMs' | 'damageTaken' | 'foodEaten' | 'braces' | 'stepOuts' | 'kills';

/**
 * What a challenge asks of a clear, as plain data both lanes read with one
 * rule (`challengeMet`), never code per challenge. A closed set:
 * - `atMost`: a statistic no higher than `n` (in seven minutes or less; no
 *   food: `foodEaten` at most 0; no brace: `braces` at most 0).
 * - `atLeast`: a statistic at least `n` (brace a heavy blow: `braces` at least 1).
 * - `withModifier`: cleared on a day with that modifier, or with any if `id`
 *   is left out.
 * Every kind is met only by a clear, and never by a statistic not reported.
 */
export type ChallengeRule =
  | { kind: 'atMost'; stat: RunStatId; n: number }
  | { kind: 'atLeast'; stat: RunStatId; n: number }
  | { kind: 'withModifier'; id?: string };

/** What a challenge pays, once: coins, bounty points and things into the bank. */
export interface ChallengeReward {
  coins?: number;
  bountyPoints?: number;
  items?: readonly { item: string; qty: number }[];
}

export interface ChallengeDef {
  /** `<dungeon>.<slug>`: kept in the save, so never changed. */
  id: string;
  name: string;
  /** What it asks, in a line for the player. */
  text: string;
  rule: ChallengeRule;
  reward: ChallengeReward;
}

/**
 * What a day's modifier does, as a closed set of plain numbers and flags a
 * run applies the same way whoever plays it (the scene by hand, the idle
 * game unattended). Each number is a multiplier; left out, it is 1.
 *
 * Applied by the fight, scene and idle alike (`foeUnder`, `heroMaxHitUnder`):
 * - `foeHealth`: foes' hit points, rounded, at least 1.
 * - `foeDamage`: foes' max hit (so their heavy blows, made of it, too), rounded, at least 1.
 * - `foeSpeed`: foes strike this many times as often (every wait divided by it), rounded.
 * - `heroDamage`: the hero's max hit, rounded, at least 1.
 * - `foodHeals`: what each thing eaten heals, rounded, at least 1 (`foodUnder`), from the food
 *   slot or found. A scene that does not know it yet eats as on a plain day.
 * - `noFood`: nothing is eaten, from the food slot or found. (Wave 17's No Rations; no
 *   dungeon draws it since wave 18, as a dungeon balanced on eating cannot be cleared
 *   without. Kept so a scene that honours it still does.)
 * Applied by the scene alone (the idle game has no tide and no lamps):
 * - `tideFaster`: the tide's cycle runs this many times as fast (a dungeon with a tide).
 * - `darker`: the rooms are lit less; how much is the scene's to say. No number changes.
 * Paid when the run is settled (`settleRun`; the idle game as it goes), never by the scene:
 * - `loot`: the run's regular drops (things some foe of that dungeon drops
 *   on every kill: doubloons, shells) count this many times over, rounded.
 * - `coins`, `xp`: the run's coins and each skill's XP, rounded.
 *
 * A modifier on a dungeon meant for learning is `kind`: easier, or a reward
 * with no catch. Every other one is a trade: harder, and paid for it. A hero
 * sent through idle takes a kind day as it comes and plays a trade day plain,
 * catch and bonus both left out (`idleModifier`, src/core/progress.ts).
 */
export interface ModifierEffects {
  foeHealth?: number;
  foeDamage?: number;
  foeSpeed?: number;
  heroDamage?: number;
  foodHeals?: number;
  noFood?: true;
  tideFaster?: number;
  darker?: true;
  loot?: number;
  coins?: number;
  xp?: number;
}

export interface ModifierDef {
  id: string;
  name: string;
  /** A line of flavour; the plain effect is worded from `effects` (`effectWords`). */
  text: string;
  effects: ModifierEffects;
  /** Only easier, never harder: the only kind a learning dungeon draws. */
  kind?: true;
}

/**
 * What opens a dungeon: nothing (open from the start), a combat level, or a
 * first clear of another dungeon.
 */
export type DungeonUnlock =
  { kind: 'none' } | { kind: 'combat'; level: number } | { kind: 'cleared'; dungeon: string };

/** One of several things, or none: rolled once a kill, one chance in `oneIn` that it is any. */
export interface PickDrop {
  readonly items: readonly string[];
  readonly oneIn: number;
}

/**
 * One of a dungeon's cast: a monster's row in the tables' own shape (so the
 * combat formulas work on it unchanged), less what only the idle game uses
 * (an area, a bounty), plus a drop that is one thing or another.
 */
export interface DungeonFoe extends Omit<MonsterDef, 'area' | 'bounty' | 'bountyOnly'> {
  readonly pick?: PickDrop;
}

/**
 * Something to have done. Earned the moment the state shows it (src/core/
 * achievements.ts), live or on return, and kept for good.
 */
export interface AchievementDef {
  id: string;
  name: string;
  /** What it asks, in a line. A hidden one shows it only once earned. */
  text: string;
  hidden?: boolean;
  rule: AchievementRule;
}

/** What an achievement asks of the state, read the same way every time. */
export type AchievementRule =
  /**
   * A skill at a level: the one named, or any of a group's, or any at all;
   * with `all`, every one of them.
   */
  | { kind: 'level'; level: number; skill?: string; group?: string; all?: boolean }
  /** Levels of every skill in the tables, added up. */
  | { kind: 'total'; level: number }
  /** Mastery of any one action at a level. */
  | { kind: 'mastery'; level: number }
  /**
   * `count` of these items in the collection log (all of them if left out):
   * for owning a thing, however it came. A skill's own firsts are `made`.
   */
  | { kind: 'found'; items: readonly string[]; count?: number }
  /**
   * Done, by the character's own hand, an action that gives one of these
   * items: read from mastery, which only doing an action earns, so a sand
   * crab's shells or a fish bought from the store do not count as foraging
   * or cooking. A theft is never one (its loot is chance, not what it gives).
   */
  | { kind: 'made'; items: readonly string[] }
  /** So many different things in the collection log, of those the tables hold. */
  | { kind: 'collected'; count: number }
  /** Kills of a monster, or of any monster at all, in the bestiary. */
  | { kind: 'kills'; count: number; monster?: string }
  /** Every one of these worn at once. */
  | { kind: 'worn'; items: readonly string[] }
  /**
   * Clears of a dungeon by hand; with `withinMs`, a best time under it
   * (`DungeonRecord.bestMs`); with `damageAtMost`, a clear that took no more
   * damage than that (`DungeonRecord.leastDamage`).
   */
  | { kind: 'cleared'; dungeon: string; count?: number; withinMs?: number; damageAtMost?: number }
  /** Every one of a dungeon's challenges done. */
  | { kind: 'challenges'; dungeon: string }
  /**
   * A dungeon cleared by hand under so many of its modifiers, each counted
   * once (every one it draws from, if `count` is left out).
   */
  | { kind: 'underModifiers'; dungeon: string; count?: number }
  /** Runs finished idle, in one dungeon or in all of them together. */
  | { kind: 'idleRuns'; count: number; dungeon?: string }
  /** Coins in hand at once. */
  | { kind: 'coins'; amount: number }
  /** Pockets picked, or times caught, at all marks together. */
  | { kind: 'thefts'; count: number; caught?: boolean }
  /** One of the running counts (`GameState.stats`) at least this high. */
  | { kind: 'stat'; stat: StatId; count: number };

export interface Content {
  skills: Readonly<Record<string, SkillDef>>;
  items: Readonly<Record<string, ItemDef>>;
  actions: Readonly<Record<string, ActionDef>>;
  /** Where to fight. Tables made for a test of something else may leave it out. */
  areas?: Readonly<Record<string, AreaDef>>;
  /** Who to fight there. Tables made for a test of something else may leave it out. */
  monsters?: Readonly<Record<string, MonsterDef>>;
  /** What bounty points buy, in the order the shop lists it. */
  shop?: Readonly<Record<string, ShopEntry>>;
  /** What the general store sells for coins, in the order it lists it. */
  store?: Readonly<Record<string, StoreEntry>>;
  /** The dungeons scenes run, as far as the rules need them. */
  dungeons?: Readonly<Record<string, DungeonDef>>;
  /** What a day can do to a dungeon (`DungeonDef.modifiers` names which a dungeon draws). */
  modifiers?: Readonly<Record<string, ModifierDef>>;
  /** Things to have done, in the order the page lists them. */
  achievements?: Readonly<Record<string, AchievementDef>>;
}
