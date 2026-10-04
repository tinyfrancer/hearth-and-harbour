import type { ItemDef } from '../core/content';

export const ITEMS = {
  pine_logs: {
    id: 'pine_logs',
    name: 'Pine logs',
    description: 'Sticky with sap. Burns fast and smells like a good morning.',
  },
  oak_logs: {
    id: 'oak_logs',
    name: 'Oak logs',
    description: 'Heavy, straight-grained, and worth the sore shoulders.',
  },
  willow_logs: {
    id: 'willow_logs',
    name: 'Willow logs',
    description: 'Light and springy. It bends a long way before it complains.',
  },
} satisfies Record<string, ItemDef>;
