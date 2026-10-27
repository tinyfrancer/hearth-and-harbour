import { describe, expect, it } from 'vitest';
import { advance, startAction } from '../../src/core/actions';
import { bountyChoices, buyFromShop, readBoard } from '../../src/core/bounty';
import { foeXp, startFight } from '../../src/core/combat';
import { settleRun } from '../../src/core/run';
import { newGame, skillLevel, type GameState } from '../../src/core/state';
import { buyFromStore } from '../../src/core/store';
import {
  actionLock,
  itemTier,
  monsterLock,
  tierLock,
  tierOf,
  tierUnlocked,
  tiersIn,
} from '../../src/core/tiers';
import { xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';

// Tiers (S22): tier 2 is shown to everyone and opens on the grotto's first
// clear, read from the clears the save keeps.
const at = (skills: Record<string, number>, extra: Partial<GameState> = {}): GameState => ({
  ...newGame('Cody', 0),
  skills: Object.fromEntries(Object.entries(skills).map(([id, level]) => [id, xpForLevel(level)])),
  ...extra,
});
const cleared = (state: GameState): GameState =>
  settleRun(state, { cleared: 'brinebeards_grotto', timeMs: 500_000 }, CONTENT);
const GROTTO = 'Clear Brinebeard’s Grotto.';

describe('tiers', () => {
  it('reads a row’s tier, the first if it has none', () => {
    expect(tierOf({})).toBe(1);
    expect(tierOf({ tier: 2 })).toBe(2);
    expect(tierOf({ tier: 0 })).toBe(1);
    expect(tierOf({ tier: 1.5 })).toBe(1);
    expect(tiersIn([{}, { tier: 2 }, {}, { tier: 2 }])).toEqual([1, 2]);
  });

  it('opens tier 2 on the grotto’s first clear and names it while closed', () => {
    const fresh = newGame('Cody', 0);
    expect(tierUnlocked(fresh, 1, CONTENT)).toBe(true);
    expect(tierUnlocked(fresh, 2, CONTENT)).toBe(false);
    expect(tierLock(fresh, 2, CONTENT)).toBe(GROTTO);
    expect(tierLock(cleared(fresh), 2, CONTENT)).toBeNull();
    // Tier 3's dungeon is charted since wave 20 (it said "Not open yet." while it waited).
    expect(tierLock(cleared(fresh), 3, CONTENT)).toBe('Clear Thistlewood Burrow.');
    expect(tierLock(cleared(fresh), 4, CONTENT)).toBe('Not open yet.');
  });

  // Wave 20: the burrow opens tier 3, which has no rows yet: open, honestly, with nothing in it.
  it('opens tier 3 on the burrow’s first clear, once the burrow is charted', () => {
    const burrow = CONTENT.dungeons!.thistlewood_burrow!;
    const open = {
      ...CONTENT,
      dungeons: { ...CONTENT.dungeons, thistlewood_burrow: { ...burrow, comingSoon: false } },
    };
    const past = cleared(at({ melee: 40 }));
    expect([tierUnlocked(past, 3, open), tierLock(past, 3, open)]).toEqual([
      false,
      'Clear Thistlewood Burrow.',
    ]);
    const through = settleRun(past, { cleared: 'thistlewood_burrow', timeMs: 500_000 }, open);
    expect([tierUnlocked(through, 3, open), tierLock(through, 3, open)]).toEqual([true, null]);
    expect(tierUnlocked(through, 4, open)).toBe(false);
    // While it waits to open, nothing counts: tier 3 is not open yet, and says so.
    const early = settleRun(past, { cleared: 'thistlewood_burrow', timeMs: 500_000 }, CONTENT);
    expect([tierUnlocked(early, 3, CONTENT), tierLock(early, 3, CONTENT)]).toEqual([
      burrow.comingSoon !== true,
      burrow.comingSoon ? 'Not open yet.' : null,
    ]);
  });

  it('closes a tier 2 action to a level-30 character until the grotto is cleared, then opens it at once', () => {
    const state = at({ woodcutting: 30 });
    expect(actionLock(state, CONTENT.actions.chop_elm!, CONTENT)).toBe(GROTTO);
    expect(startAction(state, 'chop_elm', CONTENT)).toEqual({ ok: false, reason: GROTTO });
    // Tier 1 is untouched.
    expect(startAction(state, 'chop_willow', CONTENT).ok).toBe(true);
    const after = cleared(state);
    expect(startAction(after, 'chop_elm', CONTENT).ok).toBe(true);
    // Its level still counts, once the tier is open.
    expect(startAction(after, 'chop_yew', CONTENT)).toEqual({
      ok: false,
      reason: 'Needs Woodcutting level 34.',
    });
    // And time passes for it as for any action.
    const started = startAction(after, 'chop_elm', CONTENT);
    if (!started.ok) throw new Error(started.reason);
    const later = advance(started.state, 60_000, CONTENT);
    expect(later.bank.elm_logs).toBe(12);
    expect(skillLevel(later, 'woodcutting')).toBe(30);
  });

  it('closes tier 2’s monsters until then, and posts no bounty on them', () => {
    const state = at({ melee: 40, defence: 40, vitality: 40 });
    const brigand = CONTENT.monsters!.brigand!;
    expect(monsterLock(state, brigand, CONTENT)).toBe(GROTTO);
    expect(startFight(state, 'brigand', CONTENT)).toEqual({ ok: false, reason: GROTTO });
    expect(bountyChoices(state, CONTENT).some((monster) => monster.tier)).toBe(false);
    const board = readBoard(state, CONTENT);
    if (!board.ok) throw new Error(board.reason);
    expect(board.state.bountyBoard.every((offer) => !CONTENT.monsters![offer.monster]!.tier)).toBe(
      true,
    );
    const after = cleared(state);
    expect(startFight(after, 'brigand', CONTENT).ok).toBe(true);
    expect(bountyChoices(after, CONTENT).some((monster) => monster.tier === 2)).toBe(true);
  });

  it('sells tier 2’s stock only once it is open, saying why', () => {
    const rich = at({}, { coins: 1_000_000, bountyPoints: 1000 });
    expect(buyFromStore(rich, 'cooked_mackerel', CONTENT)).toEqual({ ok: false, reason: GROTTO });
    expect(buyFromShop(rich, 'broadhead_arrows', CONTENT)).toEqual({ ok: false, reason: GROTTO });
    expect(buyFromStore(cleared(rich), 'cooked_mackerel', CONTENT).ok).toBe(true);
    expect(buyFromShop(cleared(rich), 'broadhead_arrows', CONTENT).ok).toBe(true);
  });

  it('gives an item the lowest tier of anything that gives it', () => {
    expect(itemTier(CONTENT, 'pine_logs')).toBe(1);
    expect(itemTier(CONTENT, 'driftwood')).toBe(2);
    // The grotto opens tier 2, so its loot is tier 1's; the burrow's is tier 2's.
    expect(itemTier(CONTENT, 'doubloon')).toBe(1);
    expect(itemTier(CONTENT, 'amber')).toBe(2);
    // Pearls come from tier 1 crabs as well as tier 2 thieves.
    expect(itemTier(CONTENT, 'pearl')).toBe(1);
    expect(itemTier(CONTENT, 'nothing_at_all')).toBe(1);
  });

  it('pays a monster’s XP at its rate, a whole number a blow, tier 1’s as before', () => {
    expect(foeXp(15, {})).toBe(15);
    expect(foeXp(15, { xpPercent: 270 })).toBe(41);
    expect(foeXp(10, { xpPercent: 270 })).toBe(27);
    for (const monster of Object.values(CONTENT.monsters!))
      expect(foeXp(10, monster), monster.id).toBe(monster.tier === 2 ? 27 : 10);
  });
});
