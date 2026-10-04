import type { GameState } from '../core/state';

/**
 * One screen's worth of DOM. It is built once when shown; `update` then moves
 * only what time moves (bars, counts), many times a second, so buttons are
 * never torn out from under a thumb.
 */
export interface View {
  el: HTMLElement;
  update?(state: GameState): void;
}
