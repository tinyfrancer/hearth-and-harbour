import { describe, expect, it } from 'vitest';
import { portrait } from '../../src/art/portraits';

describe('portrait', () => {
  it('answers null, and never throws, for a face art has not drawn', () => {
    expect(portrait('no_such_creature')).toBeNull();
    expect(portrait('')).toBeNull();
  });
});
