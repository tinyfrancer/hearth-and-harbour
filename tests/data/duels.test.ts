import { describe, expect, it } from 'vitest';
import { advance } from '../../src/core/actions';
import { BOUNTY_BELOW, bountyChoices } from '../../src/core/bounty';
import { CONTENT } from '../../src/data';
import { HOUR, characterAt, duels, fight, hourOf } from './fighting';

// Combat's balance is held here, by simulation on the real rules and tables,
// as tests/data/pacing.test.ts holds the skills'. A duel is one monster fought
// from full health without food, two hundred times over with different dice.
// Changing a number that breaks one of these is a decision, not a fix.
const MONSTERS = Object.values(CONTENT.monsters!);

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
// level, in its level's gear, eating that tier's fish below half health.
// Shrimp heal 6, herring 12, cod 20. A Fishing level-20 character catches
// about 600 cod an hour, so the marsh costs a third of an hour's fishing.
describe('food', () => {
  it.each([
    ['dock_rat', 0],
    ['sand_crab', 54],
    ['thieving_gull', 135],
    ['bramble_boar', 117],
    ['footpad', 189],
    ['grey_wolf', 250],
    ['smuggler', 187],
    ['marsh_troll', 190],
    ['goblin_poacher', 165],
    ['bramble_wyrm', 182],
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
  // combat level is a fair fight at that level, in that level's gear. Nor
  // anything trivial: nothing more than six levels below.
  it.each(Array.from({ length: 22 }, (_, i) => i + 1))(
    'posts nothing hopeless or trivial at combat level %i',
    (level) => {
      const choices = bountyChoices(characterAt(level), CONTENT);
      expect(choices.length).toBeGreaterThan(0);
      for (const monster of choices) {
        expect(monster.level).toBeLessThanOrEqual(level);
        expect(monster.level).toBeGreaterThanOrEqual(level - BOUNTY_BELOW);
      }
      const hardest = choices.at(-1)!;
      expect(duels(level, hardest.id, 100).winRate, hardest.id).toBeGreaterThanOrEqual(0.7);
    },
  );
});
