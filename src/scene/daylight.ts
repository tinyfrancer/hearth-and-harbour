/*
 * Day and dusk. The town follows the phone's clock, so an evening session
 * looks like evening; the player can flip it for the session to see the other.
 */
import { DAY, DUSK, type Palette } from '../art/palette';

export type TimeOfDay = 'day' | 'dusk';

/** Dusk starts at this hour and lasts until `DAWN`. */
export const DUSK_HOUR = 18;
export const DAWN_HOUR = 6;

/** Day or dusk at an hour of the clock (0 to 23): dusk from 18:00 until 06:00. */
export function timeOfDayAt(hour: number): TimeOfDay {
  return hour >= DUSK_HOUR || hour < DAWN_HOUR ? 'dusk' : 'day';
}

export function other(time: TimeOfDay): TimeOfDay {
  return time === 'day' ? 'dusk' : 'day';
}

export function paletteFor(time: TimeOfDay): Palette {
  return time === 'day' ? DAY : DUSK;
}
