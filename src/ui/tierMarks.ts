import { lockIcon, tierBadge } from '../art/icons';
import { h } from './dom';

/**
 * How the menus make tiers legible (S22): a mark naming a row's tier beside a
 * heading, and a line saying why a closed tier is closed. Tier 1 is the whole
 * game before the grotto, so it carries no mark of its own unless a list also
 * holds a later tier.
 *
 * Wave 20: the mark is lane B's badge (`tierBadge`, a small shield with the
 * tier's numeral) beside the words "Tier n", and a closed tier's badge is
 * dulled; a row not yet open wears lane B's padlock (`lockIcon`). Neither
 * picture is the only thing that says it: the words beside the badge, and
 * the "Locked: …" line, say it too, and each picture carries its label for a
 * screen reader.
 */

/** Lane B draws badges for tiers 1 to 4. */
const badgeFor = (tier: number): Element =>
  tierBadge(Math.min(4, Math.max(1, Math.round(tier))) as 1 | 2 | 3 | 4);

/** "Tier 2", as a badge and its words beside a heading. Bright when open, dulled while closed. */
export function tierChip(tier: number, open = true): HTMLElement {
  return h(
    'span',
    {
      class: `tier-chip${open ? '' : ' closed'}`,
      attrs: { 'data-tier-chip': String(tier) },
    },
    // The badge says the tier to a screen reader; the words are for the eye alone, said once.
    [
      badgeFor(tier),
      h('span', { class: 'tier-word', text: `Tier ${tier}`, attrs: { 'aria-hidden': 'true' } }),
    ],
  );
}

/** "Locked: Clear Brinebeard’s Grotto.", under a heading or on a row. */
export function tierLockLine(reason: string): HTMLElement {
  return h('p', {
    class: 'small tier-lock',
    attrs: { 'data-tier-lock': '' },
    text: `Locked: ${reason}`,
  });
}

/** A locked row's heading: the padlock, then its name, as `titled` lays out an icon and a name. */
export function lockedTitle(name: string): HTMLElement {
  const lock = lockIcon();
  lock.classList.add('lock-icon');
  return h('h2', { class: 'titled' }, [lock, name]);
}
