import { dungeonStatus, dungeonsInOrder } from '../core/dungeons';
import type { Content, DungeonDef } from '../core/content';
import type { GameState } from '../core/state';
import type { Prefs } from '../persistence/Prefs';
import { button, h } from './dom';

/*
 * The menus' pointers to the dungeons (wave 15, Cody: "make it more apparent
 * we need to click the boat"): a first-steps card on the Skills tab and a dot
 * on the Town tab. Each shows until it has done its job and is then
 * remembered, so nothing nags.
 *
 * They are kept in the menus' preferences on this device (`Prefs`), not in
 * the save: they are about learning these menus, not progress, so they need
 * no save version, are never exported, and a hint seen again on another
 * phone does no harm. Each is keyed to the character (by when it was made),
 * so a new character on the same phone is shown them afresh.
 */

const key = (name: string, state: GameState): string => `${name}:${state.createdAt}`;

/**
 * The dungeon a first-steps card points at: the learning one, the first on
 * the chart meant for the lowest level of any, while it is open and never
 * cleared. None once it is cleared.
 */
export function firstStepsDungeon(state: GameState, content: Content): DungeonDef | null {
  const charted = dungeonsInOrder(content).filter((dungeon) => !dungeon.comingSoon);
  const least = Math.min(...charted.map((dungeon) => dungeon.recommended));
  const first = charted.find((dungeon) => dungeon.recommended === least);
  return first && dungeonStatus(state, first.id, content)?.state === 'open' ? first : null;
}

/** Whether the first-steps card is due: its dungeon is there to point at and it was never put away. */
export function firstStepsDue(state: GameState, content: Content, prefs: Prefs): boolean {
  return (
    prefs.get(key('hint-first-steps', state)) !== '1' && firstStepsDungeon(state, content) !== null
  );
}

/** The first-steps card has done its job (gone to the harbour, or put away): never again. */
export function putFirstStepsAway(state: GameState, prefs: Prefs): void {
  prefs.set(key('hint-first-steps', state), '1');
}

/** The dungeons the harbour chart had open the last time it was seen. */
function charted(state: GameState, prefs: Prefs): string[] {
  try {
    const kept: unknown = JSON.parse(prefs.get(key('chart-seen', state)) ?? '[]');
    return Array.isArray(kept) ? kept.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Whether the Town tab wears its dot: some dungeon is open, never cleared,
 * and was not open when the chart was last seen. A landing that opens later
 * (a first clear opening the next) brings it back once.
 */
export function newLanding(state: GameState, content: Content, prefs: Prefs): boolean {
  const seen = new Set(charted(state, prefs));
  return Object.values(content.dungeons ?? {}).some(
    (dungeon) =>
      !seen.has(dungeon.id) && dungeonStatus(state, dungeon.id, content)?.state === 'open',
  );
}

/** The chart has been seen (or a dungeon entered): every landing open now is known. */
export function chartSeen(state: GameState, content: Content, prefs: Prefs, also?: string): void {
  const open = Object.values(content.dungeons ?? {})
    .filter((dungeon) => {
      const status = dungeonStatus(state, dungeon.id, content)?.state;
      return status === 'open' || status === 'cleared';
    })
    .map((dungeon) => dungeon.id);
  const all = [...new Set([...charted(state, prefs), ...open, ...(also ? [also] : [])])];
  prefs.set(key('chart-seen', state), JSON.stringify(all));
}

/**
 * The first-steps card, at the top of the Skills tab for a new character: the
 * learning dungeon, how to get there, and a way to put it away.
 */
export function firstStepsCard(
  dungeon: DungeonDef,
  go: () => void,
  dismiss: () => void,
): HTMLElement {
  return h(
    'section',
    { class: 'panel stack tight first-steps', attrs: { 'data-first-steps': '' } },
    [
      h('div', { class: 'card-head' }, [
        h('h2', { text: 'First steps' }),
        h('span', { class: 'hint', text: `Level ${dungeon.recommended}` }),
      ]),
      h('p', {
        class: 'small',
        text: `${dungeon.name} is a short first dungeon, there to learn the ropes: walking, fighting and eating. Take the rowing boat from the quay in town.`,
      }),
      h('div', { class: 'row' }, [
        button('To the harbour', go, 'primary'),
        button('Not now', dismiss),
      ]),
    ],
  );
}
