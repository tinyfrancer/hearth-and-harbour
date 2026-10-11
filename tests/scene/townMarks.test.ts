import { describe, expect, it } from 'vitest';
import { TOWN2_TILE } from '../../src/art/town2/town';
import { startPlay, type Play } from '../../src/scene/play';
import { centreOf, type Point } from '../../src/scene/tileMap';
import { BOAT_LANDING2, TOWNSFOLK2_AT, town2Scene } from '../../src/scene/town2';
import {
  BOAT_HULL,
  BOAT_MARK,
  BOAT_MARK_LARGE,
  EDGE_NEAR,
  MARK_NEAR,
  PAN_MS,
  POINTER_INSET,
  boatMarkSize,
  boatPointer,
  labelFor,
  labelPlace,
  markerKind,
  marksNow,
  panFocus,
  pointerWay,
  ringed,
  type MarkOptions,
} from '../../src/scene/townMarks';

// What in town says it can be tapped: markers by kind near the hero, the
// boat's from anywhere while somewhere new is open, the ring and the label on
// the one thing a tap beside him would use, and the first visit's pan.

const scene = town2Scene();
const people = new Set(TOWNSFOLK2_AT.map((p) => p.id));
const thing = (id: string) => scene.things.find((t) => t.id === id)!;
const at = (col: number, row: number): Point => centreOf({ col, row }, TOWN2_TILE);
const standing = (p: Point): Play => startPlay(p);
const by = (): Point => centreOf(BOAT_LANDING2, TOWN2_TILE);
const options = (play: Play, o: Partial<MarkOptions> = {}): MarkOptions => ({
  people,
  somewhereNew: false,
  panelOpen: false,
  hero: { x: play.walker.at.x - 14, y: play.walker.at.y - 66, w: 28, h: 68 },
  ...o,
});

describe('the town’s markers', () => {
  it('know what each thing is for: people talk, doors go in, trees gather, the boat travels', () => {
    expect(markerKind(thing('smith'), people)).toBe('talk');
    // The ferryman is the way out, as the boat is.
    expect(markerKind(thing('ferryman'), people)).toBe('travel');
    expect(markerKind(thing('stall'), people)).toBe('talk');
    expect(markerKind(thing('smithy'), people)).toBe('enter');
    expect(markerKind(thing('crate-yours'), people)).toBe('enter');
    expect(markerKind(thing('oak'), people)).toBe('gather');
    expect(markerKind(thing('rowboat'), people)).toBe('travel');
    expect(markerKind(thing('boat_sign'), people)).toBe('travel');
    // Something only looked at has none: no clutter of markers over barrels and lamps.
    expect(markerKind(thing('barrel-quay-1'), people)).toBeNull();
    expect(markerKind(thing('lamp-west'), people)).toBeNull();
  });

  it('show only near the hero, and the boat’s from anywhere, as somewhere new while it is', () => {
    const play = standing(at(26, 56));
    const near = marksNow(scene, play, options(play));
    expect(near.length).toBeGreaterThan(0);
    for (const m of near) {
      if (m.id === 'rowboat') continue;
      const t = thing(m.id);
      const box = t.tap!;
      const dx = Math.max(box.x - play.walker.at.x, 0, play.walker.at.x - box.x - box.w);
      const dy = Math.max(box.y - play.walker.at.y, 0, play.walker.at.y - box.y - box.h);
      expect(Math.hypot(dx, dy), m.id).toBeLessThanOrEqual(MARK_NEAR);
    }
    // Far up the road, only the boat, always (the way out of town); as somewhere new while it is.
    const far = standing(at(30, 12));
    // Large, from that far: it reads across the square (lane B's B16 marker).
    // Floated higher than the small one, clear over the gunwale (lane B: about y 1474 at x 520).
    expect(marksNow(scene, far, options(far))).toEqual([
      { id: 'rowboat', kind: 'travel', at: BOAT_MARK_LARGE, size: 'large' },
    ]);
    expect(BOAT_MARK_LARGE).toEqual({ x: 520, y: 1474 });
    const fresh = marksNow(scene, far, options(far, { somewhereNew: true }));
    expect(fresh).toEqual([
      { id: 'rowboat', kind: 'travel', at: BOAT_MARK_LARGE, size: 'large' },
      {
        id: 'rowboat',
        kind: 'new',
        at: { x: BOAT_MARK_LARGE.x + 20, y: BOAT_MARK_LARGE.y - 18 },
      },
    ]);
    // Until lane B's large marker is in, the small one, and its sparkle beside it as before.
    expect(marksNow(scene, far, options(far, { somewhereNew: true, largeIn: false }))).toEqual([
      { id: 'rowboat', kind: 'travel', at: BOAT_MARK },
      { id: 'rowboat', kind: 'new', at: { x: BOAT_MARK.x + 15, y: BOAT_MARK.y - 4 } },
    ]);
    // Beside it, the quiet small one, its sparkle where it always was.
    const by = standing(centreOf(BOAT_LANDING2, TOWN2_TILE));
    expect(
      marksNow(scene, by, options(by, { somewhereNew: true })).filter((m) => m.id === 'rowboat'),
    ).toEqual([
      { id: 'rowboat', kind: 'travel', at: BOAT_MARK },
      { id: 'rowboat', kind: 'new', at: { x: BOAT_MARK.x + 15, y: BOAT_MARK.y - 4 } },
    ]);
  });

  it('never show over an open panel, or over the hero', () => {
    const play = standing(at(26, 56));
    expect(marksNow(scene, play, options(play, { panelOpen: true, somewhereNew: true }))).toEqual(
      [],
    );
    const everywhere = { x: 0, y: 0, w: 1440, h: 2136 };
    expect(marksNow(scene, play, options(play, { hero: everywhere }))).toEqual([]);
  });
});

describe('the boat from across the square', () => {
  const boat = thing('rowboat');
  const by = centreOf(BOAT_LANDING2, TOWN2_TILE);
  const viewAround = (
    p: Point,
    w = 390,
    h = 727,
  ): { x: number; y: number; w: number; h: number } => ({
    x: p.x - w / 2,
    y: p.y - h / 2,
    w,
    h,
  });

  it('is large far off, or at the screen’s edge; small beside him in the middle of the view', () => {
    expect(boatMarkSize(at(30, 12), boat)).toBe('large');
    expect(boatMarkSize(by, boat, viewAround(BOAT_MARK))).toBe('small');
    // Near, but with the boat at the very edge of what shows.
    const edge = {
      x: BOAT_MARK.x - EDGE_NEAR / 2,
      y: BOAT_MARK.y - 300,
      w: 390,
      h: 300 + EDGE_NEAR / 2,
    };
    expect(boatMarkSize(by, boat, edge)).toBe('large');
  });

  it('is pointed to from the screen’s edge while somewhere new is open and the chart has not been opened', () => {
    const view = viewAround(at(30, 30));
    const o = { somewhereNew: true, chartSeen: false, panelOpen: false };
    const p = boatPointer(view, o)!;
    // The boat is down the road and a little left: the chevron at the bottom edge, pointing down.
    expect(p.dir).toBe('down');
    expect(p.at.y).toBe(Math.round(view.y + view.h - POINTER_INSET));
    expect(p.at.x).toBeGreaterThanOrEqual(view.x + POINTER_INSET);
    expect(p.at.x).toBeLessThanOrEqual(view.x + view.w - POINTER_INSET);
    // On the line from the view's middle toward the boat.
    const mid = { x: view.x + view.w / 2, y: view.y + view.h / 2 };
    const cross =
      (p.at.x - mid.x) * (BOAT_MARK.y - mid.y) - (p.at.y - mid.y) * (BOAT_MARK.x - mid.x);
    expect(Math.abs(cross) / Math.hypot(BOAT_MARK.x - mid.x, BOAT_MARK.y - mid.y)).toBeLessThan(1);
    // None once the chart has been opened, nothing new, a panel up, or the boat on screen.
    expect(boatPointer(view, { ...o, chartSeen: true })).toBeNull();
    expect(boatPointer(view, { ...o, somewhereNew: false })).toBeNull();
    expect(boatPointer(view, { ...o, panelOpen: true })).toBeNull();
    expect(boatPointer(viewAround(BOAT_MARK), o)).toBeNull();
    // Far off to the east: at the left edge, pointing left.
    expect(boatPointer(viewAround({ x: 1300, y: BOAT_MARK.y }), o)!.dir).toBe('left');
  });

  it('keeps the chevron off the sun-and-moon button', () => {
    // Boat up and to the left of the view, so the line meets the corner where the button is.
    const view = { x: BOAT_MARK.x + 40, y: BOAT_MARK.y + 40, w: 390, h: 727 };
    const button = { x: view.x, y: view.y, w: 64, h: 64 };
    const o = { somewhereNew: true, chartSeen: false, panelOpen: false };
    const p = boatPointer(view, o, button)!;
    const inside =
      p.at.x >= button.x &&
      p.at.x <= button.x + button.w &&
      p.at.y >= button.y &&
      p.at.y <= button.y + button.h;
    expect(inside).toBe(false);
  });
});

describe('the ring and the label', () => {
  it('places the label by the camera it is given, over the thing, kept on the scene', () => {
    const t = thing('rowboat');
    const feet = by();
    const look = { camera: { x: 300, y: 1200 }, cssPerArt: 1 };
    const a = labelPlace(t, feet, look, 80, 390)!;
    const moved = labelPlace(t, feet, { ...look, camera: { x: 340, y: 1200 } }, 80, 390)!;
    // A camera 40 to the right puts the words 40 to the left: the frame's own camera, no lag.
    expect(a.left - moved.left).toBe(40);
    // Never off the scene's sides, never into the top's buttons.
    const offLeft = labelPlace(t, feet, { ...look, camera: { x: 900, y: 1200 } }, 80, 390)!;
    expect(offLeft.left).toBe(86);
    expect(labelPlace(t, feet, { ...look, camera: { x: 300, y: 1500 } }, 80, 390)!.top).toBe(70);
  });

  it("anchor the boat's label to the hull, and under it when he stands above it", () => {
    const t = thing('rowboat');
    const look = { camera: { x: 300, y: 1300 }, cssPerArt: 1 };
    const hullMiddle = BOAT_HULL.x + BOAT_HULL.w / 2 - look.camera.x;
    // From the quay beside it: over the hull, centred on it (not on its wide tap box).
    const beside = labelPlace(t, centreOf(BOAT_LANDING2, TOWN2_TILE), look, 80, 390, 28)!;
    expect(beside.left).toBe(hullMiddle);
    expect(beside.top).toBe(BOAT_HULL.y - look.camera.y - 6);
    // Standing right above the boat: over it would cover him, so under the hull, never off over
    // his head to one side.
    for (const col of [20, 21, 22]) {
      const feet = at(col, 60);
      const p = labelPlace(t, feet, look, 80, 390, 28)!;
      expect(p.left).toBe(hullMiddle);
      expect(p.top - 28).toBeGreaterThanOrEqual(BOAT_HULL.y + BOAT_HULL.h - look.camera.y);
      // Clear of his figure.
      const heroTop = feet.y - 66 - look.camera.y;
      const heroLeft = feet.x - 14 - look.camera.x;
      const clear =
        p.top - 28 >= heroTop + 68 ||
        p.top <= heroTop ||
        p.left + 80 <= heroLeft ||
        p.left - 80 >= heroLeft + 28;
      expect(clear).toBe(true);
    }
  });

  it('point eight ways once lane B draws the diagonals, else the nearest of four', () => {
    expect(pointerWay(100, 10, false)).toBe('right');
    expect(pointerWay(-10, 100, false)).toBe('down');
    expect(pointerWay(-100, -90, false)).toBe('left');
    expect(pointerWay(100, 100, true)).toBe('down-right');
    expect(pointerWay(-100, -100, true)).toBe('up-left');
    expect(pointerWay(100, -100, true)).toBe('up-right');
    expect(pointerWay(-100, 100, true)).toBe('down-left');
    expect(pointerWay(100, 30, true)).toBe('right');
    expect(pointerWay(0, -100, true)).toBe('up');
    // From up the road, the boat is down and a little left: down, either way.
    const view = { x: 600, y: 300, w: 360, h: 640 };
    const o = { somewhereNew: true, chartSeen: false, panelOpen: false };
    expect(boatPointer(view, o)!.dir).toBe('down');
    expect(boatPointer(view, o, undefined, true)!.dir).toBe('down');
    // From the far east of the square it is down and to the left: a diagonal when there is one.
    const east = { x: 1000, y: 1000, w: 360, h: 300 };
    expect(boatPointer(east, o, undefined, true)!.dir).toBe('down-left');
    expect(['left', 'down']).toContain(boatPointer(east, o)!.dir);
  });

  it('ring the boat from where it is boarded, and name it with what a tap does', () => {
    const play = standing(centreOf(BOAT_LANDING2, TOWN2_TILE));
    const t = ringed(scene, play, false, people);
    expect(t?.id).toBe('rowboat');
    expect(labelFor(t!, people)).toBe('Rowing boat — tap to row out');
    expect(labelFor(thing('boat_sign'), people)).toBe('Ferry sign — tap to row out');
    // The ferryman has a word first.
    expect(labelFor(thing('ferryman'), people)).toMatch(/ferryman — tap to talk$/);
  });

  it('name people, doors and things with buttons for what a tap does there', () => {
    expect(labelFor(thing('smith'), people)).toMatch(/ — tap to talk$/);
    expect(labelFor(thing('crate-yours'), people)).toBe('Your crate — tap to open the bank');
    expect(labelFor(thing('oak'), people)).toBe('Oak — tap to go to Woodcutting');
  });

  it('ring nothing while he walks or a panel is open, nor anything only looked at', () => {
    const play = standing(centreOf(BOAT_LANDING2, TOWN2_TILE));
    expect(ringed(scene, play, true, people)).toBeNull();
    expect(
      ringed(scene, { ...play, walker: { ...play.walker, path: [at(10, 50)] } }, false, people),
    ).toBeNull();
    // Beside the quay's barrels and crates, with nothing worth walking up to near: no ring.
    expect(ringed(scene, standing(at(34, 58)), false, people)?.id ?? '').not.toMatch(
      /barrel|crate-cargo/,
    );
  });
});

describe('the first visit’s pan', () => {
  it('goes out to the boat, holds, and comes back, then is over', () => {
    const from = { x: 100, y: 100 };
    const to = { x: 500, y: 900 };
    expect(panFocus(0, from, to)).toEqual(from);
    expect(panFocus(PAN_MS / 2, from, to)).toEqual(to);
    expect(panFocus(PAN_MS - 1, from, to)!.x).toBeLessThan(110);
    expect(panFocus(PAN_MS, from, to)).toBeNull();
  });
});
