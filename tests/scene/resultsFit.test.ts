/*
 * The results card laid out for a phone on its side (wave 18): its heading
 * and time along the top, how it went on the left, what it earns on the
 * right (the first clear's and the challenges' rewards on the card itself,
 * not only in the shell's toasts), its buttons along the foot. The sizes
 * are measured in the browser at 844 x 390, 932 x 430 and 667 x 375.
 */
import { describe, expect, it } from 'vitest';
import { rewardOf } from '../../src/core/run';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { clearCounts, resultsCard, runRewards, rewardWords } from '../../src/scene/runCard';
import { runStats } from '../../src/scene/modifiers';
import { challengeMet } from '../../src/core/progress';
import { novice, playCave } from './caveBot';

const CAVE = CONTENT.dungeons!.tidepool_cave!;
const clear = playCave(novice(), 7919, { reactMs: 600, brace: false });

describe('the results card', () => {
  it('pays on the card what settling will pay on top: the first clear and each new challenge', () => {
    expect(clear.cleared).toBe(true);
    const run = clear.run;
    const fresh: GameState = newGame('Cody', 0);
    const rewards = runRewards(CONTENT, run, fresh);
    // The first clear's items, once.
    expect(rewards[0]).toMatchObject({ for: 'first', name: 'First clear' });
    expect(rewards[0]!.items).toEqual(CAVE.firstClear!.filter((r) => r.qty > 0));
    // Each challenge this run meets for the first time, with lane A's reward as paid.
    const met = CAVE.challenges!.filter((c) =>
      challengeMet(c.rule, runStats(run), { cleared: true, modifier: null }),
    );
    expect(rewards.slice(1).map((r) => r.for)).toEqual(met.map((c) => c.id));
    for (const c of met)
      expect(rewards.find((r) => r.for === c.id)).toMatchObject(rewardOf(c.reward, CONTENT));
    // A second clear: no first clear, and nothing for challenges done before.
    const again: GameState = {
      ...fresh,
      dungeons: { tidepool_cave: { clears: 1, challenges: met.map((c) => c.id) } },
    };
    expect(runRewards(CONTENT, run, again)).toEqual([]);
    // A run that did not clear earns nothing on top.
    expect(runRewards(CONTENT, { ...run, ending: 'fell' }, fresh)).toEqual([]);
    // Nor a clear of a landing still to come, rowed to for its review (`?burrow=1`): settling
    // never counts it cleared, so the card promises nothing it will not pay.
    const soon = Object.values(CONTENT.dungeons!).find((d) => d.comingSoon)!;
    expect(clearCounts(CONTENT, run)).toBe(true);
    expect(clearCounts(CONTENT, { ...run, dungeon: soon.id })).toBe(false);
    expect(runRewards(CONTENT, { ...run, dungeon: soon.id }, fresh)).toEqual([]);
  }, 120_000);

  it('words a reward shortly', () => {
    expect(
      rewardWords(
        {
          for: 'x',
          name: 'X',
          coins: 250,
          bountyPoints: 1,
          items: [{ item: 'cooked_shrimp', qty: 5 }],
        },
        CONTENT,
      ),
    ).toBe(`250 coins, 1 bounty point, 5 ${CONTENT.items.cooked_shrimp!.name}`);
  });

  it('lays out heading and time, how it went, what it earns and the buttons, in that order', () => {
    const card = resultsCard({
      content: CONTENT,
      run: clear.run,
      state: newGame('Cody', 0),
      title: 'Cleared',
      line: 'A line.',
      again: () => {},
      home: () => {},
    }).el;
    expect([...card.children].map((c) => c.className)).toEqual([
      'run-top',
      'run-head',
      'run-side',
      'run-buttons',
    ]);
    expect(card.querySelector('.run-top')!.textContent).toMatch(/^Cleared.*Time taken: \d+:\d\d$/);
    // Rewards first in the right column, then what comes home.
    const side = card.querySelector('.run-side')!;
    expect(side.firstElementChild!.className).toBe('run-rewards');
    expect(side.querySelector('.run-rewards li[data-for="first"]')).not.toBeNull();
    // A new challenge is celebrated: its medal glints and it says so.
    const fresh = card.querySelector('.run-challenges li[data-new="true"]');
    if (fresh) expect(fresh.querySelector('.run-new')!.textContent).toBe('New!');
    // Both buttons, last.
    expect([...card.querySelectorAll('.run-buttons button')].map((b) => b.textContent)).toEqual([
      'Row out again',
      'Back to town',
    ]);
  });
});
