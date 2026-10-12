import type { StoreEntry } from '../core/content';

// The general store, in the order it lists its stock. It buys anything at its
// sale value (the bank's Sell) and sells two kinds of thing for coins:
//
// - The first tools of each trade, so a new player is never stuck: a weapon
//   for each style, arrows, food for the food slot, and vials for Alchemy.
//   Each lot costs about twice what it sells for, so making things is always
//   the cheaper way and buying to sell back never pays
//   (tests/data/content.test.ts).
// - Two dear things to save for, at a few hours' earnings each
//   (tests/data/pacing.test.ts shows what an hour earns).
export const STORE = {
  bronze_sword: { id: 'bronze_sword', item: 'bronze_sword', qty: 1, price: 500 },
  pine_shortbow: { id: 'pine_shortbow', item: 'pine_shortbow', qty: 1, price: 200 },
  bronze_arrows: { id: 'bronze_arrows', item: 'bronze_arrows', qty: 50, price: 1500 },
  cooked_shrimp: { id: 'cooked_shrimp', item: 'cooked_shrimp', qty: 10, price: 600 },
  shell_vial: { id: 'shell_vial', item: 'shell_vial', qty: 5, price: 180 },
  // Tier 2's first fish and arrows, for a hero just back from the grotto (S22).
  cooked_mackerel: {
    id: 'cooked_mackerel',
    item: 'cooked_mackerel',
    qty: 10,
    price: 2700,
    tier: 2,
  },
  salt_iron_arrows: {
    id: 'salt_iron_arrows',
    item: 'salt_iron_arrows',
    qty: 50,
    price: 2800,
    tier: 2,
  },
  potion_case: {
    id: 'potion_case',
    price: 150_000,
    perk: {
      name: 'Cork-lined potion case',
      description: 'Keeps every bottle snug, dark and the right way up.',
      effect:
        'Every potion you drink from now on helps 50% more actions: one that helps 150 actions helps 225.',
      shows: ['potions'],
      potionCharges: 50,
    },
  },
  velvet_cap: { id: 'velvet_cap', item: 'velvet_cap', qty: 1, price: 75_000, once: true },
} satisfies Record<string, StoreEntry>;
