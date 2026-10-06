import { afterEach, describe, expect, it } from 'vitest';
import { forgetPreview, previewTown2 } from '../../src/scene/preview';

function at(search: string): void {
  window.history.replaceState(null, '', `/${search}`);
  forgetPreview();
}

afterEach(() => at(''));

describe('the C-scale town preview switch', () => {
  it('is off by default', () => {
    at('');
    expect(previewTown2()).toBe(false);
  });

  it('is on with ?town=2', () => {
    at('?town=2');
    expect(previewTown2()).toBe(true);
    at('?save=x&town=2');
    expect(previewTown2()).toBe(true);
  });

  it('is off for anything else', () => {
    for (const search of ['?town=1', '?town=', '?town', '?town=22', '?towns=2']) {
      at(search);
      expect(previewTown2()).toBe(false);
    }
  });

  it('reads the address once, so the town never changes halfway through a session', () => {
    at('?town=2');
    expect(previewTown2()).toBe(true);
    window.history.replaceState(null, '', '/');
    expect(previewTown2()).toBe(true);
  });
});
