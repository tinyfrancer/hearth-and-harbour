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
}

export interface Content {
  skills: Readonly<Record<string, SkillDef>>;
  items: Readonly<Record<string, ItemDef>>;
  actions: Readonly<Record<string, ActionDef>>;
  /** Where to fight. Tables made for a test of something else may leave it out. */
  areas?: Readonly<Record<string, AreaDef>>;
  /** Who to fight there. Tables made for a test of something else may leave it out. */
  monsters?: Readonly<Record<string, MonsterDef>>;
}
