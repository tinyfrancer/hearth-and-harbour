/**
 * A Burrow room composed by the art lane (B20), as the gallery and the review
 * sheets show it: lane C's first room (`hollow`, `src/scene/burrow.ts`, its
 * rows copied here in this file's key) in the `burrow` theme, its lanterns
 * on posts burning or out, figures standing in it, and the dark painted by
 * the night ramp's rule (`burrowNight`, `burrowLevel2`): every pixel looked
 * up in its level's palette, a figure in the level at its feet, glows over
 * it all. This is the art lane's reference for the rule; lane C paints its
 * own rooms.
 */
import { at as cellAt, darker, mirror, type Picture2, type TGrid } from '../town2/cells';
import { addGlow, type Glow, type RgbaImage } from '../raster';
import { burrowNight } from './cave';
import { burrowLevel2, lightGround2, type Light2 } from './light';
import { roomGround2, roomKinds2, type Stood } from './room';
import { burrowFungusGlows } from './burrow';
import { characterPicture2 } from '../character2';
import { foe2Frame, type Foe2Pose } from './cast2';
import { prop2 } from './props';
import { postLanternProp } from './burrowProps';
import { GROUND2_SHADOW, TILE2 } from './tiles';

/**
 * The hollow as lane C cut it (wave 19), in this file's key: `#` rock, `r`
 * earth, `,` moss, `.` leaf litter, `p` flagstones, `S` an open side door,
 * `Z` a barred one. Its props and lanterns are listed apart (`HOLLOW_THINGS`).
 */
export const HOLLOW_ROWS: readonly string[] = [
  '##################################',
  '##################################',
  '#rr...rrrrrrrrrrrrrrrrrrrrrrrrrrrr#',
  '#rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr#',
  '#rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr#',
  'Srrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr#',
  '#rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrZ',
  '#rrrrrrrrrrrrrr,,,rrrrrrrrrrrrrrrr#',
  '#rrrrrrrrrrrrr,,,,,rrrrrrrrrrrrrrr#',
  '#rrrrrrrrrrrrrr,,,rrrrrrrrrrrrrrrr#',
  '#rr..rrrrrrrrrrrrrrrrrrrrrrrrr...r#',
  '#r....rrrrrrrrrrrrrrrrrrrrrrr.....#',
  '##################################',
].map((r) => r.slice(0, 34));

/** A lantern on a post in a sample room: its cell (as lane C's `Q`/`Y`) and whether it burns. */
export interface SampleLamp {
  readonly col: number;
  readonly row: number;
  readonly lit: boolean;
}

/** The hollow's lanterns as lane C placed them: the one by the start burning, two to light. */
export const HOLLOW_LAMPS: readonly SampleLamp[] = [
  { col: 4, row: 3, lit: true },
  { col: 16, row: 5, lit: false },
  { col: 26, row: 4, lit: false },
];

/** Where a lantern's post meets the floor (lane C's `lampFoot`: two above its tile's bottom). */
export const lampFootOf = (col: number, row: number) => ({
  x: col * TILE2 + TILE2 / 2,
  y: row * TILE2 + TILE2 - 2,
});

/** The light a burning lantern lays, by the rules' numbers (lane C's `LAMP_POOL` 66, 4 below its foot). */
export function lampLight(col: number, row: number, flameAbove = 38): Light2 {
  const foot = lampFootOf(col, row);
  return {
    x: foot.x,
    y: foot.y - flameAbove,
    radius: 70,
    strength: 0.55,
    drop: flameAbove + 4,
    pool: 66,
    flicker: 0.12,
  };
}

/** The hero's own small light (lane C's `HERO_POOL` 36, 4 above his feet). */
export const heroLight = (x: number, y: number): Light2 => ({
  x,
  y: y - 4,
  radius: 0,
  strength: 0,
  drop: 0,
  pool: 36,
  flicker: 0,
});

/** How a sample is lit: every lantern burning and no dark, as the rule draws it, or all dark. */
export type SampleLight = 'lit' | 'rule';

/**
 * A room's pixels: the ground lit by the burning lanterns' pools, each pixel
 * in its level's palette (`burrowLevel2` by `lights`, the hero's own light
 * among them if given), each figure in the level at its feet, then every
 * glow that shines: the lanterns' and the fungus's. `light: 'lit'` paints
 * everything in the light (level 0).
 */
export function burrowRoomRgba(
  rows: readonly string[],
  stood: readonly Stood[],
  lights: readonly Light2[],
  o: { light?: SampleLight; extraGlows?: readonly Glow[] } = {},
): RgbaImage {
  const ground = roomGround2(rows, 'burrow');
  // An open door's light from beyond is a pool too.
  lights = [...lights, ...ground.lights];
  const lit = lightGround2(ground.grid, lights, 'burrow');
  const g: TGrid = { w: lit.w, h: lit.h, d: lit.d.slice() };
  const all = o.light === 'lit';
  const level = (x: number, y: number) => (all ? 0 : burrowLevel2(lights, x, y));
  // Contact shadows: the ground's own steps darkened under each foot.
  for (const s of stood) {
    const rx = s.shadow ?? 0;
    if (!rx) continue;
    const kind = ground.kinds[Math.floor(s.y / TILE2)]?.[Math.floor(s.x / TILE2)];
    const n = (kind && GROUND2_SHADOW[kind]) ?? 1;
    const ry = Math.max(2, Math.round(rx / 4));
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++) {
        const d = (x / rx) ** 2 + (y / ry) ** 2;
        if (d > 1) continue;
        const c = cellAt(g, s.x + x, s.y + y);
        if (c) g.d[(s.y + y) * g.w + s.x + x] = darker(c, d < 0.45 ? n : Math.max(1, n - 1));
      }
  }
  const out = new Float64Array(g.w * g.h * 4);
  const paint = (pic: Picture2, x0: number, y0: number, lv: (x: number, y: number) => number) => {
    const { w, h, d } = pic.grid;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const c = d[y * w + x]!;
        const X = x0 + x;
        const Y = y0 + y;
        if (!c || X < 0 || Y < 0 || X >= g.w || Y >= g.h) continue;
        const rgb = burrowNight(lv(X, Y)).rgb;
        const o4 = (Y * g.w + X) * 4;
        out[o4] = rgb[c * 3]!;
        out[o4 + 1] = rgb[c * 3 + 1]!;
        out[o4 + 2] = rgb[c * 3 + 2]!;
        out[o4 + 3] = 255;
      }
  };
  paint({ grid: g, glows: [] }, 0, 0, level);
  const glows: Glow[] = [...ground.glows, ...fungusGlowsOf(rows), ...(o.extraGlows ?? [])];
  for (const s of [...stood].sort((a, b) => (a.sort ?? a.y) - (b.sort ?? b.y))) {
    const x0 = s.x - s.anchor.x;
    const y0 = s.y - s.anchor.y;
    const lv = level(s.x, s.y);
    paint(s.picture, x0, y0, () => lv);
    for (const glow of s.picture.glows) glows.push({ ...glow, x: glow.x + x0, y: glow.y + y0 });
  }
  for (const glow of glows) addGlow(out, g.w, g.h, glow);
  const data = new Uint8ClampedArray(out.length);
  for (let i = 0; i < out.length; i++) data[i] = out[i]!;
  return { width: g.w, height: g.h, data };
}

/** Every fungus glow on a room's faces, in room pixels. */
export function fungusGlowsOf(rows: readonly string[]): Glow[] {
  const kinds = roomKinds2(rows);
  const out: Glow[] = [];
  kinds.forEach((r, row) =>
    r.forEach((k, col) => {
      for (const glow of burrowFungusGlows(k, col * TILE2))
        out.push({ ...glow, x: glow.x + col * TILE2, y: glow.y + row * TILE2 });
    }),
  );
  return out;
}

/* ------------------------------------------------- lane C's rooms, dressed */

/**
 * Three of lane C's rooms as it cut them (wave 19, `src/scene/burrow.ts`),
 * copied verbatim in its key (`#` rock, `.` floor, `M O U V F J` props, `Y`
 * a lantern burning, `Q` one to light, `s` the start, `x` the end, a lower
 * case letter a door), for the art lane's sample scenes.
 */
export const LANE_C_ROOMS: Readonly<Record<'gallery' | 'run' | 'sett', readonly string[]>> = {
  gallery: [
    '##################################',
    '##################################',
    '#MM.............OO.............MM#',
    '#M..........Y...........Q.......M#',
    '#.....Q.........................M#',
    '#.........FF.........FF..........#',
    'b................................c',
    '#............................Q...#',
    '#....FF.........FF..........FF...#',
    '#M..............................M#',
    '#MM...........OO..........V....MM#',
    '#VMMM.....MM........MM.......MMMV#',
    '##################################',
  ],
  run: [
    '##################################',
    '##################################',
    '#UU................UU..........UU#',
    '#U....Y..........................#',
    '#.......................Q........#',
    '#..........V.............V.......#',
    'c................................d',
    '#.....V..........................#',
    '#..........Q.........V...........#',
    '#U..............................U#',
    '#UU.................UU.......Q.UU#',
    '#UUUV.......UU.............UUVUUU#',
    '##################################',
  ],
  sett: [
    '##################################',
    '##################################',
    '#MM........OO..JJJJ..OO........MM#',
    '#M.....Y........x.........Y.....M#',
    '#................................#',
    '#..........Q...........Q.........#',
    'd................................#',
    '#................................#',
    '#.....Q....................Q.....#',
    '#................................#',
    '#MM............................MM#',
    '#VMMM......FF..........FF....MMMV#',
    '##################################',
  ],
};

const PROP_OF: Readonly<Record<string, string>> = {
  M: 'toadstools',
  O: 'root_tangle',
  U: 'bramble_patch',
  V: 'mossy_stone',
  F: 'fallen_log',
  J: 'root_throne',
};

/**
 * A lane C room in this file's key, its props and its lanterns: the floor
 * earth (the sett's middle flagstones with `hall`, as the badger's hall), its
 * doors open on the west and barred on the east.
 */
export function laneCRoom(
  rows: readonly string[],
  hall = false,
): {
  rows: string[];
  props: { id: string; col: number; row: number }[];
  lamps: { col: number; row: number; lit: boolean }[];
} {
  const props: { id: string; col: number; row: number }[] = [];
  const lamps: { col: number; row: number; lit: boolean }[] = [];
  const out = rows.map((r, row) =>
    [...r]
      .map((ch, col) => {
        if (ch === '#') return '#';
        const id = PROP_OF[ch];
        if (id) props.push({ id, col, row });
        if (ch === 'Y' || ch === 'Q') lamps.push({ col, row, lit: ch === 'Y' });
        if (/[a-d]/.test(ch)) return col === 0 ? 'S' : 'Z';
        if (hall && col >= 6 && col <= 27 && row >= 3 && row <= 9) return 'p';
        return 'r';
      })
      .join(''),
  );
  return { rows: out, props, lamps };
}

/** A figure for a sample scene: a foe by id in a pose, or the knight. */
export interface SampleFigure {
  readonly id: string;
  readonly col: number;
  readonly row: number;
  readonly pose?: Foe2Pose;
  readonly frame?: number;
  readonly phase?: number;
  readonly facing?: 'left' | 'right';
  /** Rows it is drawn above where it stands (the moth's lift). */
  readonly lift?: number;
  /** Pixels across within its cell, from its middle. */
  readonly dx?: number;
}

const KNIGHT = [
  'salt_iron_helm',
  'salt_iron_plate',
  'salt_iron_shield',
  'salt_iron_sword',
  'salt_iron_greaves',
  'red_cloak',
];

/**
 * A lane C room dressed and lit for the gallery and the review sheets: its
 * props, its lanterns (those in `burning` lit, by their order; all of them
 * with `light: 'lit'`), the figures (`knight` is the hero, carrying his own
 * small light), and the dark by the night ramp's rule.
 */
export function burrowScene(
  rows: readonly string[],
  figures: readonly SampleFigure[],
  o: { burning?: readonly boolean[]; light?: SampleLight; hall?: boolean } = {},
): RgbaImage {
  const room = laneCRoom(rows, o.hall);
  const T = TILE2;
  const stood: Stood[] = [];
  for (const p of room.props) {
    const pr = prop2(p.id);
    if (!pr) continue;
    stood.push({
      picture: { grid: pr.grid, glows: pr.glows },
      anchor: { x: pr.foot, y: pr.base },
      x: p.col * T + T / 2,
      y: p.row * T + T - 2,
      shadow: Math.floor(pr.grid.w / 2.4),
    });
  }
  const lights: Light2[] = [];
  room.lamps.forEach((l, i) => {
    const lit = o.light === 'lit' ? true : (o.burning?.[i] ?? l.lit);
    const lp = postLanternProp(lit ? 'lit' : 'out', 0);
    const foot = lampFootOf(l.col, l.row);
    stood.push({
      picture: { grid: lp.grid, glows: lp.glows.map((g) => ({ ...g, x: g.x + 1, y: g.y + 1 })) },
      anchor: { x: (lp.foot ?? 0) + 1, y: lp.base },
      x: foot.x,
      y: foot.y,
    });
    if (lit) lights.push(lampLight(l.col, l.row));
  });
  for (const f of figures) {
    const x = f.col * T + T / 2 + (f.dx ?? 0);
    const y = f.row * T + T - 2;
    if (f.id === 'knight') {
      stood.push({
        picture: characterPicture2({}, KNIGHT),
        anchor: { x: 28, y: 70 },
        x,
        y,
        shadow: 11,
      });
      lights.push(heroLight(x, y));
      continue;
    }
    const fr = foe2Frame(f.id, f.pose ?? 'idle', f.frame ?? 0, f.phase ?? 1);
    if (!fr) continue;
    const left = f.facing === 'left';
    const grid = left ? mirror(fr.picture.grid) : fr.picture.grid;
    const fx = left ? grid.w - 1 - fr.feet.x : fr.feet.x;
    stood.push({
      picture: { grid, glows: [] },
      anchor: { x: fx, y: fr.feet.y + (f.lift ?? 0) },
      x,
      y,
      shadow: f.lift ? 0 : 12,
    });
  }
  return burrowRoomRgba(room.rows, stood, lights, { light: o.light ?? 'rule' });
}
