/*
 * What in town says it can be tapped, as pure rules: a marker floating over
 * each thing worth walking up to (by kind: someone to talk to, a door to go
 * in by, something to gather, the way out by boat), shown only for things
 * near the hero, so standing far off there is no clutter; the boat's always,
 * while somewhere on the chart is open and has never been rowed to; a ring
 * under the one thing a tap would use, the nearest beside him; and its name
 * in a label, with what a tap does. The stage draws them (`townView.ts`).
 */
import {
  MARKER_FRAME_MS,
  MARKER_FRAMES,
  type MarkerKind,
  type MarkerSize,
  type PointerDirection,
} from './fromLaneB';
import type { Play } from './play';
import { usable, type Box, type Scene, type Thing } from './things';
import type { Point } from './tileMap';
import { TOWN2_TILE } from '../art/town2/town';

/** Where the boat's marker floats: over the middle of the boat as drawn (art pixels). */
export const BOAT_MARK: Point = { x: 520, y: 1486 };

/**
 * The beacon on the water round the boat while somewhere new is open: a gold
 * ring spreading out from it every `BEACON_MS`, so a new player's eye goes
 * there from anywhere on the quay. Centre and radii in art pixels.
 */
export const BEACON = { x: 520, y: 1512, rx: 74, ry: 18 } as const;
export const BEACON_MS = 1800;

const T = TOWN2_TILE;

/** How near, in art pixels, something must be to the hero's feet for its marker to show: four tiles. */
export const MARK_NEAR = 4 * T;
/** How near the hero must stand to something for it to be ringed and named: a tile and a half. */
export const RING_NEAR = 1.5 * T;

/** Things named for what they are rather than what they say. */
const GATHER = /^(pine-|oak$|bush-|boulder-)/;
const ENTER = new Set(['tavern', 'smithy', 'house', 'crate-yours', 'anvil']);

/** The kind of marker over a thing, or null for something only looked at (a barrel, a lamp). */
export function markerKind(thing: Thing, people: ReadonlySet<string>): MarkerKind | null {
  if (!usable(thing)) return null;
  if (thing.use?.chart) return 'travel';
  if (people.has(thing.id) || thing.panelOf) return 'talk';
  if (GATHER.test(thing.id)) return 'gather';
  if (ENTER.has(thing.id)) return 'enter';
  return null;
}

/** The nearest point of a box to `p`, and how far it is. */
function nearestOf(box: Box, p: Point): number {
  const x = Math.max(box.x, Math.min(p.x, box.x + box.w));
  const y = Math.max(box.y, Math.min(p.y, box.y + box.h));
  return Math.hypot(x - p.x, y - p.y);
}

/** How far a thing is from the hero's feet: from its tap box, or its footprint, or its spots. */
export function distanceTo(thing: Thing, feet: Point): number {
  const boxes: Box[] = [];
  if (thing.tap) boxes.push(thing.tap);
  for (const c of thing.footprint) boxes.push({ x: c.col * T, y: c.row * T, w: T, h: T });
  if (!boxes.length) return Infinity;
  return Math.min(...boxes.map((b) => nearestOf(b, feet)));
}

/** A marker to draw: over which thing, of what kind, where its foot is (art pixels), and how big. */
export interface Mark {
  readonly id: string;
  readonly kind: MarkerKind;
  readonly at: Point;
  /** Small unless said: the boat's is large from across the square (lane B's B16). */
  readonly size?: MarkerSize;
}

/** Where a thing's marker floats: over the middle of the top of what is tapped, a little clear of it. */
export function markAt(thing: Thing): Point | null {
  const box = thing.tap;
  if (!box) return null;
  return { x: Math.round(box.x + box.w / 2), y: Math.round(box.y) - 3 };
}

export interface MarkOptions {
  /** Whose ids are people (talked to). */
  readonly people: ReadonlySet<string>;
  /** Somewhere on the chart is open and has never been rowed to: the boat says so from anywhere. */
  readonly somewhereNew: boolean;
  /** A panel or the chart is open: nothing is marked over it. */
  readonly panelOpen: boolean;
  /** The hero's figure on the ground, art pixels: nothing is marked over him. */
  readonly hero: Box;
  /** Where people who stroll are now, by id: their markers go with them. */
  readonly strollers?: ReadonlyMap<string, Box>;
  /** What the camera shows this frame (art pixels): the boat's marker is large at its edge. */
  readonly view?: Box;
}

/** How near the screen's edge (art pixels) the boat's marker is drawn large even with the hero close. */
export const EDGE_NEAR = 40;

const insideBy = (box: Box, p: Point, by: number): boolean =>
  p.x >= box.x + by && p.x <= box.x + box.w - by && p.y >= box.y + by && p.y <= box.y + box.h - by;

/** Whether the boat's marker is drawn large: the hero more than four tiles off, or the boat by the screen's edge. */
export function boatMarkSize(feet: Point, boat: Thing, view?: Box): MarkerSize {
  if (distanceTo(boat, feet) > MARK_NEAR) return 'large';
  return view && !insideBy(view, BOAT_MARK, EDGE_NEAR) ? 'large' : 'small';
}

const overlap = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The size of a marker as drawn, for keeping it off the hero: lane B's small, and large (B16). */
export const MARK_BOX = { w: 14, h: 16 };
export const LARGE_MARK_BOX = { w: 29, h: 30 };

/**
 * The markers to show now: each marked thing near the hero, and the boat (as
 * `new`) from anywhere while somewhere new is open. None while a panel is
 * open, and none that would sit over the hero.
 */
export function marksNow(scene: Scene, play: Play, o: MarkOptions): Mark[] {
  if (o.panelOpen) return [];
  const feet = play.walker.at;
  const out: Mark[] = [];
  for (const thing of scene.things) {
    const kind = markerKind(thing, o.people);
    if (!kind) continue;
    const strolling = o.strollers?.get(thing.id);
    const box = strolling ?? thing.tap;
    if (!box) continue;
    const boat = thing.id === 'rowboat';
    const near = (strolling ? nearestOf(strolling, feet) : distanceTo(thing, feet)) <= MARK_NEAR;
    // The boat's marker shows from anywhere, always: it is the way out of town (Cody's point).
    if (!near && !boat) continue;
    // The boat's over the boat itself, not the top of its generous tap box (the quay's edge).
    const at = boat ? BOAT_MARK : { x: Math.round(box.x + box.w / 2), y: Math.round(box.y) - 3 };
    const size: MarkerSize = boat ? boatMarkSize(feet, thing, o.view) : 'small';
    const drawn = size === 'large' ? LARGE_MARK_BOX : MARK_BOX;
    const mark: Box = {
      x: at.x - drawn.w / 2,
      y: at.y - drawn.h - 3,
      w: drawn.w,
      h: drawn.h + 3,
    };
    if (overlap(mark, o.hero)) continue;
    out.push(size === 'large' ? { id: thing.id, kind, at, size } : { id: thing.id, kind, at });
    // Somewhere on the chart not yet rowed to: the boat's sparkle beside its badge as well.
    if (boat && o.somewhereNew)
      out.push({
        id: thing.id,
        kind: 'new',
        at: size === 'large' ? { x: at.x + 20, y: at.y - 18 } : { x: at.x + 15, y: at.y - 4 },
      });
  }
  return out;
}

/** A marker's bob frame at `now` (ms of the page's clock), for lane B's `townMarker2(kind, frame)`. */
export function markFrame(now: number): number {
  return Math.floor(now / MARKER_FRAME_MS) % MARKER_FRAMES;
}

/**
 * The thing a tap beside the hero would use: the nearest usable thing within
 * `RING_NEAR` of his feet, or null. It is ringed and named. Never while he
 * walks (the ring would chase him), nor while a panel is open.
 */
export function ringed(
  scene: Scene,
  play: Play,
  panelOpen: boolean,
  people: ReadonlySet<string> = new Set(),
): Thing | null {
  if (panelOpen || play.walker.path.length > 0 || play.heading) return null;
  let best: Thing | null = null;
  let bestD = Infinity;
  for (const thing of scene.things) {
    // Only what is worth walking up to: a barrel or a bench is not ringed, nor named.
    if (!thing.tap || !markerKind(thing, people)) continue;
    const d = distanceTo(thing, play.walker.at);
    if (d <= RING_NEAR && d < bestD) {
      best = thing;
      bestD = d;
    }
  }
  return best;
}

/** Where the ring under a thing goes: an ellipse round its foot (art pixels). */
export function ringOf(thing: Thing): { x: number; y: number; rx: number; ry: number } | null {
  const box = thing.tap;
  if (!box) return null;
  // The boat's on the water round its hull, as the art lane measures it, not its generous tap box.
  if (thing.id === 'rowboat') return { x: 520, y: 1518, rx: 75, ry: 25 };
  const cols = thing.footprint.map((c) => c.col);
  if (cols.length) {
    const left = Math.min(...cols) * T;
    const right = (Math.max(...cols) + 1) * T;
    const bottom = (Math.max(...thing.footprint.map((c) => c.row)) + 1) * T;
    return {
      x: (left + right) / 2,
      y: bottom - 3,
      rx: Math.max(10, (right - left) / 2 + 2),
      ry: 5,
    };
  }
  return { x: box.x + box.w / 2, y: box.y + box.h - 3, rx: Math.max(10, box.w / 2), ry: 6 };
}

/** What a thing's label says: its name and what a tap does. */
export function labelFor(thing: Thing, people: ReadonlySet<string>): string | null {
  const use = thing.use;
  if (!use) return null;
  const name = use.name;
  const kind = markerKind(thing, people);
  // The ferryman has a word first; the boat and its sign take you to the chart to row out.
  if (kind === 'talk' || (use.chart && people.has(thing.id))) return `${name} — tap to talk`;
  if (use.chart) return `${name} — tap to row out`;
  if (use.button) {
    const label = use.button.label;
    return `${name} — tap to ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
  }
  return `${name} — tap to look`;
}

/**
 * Where the label over a thing goes on the page, in CSS pixels from the
 * scene's top-left (its middle-bottom), by the camera of the frame it is
 * shown with: over the thing, or over the hero's head if that is higher (so
 * the words never cover him), kept on the scene by `half` (half the label's
 * width) and clear of the top's buttons.
 */
export function labelPlace(
  thing: Thing,
  feet: Point,
  look: { readonly camera: Point; readonly cssPerArt: number },
  half: number,
  width: number,
): { readonly left: number; readonly top: number } | null {
  const box = thing.tap;
  if (!box) return null;
  const { camera, cssPerArt } = look;
  const top = Math.min(box.y, feet.y - 70);
  const x = Math.round((box.x + box.w / 2 - camera.x) * cssPerArt);
  const y = Math.round((top - camera.y) * cssPerArt) - 6;
  return { left: Math.max(half + 6, Math.min(width - half - 6, x)), top: Math.max(70, y) };
}

/* ----- The first visit: the camera shows the boat ----- */

/** The first-visit pan: out to the boat, a moment on it, and back, in ms. */
export const PAN_OUT_MS = 1400;
export const PAN_HOLD_MS = 1400;
export const PAN_BACK_MS = 1200;
export const PAN_MS = PAN_OUT_MS + PAN_HOLD_MS + PAN_BACK_MS;

const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Where the camera looks `ms` into the first-visit pan, from the hero's
 * focus `from` to the boat's `to` and back; null once it is over.
 */
export function panFocus(ms: number, from: Point, to: Point): Point | null {
  if (ms < 0 || ms >= PAN_MS) return null;
  let k: number;
  if (ms < PAN_OUT_MS) k = ease(ms / PAN_OUT_MS);
  else if (ms < PAN_OUT_MS + PAN_HOLD_MS) k = 1;
  else k = 1 - ease((ms - PAN_OUT_MS - PAN_HOLD_MS) / PAN_BACK_MS);
  return {
    x: Math.round(from.x + (to.x - from.x) * k),
    y: Math.round(from.y + (to.y - from.y) * k),
  };
}

/* ----- The way to the boat from off the screen ----- */

/** How far inside the screen's edge the pointer's tip stays, in art pixels. */
export const POINTER_INSET = 6;

/** The pointer to the boat at the screen's edge: where its tip goes, and which way it points. */
export interface BoatPointer {
  readonly at: Point;
  readonly dir: PointerDirection;
}

/**
 * While somewhere new is open and the chart has never been opened, and the
 * boat is off the screen: a chevron at the edge, on the line from the
 * middle of the view toward the boat, pointing the way (the dungeon's door
 * arrow, in town). One only, and none while a panel is open. `keepOut` is a
 * box the tip stays clear of (the sun-and-moon button), art pixels.
 */
export function boatPointer(
  view: Box,
  o: { readonly somewhereNew: boolean; readonly chartSeen: boolean; readonly panelOpen: boolean },
  keepOut?: Box,
): BoatPointer | null {
  if (!o.somewhereNew || o.chartSeen || o.panelOpen) return null;
  if (insideBy(view, BOAT_MARK, 0)) return null;
  const mid = { x: view.x + view.w / 2, y: view.y + view.h / 2 };
  const dx = BOAT_MARK.x - mid.x;
  const dy = BOAT_MARK.y - mid.y;
  const halfW = view.w / 2 - POINTER_INSET;
  const halfH = view.h / 2 - POINTER_INSET;
  // Out along the line to the boat until it meets the inset edge.
  const k = Math.min(
    Math.abs(dx) > 0 ? halfW / Math.abs(dx) : Infinity,
    Math.abs(dy) > 0 ? halfH / Math.abs(dy) : Infinity,
  );
  let at = { x: Math.round(mid.x + dx * k), y: Math.round(mid.y + dy * k) };
  const sideways = Math.abs(dx) * halfH > Math.abs(dy) * halfW;
  const dir: PointerDirection = sideways ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
  if (
    keepOut &&
    at.x >= keepOut.x &&
    at.x <= keepOut.x + keepOut.w &&
    at.y >= keepOut.y &&
    at.y <= keepOut.y + keepOut.h
  ) {
    // Slid along its edge past the button.
    at = sideways
      ? { x: at.x, y: Math.round(keepOut.y + keepOut.h + 1) }
      : { x: Math.round(keepOut.x + keepOut.w + 1), y: at.y };
  }
  return { at, dir };
}
