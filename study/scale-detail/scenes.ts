/**
 * Art study (not shipped): the one scene, a corner of the town by the tavern
 * door, laid out once in metres and drawn at each option's size. The camera
 * puts the hero's feet a little below the middle of the screen, as the town
 * view does, and crops whatever does not fit.
 */
import { building, NEIGHBOUR, type Building, type BuildingCfg } from './buildings';
import { at, darker, put, stamp, tgrid, type TGrid } from './engine';
import { barrel, cobbles, crate, fence, grass, kerb, lampPost, pine, shadowOval } from './props';
import { bayer } from './texture';

/** The phone: 390 x 844 CSS pixels at 3x, less a 54-pixel header and a 60-pixel tab bar. */
export const DEVICE_W = 1170;
export const DEVICE_H = 2532;
export const HEADER = 54 * 3;
export const TABBAR = 60 * 3;
export const SCENE_DEVICE_H = DEVICE_H - HEADER - TABBAR;

export interface OptionDef {
  readonly scale: number;
  readonly u: number;
  readonly tavern: BuildingCfg;
  readonly hero: TGrid;
  readonly villager: TGrid;
  /**
   * Round two: who stands where, in metres from the tavern door (x) and from
   * the wall (y). When given, it replaces the hero-and-villager placing.
   */
  readonly figures?: readonly { readonly g: TGrid; readonly dx: number; readonly ym: number }[];
}

/** Where a figure's feet are in its own grid: the middle of its soles. */
export function feetOf(g: TGrid): { x: number; y: number } {
  let bottom = 0;
  for (let y = g.h - 1; y >= 0 && !bottom; y--)
    for (let x = 0; x < g.w; x++) if (at(g, x, y)) bottom = y;
  const sole = bottom - 1;
  let x0 = g.w;
  let x1 = 0;
  for (let x = 0; x < g.w; x++)
    if (at(g, x, sole)) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
    }
  return { x: (x0 + x1) / 2, y: sole };
}

interface Standing {
  readonly ym: number;
  draw(): void;
}

export function composeScene(o: OptionDef): TGrid {
  const W = Math.ceil(DEVICE_W / o.scale);
  const H = Math.ceil(SCENE_DEVICE_H / o.scale);
  const u = o.u;
  const g = tgrid(W, H);
  const tav = building(u, o.tavern);
  const door = tav.door!;
  const xd = (door.x + door.w / 2 - tav.wallX0) / u;
  const camX = xd + 0.95;
  const heroYm = 0.55;
  const baseY = Math.round(H * 0.56 - heroYm * u);
  const sx = (xm: number) => Math.round((xm - camX) * u + W / 2);
  const sy = (ym: number) => Math.round(baseY + ym * u);

  // Ground: grass behind and in front, the cobbled street between, a kerb.
  grass(g, { x: 0, y: 0, w: W, h: H }, u, 5);
  const streetTop = sy(-0.6);
  const streetBot = sy(4.6);
  cobbles(g, { x: 0, y: streetTop, w: W, h: streetBot - streetTop }, u, 7);
  kerb(g, 0, streetBot, W, u, 3);

  const things: Standing[] = [];
  const placeBuilding = (b: Building, xm: number) => {
    const x = sx(xm) - b.wallX0;
    const y = baseY - b.base;
    // Contact shadow along its foot, and its shadow thrown down and right.
    const w0 = sx(xm);
    const w1 = w0 + (b.wallX1 - b.wallX0);
    const ch = Math.round(0.3 * u);
    for (let j = 0; j < ch; j++)
      for (let xx = w0 - 2; xx < w1 + Math.round(0.5 * u); xx++) {
        const n = j < 2 ? 2 : bayer(xx, j) < 1 - j / ch ? 1 : 0;
        const c = at(g, xx, baseY + j);
        if (n && c) put(g, xx, baseY + j, darker(c, n));
      }
    const sh = Math.round(2.4 * u);
    for (let yy = baseY - sh; yy < baseY + ch; yy++) {
      const e = Math.round((yy - (baseY - sh)) * 0.5);
      for (let xx = w1; xx < w1 + e; xx++) {
        const c = at(g, xx, yy);
        if (c) put(g, xx, yy, darker(c, 1));
      }
    }
    things.push({ ym: 0, draw: () => stamp(g, b.grid, x, y) });
  };
  const placeFigure = (f: TGrid, xm: number, ym: number) => {
    const feet = feetOf(f);
    const fx = sx(xm);
    const fy = sy(ym);
    shadowOval(g, fx + 0.1 * u, fy + 0.5, 0.42 * u, 0.13 * u);
    things.push({ ym, draw: () => stamp(g, f, Math.round(fx - feet.x), fy - feet.y) });
  };
  const placeProp = (p: TGrid, xm: number, ym: number, shadowR: number) => {
    const fx = sx(xm);
    const fy = sy(ym);
    shadowOval(g, fx + 0.12 * u, fy, shadowR * u, Math.max(1.5, shadowR * 0.32 * u));
    things.push({ ym, draw: () => stamp(g, p, Math.round(fx - p.w / 2), fy - p.h + 1) });
  };

  // Pines behind the street, a neighbour beyond the sign, the tavern.
  const tree = pine(u, 1);
  const tree2 = pine(u, 2);
  for (let r = 0; r < 3; r++)
    for (let i = -8; i < 14; i++) {
      if ((i * 5 + r * 3) % 4 === 0) continue;
      const xm = i * 2.2 + (r % 2) * 1.1 + ((i * 7 + r) % 3) * 0.3;
      const ym = -6.5 - r * 2.6 - ((i * 5 + r) % 3) * 0.5;
      const t = (i + r) % 2 ? tree : tree2;
      things.push({
        ym: ym - 10,
        draw: () => stamp(g, t, sx(xm) - Math.floor(t.w / 2), sy(ym) - t.h),
      });
    }
  const tavernW = (tav.wallX1 - tav.wallX0) / u;
  placeBuilding(building(u, NEIGHBOUR), tavernW + 4.4);
  placeBuilding(building(u, { ...NEIGHBOUR, seed: 29, roof: 'tile', shutters: [1] }), -7.6);
  placeBuilding(tav, 0);

  placeProp(barrel(u), xd - 1.35, 0.3, 0.38);
  placeProp(crate(u), xd - 2.2, 0.42, 0.45);
  if (o.figures) for (const f of o.figures) placeFigure(f.g, xd + f.dx, f.ym);
  else {
    placeFigure(o.hero, xd + 1.2, heroYm);
    placeFigure(o.villager, xd + 2.25, 0.9);
  }
  placeProp(lampPost(u), xd + 4.1, 1.55, 0.3);
  // Beyond the kerb: a verge, a fence, and the edge of the wood.
  things.push({ ym: 7.0, draw: () => fence(g, 0, sy(7.0), W, u) });
  placeProp(tree, xd - 3.6, 8.2, 1.3);
  placeProp(tree2, xd + 6.2, 9.0, 1.3);
  for (let i = -8; i < 14; i++)
    for (let r = 0; r < 3; r++) {
      if ((i * 7 + r) % 3 === 0) continue;
      const xm = xd + i * 2.1 + (r % 2) * 1.05 + ((i * 3 + r) % 4) * 0.2;
      const ym = 12.5 + r * 2.6 + ((i * 7 + r) % 3) * 0.3;
      placeProp(r % 2 ? tree : tree2, xm, ym, 1.2);
    }

  things.sort((a, b) => a.ym - b.ym);
  for (const t of things) t.draw();
  return g;
}
