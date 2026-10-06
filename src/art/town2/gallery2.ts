/**
 * The C-scale town in the art gallery (Menu, Art gallery, "The town"): every
 * new piece by day and at dusk, four phone-sized views of the composed town
 * at game scale, and the whole town by day and at dusk. It is drawn only when
 * asked (a tap), a picture at a time, so opening the gallery stays quick and
 * a phone's memory is only spent by someone who wants to look.
 */
import { deviceSize } from '../canvas';
import { stamp, tgrid, type Picture2 } from './cells';
import { pixelCanvas2, repaint2 } from './raster';
import { DAY2, DUSK2, type TimeOfDay } from './ramps';
import { WORLD2_WIDTH, town2Scale } from './scale';
import { town2Piece, type Town2Id } from './pieces';
import { TOWN2_H, TOWN2_W, town2Picture } from './town';

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Pictures side by side on one plate, standing on a common base line. */
export function plate(pics: readonly Picture2[], pad = 8): Picture2 {
  const w = pics.reduce((s, p) => s + p.grid.w + pad, pad);
  const h = Math.max(...pics.map((p) => p.grid.h)) + pad * 2;
  const g = tgrid(w, h);
  const glows = [];
  let x = pad;
  for (const p of pics) {
    const y = h - pad - p.grid.h;
    stamp(g, p.grid, x, y);
    for (const gl of p.glows) glows.push({ ...gl, x: gl.x + x, y: gl.y + y });
    x += p.grid.w + pad;
  }
  return { grid: g, glows };
}

/** A part of a picture, `w` by `h` from (x, y), with the glows that fall in it. */
export function cut(pic: Picture2, x: number, y: number, w: number, h: number): Picture2 {
  const g = tgrid(w, h);
  for (let j = 0; j < h; j++)
    g.d.set(pic.grid.d.subarray((y + j) * pic.grid.w + x, (y + j) * pic.grid.w + x + w), j * w);
  const glows = pic.glows
    .filter(
      (gl) =>
        gl.x + gl.radius > x &&
        gl.x - gl.radius < x + w &&
        gl.y + gl.radius > y &&
        gl.y - gl.radius < y + h,
    )
    .map((gl) => ({ ...gl, x: gl.x - x, y: gl.y - y }));
  return { grid: g, glows };
}

/** The groups of pieces the gallery shows, each on a plate of its own. */
export const GALLERY2_GROUPS: readonly {
  readonly name: string;
  readonly ids: readonly Town2Id[];
}[] = [
  {
    name: 'Redrawn after Cody’s review (B9): the ship, the rock and its wreck, the oak, the three pines, your house’s eyebrow window',
    ids: ['ship', 'wreck_rock', 'oak', 'pine', 'pine_2', 'pine_3', 'house'],
  },
  { name: 'The tavern', ids: ['tavern'] },
  { name: 'The smithy', ids: ['smithy'] },
  { name: 'Your house', ids: ['house'] },
  {
    name: 'The square',
    ids: ['stall', 'well', 'notice_board', 'signpost', 'lamp', 'bench', 'planter'],
  },
  {
    name: 'Things about town',
    ids: ['barrel', 'crate', 'anvil', 'bucket', 'crab', 'fence', 'boulder', 'net'],
  },
  { name: 'Trees', ids: ['pine', 'pine_2', 'pine_3', 'oak', 'bush'] },
  {
    name: 'The harbour',
    ids: ['rowboat', 'buoy', 'wreck_rock', 'gull', 'tavern_smoke', 'smithy_smoke'],
  },
  { name: 'The ship and the pier', ids: ['ship', 'pier'] },
];
// Pictures wider than the page scroll across at game scale rather than shrink, so detail is seen as it will be.

/** Phone screens of the composed town, by their top-left in the town (360 wide, 480 tall). */
export const PHONE_VIEWS: readonly {
  readonly name: string;
  readonly x: number;
  readonly y: number;
}[] = [
  { name: 'The tavern door and the road north', x: 150, y: 700 },
  { name: 'The well, the square and the pier', x: 580, y: 1000 },
  { name: 'The harbour', x: 620, y: 1420 },
  { name: 'Your house and the oak', x: 840, y: 300 },
  { name: 'The square’s west side: the stall, a mended patch, the drain (B9)', x: 20, y: 1000 },
  { name: 'The woodcutters’ grove: the path, stumps, flowers (B9)', x: 120, y: 300 },
];
export const PHONE_VIEW_H = 480;

interface Job {
  readonly cell: HTMLElement;
  readonly label: string;
  /** The picture for a time of day, given how many art pixels fit across the page at its scale. */
  readonly make: (across: number, time: TimeOfDay) => Picture2;
  /** 'game': the C scale on this screen; 'one': one device pixel per art pixel. Wider than the page scrolls. */
  readonly want: 'game' | 'one';
  canvas?: HTMLCanvasElement;
  across?: number;
}

/**
 * The section: a button that draws it, a button that turns it to dusk and
 * back (repainting the same canvases, so dusk costs no more memory), then the
 * pictures.
 */
export function town2Gallery(): { section: HTMLElement; draw: () => void } {
  const section = el('div', 'gallery-town2');
  section.id = 'town2';
  section.append(
    el('h3', 'gallery-subhead', 'The town at the finer scale (option C), not yet approved'),
    el(
      'p',
      'gallery-caption muted',
      'Every building, prop and tree redrawn to scale with a 64-pixel person, at 3 device pixels per art pixel on a 390-wide phone (the wide ones scroll across), then four phone screens of the town, then the whole town (four screens across) at one device pixel per art pixel. One button turns it all to dusk and back. Drawing it takes a few seconds.',
    ),
  );
  const button = el('button', 'btn primary', 'Draw the new town') as HTMLButtonElement;
  button.type = 'button';
  const toggle = el('button', 'btn', 'Show it at dusk') as HTMLButtonElement;
  toggle.type = 'button';
  toggle.disabled = true;
  const status = el('p', 'gallery-caption muted', '');
  section.append(button, toggle, status);
  const jobs: Job[] = [];
  const body = el('div', 'gallery-town2-body');
  section.append(body);
  let time: TimeOfDay = 'day';

  const sub = (text: string) => body.append(el('h3', 'gallery-subhead', text));
  const shot = (label: string, make: Job['make'], want: Job['want']) => {
    const cell = el('figure', 'gallery-shot');
    cell.append(el('figcaption', 'muted', label));
    const box = el('div', 'gallery-scroll');
    box.append(cell);
    body.append(box);
    jobs.push({ cell, label, make, want });
  };

  let built = false;
  const build = () => {
    if (built) return;
    built = true;
    for (const group of GALLERY2_GROUPS) {
      sub(group.name);
      const label = group.ids.length > 1 ? group.ids.join(' · ').replace(/_/g, ' ') : group.name;
      shot(label, () => plate(group.ids.map((id) => town2Piece(id).picture)), 'game');
    }
    sub('Phone screens at game scale');
    for (const v of PHONE_VIEWS)
      shot(
        v.name,
        (across, when) =>
          cut(town2Picture(when), v.x, v.y, Math.min(WORLD2_WIDTH, across), PHONE_VIEW_H),
        'game',
      );
    sub(`The whole town, ${TOWN2_W} × ${TOWN2_H} art pixels`);
    shot('One device pixel per art pixel (scroll across)', (_, when) => town2Picture(when), 'one');
  };

  const dpr = () => window.devicePixelRatio || 1;
  const game = () => town2Scale(Math.min(window.innerWidth || 390, 480), dpr());

  /** Paints every job in turn, a picture a task, so the page stays responsive. */
  const paintAll = (done: () => void) => {
    const content = section.clientWidth || Math.min(window.innerWidth || 390, 480) - 32;
    let i = 0;
    const next = () => {
      const job = jobs[i++];
      if (!job) return done();
      status.textContent = `Drawing ${i} of ${jobs.length}…`;
      const scale = job.want === 'game' ? game() : 1;
      if (job.across === undefined) {
        // Whole art pixels that fit across the page at this scale, padding for whole CSS pixels included.
        let across = Math.floor((content * dpr()) / scale);
        while (across > 1 && deviceSize(across, scale, dpr()) / dpr() > content) across--;
        job.across = across;
      }
      const pic = job.make(job.across, time);
      const palette = time === 'day' ? DAY2 : DUSK2;
      if (job.canvas) repaint2(job.canvas, pic, palette, scale);
      else {
        job.canvas = pixelCanvas2(pic, palette, scale, dpr(), job.label);
        job.cell.prepend(job.canvas);
      }
      setTimeout(next, 0);
    };
    next();
  };
  const finished = () => {
    status.textContent = `${time === 'day' ? 'By day' : 'At dusk'}. Game scale on this screen: ${game()} device pixels per art pixel.`;
    toggle.disabled = false;
  };

  const draw = () => {
    if (built) return;
    build();
    button.disabled = true;
    paintAll(finished);
  };
  toggle.addEventListener('click', () => {
    time = time === 'day' ? 'dusk' : 'day';
    toggle.textContent = time === 'day' ? 'Show it at dusk' : 'Show it by day';
    toggle.disabled = true;
    paintAll(finished);
  });
  button.addEventListener('click', draw);
  return { section, draw };
}
