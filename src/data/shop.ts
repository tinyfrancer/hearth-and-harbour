import type { ShopEntry } from '../core/content';

// The bounty shop, in the order it lists them: things bounty points buy and
// nothing else gives. A bounty near the character's level pays a handful of
// points for ten to twenty minutes' work (src/data/monsters.ts), so the hat is
// an evening's hunting and the charm a few.
export const SHOP = {
  feathered_hat: { id: 'feathered_hat', item: 'feathered_hat', qty: 1, cost: 30, once: true },
  barbed_arrows: { id: 'barbed_arrows', item: 'barbed_arrows', qty: 150, cost: 20 },
  hunters_charm: { id: 'hunters_charm', item: 'hunters_charm', qty: 1, cost: 90 },
  // Tier 2 (S22): for hunters past the grotto.
  broadhead_arrows: {
    id: 'broadhead_arrows',
    item: 'broadhead_arrows',
    qty: 150,
    cost: 30,
    tier: 2,
  },
} satisfies Record<string, ShopEntry>;
