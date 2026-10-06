/**
 * How the cast's people wind up and strike (B10a). The figure rig carries a
 * held thing rigidly with the wrist, upright as it is drawn standing, so a
 * blow made on it is a weapon slid across the chest. Here the near arm and
 * what it holds are drawn again for the two moments a fight shows: cocked
 * back over the shoulder (the wind-up a heavy blow is telegraphed by), and
 * driven out ahead (the blow), the weapon laid along the line of the blow so
 * it reaches past the body toward whoever is struck. The rest of the figure
 * is the rig's.
 *
 * Drawn on the 56 x 72 figure canvas, facing right, in town materials, with
 * the skin in `skin` so a person's own tone is swapped in afterwards.
 */
import { put, tgrid, type TGrid } from '../town2/cells';
import type { Mat } from '../town2/ramps';
import { cell } from './cave';
import { rod, sprite } from './kit';

/** What a person strikes with. */
export type SwingKind = 'hook' | 'cutlass' | 'cudgel' | 'bow';

/** A person's sleeve as it shows on the swinging arm: the upper arm's stuff and the forearm's. */
export interface Sleeve {
  readonly upper: Mat;
  readonly fore: Mat;
}

const SKIN = {
  s: ['skin', 1],
  t: ['skin', 2],
  u: ['skin', 3],
  v: ['skin', 4],
  w: ['skin', 5],
} as const;

/** A fist closed on a grip, its knuckles toward the light. */
const fist = (g: TGrid, x: number, y: number) =>
  sprite(g, x, y, ['.st.', 'sttu', 'tuuv', '.vw.'], SKIN);

/** An arm from the shoulder through the elbow to the wrist, lit on top. */
function arm(
  g: TGrid,
  s: Sleeve,
  shoulder: readonly [number, number],
  elbow: readonly [number, number],
  wrist: readonly [number, number],
): void {
  rod(g, shoulder[0], shoulder[1], elbow[0], elbow[1], 4, s.upper, [1, 2, 3, 4]);
  rod(g, elbow[0], elbow[1], wrist[0], wrist[1], 3, s.fore, [1, 2, 4]);
}

const SHOULDER = [20, 28] as const;

/** The near arm cocked back over the shoulder, the weapon raised behind the head. */
export function windupArm(kind: SwingKind, s: Sleeve): TGrid {
  const g = tgrid(56, 72);
  if (kind === 'bow') return bowArms(g, s, true);
  // Behind the arm: the weapon, up and back from the fist.
  if (kind === 'hook') {
    rod(g, 25, 24, 7, 4, 2, 'wood', [2, 4]);
    sprite(g, 3, 0, ['.ab..', 'abb..', 'ab.a.', '.abba', '..bb.'], {
      a: ['iron', 1],
      b: ['iron', 3],
    });
  } else if (kind === 'cutlass') {
    for (let i = 0; i <= 14; i++) {
      const x = 13 - Math.round(i * 0.35 + (i * i) / 60);
      put(g, x, 13 - i, cell('iron', 1));
      put(g, x + 1, 13 - i, cell('iron', i > 11 ? 4 : 3));
    }
    sprite(g, 11, 13, ['abba', '.cc.'], { a: ['bronze', 1], b: ['bronze', 2], c: ['bronze', 4] });
  } else {
    rod(g, 14, 13, 9, 2, 3, 'wood', [1, 2, 4]);
    rod(g, 10, 4, 7, 0, 4, 'wood', [1, 2, 3, 4]);
  }
  arm(g, s, SHOULDER, [13, 23], [15, 15]);
  fist(g, 13, 12);
  return g;
}

/** The near arm driven out ahead, the weapon laid along the blow. */
export function strikeArm(kind: SwingKind, s: Sleeve): TGrid {
  const g = tgrid(56, 72);
  if (kind === 'bow') return bowArms(g, s, false);
  arm(g, s, SHOULDER, [29, 32], [39, 31]);
  if (kind === 'hook') {
    // The haft through the fist, the butt behind it, the hook out ahead.
    rod(g, 30, 32, 52, 29, 2, 'wood', [2, 4]);
    sprite(g, 49, 25, ['....a', '...ab', 'aabbb', '.b.bb', '..b..'], {
      a: ['iron', 1],
      b: ['iron', 3],
    });
  } else if (kind === 'cutlass') {
    sprite(g, 41, 28, ['a', 'b', 'b', 'c'], {
      a: ['bronze', 1],
      b: ['bronze', 2],
      c: ['bronze', 4],
    });
    for (let i = 0; i <= 12; i++) {
      const x = 43 + i;
      const y = 30 - Math.round(i * 0.25 + (i * i) / 70);
      put(g, x, y, cell('iron', 1));
      put(g, x, y + 1, cell('iron', i > 9 ? 4 : 3));
    }
  } else {
    rod(g, 41, 31, 50, 25, 3, 'wood', [1, 2, 4]);
    rod(g, 48, 26, 53, 23, 4, 'wood', [1, 2, 3, 4]);
  }
  fist(g, 38, 29);
  return g;
}

/**
 * A bow held out ahead at arm's length, upright: drawn (an arrow on the
 * string, pulled back to the cheek) for the wind-up, loosed (the string
 * straight, the arrow gone) for the blow.
 */
function bowArms(g: TGrid, s: Sleeve, drawn: boolean): TGrid {
  const bx = 44;
  // The far arm draws the string back to the cheek.
  const nock = drawn ? 30 : 41;
  rod(g, 35, 28, nock + 2, 30, 3, s.fore, [2, 3, 4]);
  // The bow: a stave bent in a curve, its grip in the near fist.
  for (let y = 15; y <= 47; y++) {
    const off = Math.round(5 * Math.sin(((y - 15) / 32) * Math.PI));
    put(g, bx + off, y, cell('wood', 2));
    put(g, bx + off + 1, y, cell('wood', 4));
  }
  // The string, from tip to tip through the nock.
  for (let y = 15; y <= 47; y++) {
    const t = y <= 31 ? (y - 15) / 16 : (47 - y) / 16;
    put(g, Math.round(bx + (nock - bx) * t), y, cell('linen', 1));
  }
  if (drawn) {
    // The arrow along the string to the bow and past it.
    for (let x = nock; x <= 54; x++) put(g, x, 31, cell('wood', x > 51 ? 3 : 2));
    sprite(g, 52, 30, ['ab', 'bb', 'a.'], { a: ['iron', 1], b: ['iron', 3] });
    sprite(g, nock - 1, 30, ['c.', 'cc', 'c.'], { c: ['crimson', 2] });
  }
  arm(g, s, SHOULDER, [31, 31], [42, 31]);
  fist(g, bx + 4, 29);
  fist(g, nock, 29);
  return g;
}
