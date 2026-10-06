/**
 * The art lane's sample room at the C scale: a grotto cave the size of a
 * phone held sideways (816 x 384 art pixels; a 3x phone shows 844 x 390),
 * every kind of ground in it, every prop, the whole cast and the hero, lit
 * by two lanterns and a lit fuse. The gallery and the review sheets show it;
 * it is a picture of how the pieces sit together, not a room of the game.
 */
import type { Picture2 } from '../town2/cells';
import { characterPicture2 } from '../character2';
import { foe2Frame, type Foe2Pose } from './cast2';
import { prop2 } from './props';
import { roomPicture2, type Stood } from './room';

export const SAMPLE_ROOM2: readonly string[] = [
  '##################################',
  '##################################',
  '##########O#################D#####',
  '#rrrrrrrr..........ppppppppp......#',
  '#rrrrrr.....##.....ppppppppp......#',
  '#rrrr.......##.....ppppppppp..,,..#',
  '#rr....,,,.......,,,,,,,,,,,,,,,..#',
  '#.....,,~~~~,,,,,,~~~~~~~~~~~,,,,..',
  '#....,,~~~~~~~~~~~~~====~~~~~~~,,.#',
  '#..,,,~~~~=====~~~~========~~~~~,,#',
  '#.,,~~~~=============p=====~~~~~~,#',
  '#,,~~~~==============p=======~~~~~#',
  '#~~~~================p===========~#',
  '##################################',
  '##################################',
  '##################################',
];

/** Everything standing in the sample room: the hero, the cast in a pose each, the props. */
export function sampleStood2(
  o: { hero?: readonly string[]; phase?: number; poses?: Partial<Record<string, Foe2Pose>> } = {},
): Stood[] {
  const stood: Stood[] = [];
  const prop = (id: string, x: number, y: number, shadow?: number) => {
    const p = prop2(id)!;
    stood.push({
      picture: { grid: p.grid, glows: p.glows },
      anchor: { x: p.foot, y: p.base },
      x,
      y,
      shadow: shadow ?? Math.floor(p.grid.w / 2.4),
    });
    return p;
  };
  const foe = (id: string, x: number, y: number, shadow: number, pose: Foe2Pose = 'idle') => {
    const f = foe2Frame(id, o.poses?.[id] ?? pose, 0, o.phase ?? 1)!;
    stood.push({ picture: f.picture, anchor: f.feet, x, y, shadow });
  };
  prop('lantern', 70, 84);
  prop('lantern', 420, 84);
  prop('crate', 250, 92);
  prop('crate', 275, 98);
  prop('rope_coil', 196, 120, 0);
  prop('cannon', 520, 104);
  prop('powder_keg', 600, 100);
  prop('powder_keg', 616, 108);
  prop('treasure_chest', 700, 96);
  prop('anchor', 790, 112);
  prop('brig_bars', 312, 100, 0);
  const perch = prop('perch', 620, 236, 0);
  stood.push({
    picture: characterPicture2(
      {},
      o.hero ?? ['iron_sword', 'iron_helmet', 'iron_breastplate', 'iron_shield'],
    ),
    anchor: { x: 28, y: 70 },
    x: 230,
    y: 150,
    shadow: 11,
  });
  foe('dock_rat', 110, 130, 11);
  foe('sand_crab', 150, 196, 9);
  foe('deckhand', 360, 140, 11);
  foe('powder_monkey', 520, 132, 10);
  foe('giant_crab', 390, 234, 22);
  foe('smuggler', 690, 150, 11);
  foe('brinebeard', 760, 166, 18);
  // The parrot on its post, its feet on the post's top.
  const parrot = foe2Frame('ships_parrot', o.poses?.ships_parrot ?? 'idle', 0)!;
  stood.push({
    picture: parrot.picture,
    anchor: parrot.feet,
    x: 620 - perch.foot + (perch.seat?.x ?? perch.foot),
    y: 236 - perch.base + (perch.seat?.y ?? 0) + 1,
    sort: 237,
  });
  return stood;
}

/** The sample room composed, every glow in place. */
export function sampleRoom2(o: Parameters<typeof sampleStood2>[0] = {}): Picture2 {
  return roomPicture2(SAMPLE_ROOM2, sampleStood2(o));
}
