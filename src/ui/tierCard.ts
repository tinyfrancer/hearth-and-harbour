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

/** What a tier opened, as lines: each skill's new actions with their levels, then where to fight. */
export function tierOpenedLines(tier: number, content: Content): { head: string; text: string }[] {
  const lines: { head: string; text: string }[] = [];
  for (const skill of Object.values(content.skills)) {
    const rows = Object.values(content.actions)
      .filter((action) => action.skill === skill.id && tierOf(action) === tier)
      .sort((a, b) => a.level - b.level);
    if (rows.length === 0) continue;
    // A long list (Smithing's set, Crafting's leathers) is told in a line, so the card fits a phone.
    lines.push({
      head: skill.name,
      text:
        rows.length > 5
          ? `${rows.length} new, levels ${rows[0]!.level} to ${rows.at(-1)!.level}`
          : rows.map((action) => `${action.name} ${action.level}`).join(' · '),
    });
  }
  for (const area of Object.values(content.areas ?? {})) {
    if (tierOf(area) !== tier) continue;
    const monsters = Object.values(content.monsters ?? {}).filter((m) => m.area === area.id);
    if (monsters.length === 0) continue;
    const bounty = monsters.every((m) => m.bountyOnly);
    lines.push({
      head: area.name,
      text: `${monsters.map((m) => `${m.name} ${m.level}`).join(' · ')}${bounty ? ' (with a bounty on them)' : ''}`,
    });
  }
  const shops = [
    Object.values(content.store ?? {}).some((entry) => tierOf(entry) === tier) &&
      'the general store',
    Object.values(content.shop ?? {}).some((entry) => tierOf(entry) === tier) && 'the bounty shop',
  ].filter((name): name is string => Boolean(name));
  if (shops.length > 0) lines.push({ head: 'Shops', text: `New stock in ${shops.join(' and ')}.` });
  return lines;
}

/** The card itself: what opened, and a button to put it away for good. */
export function tierOpenedCard(tier: number, content: Content, dismiss: () => void): HTMLElement {
  return h(
    'section',
    { class: 'panel stack tight tier-opened', attrs: { 'data-tier-opened': String(tier) } },
    [
      h('div', { class: 'card-head' }, [h('h2', { text: `Tier ${tier} is open` }), tierChip(tier)]),
      h('p', {
        class: 'small',
        text: 'The way past the grotto is clear. New things to do in every skill, from level 20:',
      }),
      h(
        'ul',
        { class: 'tier-list' },
        tierOpenedLines(tier, content).map(({ head, text }) =>
          h('li', { class: 'small' }, [
            h('span', { class: 'tier-list-head', text: head }),
            ` ${text}`,
          ]),
        ),
      ),
      h('div', { class: 'row' }, [button('Got it', dismiss, 'primary')]),
    ],
  );
}
