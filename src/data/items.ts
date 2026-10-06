import type { ItemDef } from '../core/content';
import { skillsIn } from './skills';

// In the order the bank lists them: what is gathered, then what is made from it.
//
// What a thing gives when worn is its `equip`: the three totals S8's combat
// reads. Iron is about two thirds better than bronze; cloth and shells barely
// count, and are there for the look. A bow takes both hands, so it gives up a
// shield's armour and, with arrows, hits harder for it.
export const ITEMS = {
  pine_logs: {
    id: 'pine_logs',
    name: 'Pine logs',
    description: 'Sticky with sap. Burns fast and smells like a good morning.',
    value: 10,
  },
  oak_logs: {
    id: 'oak_logs',
    name: 'Oak logs',
    description: 'Heavy, straight-grained, and worth the sore shoulders.',
    value: 35,
  },
  willow_logs: {
    id: 'willow_logs',
    name: 'Willow logs',
    description: 'Light and springy. It bends a long way before it complains.',
    value: 70,
  },
  raw_shrimp: {
    id: 'raw_shrimp',
    name: 'Raw shrimp',
    description: 'A netful from the shallows. More legs than anyone asked for.',
    value: 20,
  },
  raw_herring: {
    id: 'raw_herring',
    name: 'Raw herring',
    description: 'Silver, oily, and never caught alone.',
    value: 45,
  },
  raw_cod: {
    id: 'raw_cod',
    name: 'Raw cod',
    description: 'A proper fish. It looks faintly disappointed in you.',
    value: 85,
  },
  copper_ore: {
    id: 'copper_ore',
    name: 'Copper ore',
    description: 'Green on the outside, a soft red-gold within.',
    value: 20,
  },
  tin_ore: {
    id: 'tin_ore',
    name: 'Tin ore',
    description: 'Dull grey and lighter than it looks. Not much on its own.',
    value: 55,
  },
  iron_ore: {
    id: 'iron_ore',
    name: 'Iron ore',
    description: 'Rust-brown and heavy. The rock gives it up grudgingly.',
    value: 100,
  },
  seashells: {
    id: 'seashells',
    name: 'Seashells',
    description: 'Whole ones, picked over at low tide. The gulls took the rest.',
    value: 10,
  },
  flax: {
    id: 'flax',
    name: 'Flax',
    description: 'Blue-flowered stalks. Tough fibre once you have beaten it enough.',
    value: 30,
  },
  sageleaf: {
    id: 'sageleaf',
    name: 'Sageleaf',
    description: 'A grey-green herb. Smells clean and tastes like a mistake.',
    value: 45,
  },
  glowcap: {
    id: 'glowcap',
    name: 'Glowcap',
    description: 'A pale mushroom that shines a little in the dark. Do not eat it raw.',
    value: 75,
  },
  cooked_shrimp: {
    id: 'cooked_shrimp',
    name: 'Cooked shrimp',
    description: 'Pink, curled and gone in one bite. Mind the legs.',
    value: 32,
    heals: 6,
  },
  cooked_herring: {
    id: 'cooked_herring',
    name: 'Cooked herring',
    description: 'Crisp skin, a lot of small bones, and worth every one of them.',
    value: 75,
    heals: 12,
  },
  cooked_cod: {
    id: 'cooked_cod',
    name: 'Cooked cod',
    description: 'Flakes apart at a look. It seems more at peace now.',
    value: 150,
    heals: 20,
  },
  bronze_bar: {
    id: 'bronze_bar',
    name: 'Bronze bar',
    description: 'Copper and tin, talked into getting along.',
    value: 100,
  },
  iron_bar: {
    id: 'iron_bar',
    name: 'Iron bar',
    description: 'Dark, dense and stubborn. Wants a lot of hitting.',
    value: 170,
  },
  bronze_axe: {
    id: 'bronze_axe',
    name: 'Bronze axe',
    description: 'Holds an edge for about a morning. A good morning, though.',
    value: 120,
    equip: { slot: 'main_hand', style: 'melee', attack: 4, strength: 6 },
  },
  bronze_sword: {
    id: 'bronze_sword',
    name: 'Bronze sword',
    description: 'Short, honest and a bit soft. Better than a stick.',
    value: 235,
    equip: { slot: 'main_hand', style: 'melee', attack: 6, strength: 5 },
  },
  bronze_helmet: {
    id: 'bronze_helmet',
    name: 'Bronze helmet',
    description: 'Rings like a bell when struck. Try not to find out.',
    value: 240,
    equip: { slot: 'head', armour: 4 },
  },
  bronze_shield: {
    id: 'bronze_shield',
    name: 'Bronze shield',
    description: 'Round, dented on purpose, and heavier every hour you carry it.',
    value: 360,
    equip: { slot: 'off_hand', armour: 6 },
  },
  bronze_breastplate: {
    id: 'bronze_breastplate',
    name: 'Bronze breastplate',
    description: 'Gleams nicely until the first rain. Then it goes green and thoughtful.',
    value: 480,
    equip: { slot: 'body', armour: 9 },
  },
  iron_axe: {
    id: 'iron_axe',
    name: 'Iron axe',
    description: 'Bites deep and stays sharp. Trees have started to talk about you.',
    value: 220,
    equip: {
      slot: 'main_hand',
      style: 'melee',
      attack: 7,
      strength: 10,
      requires: { skill: 'melee', level: 10 },
    },
  },
  iron_sword: {
    id: 'iron_sword',
    name: 'Iron sword',
    description: 'Plain, grey and properly sharp. Nobody laughs at this one.',
    value: 415,
    equip: {
      slot: 'main_hand',
      style: 'melee',
      attack: 10,
      strength: 9,
      requires: { skill: 'melee', level: 10 },
    },
  },
  iron_helmet: {
    id: 'iron_helmet',
    name: 'Iron helmet',
    description: 'A cold, snug fit. Muffles the world, and most of its opinions.',
    value: 420,
    equip: { slot: 'head', armour: 7, requires: { skill: 'defence', level: 10 } },
  },
  iron_shield: {
    id: 'iron_shield',
    name: 'Iron shield',
    description: 'Solid enough to hide behind, which is most of the job.',
    value: 615,
    equip: { slot: 'off_hand', armour: 10, requires: { skill: 'defence', level: 10 } },
  },
  iron_breastplate: {
    id: 'iron_breastplate',
    name: 'Iron breastplate',
    description: 'Takes two people to buckle on and a third to say it suits you.',
    value: 815,
    equip: { slot: 'body', armour: 15, requires: { skill: 'defence', level: 10 } },
  },
  bronze_arrowheads: {
    id: 'bronze_arrowheads',
    name: 'Bronze arrowheads',
    description: 'Small, sharp and pointed in every sense. Each one is waiting for a shaft.',
    value: 12,
  },
  iron_arrowheads: {
    id: 'iron_arrowheads',
    name: 'Iron arrowheads',
    description: 'Heavier points that mean it. They rattle in a pouch like loose teeth.',
    value: 22,
  },
  shell_vial: {
    id: 'shell_vial',
    name: 'Shell vial',
    description: 'A long whelk shell, scrubbed out and stoppered. Holds a mouthful, most of it.',
    value: 18,
  },
  bowstring: {
    id: 'bowstring',
    name: 'Bowstring',
    description: 'Flax, twisted until it gave up and agreed to be strong.',
    value: 50,
  },
  linen: {
    id: 'linen',
    name: 'Linen',
    description: 'A length of pale cloth. Creases if you so much as look at it.',
    value: 90,
  },
  shell_necklace: {
    id: 'shell_necklace',
    name: 'Shell necklace',
    description:
      'Seashells on a string. Clacks pleasantly when you walk and alarmingly when you run.',
    value: 100,
    equip: { slot: 'neck', attack: 2 },
  },
  shell_bracelet: {
    id: 'shell_bracelet',
    name: 'Shell bracelet',
    description: 'Small pink shells, carefully matched. The gulls look at it with open envy.',
    value: 130,
    equip: { slot: 'wrist', attack: 1, strength: 2 },
  },
  linen_hood: {
    id: 'linen_hood',
    name: 'Linen hood',
    description: 'Keeps off the rain or the sun, though rarely both on the same day.',
    value: 210,
    equip: { slot: 'head', armour: 1 },
  },
  linen_trousers: {
    id: 'linen_trousers',
    name: 'Linen trousers',
    description: 'Light, loose and breezy. Very breezy, in a high wind.',
    value: 330,
    equip: { slot: 'legs', armour: 1 },
  },
  linen_tunic: {
    id: 'linen_tunic',
    name: 'Linen tunic',
    description:
      'Plain, cool and neatly stitched. It has never stopped a blade and does not pretend to.',
    value: 445,
    equip: { slot: 'body', armour: 2 },
  },
  arrow_shafts: {
    id: 'arrow_shafts',
    name: 'Arrow shafts',
    description: 'Straight sticks with ambitions.',
    value: 2,
  },
  bronze_arrows: {
    id: 'bronze_arrows',
    name: 'Bronze arrows',
    description: 'They fly true, mostly. Count them before and after.',
    value: 17,
    equip: { slot: 'ammo', style: 'ranged', strength: 3 },
  },
  iron_arrows: {
    id: 'iron_arrows',
    name: 'Iron arrows',
    description: 'Heavy-headed and businesslike. They land like the last word in an argument.',
    value: 27,
    equip: { slot: 'ammo', style: 'ranged', strength: 6, requires: { skill: 'ranged', level: 10 } },
  },
  pine_shortbow: {
    id: 'pine_shortbow',
    name: 'Pine shortbow',
    description: 'Light, cheap and a little bendy in the wrong places. A start.',
    value: 85,
    equip: { slot: 'main_hand', twoHanded: true, style: 'ranged', attack: 5, strength: 3 },
  },
  oak_shortbow: {
    id: 'oak_shortbow',
    name: 'Oak shortbow',
    description: 'Stiff to draw and steady to shoot. Your arm will have opinions.',
    value: 170,
    equip: {
      slot: 'main_hand',
      twoHanded: true,
      style: 'ranged',
      attack: 8,
      strength: 6,
      requires: { skill: 'ranged', level: 10 },
    },
  },
  willow_shortbow: {
    id: 'willow_shortbow',
    name: 'Willow shortbow',
    description: 'Supple, quick and quiet. It hums a little when you let go.',
    value: 280,
    equip: {
      slot: 'main_hand',
      twoHanded: true,
      style: 'ranged',
      attack: 12,
      strength: 9,
      requires: { skill: 'ranged', level: 15 },
    },
  },
  // What monsters leave behind (src/data/monsters.ts), and what Crafting makes of it.
  hide: {
    id: 'hide',
    name: 'Hide',
    description: 'Rough, whiffy and still a bit warm. A tanner would call it promising.',
    value: 25,
  },
  feathers: {
    id: 'feathers',
    name: 'Feathers',
    description: 'Grey and white, slightly greasy. The gull wanted them more than you do.',
    value: 5,
  },
  pearl: {
    id: 'pearl',
    name: 'Pearl',
    description: 'Small, lustrous and quite unbothered. The crab was keeping it for best.',
    value: 600,
  },
  cudgel: {
    id: 'cudgel',
    name: 'Cudgel',
    description: 'A length of oak with a knot at the business end. Every footpad has a spare.',
    value: 50,
    equip: {
      slot: 'main_hand',
      style: 'melee',
      attack: 2,
      strength: 8,
      requires: { skill: 'melee', level: 5 },
    },
  },
  smuggled_tea: {
    id: 'smuggled_tea',
    name: 'Smuggled tea',
    description: 'A sealed tin with no duty paid on it. Smells of tar, then, faintly, of tea.',
    value: 150,
  },
  smugglers_cutlass: {
    id: 'smugglers_cutlass',
    name: 'Smuggler’s cutlass',
    description: 'A wide, wicked curve of good steel. Its last owner will not be needing it.',
    value: 1200,
    equip: {
      slot: 'main_hand',
      style: 'melee',
      attack: 14,
      strength: 12,
      requires: { skill: 'melee', level: 18 },
    },
  },
  trollstone: {
    id: 'trollstone',
    name: 'Trollstone',
    description:
      'A smooth grey pebble on a thong, warm to the touch. Trolls swear by them, and at you.',
    value: 1500,
    equip: {
      slot: 'neck',
      attack: 3,
      strength: 4,
      armour: 4,
      requires: { skill: 'defence', level: 18 },
    },
  },
  // What the monsters only bounty hunters go after leave behind, rarely.
  poachers_longbow: {
    id: 'poachers_longbow',
    name: 'Poacher’s longbow',
    description:
      'Taller than its last owner, and quieter. Nobody in Gullwick will admit to knowing where it came from.',
    value: 250,
    equip: {
      slot: 'main_hand',
      twoHanded: true,
      style: 'ranged',
      attack: 10,
      strength: 8,
      requires: { skill: 'ranged', level: 10 },
    },
  },
  wyrmscale_shield: {
    id: 'wyrmscale_shield',
    name: 'Wyrmscale shield',
    description:
      'One great green scale, rimmed in iron. It still bristles faintly when anyone mentions brambles.',
    value: 900,
    equip: { slot: 'off_hand', armour: 14, requires: { skill: 'defence', level: 18 } },
  },
  // What bounty points buy (src/data/shop.ts), and nothing else gives.
  barbed_arrows: {
    id: 'barbed_arrows',
    name: 'Barbed arrows',
    description:
      'Iron heads with a hook behind the point, for things that would rather not stay shot.',
    value: 20,
    equip: { slot: 'ammo', style: 'ranged', strength: 8, requires: { skill: 'ranged', level: 15 } },
  },
  hunters_charm: {
    id: 'hunters_charm',
    name: 'Hunter’s charm',
    description:
      'A wolf’s tooth on a cord, notched for every bounty. It came with a few notches already, which seems unfair.',
    value: 400,
    equip: { slot: 'neck', attack: 3, strength: 1 },
  },
  feathered_hat: {
    id: 'feathered_hat',
    name: 'Feathered hat',
    description:
      'A broad brim and a plume the size of a gull’s opinion. Stops nothing, and is noticed everywhere.',
    value: 10,
    equip: { slot: 'head', armour: 1 },
  },
  // What Brinebeard's Grotto gives up (the dungeon, src/scene, drops them by
  // these ids). The grotto gates tier 2, so its gear sits just above iron: a
  // step up for a character at the end of tier 1, needing 18 to 20 to wear.
  doubloon: {
    id: 'doubloon',
    name: 'Doubloon',
    description:
      'Heavy, yellow and stamped with a king nobody remembers. Every merchant in Gullwick remembers what it is worth.',
    value: 250,
  },
  pirate_cutlass: {
    id: 'pirate_cutlass',
    name: 'Pirate cutlass',
    description:
      'Nicked, salt-pitted and still wickedly sharp. It has been sharpened more often than it has been cleaned.',
    value: 600,
    equip: {
      slot: 'main_hand',
      style: 'melee',
      attack: 13,
      strength: 11,
      requires: { skill: 'melee', level: 18 },
    },
  },
  boarding_axe: {
    id: 'boarding_axe',
    name: 'Boarding axe',
    description:
      'A long haft, a broad bit and a spike for hooking rails. Built for arriving somewhere uninvited.',
    value: 600,
    equip: {
      slot: 'main_hand',
      style: 'melee',
      attack: 9,
      strength: 14,
      requires: { skill: 'melee', level: 19 },
    },
  },
  tricorn: {
    id: 'tricorn',
    name: 'Tricorn',
    description:
      'Three corners, one feather, no shame. Turns a blow almost as well as it turns heads.',
    value: 500,
    equip: { slot: 'head', attack: 2, armour: 6, requires: { skill: 'defence', level: 18 } },
  },
  captains_coat: {
    id: 'captains_coat',
    name: 'Captain’s coat',
    description:
      'Long, purple and heavy with braid, with something hard sewn into the lining. Smells of powder and pride.',
    value: 1200,
    equip: { slot: 'body', attack: 3, armour: 14, requires: { skill: 'defence', level: 20 } },
  },
  // An off hand that helps you aim instead of hiding: attack and no armour.
  // It carries no style, so the attack counts whatever is in the main hand;
  // with every bow two-handed today, that means a melee character's choice
  // between a shield's armour and a surer blow.
  spyglass: {
    id: 'spyglass',
    name: 'Spyglass',
    description:
      'Brass, dented, and good for spotting trouble a long way off. Also for hitting it, at a pinch.',
    value: 700,
    equip: { slot: 'off_hand', attack: 5, requires: { skill: 'melee', level: 18 } },
  },
  brinebeards_anchor: {
    id: 'brinebeards_anchor',
    name: 'Brinebeard’s anchor',
    description:
      'The captain’s own anchor, swung on a length of chain. Nobody else has ever lifted it twice.',
    value: 3000,
    equip: {
      slot: 'main_hand',
      twoHanded: true,
      style: 'melee',
      attack: 15,
      strength: 21,
      requires: { skill: 'melee', level: 20 },
    },
  },
  ships_figurehead: {
    id: 'ships_figurehead',
    name: 'Ship’s figurehead',
    description:
      'A carved lady with a chipped nose and a fierce stare. Worth little to a merchant; she belongs on a wall.',
    value: 50,
  },
  // What only the general store sells (src/data/store.ts): something to save for.
  velvet_cap: {
    id: 'velvet_cap',
    name: 'Velvet cap',
    description:
      'Plum velvet, a gold pin and the air of somebody who owns a boat. Stops nothing whatsoever.',
    value: 2000,
    equip: { slot: 'head', armour: 1 },
  },
  leather: {
    id: 'leather',
    name: 'Leather',
    description: 'Tanned, supple and much better company than the hide was.',
    value: 45,
  },
  // Leather is the archer's armour: less than metal, and a little help with the bow.
  leather_bracers: {
    id: 'leather_bracers',
    name: 'Leather bracers',
    description: 'Laced tight at the wrist. The bowstring slaps them instead of you.',
    value: 70,
    equip: { slot: 'wrist', style: 'ranged', attack: 3, armour: 1 },
  },
  leather_cap: {
    id: 'leather_cap',
    name: 'Leather cap',
    description: 'Snug, scuffed and faintly jaunty. Turns a glancing blow, and a few heads.',
    value: 120,
    equip: { slot: 'head', style: 'ranged', attack: 1, armour: 3 },
  },
  leather_jerkin: {
    id: 'leather_jerkin',
    name: 'Leather jerkin',
    description: 'Stiff for a week, then yours for life. Creaks when you draw a bow.',
    value: 240,
    equip: { slot: 'body', style: 'ranged', attack: 2, armour: 6 },
  },
  // Potions: what each does is in its `potion`, and the screens describe it from there.
  sage_tonic: {
    id: 'sage_tonic',
    name: 'Sage tonic',
    description: 'Bitter, green and gone in one gulp. Your hands hurry, mostly to find a drink.',
    value: 100,
    potion: { charges: 150, skills: skillsIn('Gathering'), effect: { kind: 'speed', percent: 10 } },
  },
  steady_draught: {
    id: 'steady_draught',
    name: 'Steady-hand draught',
    description: 'A calm, grassy brew. Nothing shakes, nothing spills, and the lesson sticks.',
    value: 165,
    potion: { charges: 150, skills: skillsIn('Artisan'), effect: { kind: 'xp', percent: 10 } },
  },
  glowcap_tincture: {
    id: 'glowcap_tincture',
    name: 'Glowcap tincture',
    description: 'Faintly luminous. Everything you pick seems to have a friend hiding behind it.',
    value: 170,
    potion: { charges: 150, skills: skillsIn('Gathering'), effect: { kind: 'extra', every: 5 } },
  },
  midnight_oil: {
    id: 'midnight_oil',
    name: 'Midnight oil',
    description: 'Smells of lamp smoke and late nights. Everything sinks in a little deeper.',
    value: 240,
    potion: {
      charges: 200,
      skills: skillsIn('Gathering', 'Artisan'),
      effect: { kind: 'xp', percent: 15 },
    },
  },
} satisfies Record<string, ItemDef>;
