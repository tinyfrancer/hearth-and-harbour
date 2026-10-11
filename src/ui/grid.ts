import { h } from './dom';
import { dollIcon } from './figure';

/**
 * CSS pixels to an icon's art pixel in a grid cell: a 24-pixel icon about 36
 * to 40 CSS pixels across (5 device pixels an art pixel at 3x, 3 at 2x), so
 * five or six cells fit across a phone and each is still a 48-pixel target.
 */
export const GRID_ICON_SCALE = 1.5;

/** "Pine logs" as "PL": what a cell shows for a thing art has not drawn yet. */
const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

/**
 * An item's picture for a grid cell, crisp at a whole number of device
 * pixels to an art pixel (`dollIcon`), or its initials in a dashed square
 * the same size until art has drawn it.
 */
export function gridIcon(itemId: string, name: string, cssScale = GRID_ICON_SCALE): HTMLElement {
  const icon = dollIcon(itemId, cssScale);
  if (icon) {
    icon.classList.add('grid-icon');
    // The cell carries the item's id; its picture need not say it again.
    delete icon.dataset.item;
    return icon as unknown as HTMLElement;
  }
  return h('span', { class: 'grid-icon grid-blank', attrs: { 'aria-hidden': 'true' } }, [
    initials(name),
  ]);
}

/** Words for a screen reader only: the name a cell's picture stands for. */
export const spoken = (text: string): HTMLElement => h('span', { class: 'sr-only', text });
