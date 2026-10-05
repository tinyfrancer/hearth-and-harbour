import type { Content } from './content';
import type { GameState } from './state';

/**
 * The collection log: every item the character has ever held. An item is
 * found the first time it is seen in the bank, worn, in the food slot or being
 * drunk. Things only ever arrive in those places (an action, a fight, a theft,
 * a run or a shop puts them there), and nothing made in one stretch of time is
 * used up in the same stretch, so looking after every change misses nothing,
 * however the time was cut.
 */

/** The item ids the character holds right now, wherever they are. */
export function heldIds(state: GameState): string[] {
  return [
    ...Object.keys(state.bank),
    ...Object.values(state.equipment).map((worn) => worn!.item),
    ...(state.food ? [state.food.item] : []),
    ...(state.potion ? [state.potion.item] : []),
  ];
}

/** The state with anything held for the first time added to the log; the same state if nothing is. */
export function noteFinds(state: GameState, ids: readonly string[] = heldIds(state)): GameState {
  let found: Set<string> | null = null;
  let collection: string[] | null = null;
  for (const id of ids) {
    found ??= new Set(state.collection);
    if (found.has(id)) continue;
    found.add(id);
    collection ??= [...state.collection];
    collection.push(id);
  }
  return collection ? { ...state, collection } : state;
}

/** One heading of the log: where things come from, and the things. */
export interface CollectionSource {
  /** Stable, for remembering which headings are open: "gathering", "monster:dock_rat". */
  id: string;
  name: string;
  /** Item ids, in table order, each once. */
  items: string[];
}

/**
 * Where everything in the tables comes from, as the log lists it: what is
 * gathered, what is made, what each monster drops, what each mark gives up,
 * what bounty points buy, what each dungeon gives, and what only coins buy. An item
 * that comes from several places is listed under each.
 */
export function collectionSources(content: Content): CollectionSource[] {
  const sources: CollectionSource[] = [];
  const add = (id: string, name: string, items: Iterable<string>): void => {
    const known = [...new Set(items)].filter((item) => Object.hasOwn(content.items, item));
    if (known.length > 0) sources.push({ id, name, items: known });
  };
  const groups = [...new Set(Object.values(content.skills).map((skill) => skill.group))];
  for (const group of groups) {
    add(
      `skills:${group}`,
      group,
      Object.values(content.actions)
        .filter((action) => content.skills[action.skill]?.group === group)
        .flatMap((action) => action.gives.map(({ item }) => item)),
    );
  }
  for (const monster of Object.values(content.monsters ?? {})) {
    add(
      `monster:${monster.id}`,
      monster.name,
      [...monster.always, ...monster.rare].map(({ item }) => item),
    );
  }
  for (const action of Object.values(content.actions)) {
    if (action.steal)
      add(
        `mark:${action.id}`,
        action.name,
        action.steal.loot.map((d) => d.item),
      );
  }
  add(
    'bounty_shop',
    'The bounty shop',
    Object.values(content.shop ?? {}).map((entry) => entry.item),
  );
  for (const dungeon of Object.values(content.dungeons ?? {})) {
    add(`dungeon:${dungeon.id}`, dungeon.name, dungeon.loot);
  }
  // The store mostly sells what can be made, to get a new player going; it
  // has a heading only for what it alone sells.
  const elsewhere = new Set(sources.flatMap((source) => source.items));
  add(
    'store',
    'The general store',
    Object.values(content.store ?? {}).flatMap((entry) =>
      entry.item && !elsewhere.has(entry.item) ? [entry.item] : [],
    ),
  );
  return sources;
}

/** How many of a source's things the character has found. */
export function foundIn(state: GameState, source: CollectionSource): number {
  const found = new Set(state.collection);
  return source.items.filter((item) => found.has(item)).length;
}

/** Every item the log lists, each once: what "all of it" means. */
export function collectable(content: Content): string[] {
  return [...new Set(collectionSources(content).flatMap((source) => source.items))];
}
