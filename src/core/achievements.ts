import type { AchievementDef, AchievementRule, Content } from './content';
import { noteFinds } from './collection';
import { masteryLevel, skillLevel, stat, type GameState } from './state';

/**
 * Achievements: each is a rule that reads the state (AchievementRule in
 * src/core/content.ts), and is earned the first time the state shows it.
 * Earned is for good: losing the thing later (selling the sword, spending
 * the coins) takes nothing back. They are looked for after every change,
 * live or on return, never inside `advance`, so they cannot bend time.
 */

/** Whether the state shows what a rule asks, now. */
export function meets(state: GameState, rule: AchievementRule, content: Content): boolean {
  switch (rule.kind) {
    case 'level':
      return Object.values(content.skills)
        .filter((skill) => (rule.skill ? skill.id === rule.skill : true))
        .filter((skill) => (rule.group ? skill.group === rule.group : true))
        .some((skill) => skillLevel(state, skill.id) >= rule.level);
    case 'total':
      return totalLevel(state, content) >= rule.level;
    case 'mastery':
      return Object.keys(state.mastery).some((id) => masteryLevel(state, id) >= rule.level);
    case 'found': {
      const found = new Set(state.collection);
      const have = rule.items.filter((item) => found.has(item)).length;
      return have >= (rule.count ?? rule.items.length);
    }
    case 'kills':
      return rule.monster
        ? (state.bestiary[rule.monster]?.kills ?? 0) >= rule.count
        : Object.values(state.bestiary).reduce((sum, r) => sum + r.kills, 0) >= rule.count;
    case 'worn': {
      const worn = new Set(Object.values(state.equipment).map((slot) => slot!.item));
      return rule.items.every((item) => worn.has(item));
    }
    case 'cleared':
      return (state.dungeons[rule.dungeon]?.clears ?? 0) >= (rule.count ?? 1);
    case 'coins':
      return state.coins >= rule.amount;
    case 'thefts':
      return (
        Object.values(state.marks).reduce(
          (sum, mark) => sum + (rule.caught ? mark.caught : mark.picked),
          0,
        ) >= rule.count
      );
    case 'stat':
      return stat(state, rule.stat) >= rule.count;
  }
}

/** Every skill's level added up, untrained ones as 1. */
export function totalLevel(state: GameState, content: Content): number {
  return Object.keys(content.skills).reduce((sum, id) => sum + skillLevel(state, id), 0);
}

/**
 * The state with every achievement it now shows added, in table order, and
 * the ones just earned; the same state and none if nothing is new.
 */
export function award(
  state: GameState,
  content: Content,
): { state: GameState; earned: AchievementDef[] } {
  const had = new Set(state.achievements);
  const earned = Object.values(content.achievements ?? {}).filter(
    (def) => !had.has(def.id) && meets(state, def.rule, content),
  );
  if (earned.length === 0) return { state, earned };
  return {
    state: { ...state, achievements: [...state.achievements, ...earned.map((def) => def.id)] },
    earned,
  };
}

/**
 * Bring the collection log and achievements up to date with a state: what the
 * app does after every change, so a thing found and an achievement it earns
 * arrive together.
 */
export function takeStock(
  state: GameState,
  content: Content,
): { state: GameState; earned: AchievementDef[] } {
  return award(noteFinds(state), content);
}
