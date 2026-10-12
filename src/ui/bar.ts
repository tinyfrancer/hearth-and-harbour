import { h } from './dom';

export interface Bar {
  el: HTMLElement;
  /** 0 to 1. */
  set(fraction: number): void;
}

/**
 * A flat progress bar on a dark track: gold for XP, green for the action under
 * way, blue for mastery, violet for a potion's charges; in a fight, green for
 * the character's health, red for the monster's, and a thin pale bar for the
 * wait until a blow.
 */
export function bar(
  kind: 'xp' | 'action' | 'mastery' | 'potion' | 'health' | 'foe' | 'swing',
  label: string,
): Bar {
  const fill = h('div', { class: 'bar-fill' });
  const el = h(
    'div',
    { class: `bar ${kind}`, attrs: { role: 'progressbar', 'aria-label': label } },
    [fill],
  );
  // Written only when it moves (read back from the element itself, so nothing can drift): a
  // long page holds dozens of bars that stand still each frame.
  return {
    el,
    set(fraction) {
      const percent = Math.min(Math.max(fraction, 0), 1) * 100;
      const width = `${percent}%`;
      if (fill.style.width !== width) fill.style.width = width;
      const now = String(Math.round(percent));
      if (el.getAttribute('aria-valuenow') !== now) el.setAttribute('aria-valuenow', now);
    },
  };
}
