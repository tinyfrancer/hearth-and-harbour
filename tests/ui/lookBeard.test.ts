import { describe, expect, it, vi } from 'vitest';

// Lane B adds hairstyles and an optional beard to the art's choices (wave 13).
// The creator and "Change look" build their rows from whatever parts and
// choices the art offers, so they appear with no change to the menus. These
// stand in for a table with a beard row and a part the menus have never heard
// of; tests/ui/look.test.ts is the same without either.
vi.mock('../../src/art/character2', () => ({
  LOOK_CHOICES2: {
    skin: [
      { id: 's1', name: 'Pale' },
      { id: 's2', name: 'Tan' },
    ],
    hair: [
      { id: 'h1', name: 'Short' },
      { id: 'h2', name: 'Long' },
      { id: 'h3', name: 'Braids' },
    ],
    hairColour: [{ id: 'c1', name: 'Brown' }],
    eyeColour: [
      { id: 'e1', name: 'Grey' },
      { id: 'e2', name: 'Green' },
    ],
    beard: [
      { id: 'none', name: 'None' },
      { id: 'full', name: 'Full beard' },
      { id: 'goatee', name: 'Goatee' },
    ],
  },
}));

const { fullLook, lookParts, lookPicker } = await import('../../src/ui/look');

describe('a look built from the art’s own choices', () => {
  it('lists every part the art offers: the known ones in order, then the rest by name', () => {
    expect(lookParts()).toEqual([
      { part: 'skin', label: 'Skin' },
      { part: 'hair', label: 'Hair' },
      { part: 'hairColour', label: 'Hair colour' },
      { part: 'beard', label: 'Beard' },
      { part: 'eyeColour', label: 'Eye colour' },
    ]);
  });

  it('fills a beard never chosen with the art’s first, a bare chin, and keeps one chosen', () => {
    expect(fullLook({})).toEqual({
      skin: 's1',
      hair: 'h1',
      hairColour: 'c1',
      beard: 'none',
      eyeColour: 'e1',
    });
    expect(fullLook({ beard: 'goatee', hair: 'h3' })).toMatchObject({
      beard: 'goatee',
      hair: 'h3',
    });
  });

  it('ignores ids and parts the art does not offer, safely', () => {
    const look = fullLook({ beard: 'mutton_chops', hair: 'mohawk', nose: 'long' } as never);
    expect(look).toMatchObject({ beard: 'none', hair: 'h1' });
    expect(Object.keys(look)).not.toContain('nose');
  });

  it('gives the beard and a new part rows of their own, stepped like the rest', () => {
    const changes: Record<string, string>[] = [];
    const picker = lookPicker(fullLook({}), (look) => changes.push(look));
    const row = (part: string) => picker.querySelector<HTMLElement>(`[data-part="${part}"]`)!;
    expect(
      [...picker.querySelectorAll('[data-part]')].map((el) => el.getAttribute('data-part')),
    ).toEqual(['skin', 'hair', 'hairColour', 'beard', 'eyeColour']);
    expect(row('beard').textContent).toContain('Beard');
    expect(row('beard').textContent).toContain('None');
    row('beard').querySelector<HTMLButtonElement>('[aria-label="Next beard"]')!.click();
    expect(row('beard').querySelector('.look-choice')!.textContent).toBe('Full beard');
    expect(changes.at(-1)).toMatchObject({ beard: 'full', hair: 'h1' });
    row('eyeColour')
      .querySelector<HTMLButtonElement>('[aria-label="Previous eye colour"]')!
      .click();
    expect(changes.at(-1)).toMatchObject({ beard: 'full', eyeColour: 'e2' });
    // One choice: shown, with nothing to step.
    expect(row('hairColour').querySelectorAll('button')).toHaveLength(0);
  });
});
