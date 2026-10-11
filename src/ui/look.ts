import { LOOK_CHOICES2 } from '../art/character2';
import type { Look } from '../core/state';
import { h } from './dom';

/**
 * A look made whole for drawing: one choice for every part the art offers.
 * Named from the C-scale door's own choices, so the menus need nothing from
 * the first scale's modules.
 */
export type DrawnLook = { [Part in keyof typeof LOOK_CHOICES2]: string };

/** One choice the art offers for a part of a look. */
interface Choice {
  readonly id: string;
  readonly name: string;
}

/** The art's choices by part, read as plain data: whatever parts it offers today. */
const CHOICES = LOOK_CHOICES2 as unknown as Readonly<Record<string, readonly Choice[]>>;

/** What the parts are called, and the order they are chosen in, for the ones known by name. */
const KNOWN: readonly { part: string; label: string }[] = [
  { part: 'skin', label: 'Skin' },
  { part: 'hair', label: 'Hair' },
  { part: 'hairColour', label: 'Hair colour' },
  { part: 'beard', label: 'Beard' },
];

/** "eyeColour" as "Eye colour": a name for a part the art adds before the menus know it. */
const labelFor = (part: string): string => {
  const words = part.replace(/([A-Z])/g, ' $1').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * The parts of a look, in the order they are chosen: whatever parts the art
 * offers (`LOOK_CHOICES2`), the known ones first in their own order, then any
 * others in the art's. The art adds parts and choices over time (more
 * hairstyles, a beard), and each appears here with no change to the menus.
 * A part with no choices at all is left out.
 */
export function lookParts(): { part: string; label: string }[] {
  const offered = Object.keys(CHOICES).filter((part) => (CHOICES[part]?.length ?? 0) > 0);
  const known = KNOWN.filter(({ part }) => offered.includes(part));
  const others = offered
    .filter((part) => !KNOWN.some((entry) => entry.part === part))
    .map((part) => ({ part, label: labelFor(part) }));
  return [...known, ...others];
}

/**
 * A saved look made whole for drawing: every part the art offers, and a part
 * never chosen, or one whose choice the art no longer offers (or never did),
 * becomes the art's first choice for it. Parts the art does not offer are
 * dropped: nothing unknown reaches the drawing.
 */
export function fullLook(look: Look): DrawnLook {
  const saved = look as Readonly<Record<string, string | undefined>>;
  const pick = (part: string): string => {
    const choices = CHOICES[part] ?? [];
    const id = saved[part];
    return choices.some((choice) => choice.id === id) ? id! : (choices[0]?.id ?? '');
  };
  return Object.fromEntries(lookParts().map(({ part }) => [part, pick(part)])) as DrawnLook;
}

/**
 * One row per part, stepping through its choices with a button either side,
 * so the character drawn above stays in view while the thumb tries things on.
 * A part with only one choice is shown and nothing more.
 */
export function lookPicker(start: DrawnLook, onChange: (look: DrawnLook) => void): HTMLElement {
  let look = start;
  const at = (part: string): string | undefined =>
    (look as Readonly<Record<string, string | undefined>>)[part];
  const rows = lookParts().map(({ part, label }) => {
    const choices = CHOICES[part]!;
    const shown = h('span', { class: 'look-choice' });
    const show = (): void => {
      shown.textContent = choices.find((choice) => choice.id === at(part))?.name ?? '';
    };
    show();
    if (choices.length < 2) {
      return h('div', { class: 'look-row single', attrs: { 'data-part': part } }, [
        h('span', { class: 'look-label muted', text: label }),
        shown,
      ]);
    }
    const step = (by: number): void => {
      const now = choices.findIndex((choice) => choice.id === at(part));
      const next = choices[(now + by + choices.length) % choices.length]!;
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
