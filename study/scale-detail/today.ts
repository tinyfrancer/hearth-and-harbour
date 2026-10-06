/**
 * Art study (not shipped), option A: today's art, unchanged, from the real
 * src/art pieces, laid out as the same town corner as the other options and
 * drawn exactly as the game draws it (day palette, 4 device pixels a pixel).
 */
import { DEFAULT_LOOK, characterPicture } from '../../src/art/character';
import { HERO_OUTFIT, figure } from '../../src/art/figure';
import { blit, grid, groundShadow, type Grid } from '../../src/art/grid';
import { smithy } from '../../src/art/harbour';
import { DAY } from '../../src/art/palette';
import { picture, rasterize, type Glow, type Picture } from '../../src/art/raster';
import { seeded } from '../../src/art/rng';
import { barrel, cobbles, crate, grass, lamp, pine, tavern } from '../../src/art/scenery';
import { SCENE_DEVICE_H, DEVICE_W } from './scenes';

const SCALE = 4;

export function todayHero(): Grid {
  return figure('standard', HERO_OUTFIT);
}

export function todayVillager(): Grid {
  return characterPicture({ ...DEFAULT_LOOK, skin: 'brown' }, [
    'linen_tunic',
    'linen_hood',
    'linen_trousers',
  ]).grid;
}

export function todayPicture(): Picture {
  const W = Math.ceil(DEVICE_W / SCALE);
  const H = Math.ceil(SCENE_DEVICE_H / SCALE);
  const g = grid(W, H);
  const rand = seeded(21);
  const glows: Glow[] = [];
  const place = (p: Grid | Picture, x: number, y: number) => {
    const pic = 'grid' in p ? p : picture(p);
    blit(g, pic.grid, x, y);
    for (const gl of pic.glows) glows.push({ ...gl, x: gl.x + x, y: gl.y + y });
  };
  // The tavern's door (an opening 24 pixels tall) is two metres: 12 pixels a metre.
  const u = 12;
  const tav = tavern(rand);
  const doorCx = 65;
  const doorBase = 112;
  const heroFeetY = Math.round(H * 0.56);
  const base = heroFeetY - 6;
  const tx = Math.round(W / 2 - 0.95 * u) - doorCx;
  const ty = base - doorBase;

  grass(g, rand, { x: 0, y: 0, w: W, h: H });
  cobbles(g, rand, { x: 0, y: base - 8, w: W, h: Math.round(5.2 * u) + 8 });

  const trees = [pine(rand), pine(rand)];
  for (let r = 2; r >= 0; r--)
    for (let i = -8; i < 20; i++) {
      if ((i * 5 + r * 3) % 4 === 0) continue;
      const x = tx + Math.round((i * 2.2 + (r % 2) * 1.1 + ((i * 7 + r) % 3) * 0.3) * u);
      const y = base - Math.round((6.5 + r * 2.6 + ((i * 5 + r) % 3) * 0.5) * u);
      place(trees[(i + r) & 1]!, x - 13, y - 39);
    }
  const sm = smithy(rand);
  groundShadow(g, tx + 148 + Math.round(4.4 * u) + 48, base + 1, 'cobble3', 48, 4);
  place(sm, tx + 148 + Math.round(4.4 * u), base - 86);
  place(smithy(rand), tx - Math.round(2.4 * u) - 96, base - 86);
  groundShadow(g, tx + 66, ty + 117, 'cobble3', 66, 4);
  place(tav, tx, ty);

  const doorX = tx + doorCx;
  place(barrel(), doorX - 26, base - 13);
  place(crate(), doorX - 42, base - 10);
  groundShadow(g, doorX + 30, base + 6, 'cobble3', 10, 2.6);
  place(todayHero(), doorX + 10, base + 6 - 49);
  groundShadow(g, doorX + 58, base + 11, 'cobble3', 10, 2.6);
  place(todayVillager(), doorX + 38, base + 11 - 49);
  place(lamp(), doorX + Math.round(4.1 * u), base + Math.round(1.55 * u) - 27);
  place(trees[0]!, doorX - Math.round(3.6 * u) - 13, base + Math.round(8.2 * u) - 39);
  place(trees[1]!, doorX + Math.round(6.2 * u) - 13, base + Math.round(9.0 * u) - 39);
  for (let r = 0; r < 3; r++)
    for (let i = -10; i < 20; i++) {
      if ((i * 7 + r) % 3 === 0) continue;
      const x = doorX + Math.round((i * 2.1 + (r % 2) * 1.05 + ((i * 3 + r) % 4) * 0.2) * u);
      const y = base + Math.round((12.5 + r * 2.6 + ((i * 7 + r) % 3) * 0.3) * u);
      place(trees[r & 1]!, x - 13, y - 39);
    }
  return picture(g, glows);
}

/** Paints today's scene into a phone canvas, below the header. */
export function todayScene(
  ctx: CanvasRenderingContext2D,
  clip: { x: number; y: number; w: number; h: number },
): void {
  const img = rasterize(todayPicture(), DAY, SCALE);
  const tmp = document.createElement('canvas');
  tmp.width = img.width;
  tmp.height = img.height;
  tmp
    .getContext('2d')!
    .putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width), 0, 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(clip.x, clip.y, clip.w, clip.h);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, clip.x, clip.y);
  ctx.restore();
}

/** Paints one of today's figures at `scale`, its top-left at (x, y). */
export function paintToday(
  ctx: CanvasRenderingContext2D,
  g: Grid,
  scale: number,
  x: number,
  y: number,
): void {
  const img = rasterize(picture(g), DAY, scale);
  const tmp = document.createElement('canvas');
  tmp.width = img.width;
  tmp.height = img.height;
  tmp
    .getContext('2d')!
    .putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, x, y);
}
