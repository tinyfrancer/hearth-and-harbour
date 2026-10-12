import { h } from './dom';

/**
 * How the menus make tiers legible (S22): a small chip naming a row's tier
 * beside a heading, and a line saying why a closed tier is closed. Tier 1 is
 * the whole game before the grotto, so it carries no chip of its own unless a
 * list also holds a later tier.
 */

/** "Tier 2", as a chip beside a heading. Gold when open, dull while closed. */
export function tierChip(tier: number, open = true): HTMLElement {
  return h('span', {
    class: `tier-chip${open ? '' : ' closed'}`,
    attrs: { 'data-tier-chip': String(tier) },
    text: `Tier ${tier}`,
  });
}

/** "Locked: Clear Brinebeard’s Grotto.", under a heading or on a row. */
export function tierLockLine(reason: string): HTMLElement {
  return h('p', {
    class: 'small tier-lock',
    attrs: { 'data-tier-lock': '' },
    text: `Locked: ${reason}`,
  });
}
