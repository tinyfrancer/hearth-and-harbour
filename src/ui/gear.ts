import type { CombatStyle, EquipDef, Slot } from '../core/content';

/** What each slot is called on the character sheet. */
export const SLOT_NAMES: Readonly<Record<Slot, string>> = {
  head: 'Head',
  body: 'Body',
  legs: 'Legs',
  main_hand: 'Main hand',
  off_hand: 'Off hand',
  neck: 'Neck',
  wrist: 'Wrist',
  ammo: 'Ammunition',
};

const STYLE_NAMES: Readonly<Record<CombatStyle, string>> = { melee: 'Melee', ranged: 'Ranged' };

/** "Melee attack", "Ranged strength", "Attack": a total's name in the style it counts for. */
export function statName(stat: 'attack' | 'strength', style?: CombatStyle): string {
  return style ? `${STYLE_NAMES[style]} ${stat}` : stat === 'attack' ? 'Attack' : 'Strength';
}

/** What wearing a thing gives, in a few words: "Melee attack +6, Melee strength +5". */
export function gearText(def: EquipDef): string {
  const parts: string[] = [];
  if (def.attack) parts.push(`${statName('attack', def.style)} +${def.attack}`);
  if (def.strength) parts.push(`${statName('strength', def.style)} +${def.strength}`);
  if (def.armour) parts.push(`Armour +${def.armour}`);
  return parts.join(', ') || 'Nothing to speak of';
}

/** Where a thing is worn: "Main hand, both hands". */
export function slotText(def: EquipDef): string {
  return def.twoHanded ? `${SLOT_NAMES[def.slot]}, both hands` : SLOT_NAMES[def.slot];
}
