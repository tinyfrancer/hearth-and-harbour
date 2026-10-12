import type { Content } from '../core/content';
import { remembered } from '../core/remembered';
import type { GameState } from '../core/state';
import { tierOf, tierUnlocked } from '../core/tiers';
import { button, h } from './dom';
import { tierChip } from './tierMarks';

/*
 * The moment a tier opens (S22): a card at the top of the Skills tab listing
 * what the first clear of its dungeon opened, skill by skill, shown until put
 * away and then remembered for good in the save (`seen`), so it is never
 * shown twice on any phone. A save that cleared the grotto before tier 2
 * existed is shown it once, on its first visit after.
 */

/** The `seen` key that remembers a tier's card was put away. */
export const tierSeenKey = (tier: number): string => `tier.${tier}.opened`;

/** The highest tier whose card is due: open, with rows in the tables, and never put away. */
export function tierCardDue(state: GameState, content: Content): number | null {
  const tiers = [...new Set(Object.values(content.actions).map(tierOf))].filter((tier) => tier > 1);
  const due = tiers.filter(
    (tier) => tierUnlocked(state, tier, content) && !remembered(state, tierSeenKey(tier)),
  );
  return due.length > 0 ? Math.max(...due) : null;
}

/** "levels 20–34", or "level 20" for one. */
const levelsText = (levels: readonly number[]): string => {
  const [low, high] = [Math.min(...levels), Math.max(...levels)];
  return low === high ? `level ${low}` : `levels ${low}–${high}`;
};

/**
 * What a tier opened, as short lines: each skill's count of new things and
 * their levels, then where to fight, then the shops. Short so the card fits
 * a 360-wide phone in a line a row (wave 20); each skill's page names them.
 */
export function tierOpenedLines(tier: number, content: Content): { head: string; text: string }[] {
  const lines: { head: string; text: string }[] = [];
  for (const skill of Object.values(content.skills)) {
    const rows = Object.values(content.actions).filter(
      (action) => action.skill === skill.id && tierOf(action) === tier,
    );
    if (rows.length === 0) continue;
    lines.push({
      head: skill.name,
      text: `${rows.length} new · ${levelsText(rows.map((action) => action.level))}`,
    });
  }
  for (const area of Object.values(content.areas ?? {})) {
    if (tierOf(area) !== tier) continue;
    const monsters = Object.values(content.monsters ?? {}).filter((m) => m.area === area.id);
    if (monsters.length === 0) continue;
    const bounty = monsters.every((m) => m.bountyOnly);
    lines.push({
      head: area.name,
      text: `${monsters.length} ${bounty ? 'for bounties' : 'to fight'} · ${levelsText(monsters.map((m) => m.level))}`,
    });
  }
  const shops = [
    Object.values(content.store ?? {}).some((entry) => tierOf(entry) === tier) && 'store',
    Object.values(content.shop ?? {}).some((entry) => tierOf(entry) === tier) && 'bounty shop',
  ].filter((name): name is string => Boolean(name));
  if (shops.length > 0) lines.push({ head: 'Shops', text: `new stock: ${shops.join(', ')}` });
  return lines;
}

/** The card itself: what opened, and a button to put it away for good. */
export function tierOpenedCard(tier: number, content: Content, dismiss: () => void): HTMLElement {
  return h(
    'section',
    { class: 'panel stack tight tier-opened', attrs: { 'data-tier-opened': String(tier) } },
    [
      h('div', { class: 'card-head' }, [h('h2', { text: `Tier ${tier} is open` }), tierChip(tier)]),
      h('p', { class: 'small', text: 'New in every skill from level 20:' }),
      h(
        'ul',
        { class: 'tier-list' },
        tierOpenedLines(tier, content).map(({ head, text }) =>
          h('li', { class: 'small' }, [
            h('span', { class: 'tier-list-head', text: head }),
            h('span', { class: 'tier-list-text', text }),
          ]),
        ),
      ),
      h('div', { class: 'row' }, [button('Got it', dismiss, 'primary')]),
    ],
  );
}
