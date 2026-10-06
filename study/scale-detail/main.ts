/**
 * Art study (not shipped): the page Playwright photographs. `?v=` picks what
 * is drawn: one of the four phone screens (A-D), the two comparison sheets,
 * or a debugging sheet.
 */
import '@fontsource/pixelify-sans';
import { drawFigure, paintGrid, recolour, type TGrid } from './engine';
import { HERO_B, VILLAGER_B } from './figures-b';
import { HERO_C, VILLAGER_C } from './figures-c';
import { HERO_D, VILLAGER_D } from './figures-d';
import { TAVERN, TAVERN_SMALL, building } from './buildings';
import { DEVICE_H, DEVICE_W, HEADER, TABBAR, composeScene, type OptionDef } from './scenes';
import { paintToday, todayHero, todayScene, todayVillager } from './today';

const params = new URLSearchParams(location.search);
const v = params.get('v') ?? 'figs';

const villager = (f: TGrid) => recolour(f, { skin: 'skinb' });

export const OPTIONS: Record<'B' | 'C' | 'D', () => OptionDef> = {
  B: () => ({
    scale: 4,
    u: 28,
    tavern: TAVERN,
    hero: drawFigure(HERO_B),
    villager: villager(drawFigure(VILLAGER_B)),
  }),
  C: () => ({
    scale: 3,
    u: 38,
    tavern: TAVERN,
    hero: drawFigure(HERO_C),
    villager: villager(drawFigure(VILLAGER_C)),
  }),
  D: () => ({
    scale: 4,
    u: 19.5,
    tavern: TAVERN_SMALL,
    hero: drawFigure(HERO_D),
    villager: villager(drawFigure(VILLAGER_D)),
  }),
};

function canvas(w: number, h: number, cssW = w, cssH = h): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.style.width = `${cssW}px`;
  c.style.height = `${cssH}px`;
  document.body.append(c);
  return c;
}

/** The app's header and tab bar, plain, so the scene is framed as it would be. */
function chrome(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#16131f';
  ctx.fillRect(0, 0, DEVICE_W, HEADER);
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(0, HEADER - 6, DEVICE_W, 6);
  ctx.font = '600 66px "Pixelify Sans"';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd34d';
  ctx.fillText('Town', 48, HEADER / 2);
  const ty = DEVICE_H - TABBAR;
  ctx.fillStyle = '#16131f';
  ctx.fillRect(0, ty, DEVICE_W, TABBAR);
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(0, ty, DEVICE_W, 6);
  ctx.font = '42px "Pixelify Sans"';
  ctx.textAlign = 'center';
  ['Skills', 'Bank', 'Character', 'Town', 'Menu'].forEach((t, i) => {
    ctx.fillStyle = t === 'Town' ? '#ffd34d' : '#9a93a8';
    ctx.fillText(t, (DEVICE_W / 5) * (i + 0.5), ty + TABBAR / 2 + 6);
  });
  ctx.textAlign = 'left';
}

/** One phone screen, drawn into a context at device pixels. */
export function drawPhone(ctx: CanvasRenderingContext2D, id: 'A' | 'B' | 'C' | 'D'): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, DEVICE_W, DEVICE_H);
  const clip = { x: 0, y: HEADER, w: DEVICE_W, h: DEVICE_H - HEADER - TABBAR };
  if (id === 'A') todayScene(ctx, clip);
  else {
    const o = OPTIONS[id]();
    paintGrid(ctx, composeScene(o), o.scale, 0, HEADER, clip);
  }
  chrome(ctx);
}

interface Item {
  readonly w: number;
  readonly h: number;
  paint(ctx: CanvasRenderingContext2D, scale: number, x: number, y: number): void;
}
const ofT = (g: TGrid): Item => ({
  w: g.w,
  h: g.h,
  paint: (ctx, s, x, y) => paintGrid(ctx, g, s, x, y),
});
const ofToday = (g: { w: number; h: number } & Parameters<typeof paintToday>[1]): Item => ({
  w: g.w,
  h: g.h,
  paint: (ctx, s, x, y) => paintToday(ctx, g, s, x, y),
});

function sheet(items: Item[], scale: number, bg = '#7a8a6a'): void {
  const pad = 2;
  const w = items.reduce((s, g) => s + g.w + pad, pad);
  const h = items.reduce((m, g) => Math.max(m, g.h), 0) + pad * 2;
  const c = canvas(w * scale, h * scale);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  let x = pad;
  for (const g of items) {
    g.paint(ctx, scale, x * scale, (h - pad - g.h) * scale);
    x += g.w + pad;
  }
}

const CAPTIONS: Record<'A' | 'B' | 'C' | 'D', [string, string]> = {
  A: ['Today', 'hero 47 px · door 24 px · 4 px per pixel'],
  B: ['Richer shading, town to scale', 'hero 47 px · door 56 px · 4 px per pixel'],
  C: ['Finer pixels, more detail', 'hero 64 px · door 76 px · 3 px per pixel'],
  D: ['Smaller hero, wider view', 'hero 32 px · door 39 px · 4 px per pixel'],
};

const INK = '#16131f';
const PAPER = '#f0e6d0';

/** The four phones side by side at full size, a big letter and a caption over each. */
function comparePhones(): void {
  const gap = 90;
  const top = 330;
  const W = 4 * DEVICE_W + 5 * gap;
  const H = top + DEVICE_H + gap;
  const c = canvas(W, H);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  (['A', 'B', 'C', 'D'] as const).forEach((id, i) => {
    const x = gap + i * (DEVICE_W + gap);
    const phone = document.createElement('canvas');
    phone.width = DEVICE_W;
    phone.height = DEVICE_H;
    drawPhone(phone.getContext('2d')!, id);
    ctx.fillStyle = INK;
    ctx.fillRect(x - 12, top - 12, DEVICE_W + 24, DEVICE_H + 24);
    ctx.drawImage(phone, x, top);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = INK;
    ctx.font = '700 190px "Pixelify Sans"';
    ctx.fillText(id, x, 175);
    ctx.font = '600 66px "Pixelify Sans"';
    ctx.fillText(CAPTIONS[id][0], x + 160, 105);
    ctx.font = '50px "Pixelify Sans"';
    ctx.fillStyle = '#5a4e66';
    ctx.fillText(CAPTIONS[id][1], x + 160, 175);
  });
  ctx.font = '44px "Pixelify Sans"';
  ctx.fillStyle = '#5a4e66';
  ctx.fillText(
    'Each phone is a 390 × 844 screen at 3x, shown at its real device pixels. Art study, not the game.',
    gap,
    292,
  );
}

/** Crops a figure to what is drawn. */
function cropT(g: TGrid): TGrid {
  let x0 = g.w;
  let y0 = g.h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++)
      if (g.d[y * g.w + x]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  const out: TGrid = {
    w: x1 - x0 + 1,
    h: y1 - y0 + 1,
    d: new Int16Array((x1 - x0 + 1) * (y1 - y0 + 1)),
  };
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) out.d[(y - y0) * out.w + x - x0] = g.d[y * g.w + x]!;
  return out;
}

/** The four heroes enlarged, each at a whole-number scale, all about the same height. */
function compareHeroes(): void {
  const today = todayHero();
  let ty0 = today.h;
  let ty1 = 0;
  let tx0 = today.w;
  let tx1 = 0;
  today.d.forEach((c, i) => {
    if (!c) return;
    const x = i % today.w;
    const y = (i / today.w) | 0;
    ty0 = Math.min(ty0, y);
    ty1 = Math.max(ty1, y);
    tx0 = Math.min(tx0, x);
    tx1 = Math.max(tx1, x);
  });
  const heroes: {
    id: 'A' | 'B' | 'C' | 'D';
    w: number;
    h: number;
    paint: (ctx: CanvasRenderingContext2D, s: number, x: number, y: number) => void;
  }[] = [
    {
      id: 'A',
      w: tx1 - tx0 + 1,
      h: ty1 - ty0 + 1,
      paint: (ctx, s, x, y) => paintToday(ctx, today, s, x - tx0 * s, y - ty0 * s),
    },
    ...(['B', 'C', 'D'] as const).map((id) => {
      const g = cropT(OPTIONS[id]().hero);
      return {
        id,
        w: g.w,
        h: g.h,
        paint: (ctx: CanvasRenderingContext2D, s: number, x: number, y: number) =>
          paintGrid(ctx, g, s, x, y),
      };
    }),
  ];
  const target = 400;
  const scales = heroes.map((h) => Math.max(1, Math.round(target / h.h)));
  const gap = 70;
  const top = 200;
  const colW = heroes.map((h, i) => Math.max(h.w * scales[i]! + 60, 560));
  const W = colW.reduce((a, b) => a + b + gap, gap);
  const H = top + Math.max(...heroes.map((h, i) => h.h * scales[i]!)) + 230;
  const c = canvas(W, H);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  let x = gap;
  heroes.forEach((h, i) => {
    const s = scales[i]!;
    const hh = h.h * s;
    const plateY = top - 30;
    ctx.fillStyle = '#9d9484';
    ctx.fillRect(x, plateY, colW[i]!, H - plateY - 140);
    h.paint(ctx, s, x + Math.round((colW[i]! - h.w * s) / 2), top + (H - top - 230 - hh));
    ctx.fillStyle = INK;
    ctx.font = '700 120px "Pixelify Sans"';
    ctx.fillText(h.id, x, 130);
    ctx.font = '34px "Pixelify Sans"';
    ctx.fillStyle = '#5a4e66';
    ctx.fillText(CAPTIONS[h.id][0], x + 105, 125);
    ctx.fillStyle = INK;
    ctx.font = '600 46px "Pixelify Sans"';
    ctx.fillStyle = INK;
    ctx.fillText(CAPTIONS[h.id][1].split(' · ')[0]!.replace('hero ', '') + ' tall', x, H - 70);
    ctx.font = '38px "Pixelify Sans"';
    ctx.fillStyle = '#5a4e66';
    ctx.fillText(`shown ×${s}`, x, H - 22);
    x += colW[i]! + gap;
  });
}

async function main(): Promise<void> {
  await document.fonts.load('66px "Pixelify Sans"');
  if (v === 'A' || v === 'B' || v === 'C' || v === 'D') {
    const c = canvas(DEVICE_W, DEVICE_H, DEVICE_W / 3, DEVICE_H / 3);
    drawPhone(c.getContext('2d')!, v);
  } else if (v === 'figs') {
    sheet(
      [
        ofToday(todayHero()),
        ofToday(todayVillager()),
        ofT(drawFigure(HERO_B)),
        ofT(villager(drawFigure(VILLAGER_B))),
        ofT(drawFigure(HERO_C)),
        ofT(villager(drawFigure(VILLAGER_C))),
        ofT(drawFigure(HERO_D)),
        ofT(villager(drawFigure(VILLAGER_D))),
      ],
      Number(params.get('s') ?? 6),
    );
  } else if (v === 'pick') {
    const all: Record<string, () => Item> = {
      HB: () => ofT(drawFigure(HERO_B)),
      VB: () => ofT(villager(drawFigure(VILLAGER_B))),
      HC: () => ofT(drawFigure(HERO_C)),
      VC: () => ofT(villager(drawFigure(VILLAGER_C))),
      HD: () => ofT(drawFigure(HERO_D)),
      VD: () => ofT(villager(drawFigure(VILLAGER_D))),
    };
    sheet(
      (params.get('f') ?? 'HC,VC').split(',').map((k) => all[k]!()),
      Number(params.get('s') ?? 10),
    );
  } else if (v === 'phones') comparePhones();
  else if (v === 'heroes') compareHeroes();
  else if (v === 'bld') {
    const u = Number(params.get('u') ?? 28);
    const b = building(u, u < 22 ? TAVERN_SMALL : TAVERN);
    sheet([ofT(b.grid), ofT(drawFigure(HERO_B))], Number(params.get('s') ?? 3), '#88a070');
  }
  document.body.dataset.ready = '1';
}
void main();
