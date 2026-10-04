import type { ItemDef } from '../core/content';

// In the order the bank lists them.
export const ITEMS = {
  pine_logs: {
    id: 'pine_logs',
    name: 'Pine logs',
    description: 'Sticky with sap. Burns fast and smells like a good morning.',
    value: 1,
  },
  oak_logs: {
    id: 'oak_logs',
    name: 'Oak logs',
    description: 'Heavy, straight-grained, and worth the sore shoulders.',
    value: 3,
  },
  willow_logs: {
    id: 'willow_logs',
    name: 'Willow logs',
    description: 'Light and springy. It bends a long way before it complains.',
    value: 6,
  },
  raw_shrimp: {
    id: 'raw_shrimp',
    name: 'Raw shrimp',
    description: 'A netful from the shallows. More legs than anyone asked for.',
    value: 2,
  },
  raw_herring: {
    id: 'raw_herring',
    name: 'Raw herring',
    description: 'Silver, oily, and never caught alone.',
    value: 5,
  },
  raw_cod: {
    id: 'raw_cod',
    name: 'Raw cod',
    description: 'A proper fish. It looks faintly disappointed in you.',
    value: 9,
  },
  copper_ore: {
    id: 'copper_ore',
    name: 'Copper ore',
    description: 'Green on the outside, a soft red-gold within.',
    value: 2,
  },
  tin_ore: {
    id: 'tin_ore',
    name: 'Tin ore',
    description: 'Dull grey and lighter than it looks. Not much on its own.',
    value: 5,
  },
  iron_ore: {
    id: 'iron_ore',
    name: 'Iron ore',
    description: 'Rust-brown and heavy. The rock gives it up grudgingly.',
    value: 9,
  },
  seashells: {
    id: 'seashells',
    name: 'Seashells',
    description: 'Whole ones, picked over at low tide. The gulls took the rest.',
    value: 1,
  },
  flax: {
    id: 'flax',
    name: 'Flax',
    description: 'Blue-flowered stalks. Tough fibre once you have beaten it enough.',
    value: 3,
  },
  sageleaf: {
    id: 'sageleaf',
    name: 'Sageleaf',
    description: 'A grey-green herb. Smells clean and tastes like a mistake.',
    value: 5,
  },
  glowcap: {
    id: 'glowcap',
    name: 'Glowcap',
    description: 'A pale mushroom that shines a little in the dark. Do not eat it raw.',
    value: 9,
  },
} satisfies Record<string, ItemDef>;
