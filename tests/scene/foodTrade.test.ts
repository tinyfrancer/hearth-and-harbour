/*
 * A day when food heals less (lane A's wave 18 `foodHeals`, Short Rations),
 * wired once and generically: the food slot's fish and every kind found heal
 * by lane A's rule from the moment the boat rows out, eating takes what it
 * gives, the Eat button says by how much, and a day without it is untouched.
 */
import { describe, expect, it } from 'vitest';
import { eat, foodProblem, nextFood, type Battle } from '../../src/scene/battle';
import { foodHealsUnder } from '../../src/scene/fromLaneA';
import { foodShare, modifiedFighter, modifiedHeals } from '../../src/scene/modifiers';
import { beginCave, novice } from './caveBot';
import { begin, prepared } from './grottoBot';

const SHORT = { id: 'short', effects: { foodHeals: 0.8 } as Record<string, number> };

describe('a day when food heals less', () => {
  it('heals by lane A’s rule: rounded, at least one, nothing stays nothing', () => {
    expect(foodHealsUnder(14, SHORT.effects)).toBe(11);
    expect(foodHealsUnder(1, SHORT.effects)).toBe(1);
    expect(foodHealsUnder(0, SHORT.effects)).toBe(0);
    expect(foodHealsUnder(14, {})).toBe(14);
    expect(foodShare(SHORT.effects)).toBe(0.8);
    expect(foodShare({ loot: 1.5 })).toBeNull();
    expect(foodShare(undefined)).toBeNull();
  });

  it('takes the food slot’s fish and every kind found down as the boat rows out', () => {
    const plain = begin(prepared(20), 7919);
    const short = begin(prepared(20), 7919, undefined, SHORT);
    const was = plain.battle!.fighter.food!.heals;
    expect(short.battle!.fighter.food!.heals).toBe(foodHealsUnder(was, SHORT.effects));
    expect(short.battle!.fighter.food!.qty).toBe(plain.battle!.fighter.food!.qty);
    // The cave's found shrimp too.
    const cave = beginCave(novice(), 3, false, {}, SHORT);
    const plainCave = beginCave(novice(), 3, false);
    for (const [item, heals] of Object.entries(plainCave.battle!.larder ?? {}))
      expect(cave.battle!.larder![item]).toBe(foodHealsUnder(heals, SHORT.effects));
    // Eating gives what it heals now, no more.
    const hurt: Battle = { ...short.battle!, hp: 10 };
    expect(foodProblem(hurt)).toBeNull();
    const fed = eat(hurt, short.play.walker.at);
    expect(fed.hp - hurt.hp).toBe(nextFood(hurt)!.heals);
    expect(nextFood(hurt)!.heals).toBe(foodHealsUnder(was, SHORT.effects));
  });

  it('leaves a plain day and a day of rewards alone, to the same objects', () => {
    const fighter = begin(prepared(20), 1).battle!.fighter;
    expect(modifiedFighter(fighter, { loot: 1.5 })).toBe(fighter);
    const heals = { cooked_shrimp: 3 };
    expect(modifiedHeals(heals, { xp: 1.2 })).toBe(heals);
    expect(modifiedHeals(heals, undefined)).toBe(heals);
    expect(modifiedHeals(heals, SHORT.effects)).toEqual({ cooked_shrimp: 2 });
  });
});
