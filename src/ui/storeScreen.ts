import { itemIcon } from '../art/icons';
import type { Content, StoreEntry } from '../core/content';
import { storeProblem } from '../core/store';
import type { GameState } from '../core/state';
import { wornLines } from './bountyScreen';
import { button, h, titled } from './dom';
import { formatNumber } from './format';
import { face } from './face';
import type { View } from './view';

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
  const why = h('p', { class: 'small muted' });
  const buyButton = button(`Buy for ${coinsText(entry.price)}`, buy);
  buyButton.setAttribute('data-buy', entry.id);
  updates.push((now) => {
    const problem = storeProblem(now, entry);
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
  const dear = entries.filter((entry) => entry.perk || entry.once);
  const rows = (list: StoreEntry[]) =>
    list.map((entry) => storeRow(entry, content, () => actions.buy(entry.id), updates));
  // Built before the first update, so each row is set for the purse it opens on.
  const toolRows = rows(tools);
  const dearRows = rows(dear);

  const update = (now: GameState): void => updates.forEach((apply) => apply(now));
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
      tools.length > 0 && h('h2', { class: 'group-heading', text: 'To get you started' }),
      ...toolRows,
      dear.length > 0 && h('h2', { class: 'group-heading', text: 'Worth saving for' }),
      ...dearRows,
    ]),
    update,
  };
}
