import { itemIcon } from '../art/icons';
import type { Content, StoreEntry } from '../core/content';
import { perksFor, storeProblem } from '../core/store';
import type { PerkPlace } from '../core/content';
import type { GameState } from '../core/state';
import { wornLines } from './bountyScreen';
import { shortCount } from './bankOrder';
import { button, h, titled } from './dom';
import { formatNumber } from './format';
import { face } from './face';
import { gridIcon, spoken } from './grid';
import type { View } from './view';
import { tierLock, tierOf } from '../core/tiers';
import { tierChip, tierLockLine } from './tierMarks';

/** Who keeps the store, by the art's face id: the town's trader. */
const KEEPER = { id: 'trader', name: 'Trader' };

export interface StoreActions {
  /** Back to the bank. */
  back(): void;
  buy(entryId: string): void;
}

export const coinsText = (amount: number): string =>
  `${formatNumber(amount)} ${amount === 1 ? 'coin' : 'coins'}`;

/** What a store entry is called: "Bronze arrows ×50", or a perk's name. */
export function entryName(entry: StoreEntry, content: Content): string {
  if (entry.perk) return entry.perk.name;
  const name = content.items[entry.item]?.name ?? entry.item;
  return entry.qty > 1 ? `${name} ×${formatNumber(entry.qty)}` : name;
}

/** "Used in Alchemy.": the skills whose actions take an item, so a vial says what it is for. */
export function usedInLine(itemId: string, content: Content): string | null {
  const skills = [
    ...new Set(
      Object.values(content.actions)
        .filter((action) => action.uses?.some(({ item }) => item === itemId))
        .map((action) => content.skills[action.skill]?.name ?? action.skill),
    ),
  ];
  return skills.length > 0 ? `Used in ${skills.join(', ')}.` : null;
}

/**
 * The lasting things owned that a screen shows (`PerkDef.shows`), a line
 * each: the name and what it does, in numbers. Nothing when none is owned,
 * so a screen can always ask. A new upgrade with a place in `shows` appears
 * on that place's screen with no code of its own.
 */
export function perkNotes(state: GameState, content: Content, place: PerkPlace): HTMLElement[] {
  return perksFor(state, content, place).map(({ id, perk }) =>
    h('p', { class: 'small perk-note', attrs: { 'data-perk': id } }, [
      h('span', { class: 'perk-name', text: `${perk.name}: ` }),
      perk.effect,
    ]),
  );
}

/**
 * One thing the store sells: what it is, what it gives, its price and Buy.
 * Whether it can be bought moves with the purse, in place.
 */
function storeRow(
  entry: StoreEntry,
  content: Content,
  buy: () => void,
  updates: ((state: GameState) => void)[],
): HTMLElement {
  const item = entry.item ? content.items[entry.item] : undefined;
  const usedIn = entry.item ? usedInLine(entry.item, content) : null;
  const why = h('p', { class: 'small muted' });
  const buyButton = button(`Buy for ${coinsText(entry.price)}`, buy);
  buyButton.setAttribute('data-buy', entry.id);
  updates.push((now) => {
    const problem = storeProblem(now, entry, content);
    const owned = entry.perk && now.perks.includes(entry.id);
    buyButton.disabled = problem !== null;
    buyButton.classList.toggle('primary', problem === null);
    buyButton.textContent = owned ? 'Yours' : `Buy for ${coinsText(entry.price)}`;
    why.textContent = owned ? '' : (problem ?? '');
  });
  return h(
    'section',
    { class: `panel stack tight${entry.perk ? ' dear' : ''}`, attrs: { 'data-stock': entry.id } },
    [
      h('div', { class: 'card-head' }, [
        titled(entry.item ? itemIcon(entry.item) : null, entryName(entry, content)),
        h('span', { class: 'level', text: formatNumber(entry.price) }),
      ]),
      h('p', {
        class: 'small muted',
        text: entry.perk ? entry.perk.description : (item?.description ?? ''),
      }),
      // What buying it does, plainly and in numbers, before anything else.
      entry.perk && h('p', { class: 'small perk-effect', text: entry.perk.effect }),
      usedIn && h('p', { class: 'small', text: usedIn }),
      ...(entry.item
        ? wornLines(entry.item, content).map((line) => h('p', { class: 'small', text: line }))
        : []),
      item?.heals ? h('p', { class: 'small', text: `Heals ${item.heals} hit points.` }) : null,
      entry.once && h('p', { class: 'small muted', text: 'One to a customer.' }),
      entry.perk && h('p', { class: 'small muted', text: 'Bought once, kept for good.' }),
      why,
      buyButton,
    ],
  );
}

/**
 * One of the beginner's things as a cell, as the bank shows a stack: its
 * picture, how many come in the lot, and its price under it, always in
 * sight. A tap opens its card (everything `storeRow` says, and Buy) at the
 * foot of the screen. Whether the purse reaches it dims the price in place.
 */
function stockCell(
  entry: StoreEntry,
  content: Content,
  open: () => void,
  updates: ((state: GameState) => void)[],
): HTMLElement {
  const item = content.items[entry.item!];
  const name = item?.name ?? entry.item!;
  const price = h('span', { class: 'cell-price', text: shortCount(entry.price) });
  const el = h(
    'button',
    {
      class: 'bank-cell stock-cell',
      attrs: { type: 'button', 'data-stock-cell': entry.id, 'aria-pressed': 'false' },
      on: { click: open },
    },
    [
      gridIcon(entry.item!, name),
      spoken(`${entryName(entry, content)}, ${coinsText(entry.price)}`),
      (entry.qty ?? 1) > 1 && h('span', { class: 'qty cell-qty cell-lot', text: `×${entry.qty}` }),
      price,
    ],
  );
  updates.push((now) =>
    el.classList.toggle('dear-now', storeProblem(now, entry, content) !== null),
  );
  return el;
}

/**
 * The general store, behind the Bank tab (and, later, the trader's stall):
 * the purse, what it sells, and a word on selling, which is done from the
 * bank's own cards at what a thing is worth.
 */
export function storeView(state: GameState, content: Content, actions: StoreActions): View {
  const updates: ((state: GameState) => void)[] = [];
  const purse = h('span', { class: 'qty' });
  updates.push((now) => {
    purse.textContent = formatNumber(now.coins);
  });
  const entries = Object.values(content.store ?? {});
  const tools = entries.filter((entry) => !entry.perk && !entry.once);
  // A lasting thing bought moves out of the stock into "Yours", where it stays.
  const owned = perksFor(state, content);
  const dear = entries.filter(
    (entry) => (entry.perk && !state.perks.includes(entry.id)) || entry.once,
  );
  const rows = (list: StoreEntry[]) =>
    list.map((entry) => storeRow(entry, content, () => actions.buy(entry.id), updates));
  // The beginner's things are a grid of cells with their prices; the open
  // one's card stands at the foot of the screen, as the bank's does.
  const sheet = h('div', { class: 'bank-sheet', attrs: { 'data-store-sheet': '' } });
  sheet.hidden = true;
  let openId: string | null = null;
  let cardUpdates: ((state: GameState) => void)[] = [];
  let latest = state;
  const cells = new Map<string, HTMLElement>();
  const show = (id: string | null): void => {
    if (openId) cells.get(openId)?.setAttribute('aria-pressed', 'false');
    openId = id === openId ? null : id;
    cardUpdates = [];
    const entry = openId ? content.store?.[openId] : undefined;
    if (!entry) {
      sheet.replaceChildren();
      sheet.hidden = true;
      return;
    }
    cells.get(entry.id)?.setAttribute('aria-pressed', 'true');
    const card = storeRow(entry, content, () => actions.buy(entry.id), cardUpdates);
    card.classList.add('item-card', 'stock-card');
    card.classList.remove('panel');
    card.querySelector('.card-head')?.append(button('Close', () => show(null), 'sheet-close'));
    sheet.replaceChildren(card);
    sheet.hidden = false;
    cardUpdates.forEach((apply) => apply(latest));
  };
  const gridOf = (list: StoreEntry[], tier: number) =>
    h(
      'div',
      { class: 'bank-grid store-grid', attrs: { 'data-store-grid': String(tier) } },
      list.map((entry) => {
        const cell = stockCell(entry, content, () => show(entry.id), updates);
        cells.set(entry.id, cell);
        return cell;
      }),
    );
  // A later tier's stock (S22) has a heading of its own with its chip, and says why while closed.
  const later = tools.filter((entry) => tierOf(entry) > 1);
  const toolGrid = gridOf(
    tools.filter((entry) => tierOf(entry) === 1),
    1,
  );
  const laterClosed = tierLock(state, 2, content);
  const laterStock = later.length > 0 && [
    h('div', { class: 'area-head' }, [
      h('h2', { class: 'group-heading', text: 'Past the grotto' }),
      tierChip(2, !laterClosed),
    ]),
    laterClosed && tierLockLine(laterClosed),
    gridOf(later, 2),
  ];
  // Built before the first update, so each row is set for the purse it opens on.
  const dearRows = rows(dear);

  const update = (now: GameState): void => {
    latest = now;
    updates.forEach((apply) => apply(now));
    cardUpdates.forEach((apply) => apply(now));
  };
  update(state);
  return {
    el: h('div', { class: 'stack groups', attrs: { 'data-store': '' } }, [
      button('‹ Bank', actions.back, 'back'),
      h('section', { class: 'panel stack tight' }, [
        // The trader in town keeps the store (and the bank), so it is her face behind the counter.
        h('div', { class: 'foe-head' }, [
          face(KEEPER, 'small'),
          h('div', { class: 'stack tight monster-text' }, [
            h('h2', { text: 'The general store' }),
            h('p', { class: 'purse purse-line' }, [
              h('span', { class: 'muted', text: 'Your purse' }),
              purse,
            ]),
          ]),
        ]),
        h('p', {
          class: 'small muted',
          text: 'Buys anything at what it is worth: sell from the bank. Sells what a beginner needs, dear, and a few things worth saving for.',
        }),
      ]),
      owned.length > 0 && h('h2', { class: 'group-heading', text: 'Yours' }),
      ...owned.map(({ id, perk }) =>
        h('section', { class: 'panel stack tight owned', attrs: { 'data-owned': id } }, [
          h('div', { class: 'card-head' }, [
            h('h2', { text: perk.name }),
            h('span', { class: 'level owned-mark', text: 'Owned' }),
          ]),
          h('p', { class: 'small perk-effect', text: perk.effect }),
          h('p', { class: 'small muted', text: 'Bought once, kept for good. Working now.' }),
        ]),
      ),
      tools.length > 0 && h('h2', { class: 'group-heading', text: 'To get you started' }),
      tools.length > 0 && toolGrid,
      ...(laterStock || []),
      dear.length > 0 && h('h2', { class: 'group-heading', text: 'Worth saving for' }),
      ...dearRows,
      sheet,
    ]),
    update,
  };
}
