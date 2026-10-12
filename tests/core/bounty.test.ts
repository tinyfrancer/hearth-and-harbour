import { describe, expect, it } from 'vitest';
import { advance } from '../../src/core/actions';
import { catchUp } from '../../src/core/away';
import {
  BOARD_SIZE,
  COINS_PER_POINT,
  GIVE_UP_COST,
  REROLL_COST,
  TIER_FADE_LEAST,
  TIER_FADE_LEVELS,
  WEIGHT_SPAN,
  autoHandIn,
  boardWeights,
  bountyChoices,
  bountyPoints,
  bountyReady,
  bountyWeight,
  buyFromShop,
  combatLevel,
  expectedKillMs,
  giveUpBounty,
  giveUpCost,
  handInBounty,
  pointsAnHour,
  readBoard,
  rerollBoard,
  setAutoBounty,
  takeBounty,
} from '../../src/core/bounty';
import { settleRun } from '../../src/core/run';
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

/** Holding a bounty on `monster` with `done` of `count` kills made, paying 3 points. */
const holding = (monster: string, count = 6, done = 0, extra: Partial<GameState> = {}) =>
  hunter(5, 1, { bounty: { monster, count, done, points: 3 }, ...extra });

/** The board read for a hunter: its offers' monsters, in the order posted. */
const read = (state: GameState): GameState => ok(readBoard(state, content));
const posted = (state: GameState): string[] => state.bountyBoard.map((offer) => offer.monster);

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

  it('posts anything with a bounty row at or below the character, bounty-only ones too', () => {
    expect(ids(bountyChoices(hunter(1), content))).toEqual(['rat']);
    expect(ids(bountyChoices(hunter(5), content))).toEqual(['rat', 'mole', 'bogle']);
    // Nothing without a bounty row, and nothing above the character.
    expect(ids(bountyChoices(hunter(6), content))).toEqual(['rat', 'mole', 'bogle', 'hog']);
    // Far past them all, still all of them: never one monster over and over.
    expect(ids(bountyChoices(hunter(40), content))).toEqual([
      'rat',
      'mole',
      'bogle',
      'hog',
      'ogre',
    ]);
    // Before the weakest is reached, the weakest.
    const late = { ...content, monsters: { hog: content.monsters!.hog! } };
    expect(ids(bountyChoices(hunter(1), late))).toEqual(['hog']);
  });

  it('leans towards the strongest open, each level below a little less likely, never impossible', () => {
    const at = (id: string) => content.monsters![id]!;
    expect(bountyWeight(at('ogre'), 20)).toBe(WEIGHT_SPAN);
    expect(bountyWeight(at('hog'), 20)).toBe(1);
    expect(bountyWeight(at('hog'), 6)).toBe(WEIGHT_SPAN);
    expect(bountyWeight(at('bogle'), 6)).toBe(WEIGHT_SPAN - 1);
    expect(bountyWeight(at('rat'), 6)).toBe(WEIGHT_SPAN - 5);
  });

  // Wave 20: an earlier tier's monsters fade from the board as a later tier is climbed.
  it('fades an earlier tier’s monsters as the later tier climbs, never to nothing', () => {
    const rat = monster('rat', 1);
    const first = monster('first', 23, { tier: 2 });
    const later = (level: number) => monster('later', level, { tier: 2 });
    // Only tier 1 posted: the plain weights.
    expect(boardWeights([rat, monster('hog', 6)])(rat)).toBe(bountyWeight(rat, 6));
    // The later tier's first monster the strongest: nothing faded yet.
    expect(boardWeights([rat, first])(rat)).toBe(1);
    // Half way through the fade, half; past it, the least, and the later tier untouched.
    const half = 23 + TIER_FADE_LEVELS / 2;
    expect(boardWeights([rat, first, later(half)])(rat)).toBeCloseTo(0.5);
    const far = boardWeights([rat, first, later(23 + 3 * TIER_FADE_LEVELS)]);
    expect(far(rat)).toBe(TIER_FADE_LEAST);
    expect(far(first)).toBe(1);
    expect(far(later(23 + 3 * TIER_FADE_LEVELS))).toBe(WEIGHT_SPAN);
  });

  it('pays for the time an offer should take, judged by the combat level alone', () => {
    const ogre = content.monsters!.ogre!;
    const rat = content.monsters!.rat!;
    // The harder thing takes longer a kill, and a stronger character less.
    expect(expectedKillMs(20, ogre)).toBeGreaterThan(expectedKillMs(20, rat));
    expect(expectedKillMs(30, ogre)).toBeLessThan(expectedKillMs(20, ogre));
    // A rat dies to a blow or two from anyone strong: the wait, and a swing or a little more.
    expect(expectedKillMs(40, rat)).toBeGreaterThan(3000 + 2400);
    expect(expectedKillMs(40, rat)).toBeLessThan(3000 + 2400 * 1.5);
    expect(pointsAnHour(20)).toBe(45);
    expect(bountyPoints(20, ogre, 10)).toBe(
      Math.round(((10 * expectedKillMs(20, ogre)) / 3_600_000) * 45),
    );
    // Never nothing.
    expect(bountyPoints(40, rat, 1)).toBe(1);
  });
});

describe('the notice board', () => {
  it('posts three different offers when read, each a count from its row and its pay, by the save dice', () => {
    const start = hunter(6);
    const board = read(start);
    expect(board.bountyBoard).toHaveLength(BOARD_SIZE);
    expect(new Set(posted(board)).size).toBe(BOARD_SIZE);
    for (const offer of board.bountyBoard) {
      expect(ids(bountyChoices(start, content))).toContain(offer.monster);
      expect(offer.count).toBeGreaterThanOrEqual(5);
      expect(offer.count).toBeLessThanOrEqual(8);
      expect(offer.points).toBe(
        bountyPoints(combatLevel(start), content.monsters![offer.monster]!, offer.count),
      );
    }
    expect(board.rng).not.toBe(start.rng);
    // The same save posts the same board; a board already up is left as it is.
    expect(read(JSON.parse(JSON.stringify(start)) as GameState)).toEqual(board);
    expect(read(board)).toBe(board);
  });

  it('gives every monster open and every count its turn, the strongest most often', () => {
    const seen = new Map<string, number>();
    const counts = new Set<number>();
    for (let seed = 1; seed <= 300; seed += 1) {
      const first = read(hunter(6, seed)).bountyBoard[0]!;
      seen.set(first.monster, (seen.get(first.monster) ?? 0) + 1);
      counts.add(first.count);
    }
    expect([...seen.keys()].sort()).toEqual(['bogle', 'hog', 'mole', 'rat']);
    expect(seen.get('hog')!).toBeGreaterThan(seen.get('rat')!);
    expect([...counts].sort()).toEqual([5, 6, 7, 8]);
  });

  it('takes the offer chosen, and clears the board', () => {
    const board = read(hunter(6));
    const offer = board.bountyBoard[2]!;
    const taken = ok(takeBounty(board, content, 2));
    expect(taken.bounty).toEqual({ ...offer, done: 0 });
    expect(taken.bountyBoard).toEqual([]);
    expect(takeBounty(board, content, 5)).toEqual({
      ok: false,
      reason: 'That notice is not on the board.',
    });
  });

  it('holds one at a time', () => {
    const reason = 'One bounty at a time. Finish or give up the one you hold.';
    expect(takeBounty(holding('rat'), content)).toEqual({ ok: false, reason });
    expect(readBoard(holding('rat'), content)).toEqual({ ok: false, reason });
  });

  it('finds the board bare when nothing has a bounty row', () => {
    const bare = { ...content, monsters: { newt: content.monsters!.newt! } };
    expect(readBoard(hunter(1), bare)).toEqual({ ok: false, reason: 'The notice board is bare.' });
  });

  it(`puts up three fresh offers for ${REROLL_COST} point, none of those it replaces where it can`, () => {
    const board = read(hunter(40, 3, { bountyPoints: 2 }));
    const fresh = ok(rerollBoard(board, content));
    expect(fresh.bountyPoints).toBe(2 - REROLL_COST);
    // Five open, three shown: the two not shown, and then one of the three again.
    expect(fresh.bountyBoard).toHaveLength(2);
    for (const monster of posted(fresh)) expect(posted(board)).not.toContain(monster);
    expect(rerollBoard({ ...board, bountyPoints: 0 }, content)).toEqual({
      ok: false,
      reason: `Fresh notices cost ${REROLL_COST} bounty point.`,
    });
  });
});
describe('kills towards a bounty', () => {
  it('count the named monster while the bounty is held, up to the count and no further', () => {
    const start = ok(startFight(holding('rat', 6), 'rat', content));
    const hour = advance(start, HOUR, content);
    expect(hour.bestiary.rat!.kills).toBeGreaterThan(6);
    expect(hour.bounty).toEqual({ monster: 'rat', count: 6, done: 6, points: 3 });
    expect(bountyReady(hour)).toBe(true);
  });

  it('do not count another monster, nor anything without a bounty held', () => {
    const other = advance(ok(startFight(holding('mole'), 'rat', content)), HOUR, content);
    expect(other.bounty).toEqual({ monster: 'mole', count: 6, done: 0, points: 3 });
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

  it('pays the points it was offered at and coins, then shows a board without that monster', () => {
    const done = holding('rat', 6, 6, { bountyPoints: 4, coins: 10 });
    const paid = ok(handInBounty(done, content));
    expect(paid.bountyPoints).toBe(4 + 3);
    expect(paid.coins).toBe(10 + 3 * COINS_PER_POINT);
    expect(paid.bounty).toBeNull();
    expect(paid.lastBounty).toBe('rat');
    expect(posted(paid).sort()).toEqual(['bogle', 'mole']);
  });

  it('pays a bounty from before offers carried their pay what its monster’s row did', () => {
    const old = hunter(5, 1, { bounty: { monster: 'mole', count: 6, done: 6 } });
    // The test's mole row pays its level and one.
    expect(ok(handInBounty(old, content)).bountyPoints).toBe(3);
  });

  it('never offers the same monster twice running while anything else is open', () => {
    let state = read(hunter(40, 9));
    let last = '';
    for (let round = 0; round < 60; round += 1) {
      state = ok(takeBounty(state, content));
      expect(state.bounty!.monster).not.toBe(last);
      last = state.bounty!.monster;
      state = ok(handInBounty({ ...state, bounty: { ...state.bounty!, done: 1e6 } }, content));
    }
  });

  it('counts bounties handed in, and the run of them since the last one given up', () => {
    const done = (state: GameState): GameState => ({
      ...state,
      bounty: { ...state.bounty!, done: state.bounty!.count },
    });
    const first = ok(handInBounty(holding('rat', 6, 6), content));
    expect(first.stats).toEqual({ bounties: 1, streak: 1, bestStreak: 1 });
    const second = ok(handInBounty(done(ok(takeBounty(first, content))), content));
    expect(second.stats).toEqual({ bounties: 2, streak: 2, bestStreak: 2 });
    const given = ok(
      giveUpBounty({ ...ok(takeBounty(second, content)), bountyPoints: 10 }, content),
    );
    expect(given.stats).toEqual({ bounties: 2, streak: 0, bestStreak: 2 });
    const third = ok(handInBounty(done(ok(takeBounty(given, content))), content));
    expect(third.stats).toEqual({ bounties: 3, streak: 1, bestStreak: 2 });
  });

  it('ends a fight with a bounty-only monster once its bounty is handed in', () => {
    const fighting = advance(ok(startFight(holding('bogle', 5), 'bogle', content)), HOUR, content);
    expect(fighting.fight?.monster).toBe('bogle');
    expect(bountyReady(fighting)).toBe(true);
    const paid = ok(handInBounty(fighting, content));
    expect(paid.fight).toBeNull();
  });
});

describe('giving up', () => {
  it('costs three points, or what there is, and shows a board without that monster', () => {
    const rich = holding('rat', 6, 3, { bountyPoints: 10 });
    expect(giveUpCost(rich)).toBe(GIVE_UP_COST);
    const given = ok(giveUpBounty(rich, content));
    expect(given.bountyPoints).toBe(7);
    expect(given.bounty).toBeNull();
    expect(given.lastBounty).toBe('rat');
    expect(posted(given)).not.toContain('rat');
    const poor = holding('rat', 6, 0, { bountyPoints: 1 });
    expect(giveUpCost(poor)).toBe(1);
    expect(ok(giveUpBounty(poor, content)).bountyPoints).toBe(0);
    expect(ok(giveUpBounty(holding('rat'), content)).bountyPoints).toBe(0);
  });

  it('offers the same again only when nothing else is open', () => {
    const alone = ok(
      giveUpBounty(hunter(1, 1, { bounty: { monster: 'rat', count: 5, done: 0 } }), content),
    );
    expect(posted(alone)).toEqual(['rat']);
  });

  it('ends a fight with a bounty-only monster given up on', () => {
    const fighting = ok(startFight(holding('bogle'), 'bogle', content));
    expect(ok(giveUpBounty(fighting, content)).fight).toBeNull();
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
    expect(state.bounty).toEqual({ monster: 'rat', count: 8, done: 8, points: 3 });
    expect(report!.bounty).toEqual({ monster: 'rat', gained: 7, done: 8, count: 8, ready: true });
  });

  it('says nothing of a bounty on something else', () => {
    const start = ok(startFight(holding('mole'), 'rat', content));
    expect(catchUp(start, HOUR, content).report!.bounty).toBeNull();
  });
});

describe('auto bounty', () => {
  // The test's ogre made harmless, so a long hunt across everything is not cut short by it.
  const tame: Content = {
    ...content,
    monsters: { ...content.monsters!, ogre: { ...content.monsters!.ogre!, attack: 1, maxHit: 1 } },
  };
  /** Fighting rats with a bounty on them and auto bounty on, at combat level 40: everything is open. */
  const auto = (count = 3, extra: Partial<GameState> = {}): GameState =>
    ok(
      startFight(
        hunter(40, 4, {
          bounty: { monster: 'rat', count, done: 0, points: 2 },
          autoBounty: true,
          ...extra,
        }),
        'rat',
        tame,
      ),
    );

  it('hands in on the kill that finishes it, takes the next and fights that monster on', () => {
    const start = auto();
    const test = (state: GameState): boolean => (state.stats.bounties ?? 0) > 0;
    let lo = 0;
    let hi = HOUR;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (test(advance(start, mid, tame))) hi = mid;
      else lo = mid;
    }
    const before = advance(start, hi - 1, tame);
    const after = advance(start, hi, tame);
    expect(before.bounty).toMatchObject({ monster: 'rat', done: 2 });
    expect(after.bestiary.rat!.kills).toBe(3);
    expect(after.bountyPoints).toBe(2);
    expect(after.coins - before.coins).toBeGreaterThanOrEqual(2 * COINS_PER_POINT);
    expect(after.stats).toMatchObject({ bounties: 1, streak: 1 });
    expect(after.lastBounty).toBe('rat');
    // The next is taken straight away, on another monster, and the fight is now on it.
    expect(after.bounty!.monster).not.toBe('rat');
    expect(after.bounty!.done).toBe(0);
    expect(after.bountyBoard).toEqual([]);
    expect(after.fight!.monster).toBe(after.bounty!.monster);
    expect(after.fight!.foeHp).toBe(0);
  });

  it('chains bounty after bounty, never the same twice running', () => {
    const day = advance(auto(), 24 * HOUR, tame);
    expect(day.stats.bounties ?? 0).toBeGreaterThan(20);
    expect(day.fight).not.toBeNull();
  });

  it('lands in the same place however the time is cut, live or away', () => {
    const start = auto(4);
    const total = 3 * HOUR;
    const whole = advance(start, total, tame);
    expect(whole.stats.bounties ?? 0).toBeGreaterThan(3);
    for (const cut of [1, 777, 20 * 60 * 1000, HOUR + 12_345, total - 1]) {
      expect(advance(advance(start, cut, tame), total - cut, tame), `cut at ${cut}`).toEqual(whole);
    }
    let live = start;
    // Which monsters' bounties were handed in, watched frame by frame.
    const paidOn = new Set<string>();
    for (let spent = 0; spent < HOUR; spent += 16) {
      const was = live;
      live = advance(live, 16, tame);
      if ((live.stats.bounties ?? 0) > (was.stats.bounties ?? 0)) paidOn.add(was.bounty!.monster);
    }
    const away = catchUp(start, HOUR, tame);
    expect(away.state).toEqual(live);
    // The away report says what it handed in, and on which monsters.
    expect(away.report!.claimed).toEqual({
      bounties: live.stats.bounties,
      points: live.bountyPoints,
      monsters: Object.keys(tame.monsters!).filter((id) => paidOn.has(id)),
    });
    expect(paidOn.size).toBeGreaterThan(1);
    expect(away.report!.bounty).toMatchObject({
      monster: live.bounty!.monster,
      done: live.bounty!.done,
    });
  });

  it('does nothing while switched off, and claims one already done when switched on', () => {
    const off = advance(auto(3, { autoBounty: false }), HOUR, tame);
    expect(off.bounty).toMatchObject({ monster: 'rat', done: 3 });
    expect(off.stats.bounties).toBeUndefined();
    const on = setAutoBounty(off, true, tame);
    expect(on.autoBounty).toBe(true);
    expect(on.stats.bounties).toBe(1);
    expect(on.fight!.monster).toBe(on.bounty!.monster);
    expect(setAutoBounty(on, false, tame).autoBounty).toBe(false);
    // Off, a done bounty waits to be handed in by hand.
    expect(autoHandIn({ ...off, autoBounty: false }, tame)).toEqual({ ...off, autoBounty: false });
  });

  it('hands in a bounty a dungeon run finishes', () => {
    const held = hunter(40, 2, {
      bounty: { monster: 'rat', count: 3, done: 1, points: 2 },
      autoBounty: true,
    });
    const settled = settleRun(held, { kills: { rat: 5 } }, tame);
    expect(settled.stats.bounties).toBe(1);
    expect(settled.bounty!.monster).not.toBe('rat');
  });
});
