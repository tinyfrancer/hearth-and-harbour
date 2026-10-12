/**
 * The gallery's Thistlewood Burrow section (B20), drawn on a tap: one of lane
 * C's rooms dressed and lit (every lantern burning, half of them, one), the
 * Burrow beside the grotto, every tile, door and prop in the light and in the
 * dark, the lantern's states, the spore cloud, the mound and the eruption, the
 * cast in every pose beside the knight lit and dark, their moves, the badger
 * king's three phases, their faces, and the chart with the Burrow's landing.
 */
import { deviceSize } from './canvas';
import { characterPicture2 } from './character2';
import { chartDot2, chartEmblem2, chartMarker2, chartRoute2, harbourChart2 } from './chart';
import { burrowNight, CAVE_BURROW, CAVE_DAY, CAVE_DUSK } from './dungeon2/cave';
import { BURROW2_IDS, foe2Frame, foe2Frames, FOE2_POSES } from './dungeon2/cast2';
import { portraitPicture2 } from './dungeon2/faces2';
import { roomGround2 } from './dungeon2/room';
import { burrowScene, LANE_C_ROOMS, type SampleFigure } from './dungeon2/burrowSample';
import { prop2 } from './dungeon2/props';
import {
  burrowEruption,
  burrowMound,
  BURROW_ERUPTION2_FRAMES,
  BURROW_MOUND2_FRAMES,
  sporeCloud,
  SPORE_CLOUD2_FRAMES,
} from './dungeon2/burrowPieces';
import { BURROW_PROPS, postLanternProp, POST_LANTERN2_FRAMES } from './dungeon2/burrowProps';
import { BURROW_SPECIALS, burrowSpecialFrame } from './dungeon2/burrowCast';
import { KING_SPECIALS, kingSpecial } from './dungeon2/badgerKing';
import type { RgbaImage } from './raster';
import { stamp, tgrid, type Picture2, type TGrid } from './town2/cells';
import { pixelCanvas2 } from './town2/raster';
import type { Palette2 } from './town2/ramps';

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Pictures side by side on one canvas, standing on one ground line, `gap` apart. */
function row(pics: readonly { grid: TGrid; feetY?: number }[], gap = 6): Picture2 {
  const base = Math.max(...pics.map((p) => p.feetY ?? p.grid.h));
  const top = Math.max(...pics.map((p) => base - (p.feetY ?? p.grid.h) + p.grid.h));
  const w = pics.reduce((n, p) => n + p.grid.w + gap, gap);
  const g = tgrid(w, top + 2);
  let x = gap;
  for (const p of pics) {
    stamp(g, p.grid, x, base - (p.feetY ?? p.grid.h) + 1);
    x += p.grid.w + gap;
  }
  return { grid: g, glows: [] };
}

/** A whole RGBA image on a canvas at `scale` device pixels per art pixel. */
function rgbaCanvas(img: RgbaImage, scale: number, dpr: number, label: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-art';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', label);
  const w = deviceSize(img.width, scale, dpr);
  const h = deviceSize(img.height, scale, dpr);
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w / dpr}px`;
  canvas.style.height = `${h / dpr}px`;
  if (typeof ImageData === 'undefined') return canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < img.height * scale && y < h; y++)
    for (let x = 0; x < img.width * scale && x < w; x++) {
      const s = (Math.floor(y / scale) * img.width + Math.floor(x / scale)) * 4;
      out.set(img.data.subarray(s, s + 4), (y * w + x) * 4);
    }
  ctx.putImageData(new ImageData(out, w), 0, 0);
  return canvas;
}

const KNIGHT = [
  'salt_iron_helm',
  'salt_iron_plate',
  'salt_iron_shield',
  'salt_iron_sword',
  'salt_iron_greaves',
  'red_cloak',
];

/** The figures stood in the sample room: the knight in a pool, the cast about him. */
export const BURROW_GALLERY_FIGURES: readonly SampleFigure[] = [
  { id: 'knight', col: 9, row: 6 },
  { id: 'spore_puff', col: 14, row: 8 },
  { id: 'spore_puff', col: 17, row: 4, pose: 'windup' },
  { id: 'cap_guard', col: 20, row: 8, facing: 'left' },
  { id: 'lantern_moth', col: 25, row: 3, lift: 21, pose: 'walk', frame: 1, facing: 'left', dx: 6 },
  { id: 'bramble_hound', col: 13, row: 4, facing: 'left', pose: 'windup' },
  { id: 'lantern_moth', col: 30, row: 9, lift: 21, facing: 'left' },
];

/** Every frame of a foe facing right in a phase: its poses, then its moves. */
function frames(id: string, phase = 1): { grid: TGrid; feetY: number }[] {
  const out: { grid: TGrid; feetY: number }[] = [];
  const counts = foe2Frames(id);
  if (counts)
    for (const pose of FOE2_POSES)
      for (let f = 0; f < counts[pose]; f++) {
        const fr = foe2Frame(id, pose, f, phase)!;
        out.push({ grid: fr.picture.grid, feetY: fr.feet.y });
      }
  return out;
}

function moves(id: string, phase = 1): { grid: TGrid; feetY: number }[] {
  const out: { grid: TGrid; feetY: number }[] = [];
  const table: Readonly<Record<string, number>> =
    id === 'badger_king'
      ? KING_SPECIALS
      : Object.fromEntries(
          Object.entries(BURROW_SPECIALS[id] ?? {}).map(([k, v]) => [k, v.length]),
        );
  for (const [move, n] of Object.entries(table))
    for (let f = 0; f < n; f++) {
      const fr =
        id === 'badger_king' ? kingSpecial(move, f, phase) : burrowSpecialFrame(id, move, f);
      if (fr) out.push({ grid: fr.grid, feetY: fr.feet.y });
    }
  return out;
}

export function burrowGallery(): { button: HTMLElement; section: HTMLElement } {
  const section = el('div', 'gallery-town2');
  section.id = 'burrow';
  section.append(
    el('h3', 'gallery-subhead', 'Thistlewood Burrow (B20), not yet approved'),
    el(
      'p',
      'gallery-caption muted',
      'The second dungeon, a warren under the old forest, played dark: one of its rooms with every lantern burning, half of them, and one; the Burrow beside the grotto; every tile, door and prop in the light and in the dark (the night ramp); the lantern’s states; the spore cloud, the mound and the eruption; the cast in every pose beside the knight, lit and dark, and their moves; the badger king’s three phases; their faces; the chart with the Burrow’s landing.',
    ),
  );
  const body = el('div', 'gallery-town2-body');
  section.append(body);
  let drawn = false;
  const ratio = (): number => window.devicePixelRatio || 1;
  const box = (label: string, node: HTMLElement) => {
    const cell = el('figure', 'gallery-shot');
    cell.append(el('figcaption', 'muted', label), node);
    const scroll = el('div', 'gallery-scroll');
    scroll.append(cell);
    body.append(scroll);
  };
  const shot = (label: string, pic: Picture2, palette: Palette2 = CAVE_BURROW, zoom = 2) => {
    const scale = Math.max(1, Math.round(ratio() * zoom));
    box(label, pixelCanvas2(pic, palette, scale, ratio(), label));
  };
  const scene = (label: string, img: RgbaImage, zoom = 2) => {
    const scale = Math.max(1, Math.round(ratio() * zoom));
    box(label, rgbaCanvas(img, scale, ratio(), label));
  };

  const draw = () => {
    if (drawn) return;
    drawn = true;
    const rows = LANE_C_ROOMS.gallery;
    scene(
      'Lane C’s moth gallery, every lantern burning (all in the light)',
      burrowScene(rows, BURROW_GALLERY_FIGURES, { light: 'lit' }),
    );
    scene(
      'Three of its four lanterns burning: the dark by the night ramp beyond their pools',
      burrowScene(rows, BURROW_GALLERY_FIGURES, { burning: [true, true, true, false] }),
    );
    scene(
      'One lantern and the knight’s own small light',
      burrowScene(rows, BURROW_GALLERY_FIGURES, { burning: [true, false, false, false] }),
    );
    scene(
      'The badger king’s sett, its hall flagged, two lanterns burning',
      burrowScene(
        LANE_C_ROOMS.sett,
        [
          { id: 'knight', col: 12, row: 7 },
          { id: 'badger_king', col: 16, row: 6, facing: 'left' },
        ],
        { burning: [true, true, false, false, false, false], hall: true },
      ),
    );
    // Every ground: a small room of each floor, doors either side.
    const patch = (ch: string) => [
      '##########',
      '##O####D##',
      `S${ch.repeat(8)}#`,
      `#${ch.repeat(3)}rr${ch.repeat(3)}Z`,
      `#${ch.repeat(8)}#`,
      '##########',
    ];
    const grounds = row(
      ['r', '.', ',', 'p', '~'].map((ch) => ({ grid: roomGround2(patch(ch), 'burrow').grid })),
      8,
    );
    shot(
      'Earth, leaf litter, moss, flagstones, seep; round badger-doors and tunnels, open and barred',
      grounds,
    );
    shot('The same in the dark (the night ramp)', grounds, burrowNight(2));
    shot(
      'The grotto’s same ground beside it',
      row([{ grid: roomGround2(patch('r').map((r) => r.replace(/r/g, 'r'))).grid }], 8),
      CAVE_DUSK,
    );
    const props = row(
      Object.keys(BURROW_PROPS).map((id) => ({ grid: prop2(id)!.grid, feetY: prop2(id)!.base })),
      8,
    );
    shot(
      'Every prop, by its id, with the knight for scale',
      row([{ grid: characterPicture2({}, KNIGHT).grid, feetY: 70 }, { grid: props.grid }], 8),
    );
    shot('The props in the dark', props, burrowNight(2));
    const lantern = (['out', 'lighting', 'lit', 'snuffed'] as const).flatMap((s) =>
      Array.from({ length: POST_LANTERN2_FRAMES[s] }, (_, f) => ({
        grid: postLanternProp(s, f).grid,
      })),
    );
    shot('The lantern on a post: out, being lit, burning, snuffed', row(lantern, 6));
    shot('…and in the dark', row(lantern, 6), burrowNight(2));
    shot(
      'A spore cloud drifting (its six frames); the king’s mound; his eruption',
      row(
        [
          ...Array.from({ length: SPORE_CLOUD2_FRAMES }, (_, f) => ({
            grid: sporeCloud(40, f).picture.grid,
          })),
          ...Array.from({ length: BURROW_MOUND2_FRAMES }, (_, f) => ({
            grid: burrowMound(f).picture.grid,
          })),
          ...Array.from({ length: BURROW_ERUPTION2_FRAMES }, (_, f) => ({
            grid: burrowEruption(f).picture.grid,
          })),
        ],
        8,
      ),
    );
    const hero = { grid: characterPicture2({}, KNIGHT).grid, feetY: 70 };
    for (const id of BURROW2_IDS) {
      const phases = id === 'badger_king' ? [1, 2, 3] : [1];
      for (const ph of phases) {
        const strip = row([hero, ...frames(id, ph)], 6);
        const name = id.replace(/_/g, ' ');
        const label = phases.length > 1 ? `${name}, phase ${ph}` : name;
        shot(`${label}: idle, walk, wind-up, blow, recoil, flash, fall`, strip, CAVE_BURROW, 1);
        shot(`${label} in the dark`, strip, burrowNight(2), 1);
      }
      const m = moves(id, id === 'badger_king' ? 2 : 1);
      if (m.length) shot(`${id.replace(/_/g, ' ')}: its moves`, row(m, 6), CAVE_BURROW, 1);
    }
    shot(
      'Their faces',
      row(
        BURROW2_IDS.map((id) => ({ grid: portraitPicture2(id)!.grid })),
        4,
      ),
      CAVE_DAY,
    );
    // The chart, the Burrow's landing picked, the route to it.
    const c = harbourChart2();
    const g = tgrid(c.width, c.height);
    stamp(g, c.picture.grid, 0, 0);
    const lay = (
      p: { picture: Picture2; anchor: { x: number; y: number } },
      x: number,
      y: number,
    ) => stamp(g, p.picture.grid, Math.round(x - p.anchor.x), Math.round(y - p.anchor.y));
    const L = c.landings.thistlewood_burrow!;
    for (const d of chartRoute2(c.home, L)) lay(chartDot2(), d.x, d.y);
    lay(chartMarker2('selected'), L.x, L.y - 6);
    lay(chartEmblem2('thistlewood_burrow')!, L.x + 16, L.y - 4);
    lay(chartMarker2('open'), L.x, L.y);
    shot(
      'The chart: the Burrow’s landing in the river’s mouth under the old forest',
      { grid: g, glows: [] },
      CAVE_DAY,
      1,
    );
  };

  const button = el('button', 'btn primary', 'Draw Thistlewood Burrow') as HTMLButtonElement;
  (button as HTMLButtonElement).type = 'button';
  button.addEventListener('click', () => {
    draw();
    section.scrollIntoView?.({ block: 'start' });
  });
  return { button, section };
}
