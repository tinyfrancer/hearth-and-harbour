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

/** A lasting thing from the store: no item, just a difference the rules make from then on. */
export interface PerkDef {
  name: string;
  description: string;
  /** Every potion drunk gives this many percent more charges, rounded down. */
  potionCharges?: number;
}

/**
 * A dungeon, as far as the idle rules know it: played in a scene (src/scene),
 * its clears kept in the save, and its loot listed in the collection log.
 */
export interface DungeonDef {
  id: string;
  name: string;
  /** Item ids it can give up, in the order the collection log lists them. */
  loot: readonly string[];
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
  /** `count` of these items in the collection log (all of them if left out). */
  | { kind: 'found'; items: readonly string[]; count?: number }
  /** So many different things in the collection log, of those the tables hold. */
  | { kind: 'collected'; count: number }
  /** Kills of a monster, or of any monster at all, in the bestiary. */
  | { kind: 'kills'; count: number; monster?: string }
  /** Every one of these worn at once. */
  | { kind: 'worn'; items: readonly string[] }
  /** Clears of a dungeon. */
  | { kind: 'cleared'; dungeon: string; count?: number }
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
  /** Things to have done, in the order the page lists them. */
  achievements?: Readonly<Record<string, AchievementDef>>;
}
