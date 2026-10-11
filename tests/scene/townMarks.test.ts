import { describe, expect, it } from 'vitest';
import { TOWN2_TILE } from '../../src/art/town2/town';
import { startPlay, type Play } from '../../src/scene/play';
import { centreOf, type Point } from '../../src/scene/tileMap';
import { BOAT_LANDING2, TOWNSFOLK2_AT, town2Scene } from '../../src/scene/town2';
import {
  BOAT_MARK,
  MARK_NEAR,
  PAN_MS,
  labelFor,
  markerKind,
  marksNow,
  panFocus,
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
    expect(marksNow(scene, far, options(far))).toEqual([
      { id: 'rowboat', kind: 'travel', at: BOAT_MARK },
    ]);
    const fresh = marksNow(scene, far, options(far, { somewhereNew: true }));
    expect(fresh).toEqual([
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

describe('the ring and the label', () => {
  it('ring the boat from where it is boarded, and name it with what a tap does', () => {
    const play = standing(centreOf(BOAT_LANDING2, TOWN2_TILE));
    const t = ringed(scene, play, false, people);
    expect(t?.id).toBe('rowboat');
    expect(labelFor(t!, people)).toBe('Rowing boat — tap to open the chart');
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
