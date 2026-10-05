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
} satisfies Record<string, AreaDef>;

type Row = Omit<MonsterDef, 'id' | 'area' | 'always' | 'rare'> & {
  always?: MonsterDef['always'];
  rare?: MonsterDef['rare'];
};

function monsters(area: keyof typeof AREAS, rows: Record<string, Row>): MonsterDef[] {
  return Object.entries(rows).map(([id, row]) => ({
    id,
    area,
    always: [],
    rare: [],
    ...row,
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
      coins: [500, 1050],
      always: [{ item: 'smuggled_tea', min: 1, max: 1 }],
      rare: [
        { item: 'iron_arrows', min: 10, max: 25, oneIn: 10 },
        { item: 'smugglers_cutlass', min: 1, max: 1, oneIn: 120 },
      ],
      bounty: { kills: [16, 27], points: 10 },
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
      coins: [600, 1500],
      always: [{ item: 'hide', min: 2, max: 4 }],
      rare: [
        { item: 'iron_ore', min: 2, max: 5, oneIn: 6 },
        { item: 'trollstone', min: 1, max: 1, oneIn: 150 },
      ],
      bounty: { kills: [14, 21], points: 12 },
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
      bounty: { kills: [15, 24], points: 15 },
    },
  }),
];

export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries(
  ALL.map((monster) => [monster.id, monster]),
);
