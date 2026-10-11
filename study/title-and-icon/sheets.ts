/**
 * The title review sheets: the four titles side by side, and the logotype
 * treatments enlarged on dark and on light.
 */
import { tgrid, type TGrid } from '../../src/art/town2/cells';
import { lockupCaps, lockupUncial } from './lockups';
import { stampF } from './logo';
import { gridCanvas, xpal, type XPal } from './pal';
import { screenEl, type Title } from './screen';
import { board } from './titleB';
import { ribbon } from './titleD';
import { TITLE_B } from './titleB';
import { TITLE_D } from './titleD';

const CSS = `
body { margin: 0; background: #f3ead6; color: #2a2236; font-family: 'Pixelify Sans', monospace; }
.sheet { padding: 30px 34px 40px; }
.sheet h1 { font-size: 40px; margin: 0 0 6px; }
.sheet p.lede { font-size: 20px; margin: 0 0 26px; color: #5a4e5e; }
.titles { display: flex; gap: 34px; }
.tcell { display: flex; flex-direction: column; gap: 10px; width: 390px; }
.tlabel { font: 700 44px 'Pixelify Sans'; line-height: 1; }
.tname { font: 700 24px 'Pixelify Sans'; }
.tcap { font-size: 18px; color: #4a3e4e; min-height: 48px; }
.frame { border-radius: 26px; overflow: hidden; box-shadow: 0 0 0 6px #2a2236, 0 10px 0 6px #c9b998; }
.logos { display: grid; grid-template-columns: auto auto; gap: 0; }
.panel { padding: 26px 30px; display: flex; flex-direction: column; gap: 22px; align-items: center; }
.panel.dark { background: #15111f; color: #f0e6d0; }
.panel.light { background: #f3ead6; }
.panel h2 { font: 700 22px 'Pixelify Sans'; margin: 0; align-self: flex-start; }
.lg { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.lg .cap { font-size: 16px; opacity: 0.8; }
`;

function style(): void {
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.append(s);
}

const el = (tag: string, cls = '', text = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const CAPTIONS: Record<string, string> = {
  A: 'The town from the water as the lamps come on; warm windows against a cool sea. Gilt capitals.',
  B: 'Inside, by the tavern fire, the hero’s shield and cloak hung up. The name carved in an oak board.',
  C: 'Dawn on the headland; the hero looks down on the harbour and out to sea. Painted uncial letters.',
  D: 'A heraldic emblem: flame-and-anchor shield, pines, the ship as crest. The name on a ribbon.',
};

export function titlesComparePage(titles: Title[]): void {
  style();
  const sheet = el('div', 'sheet');
  sheet.append(el('h1', '', 'Hearth & Harbour: title screen, four directions'));
  sheet.append(el('p', 'lede', 'Each is a real 390 x 844 phone screen, one art pixel to three device pixels; the controls are the menus’ own.'));
  const row = el('div', 'titles');
  for (const t of titles) {
    const cell = el('div', 'tcell');
    const frame = el('div', 'frame');
    frame.append(screenEl(t).el);
    cell.append(el('div', 'tlabel', t.id), el('div', 'tname', t.name), el('div', 'tcap', CAPTIONS[t.id] ?? ''), frame);
    row.append(cell);
  }
  sheet.append(row);
  document.body.append(sheet);
}

function pic(g: TGrid, pal: XPal, scale: number): HTMLCanvasElement {
  return gridCanvas(g, pal, [], scale);
}

/** A logotype on its own: the lockup stamped onto an empty grid just big enough. */
function alone(f: { g: TGrid }): TGrid {
  const g = tgrid(f.g.w + 8, f.g.h + 8);
  stampF(g, f as never, 4, 4);
  return g;
}

export function logotypesPage(): void {
  style();
  const wrap = el('div', 'sheet');
  wrap.append(el('h1', '', 'The logotype, three hands'));
  wrap.append(
    el('p', 'lede', 'Hand-drawn letters, not the menu font: Roman capitals in gilt, a broad-nib uncial, and both cut or bent to suit a scene. Shown at 2x art size.'),
  );
  const logos = el('div', 'logos');
  const dusk = xpal('dusk');
  const items: { cap: string; make: () => { g: TGrid; pal: XPal } }[] = [
    { cap: 'I. Gilt Roman capitals, uncial ampersand on a rule (title A)', make: () => ({ g: alone(lockupCaps()), pal: dusk }) },
    { cap: 'II. Uncial in painted cream, red shadow (title C)', make: () => ({ g: alone(lockupUncial({ xh: 34 })), pal: dusk }) },
    {
      cap: 'II carved: the uncial cut into an oak board and gilded (title B)',
      make: () => {
        const g = tgrid(390, 150);
        board(g, 20);
        // Keep only the board: clear the chains above it.
        for (let i = 0; i < 390 * 20; i++) g.d[i] = 0;
        return { g, pal: TITLE_B.pal };
      },
    },
    {
      cap: 'I on a ribbon: the capitals bent along its bow (title D)',
      make: () => {
        const g = tgrid(390, 100);
        ribbon(g, 20);
        return { g, pal: TITLE_D.pal };
      },
    },
  ];
  for (const tone of ['dark', 'light'] as const) {
    const panel = el('div', `panel ${tone}`);
    panel.append(el('h2', '', tone === 'dark' ? 'On dark' : 'On light'));
    for (const it of items) {
      const { g, pal } = it.make();
      const lg = el('div', 'lg');
      lg.append(pic(g, pal, 2), el('div', 'cap', it.cap));
      panel.append(lg);
    }
    logos.append(panel);
  }
  wrap.append(logos);
  document.body.append(wrap);
}
