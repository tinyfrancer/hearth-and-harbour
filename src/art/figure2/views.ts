/**
 * The front figure turned for walking (B10b): toward the camera with both
 * arms free to swing, and from behind, walking away.
 *
 * Toward the camera the figure is the standing drawing, but the far hand no
 * longer rests on the hip while walking: unless it carries a shield (a busy
 * arm, which stays bent), it hangs and swings like the near one, drawn as the
 * near arm's own pixels moved to the far side with their light kept on the
 * left (`flipLit`), sleeve, bracer and all.
 *
 * From behind, the body is the front one mirrored (the figure's right side is
 * now on the viewer's right, so the sword hand is too) and re-lit, with the
 * back of each thing in place of its front: the back of the head and hair,
 * the back of every hat and helm, a coat closed behind, a belt without its
 * buckle, a jerkin without its disc or laces, the quiver on the back, the
 * shield's planks and straps, the cloak over all.
 */
import { DEPTH } from '../depth';
import type { Mat } from '../town2/ramps';
import { FIST2, OPEN_HAND2 } from './body';
import type { Bone, Part2, Pins } from './engine';
import { HAIR_BACKS, HEAD_BACK, HEADGEAR_BACK } from './sideHeads';
import type { Boned } from './walk';

/** Every pixel of a part, by row, as (x, character). */
export function rowsOf(part: Part2): Map<number, [number, string][]> {
  const out = new Map<number, [number, string][]>();
  part.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]!;
      if (ch === '.' || ch === ' ') continue;
      const y = part.at[1] + j;
      if (!out.has(y)) out.set(y, []);
      out.get(y)!.push([part.at[0] + i, ch]);
    }
  });
  return out;
}

/** A part from (x, y, character) pixels. */
export function fromPixels(base: Part2, px: readonly (readonly [number, number, string])[]): Part2 {
  if (!px.length) return { ...base, rows: [] };
  const x0 = Math.min(...px.map((p) => p[0]));
  const y0 = Math.min(...px.map((p) => p[1]));
  const y1 = Math.max(...px.map((p) => p[1]));
  const grid: string[][] = Array.from({ length: y1 - y0 + 1 }, () => []);
  for (const [x, y, ch] of px) {
    const row = grid[y - y0]!;
    while (row.length < x - x0) row.push('.');
    row[x - x0] = ch;
  }
  return { ...base, at: [x0, y0], rows: grid.map((r) => Array.from(r, (c) => c ?? '.').join('')) };
}

/**
 * A part mirrored about `axis` (x becomes axis - x) with its light kept on
 * the left: each row's pixels land in mirrored places but keep their order,
 * so a row lit on its left is still lit on its left. For cloth, skin and
 * mail, whose shading runs across each row; not for things with a front and
 * a back (a face, an axe's bit), which `mirrored` turns whole.
 */
export function flipLit(part: Part2, axis: number): Part2 {
  const px: [number, number, string][] = [];
  for (const [y, row] of rowsOf(part)) {
    const xs = row.map(([x]) => axis - x).sort((a, b) => a - b);
    row.sort((a, b) => a[0] - b[0]).forEach(([, ch], i) => px.push([xs[i]!, y, ch]));
  }
  return fromPixels(part, px);
}

/** A part turned whole about `axis`. */
export function mirrored(part: Part2, axis: number): Part2 {
  const px: [number, number, string][] = [];
  for (const [y, row] of rowsOf(part)) for (const [x, ch] of row) px.push([axis - x, y, ch]);
  return fromPixels(part, px);
}

/** A part with only its rows above `y`. */
export function above(part: Part2, y: number): Part2 {
  const px: [number, number, string][] = [];
  for (const [row, cells] of rowsOf(part))
    if (row < y) for (const [x, ch] of cells) px.push([x, row, ch]);
  return fromPixels(part, px);
}

/** A part with only its rows from `y` down. */
export function below(part: Part2, y: number): Part2 {
  const px: [number, number, string][] = [];
  for (const [row, cells] of rowsOf(part))
    if (row >= y) for (const [x, ch] of cells) px.push([x, row, ch]);
  return fromPixels(part, px);
}

/** A part with characters swapped (a pin for another, or `.` to leave a pixel out). */
export function rechar(part: Part2, swap: Readonly<Record<string, string>>, pins?: Pins): Part2 {
  return {
    ...part,
    rows: part.rows.map((r) => Array.from(r, (c) => swap[c] ?? c).join('')),
    pins: { ...part.pins, ...pins },
  };
}

/** A part with the gaps inside each row filled with `fill`, or the character beside them (a coat closed at the back). */
export function filled(part: Part2, fill?: string): Part2 {
  return {
    ...part,
    rows: part.rows.map((r) => {
      const a = r.search(/[^. ]/);
      if (a < 0) return r;
      const b = r.length - 1 - [...r].reverse().join('').search(/[^. ]/);
      let out = r.slice(0, a);
      let last = r[a]!;
      for (let i = a; i <= b; i++) {
        const c = r[i]!;
        if (c === '.' || c === ' ') out += fill ?? last;
        else {
          out += c;
          last = c;
        }
      }
      return out + r.slice(b + 1);
    }),
  };
}

/** The column the front figure mirrors about: the anchor's, so a mirrored figure stands on the same spot. */
export const BACK_AXIS = 56;
/** Moving the near arm to the far side, toward the camera: its columns 14 to 22 land on 35 to 43. */
export const FAR_AXIS = 57;

const isHand = (p: Part2) =>
  p === FIST2 || p === OPEN_HAND2 || (p.at === FIST2.at && p.rows === FIST2.rows);

/** What a worn part is, for the frames' provenance (walk.ts, `Boned.tag`). */
export function slotTag(part: Part2, bone: Bone, slot: string | null, gear: string | null): string {
  if (part === FIST2) return 'fist';
  if (part === OPEN_HAND2) return 'hand';
  switch (slot) {
    case 'weapon':
      return part.depth === DEPTH.GRIP ? 'grip' : 'held';
    case 'shield':
      return gear === 'spyglass' ? 'held' : 'shield';
    case 'back':
      return 'quiver';
    case 'cloak':
      return bone === 'cloak' ? 'cloak' : 'body';
    case 'feet':
      return 'foot';
    case 'legs':
    case 'knees':
      return 'leg';
    case 'hair':
      return 'hair';
    case 'head':
      return 'hat';
  }
  switch (bone) {
    case 'head':
      return 'head';
    case 'legs':
      return 'leg';
    case 'near':
    case 'far':
      return 'arm';
    case 'skirt':
      return 'skirt';
    case 'nearHeld':
    case 'farHeld':
      return 'hand';
    default:
      return 'body';
  }
}

/** A dressed body's parts with their bones and tags (`slottedParts` with provenance). */
export const taggedParts = (
  slotted: readonly { part: Part2; bone: Bone; slot: string | null; gear: string | null }[],
): Boned[] =>
  slotted.map((s) => ({
    part: s.part,
    bone: s.bone,
    tag: slotTag(s.part, s.bone, s.slot, s.gear),
  }));

/**
 * Toward the camera: the far arm, when it carries no shield, is the near
 * arm's drawing moved across, hanging with an open hand, so both arms swing.
 */
export function frontWalkParts(boned: readonly Boned[], shield: boolean): Boned[] {
  if (shield) return [...boned];
  const nearArm = boned.filter((b) => b.bone === 'near');
  return [
    ...boned.filter((b) => b.bone !== 'far' && b.bone !== 'farHeld'),
    ...nearArm.map((b) => ({ ...b, part: flipLit(b.part, FAR_AXIS), bone: 'far' as Bone })),
    { part: flipLit(OPEN_HAND2, FAR_AXIS), bone: 'far' as Bone, tag: 'hand' },
  ];
}

// ------------------------------------------------------------- from behind

/** A shield from behind: its own outline, planks inside, a rim, two straps across. */
export function shieldBack(front: Part2): Part2 {
  const turned = mirrored(front, BACK_AXIS);
  const by = rowsOf(turned);
  const ys = [...by.keys()].sort((a, b) => a - b);
  const y0 = ys[0]!;
  const y1 = ys[ys.length - 1]!;
  const strapRows = [Math.round(y0 + (y1 - y0) * 0.35), Math.round(y0 + (y1 - y0) * 0.6)];
  const px: [number, number, string][] = [];
  for (const y of ys) {
    const row = by.get(y)!.sort((a, b) => a[0] - b[0]);
    const xa = row[0]![0];
    const xb = row[row.length - 1]![0];
    for (const [x] of row) {
      const edge = x === xa || x === xb || y === y0 || y === y1;
      const t = (x - xa) / Math.max(1, xb - xa);
      let ch = edge ? (t < 0.5 ? 'r' : 'R') : (x - xa) % 3 === 0 ? '4' : t < 0.4 ? '2' : '3';
      if (!edge && strapRows.includes(y)) ch = 'S';
      px.push([x, y, ch]);
    }
  }
  return {
    ...fromPixels(turned, px),
    mat: 'wood',
    pins: { r: ['iron', 2], R: ['iron', 4], S: ['leather', 3] },
  };
}

/**
 * From behind, what covers what (B12; Cody: "sword and shield are visible when
 * character is facing away"). The body is between the viewer and anything
 * held in front of it, so a weapon, a bow, a spyglass and a shield go behind
 * everything of the person and show only where they reach past the body, the
 * cloak, the head and the limbs: a blade above the shoulder, a pommel below
 * the fist, a shield's rim at the elbow. What is worn on the back is in front:
 * the quiver over the shirt, the cloak over the quiver, the arms and the hands
 * that come out from under it, and long hair over the cloak.
 */
export const BACK_DEPTH = {
  /** Anything held, behind the far leg (walk.ts pushes it to -14.5) and everything else. */
  HELD: -40,
  QUIVER: 56,
  CLOAK: 58,
  /** The hands, which come out from under a cloak's edge at the sides. */
  HAND: 59,
} as const;

/**
 * The shield arm from behind: the upper arm hangs at the side and the elbow
 * comes out, but the forearm goes forward to the shield's straps in front of
 * the body, so from this row down it is behind the body (and in front of the
 * shield, whose back it is strapped to).
 */
export const BACK_FOREARM_ROW = 35;
const forearmBehind = (p: Part2): Part2[] => [
  above(p, BACK_FOREARM_ROW),
  { ...below(p, BACK_FOREARM_ROW), depth: BACK_DEPTH.HELD + 5 + p.depth / 100 },
];

/** A held thing seen from behind: behind the person, its own parts kept in their order. */
const heldBehind = (p: Part2): Part2 => ({ ...p, depth: BACK_DEPTH.HELD + p.depth / 100 });

/** A quiver lying across the back: fletchings over the left shoulder, its foot at the right hip. */
const quiverBack = (fletch: Mat): Part2 => ({
  at: [14, 13],
  depth: BACK_DEPTH.QUIVER,
  mat: 'leather',
  pins: { a: [fletch, 1], b: [fletch, 2], c: [fletch, 4], s: ['wood', 3], O: ['leather', 4] },
  rows: [
    'a..a.a.',
    'ab.ab.ab',
    'abcabcab',
    '.bcbcbc.',
    '..s.s.s.',
    '..OOOOO.',
    '...12234',
    '....12234',
    '.....12234',
    '......12234',
    '.......12234',
    '........12234',
    '.........12234',
    '..........12234',
    '...........12234',
    '............12234',
    '.............1234',
    '..............123',
    '...............2.',
  ],
});

/** Boots from behind: the heels, the shafts, the welt. */
const BOOTS_BACK: Part2 = {
  at: [20, 61],
  depth: DEPTH.FEET,
  mat: 'leather',
  rows: [
    '.122334...1122334',
    '.122334...1222334',
    '.122334...1222334',
    '.122334...1222334',
    '0122334...1222334',
    '0122334..01222334',
    '1123344..11223344',
    '4445555..44445555',
    '5555555..55555555',
  ],
};

/**
 * Cloth lit afresh across each row (a lit edge, the field, a shadow third, a
 * dark far edge), for the back of a shirt: the front's collar and the folds
 * pulled to its belt are not there behind. A fold down the spine instead.
 */
export function reshade(part: Part2): Part2 {
  const px: [number, number, string][] = [];
  for (const [y, row] of rowsOf(part)) {
    const xs = row.map(([x]) => x).sort((a, b) => a - b);
    const a = xs[0]!;
    const b = xs[xs.length - 1]!;
    const mid = Math.round((a + b) / 2);
    for (const x of xs) {
      const t = (x - a) / Math.max(1, b - a);
      let s = x === a ? 1 : x === b ? 4 : t < 0.62 ? 2 : t < 0.9 ? 3 : 4;
      if (x === mid && y > part.at[1] + 3) s += 1;
      px.push([x, y, String(Math.min(5, s))]);
    }
  }
  return { ...fromPixels(part, px), pins: undefined };
}

/** What each gear id becomes from behind, if not simply turned. */
type BackRule = (p: Part2, i: number) => Part2 | null;
const BACK_RULES: Readonly<Record<string, BackRule>> = {
  // A jerkin's disc and a belt's buckle are on the front.
  bronze_jerkin: (p, i) => (i === 0 ? p : null),
  leather_belt: (p) => rechar(p, { g: '2', G: '3', h: '4' }),
  leather_jerkin: (p) => rechar(p, { c: '2', C: '3' }),
  captains_coat: (p) => filled(rechar(p, { b: '2', B: '3', g: '1' })),
  shell_necklace: () => null,
  trollstone: () => null,
  hunters_charm: () => null,
  knight_knees: () => null,
  teal_tunic: (p, i) => (i === 0 ? reshade(p) : p),
  linen_tunic: (p, i) => (i === 0 ? reshade(p) : p),
};

/**
 * The hero from behind: the head and hair turned to their backs, the body
 * mirrored and re-lit, the sword arm on the viewer's right and the shield arm
 * on the left; with no shield both arms hang.
 */
export function backParts(
  slotted: readonly { part: Part2; bone: Bone; slot: string | null; gear: string | null }[],
  hairStyle: string | null = null,
): Boned[] {
  const out: Boned[] = [{ part: { ...HEAD_BACK, depth: 0 }, bone: 'head', tag: 'head' }];
  const done = new Set<string>();
  // Under a hat or helm the hair still shows behind, below its rim: the whole
  // style's back, cut off where the head gear starts (a cap covers the crown
  // only, so without this the bare skull reads as a face with no features).
  if (hairStyle && slotted.some((s) => s.slot === 'head')) {
    done.add('hair');
    for (const p of HAIR_BACKS[hairStyle] ?? [])
      out.push({ part: below(p, HEAD_BACK.at[1] + 4), bone: 'head', tag: 'hair' });
  }
  const shield = slotted.find((s) => s.slot === 'shield');
  const nearArm = slotted.filter((s) => s.bone === 'near');
  for (const s of slotted) {
    const { part, bone, slot, gear } = s;
    const tag = slotTag(part, bone, slot, gear);
    if (slot === null && bone === 'head') continue;
    if (slot === 'hair' || slot === 'head' || slot === 'feet') {
      if (done.has(gear!) || (slot === 'hair' && done.has('hair'))) continue;
      done.add(gear!);
      if (slot === 'feet') out.push({ part: BOOTS_BACK, bone: 'legs', tag });
      else
        for (const p of (slot === 'hair' ? HAIR_BACKS : HEADGEAR_BACK)[gear!] ?? [])
          out.push({ part: p, bone: 'head', tag });
      continue;
    }
    if (slot === 'back') {
      if (part.depth === DEPTH.QUIVER) {
        const fletch = (part.pins?.a?.[0] ?? 'linen') as Mat;
        out.push({ part: quiverBack(fletch), bone: 'body', tag });
      }
      continue;
    }
    const rule = gear ? BACK_RULES[gear] : undefined;
    const index = gear ? slotted.filter((o) => o.gear === gear).indexOf(s) : 0;
    const p = rule ? rule(part, index) : part;
    if (!p) continue;
    if (bone === 'far' || bone === 'farHeld') {
      // The shield arm, on the viewer's left from behind.
      if (!shield) continue;
      if (slot === 'shield') {
        if (index > 0 && gear !== 'spyglass') continue;
        out.push({
          part: heldBehind(gear === 'spyglass' ? mirrored(p, BACK_AXIS) : shieldBack(p)),
          bone: 'nearHeld',
          tag,
        });
        continue;
      }
      for (const half of forearmBehind(flipLit(p, BACK_AXIS)))
        if (half.rows.length) out.push({ part: half, bone: 'near', tag });
      continue;
    }
    if (bone === 'near') {
      out.push({ part: flipLit(p, BACK_AXIS), bone: 'far', tag });
      continue;
    }
    if (bone === 'nearHeld') {
      out.push({
        part: isHand(p)
          ? { ...flipLit(p, BACK_AXIS), depth: BACK_DEPTH.HAND }
          : heldBehind(mirrored(p, BACK_AXIS)),
        bone: 'farHeld',
        tag,
      });
      continue;
    }
    if (bone === 'cloak') {
      out.push({
        part: { ...flipLit(p, BACK_AXIS), depth: BACK_DEPTH.CLOAK, cast: true },
        bone: 'cloak',
        tag,
      });
      continue;
    }
    out.push({ part: flipLit(p, BACK_AXIS), bone, tag });
  }
  if (!shield) {
    // Both arms hang: the left one is the near arm's own drawing, with an open hand.
    for (const s of nearArm)
      out.push({ part: s.part, bone: 'near', tag: slotTag(s.part, s.bone, s.slot, s.gear) });
    out.push({ part: { ...OPEN_HAND2, depth: BACK_DEPTH.HAND }, bone: 'near', tag: 'hand' });
  }
  return out;
}
