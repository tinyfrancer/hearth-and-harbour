import { describe, expect, it } from 'vitest';
import { advance } from '../../src/core/actions';
import { bountyChoices, bountyWeight } from '../../src/core/bounty';
import { CONTENT } from '../../src/data';
import { HOUR, characterAt, duels, fight, hourOf } from './fighting';

// Combat's balance is held here, by simulation on the real rules and tables,
// as tests/data/pacing.test.ts holds the skills'. A duel is one monster fought
// from full health without food, two hundred times over with different dice.
// Changing a number that breaks one of these is a decision, not a fix.
// Tier 1's cases read tier 1's monsters only (S22): tier 2's are held below,
// by the same rules, for a character who has cleared the grotto.
/** Fish an hour against each of tier 2's monsters at its level, melee (S22). */
const TIER2_FISH: Record<string, number> = {
  brigand: 120,
  black_bear: 117,
  hobgoblin: 135,
  dire_wolf: 125,
  hill_ogre: 133,
  briar_hag: 121,
  moss_golem: 118,
};

const MONSTERS = Object.values(CONTENT.monsters!).filter((monster) => !monster.tier);
const TIER2 = Object.values(CONTENT.monsters!).filter((monster) => monster.tier === 2);

describe('a fresh character in linen with a bronze sword', () => {
  it('beats dock rats without food, for as long as you like', () => {
    expect(duels(1, 'dock_rat').winRate).toBe(1);
    const hour = advance(fight(characterAt(1), 'dock_rat'), HOUR, CONTENT);
    expect(hour.fight, 'still standing after an hour').not.toBeNull();
    expect(hour.bestiary.dock_rat!.kills).toBeGreaterThan(200);
  });

  it('loses to a bramble boar', () => {
    expect(duels(1, 'bramble_boar').winRate).toBeLessThan(0.05);
  });
});

describe.each(['melee', 'ranged'] as const)('fighting with %s', (style) => {
  it.each(MONSTERS.map((monster) => [monster.id, monster.level] as const))(
    'makes the %s a fair fight at level %i, in the gear of that level',
    (id, level) => {
      const { winRate, meanLost } = duels(level, id, 200, style);
      // Usually won, and not cheaply: the rat aside, a win costs a third of
      // the character's health or more, so food matters for a long fight.
      expect(winRate).toBeGreaterThanOrEqual(0.7);
      if (id !== 'dock_rat') expect(meanLost).toBeGreaterThanOrEqual(0.3);
    },
  );

  it.each(MONSTERS.filter((m) => m.level > 10).map((m) => [m.id, m.level - 10] as const))(
    'makes the %s hopeless at level %i',
    (id, level) => {
      expect(duels(level, id, 200, style).winRate).toBeLessThan(0.05);
    },
  );
});

// What a fight costs in cooked fish: an hour against each monster at its
// level, in its level's gear (greaves since wave 16), eating that tier's
// fish below half health.
// Shrimp heal 6, herring 12, cod 20. A Fishing level-20 character catches
// about 600 cod an hour, so the marsh costs a third of an hour's fishing.
describe('food', () => {
  it.each([
    ['dock_rat', 0],
    ['sand_crab', 54],
    ['thieving_gull', 139],
    ['bramble_boar', 117],
    ['footpad', 168],
    ['grey_wolf', 216],
    ['smuggler', 174],
    ['marsh_troll', 206],
    ['goblin_poacher', 145],
    ['bramble_wyrm', 169],
  ] as const)('costs a fixed number of fish an hour against the %s: %i', (id, fish) => {
    const level = CONTENT.monsters![id]!.level;
    const hour = hourOf(level, id);
    expect(hour.deaths).toBe(0);
    expect(hour.eaten).toBe(fish);
  });
});

// A bounty is a short errand, not an afternoon: ten to twenty minutes of
// fighting a monster at the character's level, whichever way they fight and
// however many kills the board's dice ask for.
describe('bounties', () => {
  const posted = MONSTERS.filter((monster) => monster.bounty);

  it('are posted for every monster', () => {
    expect(posted).toEqual(MONSTERS);
    expect(TIER2.every((monster) => monster.bounty)).toBe(true);
  });

  it.each(posted.map((monster) => [monster.id, monster.level] as const))(
    'ask ten to twenty minutes of the %s at level %i, with either weapon',
    (id, level) => {
      const [least, most] = CONTENT.monsters![id]!.bounty!.kills;
      for (const style of ['melee', 'ranged'] as const) {
        const { kills, deaths } = hourOf(level, id, { style });
        expect(deaths, style).toBe(0);
        expect((least * 60) / kills, `${style}: the fewest kills`).toBeGreaterThanOrEqual(10);
        expect((most * 60) / kills, `${style}: the most kills`).toBeLessThanOrEqual(20);
      }
    },
  );

  // The board never posts something hopeless: the hardest it may post at each
  // combat level is a fair fight at that level, in that level's gear. Since
  // wave 13 (Cody: "I only got marsh trolls over and over") it posts anything
  // easier too, so there is always variety; but the trivial are the exception:
  // what is more than six levels below the strongest open is under a third
  // of what is posted.
  it.each(Array.from({ length: 22 }, (_, i) => i + 1))(
    'posts nothing hopeless, and the trivial seldom, at combat level %i',
    (level) => {
      const choices = bountyChoices(characterAt(level), CONTENT);
      expect(choices.length).toBeGreaterThan(0);
      for (const monster of choices) expect(monster.level).toBeLessThanOrEqual(level);
      const hardest = choices.at(-1)!;
      const weight = (list: typeof choices): number =>
        list.reduce((sum, monster) => sum + bountyWeight(monster, hardest.level), 0);
      const trivial = choices.filter((monster) => monster.level < hardest.level - 6);
      expect(weight(trivial) / weight(choices)).toBeLessThan(1 / 3);
      expect(duels(level, hardest.id, 100).winRate, hardest.id).toBeGreaterThanOrEqual(0.7);
    },
  );
});

// Tier 2 (S22): the same limits at levels 20 to 40, in the best set the anvil,
// bench and bowyer make at each level (salt-iron for the sword, the ranger's
// leathers and the longbows for the bow; tests/data/fighting.ts, `tier2GearAt`),
// eating tier 2's fish. One limit is looser, and is a decision for Cody: ten
// levels early a character wins under a fifth of duels, not under one in
// twenty, because tier 2 is one rung of gear (the knight) where tier 1 had two
// (bronze, then iron), so ten levels early is less far behind.
describe.each(['melee', 'ranged'] as const)('tier 2, fighting with %s', (style) => {
  it.each(TIER2.map((monster) => [monster.id, monster.level] as const))(
    'makes the %s a fair fight at level %i, in the gear of that level',
    (id, level) => {
      const { winRate, meanLost } = duels(level, id, 200, style, true);
      expect(winRate).toBeGreaterThanOrEqual(0.7);
      expect(meanLost).toBeGreaterThanOrEqual(0.3);
    },
  );

  it.each(TIER2.map((m) => [m.id, m.level - 10] as const))(
    'makes the %s all but hopeless at level %i',
    (id, level) => {
      expect(duels(level, id, 200, style, true).winRate).toBeLessThan(0.2);
    },
  );
});

describe('tier 2: food and bounties', () => {
  it.each(TIER2.map((monster) => [monster.id, monster.level] as const))(
    'asks ten to twenty minutes of the %s at level %i, with either weapon, and costs fish',
    (id, level) => {
      const [least, most] = CONTENT.monsters![id]!.bounty!.kills;
      for (const style of ['melee', 'ranged'] as const) {
        const { kills, deaths } = hourOf(level, id, { style, tier2: true });
        expect(deaths, style).toBe(0);
        expect((least * 60) / kills, `${style}: the fewest kills`).toBeGreaterThanOrEqual(10);
        expect((most * 60) / kills, `${style}: the most kills`).toBeLessThanOrEqual(20);
      }
    },
  );

  it('costs a fixed number of fish an hour against each, melee', () => {
    const fish = Object.fromEntries(
      TIER2.map((monster) => [
        monster.id,
        hourOf(monster.level, monster.id, { tier2: true }).eaten,
      ]),
    );
    expect(fish).toEqual(TIER2_FISH);
  });

  it.each(Array.from({ length: 18 }, (_, i) => i + 23))(
    'posts nothing hopeless at combat level %i, once the grotto is cleared',
    (level) => {
      const choices = bountyChoices(characterAt(level, { tier2: true }), CONTENT);
      for (const monster of choices) expect(monster.level).toBeLessThanOrEqual(level);
      const hardest = choices.at(-1)!;
      expect(hardest.tier, `${hardest.id} at ${level}`).toBe(2);
      expect(
        duels(level, hardest.id, 100, 'melee', true).winRate,
        hardest.id,
      ).toBeGreaterThanOrEqual(0.7);
    },
  );

  it('posts nothing of tier 2 before the grotto is cleared, whatever the level', () => {
    for (const level of [25, 30, 40])
      expect(bountyChoices(characterAt(level), CONTENT).every((m) => !m.tier)).toBe(true);
  });
});
