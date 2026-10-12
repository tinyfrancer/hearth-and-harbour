import type { AreaDef, MonsterDef } from '../core/content';

// Where to fight, in the order the Combat page lists them.
export const AREAS = {
  docks: {
    id: 'docks',
    name: 'The Docks',
    description: 'Fish crates, wet rope and things that live off both.',
  },
  north_road: {
    id: 'north_road',
    name: 'The North Road',
    description: 'The way inland, through hedges that have heard every excuse.',
  },
  saltmarsh: {
    id: 'saltmarsh',
    name: 'The Saltmarsh',
    description: 'Reeds, mud and channels that move about when nobody is looking.',
  },
  // Its monsters are only for bounty hunters (`bountyOnly`): the way in is a bounty on one.
  blackthorn_wood: {
    id: 'blackthorn_wood',
    name: 'Blackthorn Wood',
    description: 'Thick, thorny and well off the road. Nobody goes in without being paid to.',
  },
  // Tier 2 (S22), opened by Brinebeard's Grotto: the old forest's edge, and
  // the thicket inside it that only bounty hunters are paid to enter.
  thistlewood_edge: {
    id: 'thistlewood_edge',
    name: 'Thistlewood’s Edge',
    description:
      'Where the road gives up and the old forest begins, and everything in it is bigger.',
    tier: 2,
  },
  the_deepthorn: {
    id: 'the_deepthorn',
    name: 'The Deepthorn',
    description: 'A thicket so old it has opinions. Only a bounty will get anyone through it.',
    tier: 2,
  },
} satisfies Record<string, AreaDef>;

type Row = Omit<MonsterDef, 'id' | 'area' | 'always' | 'rare'> & {
  always?: MonsterDef['always'];
  rare?: MonsterDef['rare'];
};

/** An area's monsters, each of its area's tier. */
function monsters(area: keyof typeof AREAS, rows: Record<string, Row>): MonsterDef[] {
  const tier = (AREAS[area] as AreaDef).tier;
  return Object.entries(rows).map(([id, row]) => ({
    id,
    area,
    always: [],
    rare: [],
    ...row,
    ...(tier ? { tier } : {}),
  }));
}

// Tier 1. Each is a fair fight for a character of about its level wearing that
// level's gear, and hopeless ten levels sooner; tests/data/duels.test.ts holds
// them to it, and tests/data/pacing.test.ts holds what they are worth.
//
// Ratings are on the character's scale (src/core/combat.ts): `attack` is set
// against the character's defence rating, `defence` against their attack.
const ALL: MonsterDef[] = [
  ...monsters('docks', {
    dock_rat: {
      name: 'Dock rat',
      description: 'The size of a terrier and twice as sure of itself.',
      level: 1,
      hp: 10,
      attack: 8,
      defence: 8,
      maxHit: 2,
      speedMs: 2400,
      coins: [50, 110],
      always: [{ item: 'hide', min: 1, max: 1 }],
      rare: [{ item: 'raw_herring', min: 1, max: 1, oneIn: 8 }],
      bounty: { kills: [50, 90], points: 2 },
    },
    sand_crab: {
      name: 'Sand crab',
      description: 'A crab with opinions, most of them about you, all of them sideways.',
      level: 3,
      hp: 16,
      attack: 16,
      defence: 22,
      maxHit: 4,
      speedMs: 3000,
      coins: [100, 240],
      always: [{ item: 'seashells', min: 2, max: 4 }],
      rare: [{ item: 'pearl', min: 1, max: 1, oneIn: 64 }],
      bounty: { kills: [28, 50], points: 3 },
    },
    thieving_gull: {
      name: 'Thieving gull',
      description: 'Steals chips, hats and fights. Goes for the eyes, then the sandwich.',
      level: 5,
      hp: 14,
      attack: 30,
      defence: 14,
      maxHit: 5,
      speedMs: 1800,
      coins: [80, 250],
      always: [{ item: 'feathers', min: 1, max: 3 }],
      rare: [{ item: 'shell_necklace', min: 1, max: 1, oneIn: 40 }],
      bounty: { kills: [40, 65], points: 4 },
    },
  }),
  ...monsters('north_road', {
    bramble_boar: {
      name: 'Bramble boar',
      description: 'Thorns in its hide and a grudge in its heart. Charges first, thinks never.',
      level: 8,
      hp: 30,
      attack: 36,
      defence: 24,
      maxHit: 7,
      speedMs: 2800,
      coins: [0, 0],
      always: [{ item: 'hide', min: 1, max: 2 }],
      rare: [{ item: 'glowcap', min: 1, max: 2, oneIn: 10 }],
      bounty: { kills: [21, 34], points: 5 },
    },
    footpad: {
      name: 'Footpad',
      description: 'A roadside robber with a cudgel and a speech he has clearly practised.',
      level: 11,
      hp: 40,
      attack: 50,
      defence: 32,
      maxHit: 9,
      speedMs: 2400,
      coins: [250, 600],
      always: [{ item: 'cudgel', min: 1, max: 1 }],
      rare: [{ item: 'iron_sword', min: 1, max: 1, oneIn: 50 }],
      bounty: { kills: [20, 34], points: 7 },
    },
    grey_wolf: {
      name: 'Grey wolf',
      description: 'Lean, quiet and patient. It has been following you for a while.',
      level: 14,
      hp: 46,
      attack: 56,
      defence: 36,
      maxHit: 9,
      speedMs: 2200,
      coins: [0, 0],
      always: [{ item: 'hide', min: 1, max: 2 }],
      rare: [{ item: 'sageleaf', min: 2, max: 4, oneIn: 8 }],
      bounty: { kills: [18, 30], points: 8 },
    },
  }),
  ...monsters('saltmarsh', {
    smuggler: {
      name: 'Smuggler',
      description: 'A cutlass and a bad attitude. Insists the barrels are full of turnips.',
      level: 17,
      hp: 64,
      attack: 60,
      defence: 44,
      maxHit: 13,
      speedMs: 2400,
      // Wave 20: 420 to 900 (was 500 to 1050), so a character past the grotto earns more from
      // tier 2's brigand at 30, and less than Thieving at 40 in the knight's full kit
      // (tests/data/pacing.test.ts).
      coins: [420, 900],
      always: [{ item: 'smuggled_tea', min: 1, max: 1 }],
      rare: [
        { item: 'iron_arrows', min: 10, max: 25, oneIn: 10 },
        { item: 'smugglers_cutlass', min: 1, max: 1, oneIn: 120 },
      ],
      bounty: { kills: [16, 26], points: 10 },
    },
    marsh_troll: {
      name: 'Marsh troll',
      description: 'Big, slow and very hard to discourage. Smells of a pond with a past.',
      level: 20,
      hp: 96,
      attack: 62,
      defence: 40,
      maxHit: 20,
      speedMs: 3600,
      coins: [600, 1600],
      always: [{ item: 'hide', min: 2, max: 4 }],
      rare: [
        { item: 'iron_ore', min: 2, max: 5, oneIn: 6 },
        { item: 'trollstone', min: 1, max: 1, oneIn: 150 },
      ],
      bounty: { kills: [14, 20], points: 12 },
    },
  }),
  ...monsters('blackthorn_wood', {
    goblin_poacher: {
      name: 'Goblin poacher',
      description:
        'Wanted for eleven chickens, a goat and the vicar’s hat. Has returned none of them.',
      level: 10,
      hp: 36,
      attack: 46,
      defence: 30,
      maxHit: 8,
      speedMs: 2200,
      coins: [150, 400],
      always: [{ item: 'feathers', min: 2, max: 4 }],
      rare: [{ item: 'poachers_longbow', min: 1, max: 1, oneIn: 30 }],
      bountyOnly: true,
      bounty: { kills: [23, 38], points: 9 },
    },
    bramble_wyrm: {
      name: 'Bramble wyrm',
      description:
        'A long, low dragon with no wings and less patience. Nests in thorns and resents visitors.',
      level: 18,
      hp: 76,
      attack: 62,
      defence: 46,
      maxHit: 14,
      speedMs: 2800,
      coins: [300, 800],
      always: [{ item: 'hide', min: 2, max: 3 }],
      rare: [{ item: 'wyrmscale_shield', min: 1, max: 1, oneIn: 30 }],
      bountyOnly: true,
      bounty: { kills: [15, 23], points: 15 },
    },
  }),
  // Tier 2: the same rules as tier 1, held by the same simulations at levels
  // 20 to 40, each in the best set the anvil makes at its level (salt-iron).
  ...monsters('thistlewood_edge', {
    brigand: {
      name: 'Brigand',
      description:
        'A footpad who did well for himself: a better coat, a sharper sword, the same speech.',
      level: 23,
      hp: 126,
      attack: 70,
      defence: 42,
      maxHit: 12,
      speedMs: 2400,
      xpPercent: 270,
      coins: [900, 1800],
      always: [{ item: 'cudgel', min: 1, max: 1 }],
      rare: [
        { item: 'silver_ore', min: 2, max: 4, oneIn: 8 },
        { item: 'salt_iron_arrows', min: 15, max: 30, oneIn: 10 },
      ],
      bounty: { kills: [14, 22], points: 12 },
    },
    black_bear: {
      name: 'Black bear',
      description: 'Big, black and very sure the berries were hers first.',
      level: 27,
      hp: 154,
      attack: 78,
      defence: 46,
      maxHit: 17,
      speedMs: 3000,
      xpPercent: 270,
      coins: [0, 0],
      always: [{ item: 'thick_hide', min: 1, max: 2 }],
      rare: [{ item: 'duskbloom', min: 1, max: 2, oneIn: 10 }],
      bounty: { kills: [12, 19], points: 14 },
    },
    hobgoblin: {
      name: 'Hobgoblin',
      description:
        'A goblin’s big cousin, who got the helmet, the cleaver and none of the manners.',
      level: 31,
      hp: 168,
      attack: 90,
      defence: 50,
      maxHit: 16,
      speedMs: 2400,
      xpPercent: 270,
      // Wave 20: 1540 to 2880 (was 1600 to 3000): with the cloak and the amulet both worn, a
      // level-40 knight out-earned Thieving on him.
      coins: [1540, 2880],
      always: [{ item: 'feathers', min: 2, max: 4 }],
      rare: [
        { item: 'gold_ore', min: 1, max: 3, oneIn: 10 },
        { item: 'salt_iron_sword', min: 1, max: 1, oneIn: 60 },
      ],
      bounty: { kills: [13, 20], points: 16 },
    },
    dire_wolf: {
      name: 'Dire wolf',
      description: 'The grey wolf’s grandmother, and what big teeth she has.',
      level: 35,
      hp: 175,
      attack: 100,
      defence: 54,
      maxHit: 16,
      speedMs: 2200,
      xpPercent: 270,
      coins: [0, 0],
      always: [{ item: 'thick_hide', min: 2, max: 3 }],
      rare: [{ item: 'sea_holly', min: 2, max: 4, oneIn: 8 }],
      bounty: { kills: [14, 20], points: 18 },
    },
    hill_ogre: {
      name: 'Hill ogre',
      description:
        'Enormous, unhurried and carrying most of a tree. He has never needed to be clever.',
      level: 39,
      hp: 250,
      attack: 110,
      defence: 58,
      maxHit: 27,
      speedMs: 3600,
      xpPercent: 270,
      // Wave 20: 2600 to 4600 (was 2800 to 4900): he paid within 3.5% of Thieving at 40. The
      // best fight for money there is now the brigand, a twentieth under it.
      coins: [2600, 4600],
      always: [{ item: 'thick_hide', min: 2, max: 4 }],
      rare: [
        { item: 'gold_ore', min: 2, max: 5, oneIn: 6 },
        { item: 'ogre_maul', min: 1, max: 1, oneIn: 150 },
      ],
      bounty: { kills: [11, 15], points: 20 },
    },
  }),
  ...monsters('the_deepthorn', {
    briar_hag: {
      name: 'Briar hag',
      description:
        'Brambles for hair, berries in it, and a laugh you can hear through three hedges.',
      level: 29,
      hp: 154,
      attack: 85,
      defence: 50,
      maxHit: 14,
      speedMs: 2400,
      xpPercent: 270,
      coins: [600, 1400],
      always: [{ item: 'nettles', min: 2, max: 4 }],
      rare: [{ item: 'briar_charm', min: 1, max: 1, oneIn: 30 }],
      bountyOnly: true,
      bounty: { kills: [13, 21], points: 18 },
    },
    moss_golem: {
      name: 'Moss golem',
      description: 'A heap of old stones that the moss decided to get up and walk about in.',
      level: 37,
      hp: 238,
      attack: 105,
      defence: 60,
      maxHit: 22,
      speedMs: 3200,
      xpPercent: 270,
      coins: [800, 1800],
      always: [{ item: 'sea_glass', min: 2, max: 4 }],
      rare: [{ item: 'mossback_shield', min: 1, max: 1, oneIn: 30 }],
      bountyOnly: true,
      bounty: { kills: [11, 14], points: 22 },
    },
  }),
];

export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries(
  ALL.map((monster) => [monster.id, monster]),
);
