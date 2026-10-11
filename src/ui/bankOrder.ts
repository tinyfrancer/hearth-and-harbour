import type { Content, ItemDef } from '../core/content';
import { bankCount, type GameState } from '../core/state';

/**
 * What kind of thing an item is, for the bank's sort and filter: read off
 * the item's own row and the action tables, so a new item falls into its
 * kind with no code. In the order the bank lists them.
 */
export const CATEGORIES = [
  { id: 'resources', label: 'Resources' },
  { id: 'food', label: 'Food' },
  { id: 'potions', label: 'Potions' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'ammunition', label: 'Ammunition' },
  { id: 'other', label: 'Other' },
] as const;
export type Category = (typeof CATEGORIES)[number]['id'];

/** The ways the bank can be sorted, in the order the menu offers them. */
export const BANK_SORTS = [
  { id: 'type', label: 'Type' },
  { id: 'name', label: 'Name' },
  { id: 'value', label: 'Value each' },
  { id: 'stack', label: 'Value of stack' },
  { id: 'count', label: 'Count' },
  { id: 'newest', label: 'Newest find' },
] as const;
export type BankSort = (typeof BANK_SORTS)[number]['id'];

export const isBankSort = (id: string | null): id is BankSort =>
  BANK_SORTS.some((sort) => sort.id === id);

const kinds = new WeakMap<Content, Map<string, Category>>();

/**
 * An item's kind: a potion, food (it heals), ammunition or equipment (it is
 * worn), a resource (an action makes it or uses it: logs, ore, bars, shafts),
 * or else other (what only monsters, marks, shops and dungeons give).
 */
export function categoryOf(item: ItemDef, content: Content): Category {
  let table = kinds.get(content);
  if (!table) {
    const made = new Set<string>();
    for (const action of Object.values(content.actions)) {
      if (!action.steal) action.gives.forEach(({ item: id }) => made.add(id));
      action.uses?.forEach(({ item: id }) => made.add(id));
    }
    table = new Map();
    for (const def of Object.values(content.items)) {
      table.set(
        def.id,
        def.potion
          ? 'potions'
          : def.heals
            ? 'food'
            : def.equip?.slot === 'ammo'
              ? 'ammunition'
              : def.equip
                ? 'equipment'
                : made.has(def.id)
                  ? 'resources'
                  : 'other',
      );
    }
    kinds.set(content, table);
  }
  return table.get(item.id) ?? 'other';
}

/** What the bank is showing: how it is sorted, which kind (or all), and any words searched for. */
export interface BankView {
  sort: BankSort;
  filter: Category | 'all';
  search: string;
}

/**
 * The item ids to show, in order. Ties, and the type sort within a kind, keep
 * the tables' own order (what is gathered, then what is made from it), so
 * nothing swaps places for no reason. "Newest find" is the collection log's
 * order, which is the order things were first held: no new state needed.
 * `keep` is shown whether or not any are held (an open card's item).
 */
export function bankOrder(
  state: GameState,
  content: Content,
  view: BankView,
  keep: string | null = null,
): string[] {
  const words = view.search.trim().toLowerCase();
  const table = Object.values(content.items);
  const held = table.filter(
    (item) =>
      (bankCount(state, item.id) > 0 || item.id === keep) &&
      (view.filter === 'all' || categoryOf(item, content) === view.filter) &&
      (!words || item.name.toLowerCase().includes(words)),
  );
  const at = new Map(table.map((item, index) => [item.id, index]));
  const tie = (a: ItemDef, b: ItemDef): number => at.get(a.id)! - at.get(b.id)!;
  const count = (item: ItemDef): number => bankCount(state, item.id);
  const kind = (item: ItemDef): number =>
    CATEGORIES.findIndex((entry) => entry.id === categoryOf(item, content));
  const found = new Map(state.collection.map((id, index) => [id, index]));
  const by: Record<BankSort, (a: ItemDef, b: ItemDef) => number> = {
    type: (a, b) => kind(a) - kind(b) || tie(a, b),
    name: (a, b) => a.name.localeCompare(b.name, 'en-GB') || tie(a, b),
    value: (a, b) => b.value - a.value || tie(a, b),
    stack: (a, b) => b.value * count(b) - a.value * count(a) || tie(a, b),
    count: (a, b) => count(b) - count(a) || tie(a, b),
    // Anything held but somehow not in the log goes last, in table order.
    newest: (a, b) => (found.get(b.id) ?? -1) - (found.get(a.id) ?? -1) || tie(a, b),
  };
  return held.sort(by[view.sort]).map((item) => item.id);
}

/**
 * A count short enough for a grid cell: 999, then 1.2k, 12k, 123k, 1.2M.
 * Rounded down, so a cell never shows more than is held.
 */
export function shortCount(value: number): string {
  const n = Math.max(0, Math.floor(value));
  const cut = (by: number, unit: string): string => {
    const whole = n / by;
    return whole < 10 ? `${Math.floor(whole * 10) / 10}${unit}` : `${Math.floor(whole)}${unit}`;
  };
  if (n < 1000) return String(n);
  if (n < 1_000_000) return cut(1000, 'k');
  if (n < 1_000_000_000) return cut(1_000_000, 'M');
  return cut(1_000_000_000, 'B');
}
