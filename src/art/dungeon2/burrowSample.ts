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
import { at as cellAt, darker, type Picture2, type TGrid } from '../town2/cells';
import { addGlow, type Glow, type RgbaImage } from '../raster';
import { burrowNight } from './cave';
import { burrowLevel2, lightGround2, type Light2 } from './light';
import { roomGround2, roomKinds2, type Stood } from './room';
import { burrowFungusGlows } from './burrow';
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
