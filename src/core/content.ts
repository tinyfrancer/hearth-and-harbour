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

export interface Content {
  skills: Readonly<Record<string, SkillDef>>;
  items: Readonly<Record<string, ItemDef>>;
  actions: Readonly<Record<string, ActionDef>>;
}
