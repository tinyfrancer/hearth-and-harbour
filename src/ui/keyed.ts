/**
 * A list kept in step with the state in place: an element per key, in the
 * order the keys come, built the first time its key appears and kept until it
 * goes. Nothing already on screen is rebuilt or moved needlessly, so an open
 * card, a focused button and the scroll all stay as the thumb left them when
 * something arrives (a first log, a drop from a kill) or runs out.
 */
export interface Keyed<S> {
  /** Bring the list in line with `keys`, then update every row with `state`. */
  sync(keys: readonly string[], state: S): void;
  /** Build the row for `key` afresh where it stands (a card opened in place of a row). */
  rebuild(key: string, state: S): void;
  /** The element shown for a key, if it is shown. */
  get(key: string): HTMLElement | undefined;
}

/** What a row is: its element and how it follows the state. */
export interface Row<S> {
  el: HTMLElement;
  update?(state: S): void;
}

export function keyedList<S>(
  parent: HTMLElement,
  build: (key: string, state: S) => Row<S>,
): Keyed<S> {
  const rows = new Map<string, Row<S>>();
  let order: readonly string[] = [];

  const sync = (keys: readonly string[], state: S): void => {
    const same = keys.length === order.length && keys.every((key, at) => key === order[at]);
    if (!same) {
      const wanted = new Set(keys);
      for (const [key, row] of rows) {
        if (!wanted.has(key)) {
          row.el.remove();
          rows.delete(key);
        }
      }
      let at: Element | null = parent.firstElementChild;
      for (const key of keys) {
        let row = rows.get(key);
        if (!row) {
          row = build(key, state);
          rows.set(key, row);
        }
        if (row.el === at) {
          at = at.nextElementSibling;
        } else {
          parent.insertBefore(row.el, at);
        }
      }
      order = [...keys];
    }
    for (const key of keys) rows.get(key)!.update?.(state);
  };

  const rebuild = (key: string, state: S): void => {
    const old = rows.get(key);
    if (!old) return;
    const row = build(key, state);
    old.el.replaceWith(row.el);
    rows.set(key, row);
    row.update?.(state);
  };

  return { sync, rebuild, get: (key) => rows.get(key)?.el };
}
