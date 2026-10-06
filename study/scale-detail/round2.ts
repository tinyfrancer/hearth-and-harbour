/**
 * Art study (not shipped), round two: the sheets Playwright photographs for
 * the figures pass. `?v=heads`, `looks`, `villagers`, `C2` (the phone), and
 * `fig&f=...` for looking at single figures while drawing.
 */
import { paintGrid, tgrid, type TGrid } from './engine';
import { HEADS, LOOKS_CHECK, knight, withLook } from './heads';
import { drawFigure, recolour } from './engine';
import { VILLAGER_C } from './figures-c';
import { TOWNSFOLK, drawTownsfolk } from './villagers';

/** Option C's villager as it was, for before and after. */
export const oldVillager = (): TGrid => recolour(drawFigure(VILLAGER_C), { skin: 'skinb' });

export const INK = '#16131f';
export const PAPER = '#f0e6d0';
export const SOFT = '#5a4e66';
export const PLATE = '#a49a88';

export function newCanvas(w: number, h: number): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  document.body.append(c);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  return ctx;
}

export function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  colour = INK,
  weight = '',
): void {
  ctx.font = `${weight} ${size}px "Pixelify Sans"`.trim();
  ctx.fillStyle = colour;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

export function plate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c = PLATE,
): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

/** A rectangle cut from a grid. */
export function crop(g: TGrid, x0: number, y0: number, w: number, h: number): TGrid {
  const o = tgrid(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = x0 + x;
      const sy = y0 + y;
      if (sx >= 0 && sy >= 0 && sx < g.w && sy < g.h) o.d[y * w + x] = g.d[sy * g.w + sx]!;
    }
  return o;
}

/** The smallest rectangle round what is drawn. */
export function bounds(g: TGrid): { x: number; y: number; w: number; h: number } {
  let x0 = g.w;
  let y0 = g.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++)
      if (g.d[y * g.w + x]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export const tight = (g: TGrid): TGrid => {
  const b = bounds(g);
  return crop(g, b.x, b.y, b.w, b.h);
};

/** The head and shoulders of a knight-sized figure, for close-ups. */
export const bust = (g: TGrid, cx = 27, top = 0, w = 27, h = 26): TGrid =>
  crop(g, cx - (w - 1) / 2, top, w, h);

// ------------------------------------------------------------------- sheets

export function headsSheet(): void {
  const colW = 620;
  const gap = 40;
  const W = gap + HEADS.length * (colW + gap);
  const top = 230;
  const H = 1880;
  const ctx = newCanvas(W, H);
  text(ctx, 'Heads, round two', gap, 110, 92, INK, '700');
  text(
    ctx,
    'Same knight, four heads. Close-up ×16, whole figure ×6, and true size on the phone (×3) at the bottom.',
    gap,
    180,
    40,
    SOFT,
  );
  HEADS.forEach((head, i) => {
    const x = gap + i * (colW + gap);
    const fig = knight(head);
    const pick = head.id === 'H2';
    const red = '#8a2432';
    text(ctx, head.id, x, top + 105, 120, pick ? red : INK, '700');
    text(ctx, head.title, x + 175, top + 50, 46, INK, '600');
    if (pick) text(ctx, 'my pick', x + 175, top + 100, 42, red, '700');
    text(ctx, head.caption[0]!, x, top + 160, 36, SOFT);
    text(ctx, head.caption[1]!, x, top + 205, 36, SOFT);
    // Close-up.
    const cy = top + 235;
    plate(ctx, x, cy, colW, 450);
    const b = bust(fig, 27, 0, 29, 27);
    paintGrid(ctx, b, 16, x + Math.round((colW - b.w * 16) / 2), cy + 450 - b.h * 16);
    // Whole figure.
    const fy = cy + 475;
    plate(ctx, x, fy, colW, 470);
    const t = tight(fig);
    paintGrid(ctx, t, 6, x + Math.round((colW - t.w * 6) / 2), fy + 470 - 18 - t.h * 6);
    // True size, in the default look and one other.
    const ty = fy + 495;
    plate(ctx, x, ty, colW, 330, '#8a8274');
    const t2 = tight(withLook(fig, 'skinbrown', 'hairblack'));
    paintGrid(ctx, t, 3, x + 90, ty + 330 - 30 - t.h * 3);
    paintGrid(ctx, t2, 3, x + 360, ty + 330 - 30 - t2.h * 3);
    text(ctx, 'true size ×3', x + 20, ty + 46, 34, PAPER);
  });
}

export function looksSheet(): void {
  const colW = 500;
  const gap = 40;
  const W = gap + LOOKS_CHECK.length * (colW + gap);
  const top = 230;
  const H = 1560;
  const ctx = newCanvas(W, H);
  text(ctx, 'H2 across the character creator', gap, 110, 84, INK, '700');
  text(
    ctx,
    "Same face and body; only the skin and hair ramps and the hair's shape change. Close-up ×14, figure ×5, true size ×3.",
    gap,
    180,
    38,
    SOFT,
  );
  LOOKS_CHECK.forEach((c, i) => {
    const x = gap + i * (colW + gap);
    const fig = withLook(knight(c.head), c.skin, c.hair);
    const [skin, hair, style] = c.name.split(' · ');
    text(ctx, style!, x, top + 60, 58, INK, '700');
    text(ctx, `${skin} skin · ${hair} hair`, x, top + 110, 36, SOFT);
    if (i === 0) text(ctx, '(the default)', x + 210, top + 60, 34, SOFT);
    const cy = top + 140;
    plate(ctx, x, cy, colW, 420);
    const b = bust(fig, 27, 0, 31, 29);
    paintGrid(ctx, b, 14, x + Math.round((colW - b.w * 14) / 2), cy + 420 - b.h * 14);
    const fy = cy + 445;
    plate(ctx, x, fy, colW, 400);
    const t = tight(fig);
    paintGrid(ctx, t, 5, x + Math.round((colW - t.w * 5) / 2), fy + 400 - 16 - t.h * 5);
    const ty = fy + 425;
    plate(ctx, x, ty, colW, 300, '#8a8274');
    paintGrid(ctx, t, 3, x + Math.round((colW - t.w * 3) / 2), ty + 300 - 24 - t.h * 3);
    text(ctx, 'true size ×3', x + 20, ty + 44, 32, PAPER);
  });
}

export function villagersSheet(): void {
  const cols = [
    { g: oldVillager(), name: 'Before', note: 'option C, round one', old: true },
    ...TOWNSFOLK.map((t) => ({ g: drawTownsfolk(t), name: t.name, note: t.note, old: false })),
  ];
  const colW = 400;
  const gap = 36;
  const W = gap + cols.length * (colW + gap);
  const top = 230;
  const H = 1600;
  const ctx = newCanvas(W, H);
  text(ctx, 'Townsfolk, round two', gap, 110, 92, INK, '700');
  text(
    ctx,
    'Every pixel placed by hand. Enlarged ×6 above, true size on the phone (×3) below, then all of them in a row beside the hero.',
    gap,
    180,
    40,
    SOFT,
  );
  const plateH = 470;
  cols.forEach((c, i) => {
    const x = gap + i * (colW + gap);
    text(ctx, c.name, x, top + 55, c.name.length > 14 ? 44 : 52, c.old ? SOFT : INK, '700');
    c.note.split(' · ').forEach((part, j) => text(ctx, part, x, top + 96 + j * 30, 28, SOFT));
    const py = top + 175;
    plate(ctx, x, py, colW, plateH, c.old ? '#b8ae9c' : PLATE);
    const t = tight(c.g);
    paintGrid(ctx, t, 6, x + Math.round((colW - t.w * 6) / 2), py + plateH - 24 - t.h * 6);
    const ty = py + plateH + 20;
    plate(ctx, x, ty, colW, 260, '#8a8274');
    paintGrid(ctx, t, 3, x + Math.round((colW - t.w * 3) / 2), ty + 260 - 22 - t.h * 3);
    text(ctx, 'true size ×3', x + 16, ty + 40, 28, PAPER);
  });
  // The line-up, feet on one line, at true size.
  const ly = top + 175 + plateH + 20 + 260 + 40;
  plate(ctx, gap, ly, W - 2 * gap, 330, '#8a8274');
  text(ctx, 'line-up at true size, with the H2 knight', gap + 20, ly + 44, 32, PAPER);
  const line = [
    ...TOWNSFOLK.map((t) => tight(drawTownsfolk(t))),
    tight(knight(HEADS[1]!)),
    tight(oldVillager()),
  ];
  let lx = gap + 60;
  const base = ly + 330 - 24;
  line.forEach((g, i) => {
    if (i === line.length - 1) {
      text(ctx, 'before:', lx + 20, base - 90, 30, PAPER);
      lx += 140;
    }
    paintGrid(ctx, g, 3, lx, base - g.h * 3);
    lx += g.w * 3 + 50;
  });
}

/** One or more figures at a scale, for looking while drawing: `?v=fig&f=H1,H2&s=8`. */
export function figSheet(params: URLSearchParams): void {
  const s = Number(params.get('s') ?? 8);
  const ids = (params.get('f') ?? 'H2').split(',');
  const figs = ids.map((id) => {
    const h = HEADS.find((x) => x.id === id);
    if (h) return knight(h);
    const t = TOWNSFOLK.find((x) => x.id === id);
    if (t) return drawTownsfolk(t);
    if (id === 'old') return oldVillager();
    return knight(HEADS[1]!);
  });
  const W = figs.reduce((a, g) => a + g.w * s + 20, 20);
  const H = Math.max(...figs.map((g) => g.h)) * s + 40;
  const ctx = newCanvas(W, H);
  let x = 20;
  for (const g of figs) {
    plate(ctx, x, 20, g.w * s, g.h * s);
    paintGrid(ctx, g, s, x, 20);
    x += g.w * s + 20;
  }
}
