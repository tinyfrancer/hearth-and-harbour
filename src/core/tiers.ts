import type { ActionDef, Content, MonsterDef } from './content';
import { skillLevel, type GameState } from './state';

/**
 * Tiers of content (S22). Each rule in a sentence:
 * - A row's tier is its `tier`, or 1 if it has none: tier 1 is the whole
 *   game before the grotto.
 * - A tier is open once the dungeon whose row opens it has been cleared by
 *   hand (`tierUnlocked`, read from the clears the save keeps: no state).
 * - Something of a closed tier cannot be started, fought, posted or bought,
 *   and says why in words naming that dungeon ("Clear Brinebeard’s Grotto.");
 *   it is shown, never hidden.
 * - Once the tier is open, an action needs only its level, so a character
 *   already past it can use it at once.
 * - Nothing closes again: a tier once open stays open, so an action under way
 *   is never stopped by one.
 */

/**
 * Whether a tier of idle content is open: tier 1 always; a later one once
 * the dungeon that opens it (`DungeonDef.opens`) has been cleared.
 */
export function tierUnlocked(state: GameState, tier: number, content: Content): boolean {
  if (tier <= 1) return true;
  return Object.values(content.dungeons ?? {}).some(
    (dungeon) =>
      !dungeon.comingSoon &&
      dungeon.opens?.tier === tier &&
      (state.dungeons[dungeon.id]?.clears ?? 0) >= 1,
  );
}

/** The tier a row belongs to: its own, or the first. */
export function tierOf(row: { readonly tier?: number }): number {
  return row.tier !== undefined && Number.isInteger(row.tier) && row.tier > 1 ? row.tier : 1;
}

/**
 * Why a tier is closed to this character, in a line ("Clear Brinebeard’s
 * Grotto."), or null when it is open. A tier no dungeon opens yet says so.
 */
export function tierLock(state: GameState, tier: number, content: Content): string | null {
  if (tierUnlocked(state, tier, content)) return null;
  const opener = Object.values(content.dungeons ?? {}).find(
    (dungeon) => dungeon.opens?.tier === tier,
  );
  if (!opener || opener.comingSoon) return 'Not open yet.';
  return `Clear ${opener.name}.`;
}

/** Why an action cannot be started for want of its tier or its level, or null if it can. */
export function actionLock(state: GameState, action: ActionDef, content: Content): string | null {
  const tier = tierLock(state, tierOf(action), content);
  if (tier) return tier;
  if (skillLevel(state, action.skill) < action.level) {
    const skill = content.skills[action.skill]?.name ?? action.skill;
    return `Needs ${skill} level ${action.level}.`;
  }
  return null;
}

/** Why a monster cannot be fought for want of its tier, or null. (Its level is advice, as in tier 1.) */
export function monsterLock(
  state: GameState,
  monster: MonsterDef,
  content: Content,
): string | null {
  return tierLock(state, tierOf(monster), content);
}

/** Whether a row's tier is open to this character. */
export function tierOpen(
  state: GameState,
  row: { readonly tier?: number },
  content: Content,
): boolean {
  return tierUnlocked(state, tierOf(row), content);
}

/**
 * The tier an item belongs to, for the menus: the lowest tier of anything
 * that gives it (an action, a monster, a mark, a shop, a dungeon's loot,
 * whose tier is the one below the tier it opens). Tier 1 if nothing does.
 */
export function itemTier(content: Content, item: string): number {
  let lowest = Infinity;
  const note = (tier: number): void => {
    lowest = Math.min(lowest, tier);
  };
  for (const action of Object.values(content.actions)) {
    if (action.gives.some((g) => g.item === item)) note(tierOf(action));
    if (action.steal?.loot.some((d) => d.item === item)) note(tierOf(action));
  }
  for (const monster of Object.values(content.monsters ?? {})) {
    if ([...monster.always, ...monster.rare].some((d) => d.item === item)) note(tierOf(monster));
  }
  for (const entry of [...Object.values(content.shop ?? {}), ...Object.values(content.store ?? {})])
    if (entry.item === item) note(tierOf(entry));
  for (const dungeon of Object.values(content.dungeons ?? {})) {
    if (dungeon.loot.includes(item)) note(Math.max(1, (dungeon.opens?.tier ?? 2) - 1));
  }
  return lowest === Infinity ? 1 : lowest;
}

/** The tiers the tables hold, lowest first. */
export function tiersIn(rows: Iterable<{ readonly tier?: number }>): number[] {
  return [...new Set([...rows].map(tierOf))].sort((a, b) => a - b);
}
