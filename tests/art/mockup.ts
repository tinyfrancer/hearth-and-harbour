/**
 * The approved mock-up's own drawing code, run in the test, so harvested art
 * is checked against what the mock-up actually draws rather than against a
 * copy of it. The mock-up's palette is swapped for one whose "colours" are
 * our step names, so its grids come out in steps and compare cell for cell
 * (its hex palette gives the same picture: no two of its colours that a
 * drawing tells apart share a value).
 */
import mockupHtml from '../../docs/art-reference/town-mockup.html?raw';
import type { Cell, Grid } from '../../src/art/grid';
import type { Glow } from '../../src/art/raster';

/** Each of the mock-up's colour names, as the palette step it became. */
export const STEP_OF: Readonly<Record<string, string>> = {
  ink: 'ink1',
  g1: 'grass1',
  g2: 'grass2',
  g3: 'grass3',
  s1: 'sand1',
  s2: 'sand2',
  s3: 'sand3',
  w1: 'sea1',
  w2: 'sea2',
  w3: 'sea3',
  foam: 'foam1',
  wd1: 'wood1',
  wd2: 'wood2',
  wd3: 'wood3',
  wd4: 'wood4',
  r1: 'red1',
  r2: 'red2',
  r3: 'red3',
  wl1: 'plaster1',
  wl2: 'plaster2',
  st1: 'stone1',
  st2: 'stone2',
  st3: 'stone3',
  sl1: 'slate1',
  sl2: 'slate2',
  sl3: 'slate3',
  cb1: 'cobble1',
  cb2: 'cobble2',
  cb3: 'cobble3',
  pn1: 'pine1',
  pn2: 'pine2',
  pn3: 'pine3',
  sk: 'skin1',
  skD: 'skin2',
  hair: 'hair2',
  hairD: 'hair3',
  hairHi: 'hair1',
  tu: 'teal1',
  tuD: 'teal2',
  cape: 'crimson1',
  capeD: 'crimson2',
  pants: 'cloth1',
  boot: 'leather1',
  m1: 'metal1',
  m2: 'metal2',
  m3: 'metal3',
  gold: 'gold1',
  goldD: 'gold2',
  navy: 'navy2',
  navyL: 'navy1',
  blue: 'blue2',
  blueL: 'blue1',
  white: 'white1',
  beard: 'beard2',
  f1: 'fire1',
  f2: 'fire2',
  f3: 'fire3',
  win: 'glass2',
  winHi: 'glass1',
  lamp: 'lamp1',
  sail: 'sail1',
  sailD: 'sail2',
  flag: 'flag1',
  dark: 'shade1',
  smoke: 'smoke1',
  apron: 'apron1',
  apronD: 'apron2',
  dress: 'dress1',
  dressD: 'dress2',
  hairB: 'auburn2',
  hairBD: 'auburn3',
  hairBH: 'auburn1',
  eye: 'eyes1',
  eyeG: 'eyes2',
  lip: 'lips2',
  lipL: 'lips1',
  scar: 'flush2',
  skR: 'flush1',
  beardHi: 'beard1',
};

type Fn = (...args: number[]) => Grid;
type MockupGlow = readonly [number, number, number, number];

/** What the test can reach inside the mock-up's script. */
export interface Mockup {
  readonly BASE: Readonly<Record<string, string>>;
  /** Draw from now on in day (false) or dusk (true); clears its list of glows. */
  dusk(night: boolean): void;
  /** Glows noted since the last `dusk` call, as the mock-up keeps them: [x, y, radius, strength]. */
  glows(): readonly MockupGlow[];
  /** The grid the mock-up's scenery draws itself onto, and its shared random source. */
  setCanvas(g: Grid): void;
  setRandom(seed: number): void;
  P(w: number, h: number): Grid;
  /**
   * Runs statements taken from the mock-up's town() on an empty town-sized
   * canvas, with the random source seeded `seed`, and returns what they drew.
   */
  only(code: string, seed: number, night: boolean): { grid: Grid; glows: MockupGlow[] };
  readonly town: Fn;
  readonly tavern: Fn;
  readonly smithy: Fn;
  readonly ship: Fn;
  readonly lamp: Fn;
  readonly stall: Fn;
  readonly board: Fn;
  readonly well: Fn;
  readonly barrel: Fn;
  readonly crate: Fn;
  readonly pine: Fn;
  readonly heroFig: Fn;
  readonly pirateFig: Fn;
  readonly smithFig: Fn;
  readonly traderFig: Fn;
}

/**
 * Loads the mock-up's script up to where it paints the page. `edit` may
 * change its source first, to draw one piece of the town on its own.
 */
export function loadMockup(edit: (source: string) => string = (s) => s): Mockup {
  const start = mockupHtml.indexOf('<script>') + '<script>'.length;
  const end = mockupHtml.indexOf('/* ---------- mount ---------- */');
  const body = `${edit(mockupHtml.slice(start, end))}
    const STEPS = ${JSON.stringify(STEP_OF)};
    A = STEPS;
    return {
      BASE,
      dusk(night) { NIGHT = night; GL = []; },
      glows() { return GL; },
      setCanvas(g) { G = g; },
      setRandom(seed) { R = rng(seed); },
      only(code, seed, night) {
        G = P(270, 360); R = rng(seed); NIGHT = night; GL = [];
        const g = G;
        eval(code);
        return { grid: G, glows: GL };
      },
      P, town, tavern, smithy, ship, lamp, stall, board, well, barrel, crate, pine,
      heroFig, pirateFig, smithFig, traderFig,
    };`;
  return new Function(body)() as Mockup;
}

/** The source of the mock-up's script, to take statements from. */
export const MOCKUP_SOURCE = mockupHtml;

/**
 * Statements from the mock-up's town(), checked to be there word for word,
 * so a test draws exactly what the mock-up drew.
 */
export function statements(...code: string[]): string {
  for (const c of code) if (!mockupHtml.includes(c)) throw new Error(`The mock-up has no "${c}".`);
  return code.join('\n');
}

/** The whole line of the mock-up's source that starts with `start` (trimmed). */
export function sourceLine(start: string): string {
  const found = mockupHtml.split('\n').filter((l) => l.trim().startsWith(start));
  if (found.length !== 1)
    throw new Error(`The mock-up has ${found.length} lines starting "${start}".`);
  return (found[0] as string).trim();
}

/** Cuts a fragment out of the mock-up's source, insisting it is there. */
export function without(source: string, fragment: string): string {
  if (!source.includes(fragment)) throw new Error(`The mock-up has no "${fragment}".`);
  return source.replace(fragment, '');
}

/** A rectangle of the mock-up's town as a grid, for comparing a piece where it was drawn. */
export function cut(g: Grid, x: number, y: number, w: number, h: number): Cell[] {
  const out: Cell[] = [];
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const xx = x + i;
      const yy = y + j;
      out.push(xx >= 0 && yy >= 0 && xx < g.w && yy < g.h ? (g.d[yy * g.w + xx] ?? null) : null);
    }
  return out;
}

/** Our glows in the mock-up's form, for comparing lists. */
export function asMockupGlows(glows: readonly Glow[]): number[][] {
  return glows.map((g) => [g.x, g.y, g.radius, g.strength]);
}
