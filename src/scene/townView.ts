import type { Content } from '../core/content';
import type { GameState } from '../core/state';
import type { Shell, View } from '../ui/view';
import { other, timeOfDayAt, type TimeOfDay } from './daylight';
import { closePanel, startPlay, type Play } from './play';
import { stage } from './stage';
import { TOWN_START, town } from './town';
import { centreOf } from './tileMap';

/**
 * Where the hero was and what was open when the Town tab was last on screen.
 * The shell rebuilds the tab on a level-up or when an action stops, and
 * coming back to the tab should find things as they were left. It lasts as
 * long as the page does; a position in town is not part of the save.
 */
let play: Play = startPlay(centreOf(TOWN_START));

/** Day or dusk chosen with the sun-and-moon button, for this session; null follows the clock. */
let chosen: TimeOfDay | null = null;

const now = (): TimeOfDay => chosen ?? timeOfDayAt(new Date().getHours());

/**
 * What the Town tab shows. This is the scene lane's one door into the app:
 * `src/ui/app.ts` calls it and knows nothing else about scenes, so everything
 * behind it can change without touching the shell.
 */
export function townView(_state: GameState, _content: Content, shell?: Shell): View {
  const { scene, art } = town();
  return stage({
    scene,
    art,
    play,
    keep: (next) => {
      play = next;
    },
    light: {
      current: now,
      flip: () => {
        chosen = other(now());
      },
    },
    press: (opens) => {
      // Coming back to town should not find the panel still open over the square.
      play = closePanel(play);
      if ('tab' in opens) shell?.openTab(opens.tab);
      else shell?.openSkill(opens.skill);
    },
    label: 'Gullwick, the town. Tap the ground to walk there, or tap something to walk up to it.',
    fallback: 'The town needs a browser that can draw on a canvas.',
  });
}

/** Puts the hero back at the start with nothing open and the clock in charge. For tests. */
export function resetTown(): void {
  play = startPlay(centreOf(TOWN_START));
  chosen = null;
}
