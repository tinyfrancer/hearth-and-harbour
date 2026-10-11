/**
 * The icon review sheets: the six options and today's icon large; at true
 * size (60 pt, 180 device px) in a mock home-screen row on a light and a dark
 * wallpaper, under the iOS mask; and the Android adaptive-icon safe-zone check.
 */
import { colourise } from './pal';
import { ICONS, type IconArt } from './icons';

const TODAY = '/icons/icon-512.png';

/** An icon as a canvas at one pixel per art pixel, `size` art pixels square. */
function iconCanvas(icon: IconArt, size = 36): HTMLCanvasElement {
  const { g, glows } = icon.draw(size);
  const c = document.createElement('canvas');
  c.width = g.w;
  c.height = g.h;
  c.getContext('2d')!.putImageData(new ImageData(colourise(g, icon.pal, glows) as Uint8ClampedArray<ArrayBuffer>, g.w, g.h), 0, 0);
  c.style.imageRendering = 'pixelated';
  return c;
}

function todayImg(src = TODAY): HTMLImageElement {
  const i = new Image();
  i.src = src;
  i.style.imageRendering = 'pixelated';
  return i;
}

const SHEET_CSS = `
body { margin: 0; background: #f3ead6; color: #2a2236; font-family: 'Pixelify Sans', monospace; }
.sheet { padding: 28px 32px 36px; }
.sheet h1 { font-size: 34px; margin: 0 0 4px; }
.sheet p.lede { font-size: 18px; margin: 0 0 22px; color: #5a4e5e; }
.row { display: flex; gap: 28px; flex-wrap: wrap; align-items: flex-start; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.cell .num { font: 700 30px 'Pixelify Sans'; }
.cell .cap { font-size: 16px; max-width: 300px; text-align: center; }
.big { width: 288px; height: 288px; border-radius: 64px; overflow: hidden; box-shadow: 0 4px 0 #c9b998; }
.big canvas, .big img { width: 288px; height: 288px; display: block; image-rendering: pixelated; }
.raw canvas, .raw img { width: 144px; height: 144px; display: block; image-rendering: pixelated; }
.wall { padding: 26px 22px 18px; border-radius: 18px; display: flex; flex-direction: column; gap: 14px; }
.wall.light { background: #dfe7f0; background-image: linear-gradient(160deg, #eef3f8, #cdd9e6); }
.wall.dark { background: #1b1d2a; background-image: linear-gradient(160deg, #2a2d42, #10111a); }
.hs { display: flex; gap: 27px; }
.app { display: flex; flex-direction: column; align-items: center; gap: 5px; width: 64px; }
.app .ic { width: 60px; height: 60px; border-radius: 13.4px; overflow: hidden; }
.app .ic canvas, .app .ic img { width: 60px; height: 60px; display: block; image-rendering: pixelated; }
.app .ic > div { width: 60px; height: 60px; }
.app .lbl { font: 12px -apple-system, 'Helvetica Neue', Arial, sans-serif; white-space: nowrap; }
.wall.light .lbl { color: #1b1d2a; }
.wall.dark .lbl { color: #f2f2f2; }
.ph1 { background: #4c8df6; } .ph2 { background: #34c759; } .ph3 { background: #ff9500; } .ph4 { background: #e5e5ea; }
.ph5 { background: #ff3b30; } .ph6 { background: #8e8e93; } .ph7 { background: #5856d6; }
.walltitle { font: 700 15px 'Pixelify Sans'; }
.wall.dark .walltitle { color: #f0e6d0; }
.safe { position: relative; width: 240px; height: 240px; }
.safe canvas, .safe img { width: 240px; height: 240px; image-rendering: pixelated; display: block; }
.safe .ring { position: absolute; border: 2px dashed #ff2d55; border-radius: 50%; pointer-events: none; }
.safe .sq { position: absolute; border: 2px solid rgba(255, 45, 85, 0.6); pointer-events: none; }
.mask { width: 128px; height: 128px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.mask canvas, .mask img { width: 192px; height: 192px; flex: none; image-rendering: pixelated; }
.circle { border-radius: 50%; } .squircle { border-radius: 30%; } .teardrop { border-radius: 50% 50% 50% 12%; }
`;

function style(): void {
  const s = document.createElement('style');
  s.textContent = SHEET_CSS;
  document.head.append(s);
}

function el(tag: string, cls = '', text = ''): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** icons-compare: the six, large, numbered, and today's. */
export function iconsComparePage(): void {
  style();
  const sheet = el('div', 'sheet');
  sheet.append(el('h1', '', 'Home-screen icon: six options'));
  sheet.append(el('p', 'lede', '36 x 36 pixels each, shown at 8x with the iPhone corner mask. Today’s icon last.'));
  const row = el('div', 'row');
  for (const icon of ICONS) {
    const cell = el('div', 'cell');
    const big = el('div', 'big');
    big.append(iconCanvas(icon));
    cell.append(el('div', 'num', icon.id), big, el('div', 'cap', icon.name));
    row.append(cell);
  }
  const t = el('div', 'cell');
  const tb = el('div', 'big');
  tb.append(todayImg());
  t.append(el('div', 'num', 'Today'), tb, el('div', 'cap', 'Hearth fire over water (16 x 16)'));
  row.append(t);
  sheet.append(row);
  document.body.append(sheet);
}

function homeRow(icons: { name: string; node: () => HTMLElement }[]): HTMLElement {
  const hs = el('div', 'hs');
  for (const it of icons) {
    const app = el('div', 'app');
    const ic = el('div', 'ic');
    ic.append(it.node());
    app.append(ic, el('div', 'lbl', it.name));
    hs.append(app);
  }
  return hs;
}

const placeholder = (n: number) => () => el('div', `ph${n}`, '');

/** icons-homescreen: each option at true size between plain placeholder apps, light and dark. */
export function iconsHomePage(): void {
  style();
  const sheet = el('div', 'sheet');
  sheet.append(el('h1', '', 'At true size on a home screen'));
  sheet.append(el('p', 'lede', '60 pt (180 device pixels at 3x), iOS mask, between plain placeholder apps.'));
  const walls = el('div', 'row');
  for (const tone of ['light', 'dark'] as const) {
    const wall = el('div', `wall ${tone}`);
    wall.append(el('div', 'walltitle', tone === 'light' ? 'Light wallpaper' : 'Dark wallpaper'));
    const all: { id: string; node: () => HTMLElement }[] = [
      ...ICONS.map((i) => ({ id: i.id, node: () => iconCanvas(i) })),
      { id: 'Today', node: () => todayImg('/icons/apple-touch-icon.png') },
    ];
    for (const it of all) {
      const ph = [1, 2, 3, 4, 5, 6, 7];
      const n = Number(it.id) || 7;
      wall.append(
        homeRow([
          { name: 'Mail', node: placeholder(ph[(n + 0) % 7]!) },
          { name: `${it.id === 'Today' ? 'Today' : 'Option ' + it.id}`, node: it.node },
          { name: 'Notes', node: placeholder(ph[(n + 2) % 7]!) },
          { name: 'Maps', node: placeholder(ph[(n + 4) % 7]!) },
        ]),
      );
    }
    walls.append(wall);
  }
  sheet.append(walls);
  document.body.append(sheet);
}

/**
 * icons-safezone: each option grown to 44 x 44 (the field run out round the
 * same motif), with the adaptive icon's visible 72/108 and safe 66/108 drawn
 * over it, then under three launcher masks.
 */
export function iconsSafePage(): void {
  style();
  const sheet = el('div', 'sheet');
  sheet.append(el('h1', '', 'Android adaptive-icon safe zone'));
  sheet.append(
    el(
      'p',
      'lede',
      'Maskable art: the same 36-pixel motif with its field grown to 48 x 48 (512 px at 10x). Dashed circle: the centre 66% that every launcher keeps. Square: the 72/108 a launcher shows. Then cut by circle, squircle and teardrop masks.',
    ),
  );
  const grid = el('div', 'row');
  for (const icon of ICONS) {
    const cell = el('div', 'cell');
    const safe = el('div', 'safe');
    safe.append(iconCanvas(icon, 48));
    const ring = el('div', 'ring');
    const d = 240 * 0.66;
    Object.assign(ring.style, { width: `${d}px`, height: `${d}px`, left: `${(240 - d) / 2 - 2}px`, top: `${(240 - d) / 2 - 2}px` });
    const sq = el('div', 'sq');
    const v = 240 * (72 / 108);
    Object.assign(sq.style, { width: `${v}px`, height: `${v}px`, left: `${(240 - v) / 2 - 2}px`, top: `${(240 - v) / 2 - 2}px` });
    safe.append(sq, ring);
    const masks = el('div', 'row');
    masks.style.gap = '10px';
    for (const m of ['circle', 'squircle', 'teardrop']) {
      const mk = el('div', `mask ${m}`);
      mk.append(iconCanvas(icon, 48));
      masks.append(mk);
    }
    cell.append(el('div', 'num', icon.id), safe, masks, el('div', 'cap', icon.name));
    grid.append(cell);
  }
  sheet.append(grid);
  document.body.append(sheet);
}
