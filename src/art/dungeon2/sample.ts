/**
 * The art lane's sample rooms at the C scale (B10a): two of Brinebeard's
 * Grotto's rooms re-cut on 24-pixel tiles as lane C's plan describes (the
 * same rooms in the same metres, about 32 x 12 tiles, a person 2.7 tiles
 * tall), in the grotto's own key (src/scene/ground.ts, copied here, since art
 * may not import the scene), at a state of the tide, dressed with their
 * props and lanterns, the hero and the cast standing in them at true size.
 * The gallery and the review sheets show them; lane C lays out the real
 * rooms.
 */
import type { Picture2 } from '../town2/cells';
import { characterPicture2 } from '../character2';
import { foe2Frame, type Foe2Pose } from './cast2';
import { prop2 } from './props';
import { roomPicture2, type Stood } from './room';
import { TILE2 } from './tiles';

/**
 * The grotto's key: `#` rock, `.` rock floor, `:` dry sand, `=` planks, `~`
 * deep water, `,` shallows, `0`-`3` sand the tide reaches by height, a
 * lower-case letter a door; `L` a lantern on the rock, `C` a crate, `K` a
 * powder keg, `T` the chest, `N` a cannon, `A` the anchor, `R` rope, `P` a
 * perch in the water (each standing on the ground under it).
 */
const GROUND_UNDER: Readonly<Record<string, string>> = {
  L: '#',
  C: '=',
  K: '=',
  T: '.',
  N: '.',
  A: ':',
  R: ':',
  P: ',',
};

/** The pools re-cut: beach, sandbars over the channel, the ledge round its head, the crabs' far side. */
export const POOLS2: readonly string[] = [
  '################################',
  '###L####.........##L#####.......',
  '##:::::.....................::.#',
  '#::::::::....,,....##.....:::::#',
  '#:::::::::::,,,,::22~~~22::::::#',
  '#::::::::::::::,22221~~~1222:,:#',
  'a:::::::::::::::222111111222:,,#',
  '#~::::::::::R::::221111111122::#',
  '#~~::::::,,::::::221~~~~~1222:2#',
  '#~~~::::::::::::222100~~0012221#',
  '#~~~~~~22222222221000~~000122P~#',
  '################################',
].map((r) => r.padEnd(32, '#').slice(0, 32));

/** The smugglers' store re-cut: a plank deck with crates and kegs, sand below it the tide floods. */
export const STORE2: readonly string[] = [
  '################################',
  '###L######L#######L#######L#####',
  '#==C=C==K=======C====K===C====##',
  '#==C=======C=C====K=======C====#',
  'a====K============C====KK======b',
  '#=K====T====C=============N====#',
  '#::::::::A===::::====::::R:::::#',
  '#::33333::::::::33333::::333:::#',
  '#:333322233::::33322222333222::#',
  '#333222222223333332211122222213#',
  '#222111111112222211000111111110#',
  '################~~~~############',
].map((r) => r.padEnd(32, '#').slice(0, 32));

/** A room's rows as tile kinds at a level of the tide (0 low to 3 high); `warn` while it is about to rise. */
export function roomAtTide(rows: readonly string[], level: number, warn = false): string[] {
  return rows.map((row) =>
    [...row]
      .map((ch) => {
        const c = GROUND_UNDER[ch] ?? ch;
        if (c >= '0' && c <= '3') {
          // One level over a tile is shallows, two is deep (src/scene/tide.ts).
          const depth = level - Number(c) + 1;
          if (depth >= 2) return '=';
          if (depth === 1) return '~';
          return warn && depth === 0 ? ',' : '.';
        }
        switch (c) {
          case '#':
            return '#';
          case '.':
            return 'r';
          case ':':
            return '.';
          case '=':
            return 'p';
          case '~':
            return '=';
          case ',':
            return '~';
          default:
            return c >= 'a' && c <= 'z' ? 'O' : '#';
        }
      })
      .join(''),
  );
}

/** Where each prop letter in a room's rows stands: the middle of its cell's floor. */
function propsOf(rows: readonly string[]): Stood[] {
  const stood: Stood[] = [];
  const ids: Readonly<Record<string, string>> = {
    L: 'lantern',
    C: 'crate',
    K: 'powder_keg',
    T: 'treasure_chest',
    N: 'cannon',
    A: 'anchor',
    R: 'rope_coil',
    P: 'perch',
  };
  rows.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      const id = ids[ch];
      if (!id) return;
      const p = prop2(id)!;
      // A lantern hangs on the wall's face; everything else stands on its tile, its foot two pixels up.
      const y = id === 'lantern' ? r * TILE2 + TILE2 + 18 : r * TILE2 + TILE2 - 2;
      stood.push({
        picture: { grid: p.grid, glows: p.glows },
        anchor: { x: p.foot, y: p.base },
        x: c * TILE2 + TILE2 / 2,
        y,
        shadow: id === 'lantern' || id === 'rope_coil' ? 0 : Math.floor(p.grid.w / 2.4),
        ...(p.light ? { light: p.light } : {}),
      });
    }),
  );
  return stood;
}

const HERO = ['iron_sword', 'iron_helmet', 'iron_breastplate', 'iron_shield'];

/** A foe standing at (x, y) in a pose, its shadow under it. */
function foe(id: string, x: number, y: number, pose: Foe2Pose = 'idle', phase = 1): Stood {
  const f = foe2Frame(id, pose, 0, phase)!;
  const w = f.picture.grid.w;
  return {
    picture: f.picture,
    anchor: f.feet,
    x,
    y,
    shadow: Math.max(7, Math.round(w / 4.5)),
  };
}

export interface SampleOptions {
  readonly hero?: readonly string[];
  readonly phase?: number;
  readonly poses?: Partial<Record<string, Foe2Pose>>;
  readonly level?: number;
  readonly warn?: boolean;
  readonly lit?: boolean;
}

/** The store, at low water, with its deckhands and powder monkey, the hero come in at the west door. */
export function storeRoom2(o: SampleOptions = {}): Picture2 {
  const p = (id: string) => o.poses?.[id] ?? 'idle';
  const stood: Stood[] = [
    ...propsOf(STORE2),
    {
      picture: characterPicture2({}, o.hero ?? HERO),
      anchor: { x: 28, y: 70 },
      x: 92,
      y: 128,
      shadow: 11,
    },
    foe('deckhand', 300, 104, p('deckhand')),
    foe('deckhand', 520, 152, p('deckhand')),
    foe('powder_monkey', 690, 80, p('powder_monkey')),
    foe('smuggler', 230, 196, p('smuggler')),
    foe('dock_rat', 420, 222, p('dock_rat')),
  ];
  return roomPicture2(roomAtTide(STORE2, o.level ?? 1, o.warn), stood, { lit: o.lit });
}

/** The pools at the first rise, with every creature of the grotto, the captain and the hero. */
export function poolsRoom2(o: SampleOptions = {}): Picture2 {
  const p = (id: string) => o.poses?.[id] ?? 'idle';
  const stood: Stood[] = [
    ...propsOf(POOLS2),
    {
      picture: characterPicture2({}, o.hero ?? HERO),
      anchor: { x: 28, y: 70 },
      x: 132,
      y: 150,
      shadow: 11,
    },
    foe('giant_crab', 548, 178, p('giant_crab')),
    foe('sand_crab', 230, 230, p('sand_crab')),
    foe('dock_rat', 300, 92, p('dock_rat')),
    foe('brinebeard', 690, 150, p('brinebeard'), o.phase ?? 1),
    foe('deckhand', 420, 96, p('deckhand')),
  ];
  // The parrot on its post in the water, its feet on the post's top.
  const row = POOLS2.findIndex((r) => r.includes('P'));
  const col = POOLS2[row]!.indexOf('P');
  const post = prop2('perch')!;
  const seat = post.seat!;
  const parrot = foe2Frame('ships_parrot', p('ships_parrot'), 0)!;
  const px = col * TILE2 + TILE2 / 2;
  const py = row * TILE2 + TILE2 - 2;
  stood.push({
    picture: parrot.picture,
    anchor: parrot.feet,
    x: px - post.foot + seat.x,
    y: py - post.base + seat.y + 1,
    sort: py + 1,
  });
  return roomPicture2(roomAtTide(POOLS2, o.level ?? 1, o.warn), stood, { lit: o.lit });
}
