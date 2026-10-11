/**
 * A title as the phone shows it: the picture filling a 390 x 844 portrait
 * screen (one canvas pixel per art pixel, scaled 3x to device pixels with no
 * smoothing), and over it the start-up controls as the app would draw them,
 * in the menus' own face and colours (src/ui/styles.css): a Continue button
 * or a "Tap to begin" line, and the version.
 */
import type { TGrid } from '../../src/art/town2/cells';
import { paintInto, type BandGlow, type XPal } from './pal';

export const SCREEN_W = 390;
export const SCREEN_H = 844;

export interface Frame {
  g: TGrid;
  glows: BandGlow[];
}

export interface Title {
  id: string;
  name: string;
  pal: XPal;
  /** The picture at time t (ms); pure, so any frame can be drawn on its own. */
  draw: (t: number) => Frame;
  ui: 'continue' | 'tap';
  /** Where the controls sit, from the top, in CSS pixels. */
  uiTop: number;
  /** Whether it is animated in the study (a GIF is made of it). */
  animated?: boolean;
  /** Milliseconds for one loop, if animated. */
  loop?: number;
}

const CSS = `
.hh-screen { position: relative; width: ${SCREEN_W}px; height: ${SCREEN_H}px; overflow: hidden; background: #15111f; }
.hh-screen canvas { position: absolute; left: 0; top: 0; width: ${SCREEN_W}px; height: ${SCREEN_H}px; image-rendering: pixelated; }
.hh-ui { position: absolute; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 10px;
  font-family: 'Pixelify Sans', monospace; color: #f0e6d0; }
.hh-btn { width: 248px; min-height: 52px; background: #1e1a2a; color: #f0e6d0; border: 2px solid #c9a24a;
  font: 700 22px 'Pixelify Sans', monospace; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 0 #15111f; }
.hh-btn.primary { background: #c9a24a; color: #1e1a2a; border-color: #ffd34d; }
.hh-sub { font-size: 16px; color: #f0e6d0; text-shadow: 0 2px 0 #15111f, 2px 0 0 #15111f, -2px 0 0 #15111f, 0 -2px 0 #15111f; }
.hh-tap { font: 700 24px 'Pixelify Sans', monospace; color: #fff2c0; letter-spacing: 1px;
  text-shadow: 0 2px 0 #15111f, 2px 0 0 #15111f, -2px 0 0 #15111f, 0 -2px 0 #15111f, 2px 2px 0 #15111f; }
.hh-ver { position: absolute; left: 0; right: 0; bottom: 38px; text-align: center; font: 400 14px 'Pixelify Sans', monospace;
  color: #a89f8e; text-shadow: 0 2px 0 #15111f; }
`;

let styled = false;
function style(): void {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.append(s);
}

/** The title on a phone screen at time t. Returns the element and a repaint. */
export function screenEl(title: Title, t = 0): { el: HTMLElement; paint: (t: number) => void; canvas: HTMLCanvasElement } {
  style();
  const el = document.createElement('div');
  el.className = 'hh-screen';
  const c = document.createElement('canvas');
  c.width = SCREEN_W;
  c.height = SCREEN_H;
  el.append(c);
  const ui = document.createElement('div');
  ui.className = 'hh-ui';
  ui.style.top = `${title.uiTop}px`;
  if (title.ui === 'continue') {
    const b = document.createElement('div');
    b.className = 'hh-btn primary';
    b.textContent = 'Continue';
    const sub = document.createElement('div');
    sub.className = 'hh-sub';
    sub.textContent = 'Rowan · away 3 hours';
    ui.append(b, sub);
  } else {
    const tap = document.createElement('div');
    tap.className = 'hh-tap';
    tap.textContent = 'Tap to begin';
    ui.append(tap);
  }
  el.append(ui);
  const ver = document.createElement('div');
  ver.className = 'hh-ver';
  ver.textContent = 'v0.1.0';
  el.append(ver);
  const paint = (time: number) => {
    const f = title.draw(time);
    paintInto(c, f.g, title.pal, f.glows);
  };
  paint(t);
  return { el, paint, canvas: c };
}
