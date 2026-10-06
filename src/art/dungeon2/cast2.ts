/**
 * The grotto's cast and the idle game's monsters at the C scale, frame by
 * frame: which drawing each id is (a person on the figure engine, a
 * creature, the captain) and the poses each has, so the scene asks for an id,
 * a pose and a frame and gets a picture and where it stands.
 */
import type { Picture2, TGrid } from '../town2/cells';
import type { Glow } from '../raster';
import { BEASTS, beastGrid, upturned, type BeastPose } from './beasts';
import { bossFrame, BOSS_FRAMES, type BossPhase } from './boss';
import { PEOPLE, PERSON_FRAMES, personPose } from './people';

/** What a foe can be doing. Every id has every pose. */
export const FOE2_POSES = ['idle', 'walk', 'windup', 'strike', 'hurt', 'fall'] as const;
export type Foe2Pose = (typeof FOE2_POSES)[number];

/** A frame: the picture and where it stands (the middle of its feet on the ground). */
export interface Foe2Frame {
  readonly picture: Picture2;
  readonly feet: { readonly x: number; readonly y: number };
}

type BeastKeys = Readonly<Record<Foe2Pose, readonly BeastPose[]>>;

/** A four-footed walk, a lunge and a recoil, for the rat, the boar and the wolf. */
const FOUR_FEET: BeastKeys = {
  idle: [{}, { at: { body: [0, -1], head: [0, -1] } }],
  walk: [
    { at: { front: [2, -1], hind: [-2, 0], body: [0, 0] } },
    { at: { front: [0, 0], hind: [0, -1], body: [0, -1], head: [0, -1] } },
    { at: { front: [-2, 0], hind: [2, -1], body: [0, 0] } },
    { at: { front: [0, -1], hind: [0, 0], body: [0, -1], head: [0, -1] } },
  ],
  windup: [{ at: { body: [-2, 1], head: [-2, 2], front: [-1, 0], hind: [-1, 0] }, open: true }],
  strike: [{ at: { body: [3, 0], head: [5, 1], front: [3, 0], hind: [2, 0] }, open: true }],
  hurt: [{ at: { body: [-3, 0], head: [-4, -2], front: [-2, 0], hind: [-1, 0] }, open: true }],
  fall: [{ at: { body: [-2, 2], head: [-3, 3], front: [-1, 0], hind: [0, 0] }, open: true }, {}],
};

/** Crabs scuttle on their legs, raise both claws and slam them down. */
const crabKeys = (big: number): BeastKeys => ({
  idle: [{}, { at: { claws: [0, -1], body: [0, -1] } }],
  walk: [
    { at: { legs: [1, 1], body: [0, 0] } },
    { at: { legs: [0, 0], body: [0, -1], claws: [0, -1] } },
    { at: { legs: [-1, -1], body: [0, 0] } },
    { at: { legs: [0, 0], body: [0, -1], claws: [0, -1] } },
  ],
  windup: [{ at: { claws: [0, -4 * big], body: [0, -1] }, open: true }],
  strike: [{ at: { claws: [3, 3 * big], body: [0, 1] }, open: true }],
  hurt: [{ at: { body: [-2, 0], claws: [-1, -2], legs: [-1, 0] }, open: true }],
  fall: [{ at: { body: [0, 2], claws: [0, 3], legs: [0, 0] } }, {}],
});

/** The parrot perches, flies on beating wings, rears and dives to peck. */
const PARROT_KEYS: BeastKeys = {
  idle: [{}, { at: { head: [0, 1] } }],
  walk: [
    { wings: 'up', at: { body: [0, -6], head: [0, -6] } },
    { wings: 'mid', at: { body: [0, -7], head: [0, -7] } },
    { wings: 'down', at: { body: [0, -8], head: [0, -8] } },
    { wings: 'mid', at: { body: [0, -7], head: [0, -7] } },
  ],
  windup: [{ wings: 'up', at: { body: [-1, -7], head: [-2, -9] }, open: true }],
  strike: [{ wings: 'up', at: { body: [3, -2], head: [5, 1] }, open: true }],
  hurt: [{ wings: 'mid', at: { body: [-2, -4], head: [-3, -5] }, open: true }],
  fall: [{ wings: 'down', at: { body: [0, -2], head: [0, -1] }, open: true }, {}],
};

/** The idle game's gull, troll and wyrm stand and breathe; only the cast is posed further. */
const STANDING: BeastKeys = {
  idle: [{}, { at: { body: [0, -1], head: [0, -1] } }],
  walk: [{}, { at: { body: [0, -1], head: [0, -1] } }],
  windup: [{ at: { head: [-1, -1] }, open: true }],
  strike: [{ at: { head: [2, 1], arms: [2, 0] }, open: true }],
  hurt: [{ at: { head: [-2, -1], body: [-1, 0] }, open: true }],
  fall: [{ at: { body: [0, 2], head: [0, 2] } }, {}],
};

const BEAST_KEYS: Readonly<Record<string, BeastKeys>> = {
  dock_rat: FOUR_FEET,
  bramble_boar: FOUR_FEET,
  grey_wolf: FOUR_FEET,
  sand_crab: crabKeys(1),
  giant_crab: crabKeys(2),
  ships_parrot: PARROT_KEYS,
  thieving_gull: STANDING,
  marsh_troll: STANDING,
  bramble_wyrm: STANDING,
};

/** The grotto's cast, by the ids the scene fights them by: everything `foePicture` draws today. */
export const FOE2_IDS: readonly string[] = [
  'dock_rat',
  'sand_crab',
  'smuggler',
  'deckhand',
  'powder_monkey',
  'giant_crab',
  'ships_parrot',
  'brinebeard',
];

/** The idle game's monsters, by their ids in the monster tables. */
export const MONSTER2_IDS: readonly string[] = [
  'dock_rat',
  'sand_crab',
  'thieving_gull',
  'bramble_boar',
  'footpad',
  'grey_wolf',
  'smuggler',
  'marsh_troll',
  'goblin_poacher',
  'bramble_wyrm',
];

/** How many frames each pose of an id has (the same for every phase of the captain). */
export function foe2Frames(id: string): Readonly<Record<Foe2Pose, number>> | null {
  if (id === 'brinebeard') return BOSS_FRAMES;
  if (Object.hasOwn(PEOPLE, id)) return PERSON_FRAMES;
  const k = BEAST_KEYS[id];
  if (!k) return null;
  return Object.fromEntries(FOE2_POSES.map((p) => [p, k[p].length])) as Record<Foe2Pose, number>;
}

const pic = (grid: TGrid, glows: readonly Glow[] = []): Picture2 => ({ grid, glows });
const made = new Map<string, Foe2Frame>();

/**
 * A foe's frame, facing right, or null for an id with none. `frame` wraps at
 * the pose's count; `phase` matters only to the captain (1 to 3). Kept once
 * drawn.
 */
export function foe2Frame(
  id: string,
  pose: Foe2Pose = 'idle',
  frame = 0,
  phase = 1,
): Foe2Frame | null {
  const counts = foe2Frames(id);
  if (!counts || !(FOE2_POSES as readonly string[]).includes(pose)) return null;
  const f =
    ((Math.floor(Number.isFinite(frame) ? frame : 0) % counts[pose]) + counts[pose]) % counts[pose];
  const ph = (
    id === 'brinebeard' ? Math.max(1, Math.min(3, Math.floor(phase) || 1)) : 1
  ) as BossPhase;
  const key = `${id} ${pose} ${f} ${ph}`;
  let out = made.get(key);
  if (out) return out;
  if (id === 'brinebeard') {
    const b = bossFrame(ph, pose, f);
    out = { picture: pic(b.grid, b.glows), feet: b.anchor };
  } else if (Object.hasOwn(PEOPLE, id)) {
    const p = personPose(id, pose, f)!;
    out = { picture: pic(p.grid, p.glows), feet: p.anchor };
  } else {
    const keys = BEAST_KEYS[id]![pose];
    const b = BEASTS[id]!;
    if (pose === 'fall' && f === keys.length - 1 && keys.length > 1) {
      // On its back: the last fall frame is the first turned over.
      const g = upturned(beastGrid(id, keys[0])!);
      let top = g.h;
      for (let i = 0; i < g.d.length; i++)
        if (g.d[i]) {
          top = Math.floor(i / g.w);
          break;
        }
      // Turned over, it lies where it stood: its back (now the bottom) on the ground.
      let low = 0;
      for (let i = 0; i < g.d.length; i++) if (g.d[i]) low = Math.floor(i / g.w);
      void top;
      out = { picture: pic(g), feet: { x: b.anchor.x, y: low } };
    } else out = { picture: pic(beastGrid(id, keys[f])!), feet: b.anchor };
  }
  made.set(key, out);
  return out;
}

/** Lets go of every kept frame. */
export function forgetFoes2(): void {
  made.clear();
}
