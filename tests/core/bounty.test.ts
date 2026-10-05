import { describe, expect, it } from 'vitest';
import { advance } from '../../src/core/actions';
import { catchUp } from '../../src/core/away';
import {
  BOUNTY_BELOW,
  COINS_PER_POINT,
  SWAP_COST,
  bountyChoices,
  bountyReady,
  buyFromShop,
  combatLevel,
  handInBounty,
  swapBounty,
  swapCost,
  takeBounty,
} from '../../src/core/bounty';
import { startFight } from '../../src/core/combat';
import type { Content, MonsterDef } from '../../src/core/content';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';

// Tables of the test's own: the rules are checked apart from the game's numbers.
const skill = (id: string) => ({ id, name: id, verb: 'Fighting', group: 'Combat' });
const item = (id: string, extra = {}) => ({ id, name: id, description: '', value: 1, ...extra });
const monster = (id: string, level: number, extra: Partial<MonsterDef> = {}): MonsterDef => ({
  id,
  name: id,
  description: '',
  area: 'yard',
  level,
  hp: 8,
  attack: 9,
  defence: 6,
  maxHit: 2,
  speedMs: 2400,
  coins: [1, 3],
  always: [{ item: 'hide', min: 1, max: 1 }],
  rare: [],
  bounty: { kills: [5, 8], points: level + 1 },
  ...extra,
});
const content: Content = {
  skills: {
    melee: skill('melee'),
    ranged: skill('ranged'),
    defence: skill('defence'),
    vitality: skill('vitality'),
  },
  items: {
    sword: item('sword', { equip: { slot: 'main_hand', style: 'melee', attack: 6, strength: 5 } }),
    hide: item('hide'),
    hat: item('hat', { equip: { slot: 'head', armour: 1 } }),
    darts: item('darts'),
  },
  actions: {},
  areas: { yard: { id: 'yard', name: 'Yard', description: '' } },
  monsters: {
    rat: monster('rat', 1),
    mole: monster('mole', 2),
    // Never posted: it has no bounty row.
    newt: monster('newt', 3, { bounty: undefined }),
    hog: monster('hog', 6),
    // Only for those with a bounty on it.
    bogle: monster('bogle', 5, { bountyOnly: true, always: [{ item: 'darts', min: 1, max: 1 }] }),
    ogre: monster('ogre', 20, { hp: 200, attack: 200, defence: 200, maxHit: 30 }),
  },
  shop: {
    hat: { id: 'hat', item: 'hat', qty: 1, cost: 10, once: true },
    darts: { id: 'darts', item: 'darts', qty: 50, cost: 4 },
  },
};

const HOUR = 60 * 60 * 1000;

const ok = (result: { ok: true; state: GameState } | { ok: false; reason: string }): GameState => {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};

/** A swordsman with every combat skill at `level`, dice of `seed`, and `extra` laid over. */
function hunter(level = 1, seed = 1, extra: Partial<GameState> = {}): GameState {
  const xp = xpForLevel(level);
  return {
    ...newGame('Cody', seed),
    skills: level > 1 ? { melee: xp, defence: xp, vitality: xp } : {},
    equipment: { main_hand: { item: 'sword', qty: 1 } },
    ...extra,
  };
}

/** Holding a bounty on `monster` with `done` of `count` kills made. */
const holding = (monster: string, count = 6, done = 0, extra: Partial<GameState> = {}) =>
  hunter(5, 1, { bounty: { monster, count, done }, ...extra });

const ids = (monsters: MonsterDef[]): string[] => monsters.map((m) => m.id);

describe('who the board posts for', () => {
  it('reads a combat level from the better attacking skill, Defence and Vitality', () => {
    expect(combatLevel(newGame('Cody', 0))).toBe(1);
    const mixed = {
      ...newGame('Cody', 0),
      skills: {
        melee: xpForLevel(4),
        ranged: xpForLevel(10),
        defence: xpForLevel(7),
        vitality: xpForLevel(8),
      },
    };
    expect(combatLevel(mixed)).toBe(8);
  });

  it(`posts monsters from ${BOUNTY_BELOW} levels below the character up to their level`, () => {
    expect(ids(bountyChoices(hunter(1), content))).toEqual(['rat']);
    expect(ids(bountyChoices(hunter(5), content))).toEqual(['rat', 'mole', 'bogle']);
    // Nothing without a bounty row, and nothing above the character.
    expect(ids(bountyChoices(hunter(6), content))).toEqual(['rat', 'mole', 'bogle', 'hog']);
    expect(ids(bountyChoices(hunter(9), content))).toEqual(['bogle', 'hog']);
  });

  it('posts the strongest below when nothing is near enough, never one above', () => {
    expect(ids(bountyChoices(hunter(14), content))).toEqual(['hog']);
    expect(ids(bountyChoices(hunter(40), content))).toEqual(['ogre']);
    const late = { ...content, monsters: { hog: content.monsters!.hog! } };
    expect(ids(bountyChoices(hunter(1), late))).toEqual(['hog']);
  });
});

describe('taking a bounty', () => {
  it('posts one of the choices with a count from its row, by the save dice', () => {
    const start = hunter(6);
    const taken = ok(takeBounty(start, content));
    const { monster, count, done } = taken.bounty!;
    expect(ids(bountyChoices(start, content))).toContain(monster);
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(8);
    expect(done).toBe(0);
    expect(taken.rng).not.toBe(start.rng);
    // The same save posts the same bounty.
    expect(ok(takeBounty(JSON.parse(JSON.stringify(start)) as GameState, content))).toEqual(taken);
  });

  it('gives every choice and every count its turn, with different dice', () => {
    const posted = new Set<string>();
    const counts = new Set<number>();
    for (let seed = 1; seed <= 200; seed += 1) {
      const bounty = ok(takeBounty(hunter(6, seed), content)).bounty!;
      posted.add(bounty.monster);
      counts.add(bounty.count);
    }
    expect([...posted].sort()).toEqual(['bogle', 'hog', 'mole', 'rat']);
    expect([...counts].sort()).toEqual([5, 6, 7, 8]);
  });

  it('holds one at a time', () => {
    expect(takeBounty(holding('rat'), content)).toEqual({
      ok: false,
      reason: 'One bounty at a time. Finish or swap the one you hold.',
    });
  });

  it('finds the board bare when nothing has a bounty row', () => {
    const bare = { ...content, monsters: { newt: content.monsters!.newt! } };
    expect(takeBounty(hunter(1), bare)).toEqual({ ok: false, reason: 'The notice board is bare.' });
  });
});

describe('kills towards a bounty', () => {
  it('count the named monster while the bounty is held, up to the count and no further', () => {
    const start = ok(startFight(holding('rat', 6), 'rat', content));
    const hour = advance(start, HOUR, content);
    expect(hour.bestiary.rat!.kills).toBeGreaterThan(6);
    expect(hour.bounty).toEqual({ monster: 'rat', count: 6, done: 6 });
    expect(bountyReady(hour)).toBe(true);
  });

  it('do not count another monster, nor anything without a bounty held', () => {
    const other = advance(ok(startFight(holding('mole'), 'rat', content)), HOUR, content);
    expect(other.bounty).toEqual({ monster: 'mole', count: 6, done: 0 });
    const none = advance(ok(startFight(hunter(5), 'rat', content)), HOUR, content);
    expect(none.bounty).toBeNull();
  });

  it('land in the same place however the time is cut, the completing kill included', () => {
    const start = ok(startFight(holding('rat', 8, 2), 'rat', content));
    const test = (state: GameState): boolean => bountyReady(state);
    let lo = 0;
    let hi = HOUR;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (test(advance(start, mid, content))) hi = mid;
      else lo = mid;
    }
    expect(advance(start, hi - 1, content).bounty!.done).toBe(7);
    expect(advance(start, hi, content).bounty!.done).toBe(8);
    const total = 20 * 60 * 1000;
    const whole = advance(start, total, content);
    for (const cut of [hi - 1, hi, hi + 1, hi + 2999, hi + 3000]) {
      expect(advance(advance(start, cut, content), total - cut, content), `cut at ${cut}`).toEqual(
        whole,
      );
    }
    let live = start;
    for (let spent = 0; spent < total; spent += 16) {
      live = advance(live, Math.min(16, total - spent), content);
    }
    expect(catchUp(start, total, content).state).toEqual(live);
  });
});

describe('handing in', () => {
  it('waits for the last kill', () => {
    expect(handInBounty(holding('rat', 6, 5), content)).toEqual({
      ok: false,
      reason: 'Not yet: 1 more to go.',
    });
    expect(handInBounty(hunter(5), content)).toEqual({ ok: false, reason: 'You hold no bounty.' });
  });

  it('pays the points and coins, and posts the next, on another monster', () => {
    const done = holding('rat', 6, 6, { bountyPoints: 4, coins: 10 });
    const paid = ok(handInBounty(done, content));
    // The rat's row pays 2 points.
    expect(paid.bountyPoints).toBe(6);
    expect(paid.coins).toBe(10 + 2 * COINS_PER_POINT);
    expect(paid.bounty).toMatchObject({ done: 0 });
    expect(['mole', 'bogle']).toContain(paid.bounty!.monster);
  });

  it('counts bounties handed in, and the run of them since the last swap', () => {
    const first = ok(handInBounty(holding('rat', 6, 6), content));
    expect(first.stats).toEqual({ bounties: 1, streak: 1, bestStreak: 1 });
    const done = (state: GameState): GameState => ({
      ...state,
      bounty: { ...state.bounty!, done: state.bounty!.count },
    });
    const second = ok(handInBounty(done(first), content));
    expect(second.stats).toEqual({ bounties: 2, streak: 2, bestStreak: 2 });
    const swapped = ok(swapBounty({ ...second, bountyPoints: 10 }, content));
    expect(swapped.stats).toEqual({ bounties: 2, streak: 0, bestStreak: 2 });
    const third = ok(handInBounty(done(swapped), content));
    expect(third.stats).toEqual({ bounties: 3, streak: 1, bestStreak: 2 });
  });

  it('ends a fight with a bounty-only monster the next bounty does not name', () => {
    const fighting = advance(ok(startFight(holding('bogle', 5), 'bogle', content)), HOUR, content);
    expect(fighting.fight?.monster).toBe('bogle');
    expect(bountyReady(fighting)).toBe(true);
    const paid = ok(handInBounty(fighting, content));
    expect(paid.bounty!.monster).not.toBe('bogle');
    expect(paid.fight).toBeNull();
  });
});

describe('swapping', () => {
  it('costs three points for another monster, or what there is', () => {
    const rich = holding('rat', 6, 3, { bountyPoints: 10 });
    expect(swapCost(rich)).toBe(SWAP_COST);
    const swapped = ok(swapBounty(rich, content));
    expect(swapped.bountyPoints).toBe(7);
    expect(swapped.bounty!.monster).not.toBe('rat');
    expect(swapped.bounty!.done).toBe(0);
    const poor = holding('rat', 6, 0, { bountyPoints: 1 });
    expect(swapCost(poor)).toBe(1);
    expect(ok(swapBounty(poor, content)).bountyPoints).toBe(0);
    expect(ok(swapBounty(holding('rat'), content)).bountyPoints).toBe(0);
  });

  it('will not swap when there is nothing else to swap to', () => {
    expect(
      swapBounty(hunter(1, 1, { bounty: { monster: 'rat', count: 5, done: 0 } }), content),
    ).toEqual({ ok: false, reason: 'There is nothing else on the board for you yet.' });
  });

  it('ends a fight with a bounty-only monster swapped away from', () => {
    const fighting = ok(startFight(holding('bogle'), 'bogle', content));
    const swapped = ok(swapBounty(fighting, content));
    expect(swapped.fight).toBeNull();
  });
});

describe('a monster only bounty hunters go after', () => {
  it('can be fought only with a bounty on it', () => {
    expect(startFight(hunter(5), 'bogle', content)).toEqual({
      ok: false,
      reason: 'Only a bounty on the bogle will lead you to it.',
    });
    expect(startFight(holding('rat'), 'bogle', content).ok).toBe(false);
    expect(ok(startFight(holding('bogle'), 'bogle', content)).fight?.monster).toBe('bogle');
  });
});

describe('the bounty shop', () => {
  it('sells for points, into the bank', () => {
    const bought = ok(buyFromShop(hunter(1, 1, { bountyPoints: 9 }), 'darts', content));
    expect(bought.bountyPoints).toBe(5);
    expect(bought.bank.darts).toBe(50);
    expect(ok(buyFromShop(bought, 'darts', content)).bank.darts).toBe(100);
  });

  it('will not sell on credit, nor what it does not stock', () => {
    expect(buyFromShop(hunter(1, 1, { bountyPoints: 3 }), 'darts', content)).toEqual({
      ok: false,
      reason: 'Needs 4 bounty points; you have 3.',
    });
    expect(buyFromShop(hunter(), 'moon', content).ok).toBe(false);
  });

  it('sells a one-off only to someone without one, banked or worn', () => {
    const rich = hunter(1, 1, { bountyPoints: 100 });
    const bought = ok(buyFromShop(rich, 'hat', content));
    expect(bought.bank.hat).toBe(1);
    expect(buyFromShop(bought, 'hat', content)).toEqual({
      ok: false,
      reason: 'You have one already.',
    });
    const worn = { ...rich, equipment: { head: { item: 'hat', qty: 1 } } };
    expect(buyFromShop(worn, 'hat', content).ok).toBe(false);
  });
});

describe('the away report for a bounty', () => {
  it('says how far it came, and when it is ready to hand in', () => {
    const start = ok(startFight(holding('rat', 8, 1), 'rat', content));
    const short = catchUp(start, 1000, content).report!;
    expect(short.bounty).toBeNull();
    const { state, report } = catchUp(start, 2 * HOUR, content);
    expect(state.bounty).toEqual({ monster: 'rat', count: 8, done: 8 });
    expect(report!.bounty).toEqual({ monster: 'rat', gained: 7, done: 8, count: 8, ready: true });
  });

  it('says nothing of a bounty on something else', () => {
    const start = ok(startFight(holding('mole'), 'rat', content));
    expect(catchUp(start, HOUR, content).report!.bounty).toBeNull();
  });
});
