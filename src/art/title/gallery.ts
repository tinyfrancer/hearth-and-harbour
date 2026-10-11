/**
 * The title screen in the art gallery: the scene animated at the three phone
 * sizes it is composed for (360 x 640, 390 x 844, 430 x 932 CSS pixels, at
 * this screen's pixel ratio), each with the box the menu may use outlined.
 * Drawn on a tap; the animation stops when the gallery is left.
 */
import { TITLE_FRAME_MS, titleScene } from '../title';

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const SIZES: readonly [number, number][] = [
  [360, 640],
  [390, 844],
  [430, 932],
];

export function titleGallery(): { button: HTMLElement; section: HTMLElement } {
  const section = el('div', 'gallery-title');
  section.id = 'title-scene';
  section.append(
    el('h3', 'gallery-subhead', 'The title screen (B14): the harbour at dusk'),
    el(
      'p',
      'gallery-caption muted',
      'The town across the water as the lamps come on, at three phone sizes, moving as it will (water, smoke, lamps, stars, clouds, gulls, the flag, the buoy). The dashed box is where the menu may put its button and version line.',
    ),
  );
  const body = el('div', 'gallery-title-body');
  section.append(body);
  const button = el('button', 'btn primary', 'See the title screen') as HTMLButtonElement;
  button.type = 'button';
  let drawn = false;
  button.addEventListener('click', () => {
    if (!drawn) {
      drawn = true;
      draw(body);
    }
    section.scrollIntoView?.({ block: 'start' });
  });
  return { button, section };
}

function draw(body: HTMLElement): void {
  const dpr = window.devicePixelRatio || 1;
  const scenes = SIZES.map(([w, h]) => {
    const t = titleScene(w, h, dpr);
    const frame = el('figure', 'gallery-shot');
    const screen = el('div', 'gallery-title-screen');
    screen.style.width = `${w}px`;
    screen.style.height = `${h}px`;
    const safe = el('div', 'gallery-title-safe');
    Object.assign(safe.style, {
      left: `${t.safe.x}px`,
      top: `${t.safe.y}px`,
      width: `${t.safe.w}px`,
      height: `${t.safe.h}px`,
    });
    screen.append(t.canvas, safe);
    const scroll = el('div', 'gallery-scroll');
    scroll.append(screen);
    frame.append(el('figcaption', 'muted', `${w} × ${h}`), scroll);
    body.append(frame);
    t.draw(0);
    return t;
  });
  let start = -1;
  let last = -Infinity;
  const tick = (now: number) => {
    if (!body.isConnected) {
      for (const t of scenes) t.dispose();
      return;
    }
    if (start < 0) start = now;
    if (now - last >= TITLE_FRAME_MS) {
      last = now;
      for (const t of scenes) t.draw(now - start);
    }
    requestAnimationFrame(tick);
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
}
