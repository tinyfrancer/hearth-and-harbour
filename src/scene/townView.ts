import type { Content } from '../core/content';
import type { GameState } from '../core/state';
import type { View } from '../ui/view';
import { stage } from './stage';
import { ROOM_KINDS, ROOM_START, TEST_ROOM } from './testRoom';
import { centreOf } from './tileMap';
import type { Walker } from './walker';

/**
 * Where the walker was when the Town tab was last on screen. The shell
 * rebuilds the tab on a level-up or when an action stops, and coming back to
 * the tab should find them where they were left. It lasts as long as the page
 * does; a position in town is not part of the save.
 */
let walker: Walker = { at: centreOf(ROOM_START), path: [] };

/**
 * What the Town tab shows. This is the scene lane's one door into the app:
 * `src/ui/app.ts` calls it and knows nothing else about scenes, so everything
 * behind it can change without touching the shell.
 */
export function townView(_state: GameState, _content: Content): View {
  return stage({
    map: TEST_ROOM,
    looks: ROOM_KINDS,
    walker,
    onMove: (moved) => {
      walker = moved;
    },
    label: 'A test room. Tap the ground to walk there.',
    fallback: 'The town needs a browser that can draw on a canvas.',
  });
}
