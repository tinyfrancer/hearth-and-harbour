/**
 * Things standing in Brinebeard's Grotto: what smugglers keep and a pirate
 * ship carries, in the town's own woods and irons. Rows of characters with a
 * shared legend, outlined automatically, lit from the upper left. Each knows
 * the row it meets the ground on; the lantern knows where its light is.
 */
import { outline, parseSprite, type Grid, type Legend } from './grid';
import type { Glow } from './raster';

const LEGEND: Legend = {
  j: 'wood1',
  W: 'wood2',
  o: 'wood3',
  O: 'wood4',
  M: 'metal2',
  m: 'metal3',
  q: 'slate3',
  v: 'rust2',
  '1': 'slate1',
  '2': 'slate2',
  '3': 'slate3',
  k: 'ink1',
  x: 'shade1',
  g: 'gold1',
  G: 'gold2',
  w: 'white1',
  l: 'linen1',
  L: 'linen2',
  I: 'linen3',
  a: 'lamp1',
  y: 'glass1',
  Y: 'glass2',
};

export interface PropDef {
  readonly rows: readonly string[];
  /** Lights on the drawing, before the outline. */
  readonly glows?: readonly Glow[];
}

const PROPS: Readonly<Record<string, PropDef>> = {
  // A keg of powder: a squat barrel in iron hoops, a skull painted on it and a
  // fuse sticking out of its top.
  powder_keg: {
    rows: [
      '.....k',
      '....kO',
      '..OOOOOOO',
      '.OjjWWWWoO',
      'qqqqqqqqqqq',
      'jjWWWWWWWoo',
      'jjWWwwwWWoo',
      'jjWWkwkWWoo',
      'jjWWwwwWWoo',
      'jjWWWwWWWoo',
      'qqqqqqqqqqq',
      'jjWWWWWWWoo',
      '.jWWWWWWoo',
      '..OOOOOOO',
    ],
  },
  // A sea chest: a domed lid banded in iron, a gold hasp, one coin dropped.
  treasure_chest: {
    rows: [
      '..OOOOOOOOOOOOOO',
      '.OjjjMjjjjjjMjjWO',
      'OjjWWMWWWWWWMWWWoO',
      'OjWWWMWWWWWWMWWWoO',
      'mmmmmmmmGGmmmmmmmm',
      'OjWWWMWWggWWMWWWoO',
      'OjWWWMWWGGWWMWWWoO',
      'OjWWWMWWWWWWMWWWoO',
      'OjWWWMWWWWWWMWWWoO',
      'OoooomooooooMoooOO..gG',
      '.OOOOOOOOOOOOOOOO...GG',
    ],
  },
  // A section of the brig's wall: iron bars set in timber, a band across.
  brig_bars: {
    rows: [
      'OOOOOOOOOOOOOOOO',
      'jjjjjjjjjjjjjjjo',
      'WWWWWWWWWWWWWWWO',
      'OOOOOOOOOOOOOOOO',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mm..Mm..Mm.',
      'mmmmmmmmmmmmmmmm',
      'm1mmm1mmm1mmm1mq',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mv..Mm..Mm.',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mm..Mv..Mm.',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mm..Mm..Mm.',
      '.Mm..Mm..Mm..Mm.',
      'OOOOOOOOOOOOOOOO',
      'jjjjjjjjjjjjjjjo',
      'OOOOOOOOOOOOOOOO',
    ],
  },
  // A ship's lantern hung from a post driven into the floor, lit.
  lantern: {
    rows: [
      'OOOOOOOOOO',
      'jjjjjjjjjO',
      'jO.....m',
      'jO.....m',
      'jO....mmm',
      'jO...mayam',
      'jO...mayam',
      'jO...maaam',
      'jO....mmm',
      'jO',
      'jO',
      'jO',
      'jO',
      'jO',
      'jO',
      'jO',
      'jO',
      'jO',
      'jO',
      'jO',
      'jO',
      'jO',
      'OOO',
    ],
    glows: [{ x: 7.5, y: 6.5, radius: 44, strength: 0.55 }],
  },
  // A spare anchor standing on its crown: ring, wooden stock, rusting shank.
  anchor: {
    rows: [
      '.......Mmq',
      '......M...q',
      '......m...q',
      '.......mqq',
      'jjjjjjjMmqjjjjjjo',
      'oooooooMmqooooooO',
      '.......Mmq',
      '.......Mvq',
      '.......Mmq',
      '.......Mmq',
      '.......Mmq',
      '.......Mmq',
      '.......Mvq',
      '.......Mmq',
      'M......Mmq......q',
      'MM.....Mmq.....qq',
      '.Mm....Mmq....mq',
      '..Mmq..Mmq..Mmq',
      '...MMmmMmqmmmq',
      '.....MMmmqqq',
    ],
  },
  // A coil of hemp rope, lying flat, its end trailing off.
  rope_coil: {
    rows: [
      '....lllLLL',
      '..llLIIIIILL',
      '.lLIlllLLLILL',
      'lLIlLIIIILlILL',
      'lLIlLIxxILlILL',
      '.lLIlllLLLILL',
      '..lLIIIIIILLIlL',
      '....LLLLLLII..LI',
    ],
  },
  // A ship's cannon on its wooden carriage, facing right.
  cannon: {
    rows: [
      '......1111111111111',
      '....11222222222222111',
      '.k3122222222222222222211',
      'k33222222222222222222221k',
      '.k3333333333333333333322k',
      '....33333333333333333333',
      '...OjjjjjjjjjjjjjjjO',
      '..OjWWWWWWWWWWWWWWWoO',
      '..OOOOOOOOOOOOOOOOOOO',
      '..OjjjO.........OjjjO',
      '.OjWWWoO.......OjWWWoO',
      '.OjWmWoO.......OjWmWoO',
      '.OjWWWoO.......OjWWWoO',
      '..OoooO.........OoooO',
    ],
  },
};

export const PROP_IDS: readonly string[] = Object.keys(PROPS);

export function isPropId(id: string): boolean {
  return Object.hasOwn(PROPS, id);
}

/** A prop outlined, the row it meets the ground on, and its lights. */
export function propGrid(id: string): { grid: Grid; base: number; glows: Glow[] } {
  const def = PROPS[id]!;
  const g = outline(parseSprite(def.rows, LEGEND));
  const glows = (def.glows ?? []).map((l) => ({ ...l, x: l.x + 1, y: l.y + 1 }));
  return { grid: g, base: def.rows.length, glows };
}
