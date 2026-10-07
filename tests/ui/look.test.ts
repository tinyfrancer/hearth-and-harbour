import { beforeEach, describe, expect, it, vi } from 'vitest';

// The art lane's real choices grow over time; these stand in for a list with
// several of one part and one of another, so the picker is tested either way.
vi.mock('../../src/art/character2', () => ({
  LOOK_CHOICES2: {
    skin: [
      { id: 's1', name: 'Pale' },
      { id: 's2', name: 'Tan' },
      { id: 's3', name: 'Dark' },
    ],
    hair: [{ id: 'h1', name: 'Short' }],
    hairColour: [
      { id: 'c1', name: 'Brown' },
      { id: 'c2', name: 'Red' },
    ],
  },
}));

const { fullLook, lookPicker } = await import('../../src/ui/look');

describe('fullLook', () => {
  it("fills a part never chosen, or no longer offered, with the art's first choice", () => {
    expect(fullLook({})).toEqual({ skin: 's1', hair: 'h1', hairColour: 'c1' });
    expect(fullLook({ skin: 's3', hair: 'gone', hairColour: 'c2' })).toEqual({
      skin: 's3',
      hair: 'h1',
      hairColour: 'c2',
    });
  });
});

describe('lookPicker', () => {
  let changes: unknown[];
  let picker: HTMLElement;
  const row = (part: string): HTMLElement => picker.querySelector(`[data-part="${part}"]`)!;
  const step = (part: string, which: 'Next' | 'Previous'): void =>
    row(part).querySelector<HTMLButtonElement>(`[aria-label^="${which}"]`)!.click();

  beforeEach(() => {
    changes = [];
    picker = lookPicker(fullLook({}), (look) => changes.push(look));
  });

  it('steps forward and round again, saying each new look', () => {
    step('skin', 'Next');
    step('skin', 'Next');
    expect(row('skin').querySelector('.look-choice')?.textContent).toBe('Dark');
    step('skin', 'Next');
    expect(row('skin').querySelector('.look-choice')?.textContent).toBe('Pale');
    expect(changes.at(-1)).toEqual({ skin: 's1', hair: 'h1', hairColour: 'c1' });
    expect(changes).toHaveLength(3);
  });

  it('steps back past the first to the last, keeping the other parts', () => {
    step('hairColour', 'Next');
    step('skin', 'Previous');
    expect(changes.at(-1)).toEqual({ skin: 's3', hair: 'h1', hairColour: 'c2' });
  });

  it('shows a part with one choice without buttons to step it', () => {
    expect(row('hair').querySelectorAll('button')).toHaveLength(0);
    expect(row('hair').classList).toContain('single');
    expect(row('hair').textContent).toContain('Short');
    expect(row('skin').querySelectorAll('button')).toHaveLength(2);
  });

  it('names its buttons for a screen reader', () => {
    expect(row('hairColour').querySelector('[aria-label="Next hair colour"]')).not.toBeNull();
  });
});
