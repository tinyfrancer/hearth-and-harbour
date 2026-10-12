import { beforeEach, describe, expect, it } from 'vitest';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp, type App } from '../../src/ui/app';
import { tierOpenedLines } from '../../src/ui/tierCard';

// Tier 2 in the menus (S22), driven the way a thumb would: shown to everyone,
// closed with the reason until the grotto is cleared, legible wherever lists
// grow long, and a card once when it opens.
let root: HTMLElement;
let clock: number;
const saves = () => new LocalStorageSaveService();
const saved = (): GameState => saves().load()!;
const GROTTO = { brinebeards_grotto: { clears: 1, bestMs: 500_000 } };
const REASON = 'Locked: Clear Brinebeard’s Grotto.';

const q = <T extends HTMLElement>(selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`nothing matches ${selector}`);
  return found;
};
const tab = (id: string): void => q<HTMLButtonElement>(`.tab[data-tab="${id}"]`).click();
const lastToast = (): string => [...root.querySelectorAll('.toast')].at(-1)?.textContent ?? '';

function playing(extra: Partial<GameState> = {}): App {
  saves().save({ ...newGame('Cody', clock), ...extra });
  return mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
}
const level = (n: number): number => xpForLevel(n);

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
});

describe('a skill page with two tiers', () => {
  it('folds tier 2 for a newcomer, chip and reason in sight, every row there to see', () => {
    playing();
    q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
    const tier1 = q('[data-tier-toggle="1"]');
    const tier2 = q('[data-tier-toggle="2"]');
    expect(tier1.getAttribute('aria-expanded')).toBe('true');
    expect(tier2.getAttribute('aria-expanded')).toBe('false');
    expect(tier1.textContent).toContain('Levels 1–15');
    expect(tier2.querySelector('[data-tier-chip="2"]')!.classList).toContain('closed');
    expect(q('[data-tier="2"] > [data-tier-lock]').textContent).toBe(REASON);
    // Unfolded, its rows are there, each locked and saying why.
    tier2.click();
    const yew = q('[data-action="chop_yew"]');
    expect(yew.classList).toContain('locked');
    expect(yew.textContent).toContain('Level 34');
    expect(yew.textContent).toContain(REASON);
  });

  it('opens tier 2 at once for a level-30 character who clears the grotto, and starts its rows', () => {
    playing({ skills: { woodcutting: level(30) } });
    q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
    // Level 30 but no grotto: tier 1 is where to work, tier 2 says why not yet.
    expect(q('[data-tier-toggle="1"]').getAttribute('aria-expanded')).toBe('true');
    q<HTMLButtonElement>('[data-tier-toggle="2"]').click();
    expect(root.querySelector('button[data-action="chop_elm"]')).toBeNull();
    root.replaceChildren();
    playing({ skills: { woodcutting: level(30) }, dungeons: GROTTO, seen: ['tier.2.opened'] });
    q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
    expect(q('[data-tier-toggle="2"]').getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('[data-tier="2"] > [data-tier-lock]')).toBeNull();
    expect(q('[data-tier-toggle="2"]').textContent).toContain('Levels 20–34');
    q<HTMLButtonElement>('button[data-action="chop_elm"]').click();
    expect(saved().action?.id).toBe('chop_elm');
    // Yew's level is still to come.
    expect(q('[data-action="chop_yew"]').textContent).not.toContain('Locked');
  });

  it('keeps Smithing’s groups under each tier, the newest that can be made open', () => {
    playing({ skills: { smithing: level(60) } });
    q<HTMLButtonElement>('[data-skill="smithing"]').click();
    // Without the grotto, iron is the newest that can be made.
    expect(q('[data-group-toggle="Iron"]').getAttribute('aria-expanded')).toBe('true');
    expect(q('[data-tier="2"]').contains(q('[data-group="Salt-iron"]'))).toBe(true);
    expect(q('[data-tier="1"]').contains(q('[data-group="Iron"]'))).toBe(true);
  });

  it('lists tier 2’s marks on Thieving, closed with the reason', () => {
    playing({ skills: { thieving: level(25) } });
    q<HTMLButtonElement>('[data-skill="thieving"]').click();
    q<HTMLButtonElement>('[data-tier-toggle="2"]').click();
    const merchant = q('[data-action="steal_spice_merchant"]');
    expect(merchant.classList).toContain('locked');
    expect(merchant.textContent).toContain(REASON);
  });
});

describe('the Combat page and the shops', () => {
  it('lists tier 2’s areas with their chip, closed with the reason until the grotto is cleared', () => {
    playing();
    q<HTMLButtonElement>('[data-combat]').click();
    const edge = q('[data-area="thistlewood_edge"]');
    expect(edge.querySelector('[data-tier-chip="2"]')!.classList).toContain('closed');
    expect(edge.querySelector('[data-tier-lock]')!.textContent).toBe(REASON);
    const brigand = q('[data-monster="brigand"]');
    expect(brigand.classList).toContain('locked');
    brigand.click();
    expect(lastToast()).toBe('Clear Brinebeard’s Grotto.');
    expect(saved().fight).toBeNull();
  });

  it('opens them once it is cleared', () => {
    playing({ dungeons: GROTTO, seen: ['tier.2.opened'] });
    q<HTMLButtonElement>('[data-combat]').click();
    const edge = q('[data-area="thistlewood_edge"]');
    expect(edge.querySelector('[data-tier-chip="2"]')!.classList).not.toContain('closed');
    expect(edge.querySelector('[data-tier-lock]')).toBeNull();
    q<HTMLButtonElement>('[data-monster="brigand"]').click();
    expect(saved().fight?.monster).toBe('brigand');
  });

  it('heads tier 2’s stock in the general store, closed with the reason', () => {
    playing({ coins: 100_000 });
    tab('bank');
    [...root.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => /general store/i.test(b.textContent ?? ''))!
      .click();
    expect(
      q('[data-store-grid="2"]').querySelector('[data-stock-cell="cooked_mackerel"]'),
    ).not.toBe(null);
    expect(root.textContent).toContain(REASON);
    q<HTMLButtonElement>('[data-stock-cell="cooked_mackerel"]').click();
    const buy = q<HTMLButtonElement>('[data-store-sheet] [data-buy="cooked_mackerel"]');
    expect(buy.disabled).toBe(true);
    expect(q('[data-store-sheet]').textContent).toContain('Clear Brinebeard’s Grotto.');
  });

  it('heads a later tier’s things in the bank’s type sort, under their kind', () => {
    playing({ bank: { pine_logs: 3, driftwood: 2, cooked_mackerel: 1 } });
    tab('bank');
    const headings = [...root.querySelectorAll('[data-heading]')].map((el) => el.textContent);
    expect(headings).toEqual(['Resources', 'Resources · Tier 2', 'Food · Tier 2']);
    q<HTMLButtonElement>('[data-item="driftwood"]').click();
    expect(q('[data-card="driftwood"]').textContent).toContain('Resources · Tier 2');
  });
});

describe('the moment tier 2 opens', () => {
  it('shows a card of what opened at the top of the Skills tab, once, remembered in the save', () => {
    playing({ dungeons: GROTTO });
    const card = q('[data-tier-opened="2"]');
    expect(card.textContent).toContain('Tier 2 is open');
    expect(card.textContent).toContain('Woodcutting3 new · levels 20–34');
    expect(card.textContent).toContain('Thistlewood’s Edge');
    [...card.querySelectorAll('button')].find((b) => b.textContent === 'Got it')!.click();
    expect(root.querySelector('[data-tier-opened]')).toBeNull();
    expect(saved().seen).toContain('tier.2.opened');
    // Never again, on a fresh mount.
    root.replaceChildren();
    mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
    expect(root.querySelector('[data-tier-opened]')).toBeNull();
  });

  it('is not shown before the grotto is cleared', () => {
    playing();
    expect(root.querySelector('[data-tier-opened]')).toBeNull();
  });

  it('lists every skill with tier 2 rows, then where to fight, then the shops', () => {
    const lines = tierOpenedLines(2, CONTENT);
    expect(lines.map((line) => line.head)).toEqual([
      'Woodcutting',
      'Fishing',
      'Mining',
      'Foraging',
      'Cooking',
      'Smithing',
      'Crafting',
      'Fletching',
      'Alchemy',
      'Thieving',
      'Thistlewood’s Edge',
      'The Deepthorn',
      'Shops',
    ]);
    expect(lines.at(-2)!.text).toBe('2 for bounties · levels 29–37');
    expect(lines.at(-3)!.text).toBe('5 to fight · levels 23–39');
    expect(lines.at(-1)!.text).toBe('new stock: store, bounty shop');
  });
});
