import { describe, expect, it } from 'vitest';
import {
  get,
  grid,
  groundShadow,
  outline,
  parseSprite,
  set,
  type Grid,
  type Legend,
} from '../../src/art/grid';

const LEGEND: Legend = { a: 'wood1', b: 'wood3', k: 'ink1' };
const INK: Legend = { ...LEGEND, '#': 'ink1' };

/** A grid back as rows, '#' for ink, so expectations can be drawn. */
function picture(g: Grid): string[] {
  const back: Record<string, string> = { wood1: 'a', wood3: 'b', ink1: '#' };
  const rows: string[] = [];
  for (let y = 0; y < g.h; y++) {
    let row = '';
    for (let x = 0; x < g.w; x++) {
      const c = get(g, x, y);
      row += c ? (back[c] ?? '?') : '.';
    }
    rows.push(row);
  }
  return rows;
}

describe('parseSprite', () => {
  it('reads rows of characters into palette steps', () => {
    const g = parseSprite(['ab', '.a'], LEGEND);
    expect([g.w, g.h]).toEqual([2, 2]);
    expect(get(g, 0, 0)).toBe('wood1');
    expect(get(g, 1, 0)).toBe('wood3');
    expect(get(g, 0, 1)).toBeNull();
  });

  it('treats spaces like dots', () => {
    expect(get(parseSprite([' a'], LEGEND), 0, 0)).toBeNull();
  });

  it('makes ragged rows as wide as the longest, empty past their end', () => {
    const g = parseSprite(['a', 'aaa', ''], LEGEND);
    expect([g.w, g.h]).toEqual([3, 3]);
    expect(picture(g)).toEqual(['a..', 'aaa', '...']);
  });

  it('says where an unknown character is', () => {
    expect(() => parseSprite(['aa', 'aZ'], LEGEND)).toThrow(
      'Unknown character "Z" at row 1, column 1.',
    );
  });

  it('refuses a legend that names a step no ramp has', () => {
    expect(() => parseSprite(['a'], { a: 'wood9' } as unknown as Legend)).toThrow('wood9');
  });
});

describe('outline', () => {
  it('rings a shape in ink along its edges, not its corners', () => {
    const g = outline(parseSprite(['a.', 'ab'], LEGEND));
    expect(picture(g)).toEqual(['.#..', '#a#.', '#ab#', '.##.']);
  });

  it('outlines holes inside a shape too', () => {
    const g = outline(parseSprite(['aaa', 'a.a', 'aaa'], LEGEND));
    expect(picture(g)).toEqual(['.###.', '#aaa#', '#a#a#', '#aaa#', '.###.']);
  });

  it('adds one pixel on every side and leaves the drawing as it was', () => {
    const sprite = parseSprite(['k'], INK);
    const g = outline(sprite);
    expect([g.w, g.h]).toEqual([3, 3]);
    expect(picture(sprite)).toEqual(['#']);
  });
});

describe('drawing', () => {
  it('rounds positions as the mock-up did and ignores pixels off the grid', () => {
    const g = grid(3, 3);
    set(g, 1.4, 0.6, 'wood1');
    set(g, -1, 0, 'wood1');
    set(g, 3, 0, 'wood1');
    expect(picture(g)).toEqual(['...', '.a.', '...']);
  });

  it('lays a flat ellipse of shadow where something stands', () => {
    const g = grid(9, 3);
    groundShadow(g, 4, 1, 'wood3', 3, 1);
    expect(picture(g)).toEqual(['....b....', '.bbbbbbb.', '....b....']);
  });
});
