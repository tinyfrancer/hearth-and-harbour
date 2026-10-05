import { describe, expect, it } from 'vitest';
import {
  DAY,
  DAY_SHIFT,
  DUSK,
  DUSK_SHIFT,
  RAMPS,
  SHADES,
  baseColour,
  isShade,
  shift,
} from '../../src/art/palette';

// Expected values were worked out by the approved mock-up's own code
// (docs/art-reference/town-mockup.html), so these hold the port to it.
describe('palette', () => {
  it('names every step of every ramp, lightest first', () => {
    expect(SHADES).toContain('wood4');
    expect(SHADES).not.toContain('wood5');
    expect(baseColour('wood1')).toBe('#d59a5a');
    expect(baseColour('wood4')).toBe('#52301e');
    expect(SHADES.length).toBe(Object.values(RAMPS).reduce((n, ramp) => n + ramp.length, 0));
    expect(isShade('grass2')).toBe(true);
    expect(isShade('grass9')).toBe(false);
  });

  it('shifts colours for day exactly as the mock-up does', () => {
    expect(shift('#74c256', DAY_SHIFT)).toBe('#5cad3f');
    expect(DAY.colours.grass2).toBe('#5cad3f');
    expect(DAY.colours.wood1).toBe('#c6813b');
    expect(DAY.colours.skin1).toBe('#e9a970');
    expect(DAY.colours.stone2).toBe('#707892');
    expect(DAY.colours.glass2).toBe('#334f74');
  });

  it('shifts colours for dusk exactly as the mock-up does', () => {
    expect(shift('#74c256', DUSK_SHIFT)).toBe('#4e6a3f');
    expect(DUSK.colours.grass2).toBe('#4e6a3f');
    expect(DUSK.colours.wood1).toBe('#86553a');
    expect(DUSK.colours.skin1).toBe('#c66d31');
    expect(DUSK.colours.stone2).toBe('#585169');
    expect(DUSK.colours.sea2).toBe('#30638a');
  });

  it('keeps fire as it is at any hour', () => {
    for (const step of ['fire1', 'fire2', 'fire3'] as const) {
      expect(DAY.colours[step]).toBe(baseColour(step));
      expect(DUSK.colours[step]).toBe(baseColour(step));
    }
  });

  it('lights windows and lamps at dusk instead of darkening them', () => {
    expect(DUSK.colours.glass2).toBe('#ffd34d');
    expect(DUSK.colours.glass1).toBe('#fff2b0');
    expect(DUSK.colours.lamp1).toBe('#ffe08a');
    expect(DUSK.lightsOn).toBe(true);
    expect(DAY.lightsOn).toBe(false);
  });

  it('uses the style guide outline inks', () => {
    expect(DAY.colours.ink1).toBe('#1a1224');
    expect(DUSK.colours.ink1).toBe('#150d20');
  });

  it('gives every step a colour in both palettes', () => {
    for (const palette of [DAY, DUSK])
      for (const step of SHADES) expect(palette.colours[step]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('makes dusk darker than day', () => {
    const light = (hex: string) =>
      [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0);
    for (const step of ['grass2', 'wood2', 'stone1', 'red2', 'skin1'] as const)
      expect(light(DUSK.colours[step])).toBeLessThan(light(DAY.colours[step]));
  });
});
