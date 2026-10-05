import { LOOK_CHOICES, type Look as DrawnLook } from '../art/character';
import type { Look } from '../core/state';
import { h } from './dom';

/**
 * The parts of a look, in the order they are chosen. Which choices each part
 * has is the art's to say (`LOOK_CHOICES`), and it adds to them over time, so
 * nothing here names one.
 */
const PARTS: readonly { part: keyof DrawnLook; label: string }[] = [
  { part: 'skin', label: 'Skin' },
  { part: 'hair', label: 'Hair' },
  { part: 'hairColour', label: 'Hair colour' },
];

/**
 * A saved look made whole for drawing: a part never chosen, or one the art no
 * longer offers, becomes the art's first choice for it.
 */
export function fullLook(look: Look): DrawnLook {
  const pick = (part: keyof DrawnLook): string => {
    const choices = LOOK_CHOICES[part];
    const id = look[part];
    return choices.some((choice) => choice.id === id) ? id! : (choices[0]?.id ?? '');
  };
  return { skin: pick('skin'), hair: pick('hair'), hairColour: pick('hairColour') };
}

/**
 * One row per part, stepping through its choices with a button either side,
 * so the character drawn above stays in view while the thumb tries things on.
 * A part with only one choice is shown and nothing more.
 */
export function lookPicker(start: DrawnLook, onChange: (look: DrawnLook) => void): HTMLElement {
  let look = start;
  const rows = PARTS.map(({ part, label }) => {
    const choices = LOOK_CHOICES[part];
    const shown = h('span', { class: 'look-choice' });
    const show = (): void => {
      shown.textContent = choices.find((choice) => choice.id === look[part])?.name ?? '';
    };
    show();
    if (choices.length < 2) {
      return h('div', { class: 'look-row single', attrs: { 'data-part': part } }, [
        h('span', { class: 'look-label muted', text: label }),
        shown,
      ]);
    }
    const step = (by: number): void => {
      const at = choices.findIndex((choice) => choice.id === look[part]);
      const next = choices[(at + by + choices.length) % choices.length]!;
      look = { ...look, [part]: next.id };
      show();
      onChange(look);
    };
    const stepper = (by: number, text: string, name: string): HTMLButtonElement =>
      h('button', {
        class: 'btn step',
        text,
        attrs: { type: 'button', 'aria-label': `${name} ${label.toLowerCase()}` },
        on: { click: () => step(by) },
      });
    return h('div', { class: 'look-row', attrs: { 'data-part': part } }, [
      h('span', { class: 'look-label muted', text: label }),
      stepper(-1, '‹', 'Previous'),
      shown,
      stepper(1, '›', 'Next'),
    ]);
  });
  return h('div', { class: 'look-picker' }, rows);
}
