import type { Content, ItemDef, PotionDef } from '../core/content';
import { bankCount, type GameState } from '../core/state';
import { itemIcon } from '../art/icons';
import { button, h, titled } from './dom';
import { activePotion } from '../core/potions';
import { formatNumber } from './format';
import { gearText, slotText } from './gear';
import { potionEffectText, potionSkillsText } from './potionPanel';
import type { View } from './view';

interface BankActions {
  /** Open an item's card, or close it with null. */
  open(itemId: string | null): void;
  sell(itemId: string, qty: number): void;
  drink(itemId: string): void;
  equip(itemId: string): void;
}

const coins = (amount: number): string =>
  `${formatNumber(amount)} ${amount === 1 ? 'coin' : 'coins'}`;

/** Where an item comes from and what it goes into, read off the action tables. */
function provenance(item: ItemDef, content: Content): { from: string[]; usedIn: string[] } {
  const from: string[] = [];
  const usedIn: string[] = [];
  for (const action of Object.values(content.actions)) {
    const skill = content.skills[action.skill]?.name ?? action.skill;
    if (action.gives.some((entry) => entry.item === item.id)) {
      from.push(`${skill} (${action.name})`);
    }
    if (action.uses?.some((entry) => entry.item === item.id)) {
      usedIn.push(`${skill} (${action.name})`);
    }
  }
  return { from, usedIn };
}

/** What a potion does, as rows for the item card's facts. */
function potionFacts(potion: PotionDef, content: Content): HTMLElement[] {
  return [
    h('dt', { text: 'Does' }),
    h('dd', { class: 'potion-text', text: potionEffectText(potion) }),
    h('dt', { text: 'For' }),
    h('dd', { text: potionSkillsText(potion, content) }),
    h('dt', { text: 'Lasts' }),
    h('dd', { text: `${formatNumber(potion.charges)} actions` }),
  ];
}

/**
 * The button to drink a potion. Drinking pours away whatever charges the
 * potion already working has left, so then it asks first, with a second tap.
 */
function drinkButton(
  item: ItemDef,
  content: Content,
  actions: BankActions,
  latest: () => GameState,
): HTMLElement {
  const confirm = h('div', { class: 'stack tight' });
  const drink = button(
    `Drink ${item.name}`,
    () => {
      const working = activePotion(latest(), content);
      if (!working) {
        actions.drink(item.id);
        return;
      }
      const left = `${formatNumber(working.charges)} ${working.charges === 1 ? 'charge' : 'charges'}`;
      confirm.replaceChildren(
        h('p', {
          class: 'small',
          text: `Your ${working.item.name} still has ${left} left. Drinking this pours them away.`,
        }),
        h('div', { class: 'row' }, [
          button(`Replace ${working.item.name}`, () => actions.drink(item.id), 'primary'),
          button('Cancel', () => confirm.replaceChildren()),
        ]),
      );
    },
    'primary',
  );
  return h('div', { class: 'stack tight' }, [drink, confirm]);
}

/** The item card: what a thing is, where it comes from, what it is for, and selling it. */
function itemCard(
  state: GameState,
  item: ItemDef,
  content: Content,
  actions: BankActions,
  updates: ((state: GameState) => void)[],
): HTMLElement {
  const { from, usedIn } = provenance(item, content);
  const held = h('span', { class: 'qty' });
  // How many the sell button will sell: a number, or everything held.
  let chosen: number | 'all' = 1;
  const sellButton = button('', () => {
    actions.sell(item.id, chosen === 'all' ? Infinity : chosen);
  });
  // On a potion the thing to do is drink it, and on gear to wear it, so selling steps back.
  if (!item.potion && !item.equip) sellButton.classList.add('primary');
  const choices = ([1, 10, 100, 'all'] as const).map((amount) =>
    h('button', {
      class: 'btn choice',
      text: amount === 'all' ? 'All' : String(amount),
      attrs: { type: 'button', 'data-sell': String(amount) },
      on: {
        click: () => {
          chosen = amount;
          refresh(latest);
        },
      },
    }),
  );
  let latest = state;
  const refresh = (now: GameState): void => {
    latest = now;
    const have = bankCount(now, item.id);
    const count = chosen === 'all' ? have : Math.min(chosen, have);
    held.textContent = formatNumber(have);
    sellButton.textContent = `Sell ${formatNumber(count)} for ${coins(count * item.value)}`;
    sellButton.disabled = count === 0;
    choices.forEach((choice) => {
      choice.setAttribute('aria-pressed', String(choice.dataset.sell === String(chosen)));
    });
  };
  updates.push(refresh);

  return h('section', { class: 'panel stack item-card', attrs: { 'data-card': item.id } }, [
    h('div', { class: 'card-head' }, [titled(itemIcon(item.id), item.name), held]),
    h('p', { class: 'muted', text: item.description }),
    h('dl', { class: 'facts small' }, [
      ...(item.potion ? potionFacts(item.potion, content) : []),
      ...(item.equip
        ? [
            h('dt', { text: 'Worn' }),
            h('dd', { text: slotText(item.equip) }),
            h('dt', { text: 'Gives' }),
            h('dd', { text: gearText(item.equip) }),
          ]
        : []),
      h('dt', { text: 'From' }),
      h('dd', { text: from.join(', ') || 'Nowhere yet' }),
      h('dt', { text: 'Used in' }),
      h('dd', { text: usedIn.join(', ') || 'Nothing yet' }),
      h('dt', { text: 'Worth' }),
      h('dd', { text: `${coins(item.value)} each` }),
    ]),
    item.potion && drinkButton(item, content, actions, () => latest),
    item.equip && button(`Equip ${item.name}`, () => actions.equip(item.id), 'primary'),
    h('div', { class: 'row' }, choices),
    sellButton,
    button('Close', () => actions.open(null)),
  ]);
}

/** The Bank tab: coins, every stack held, and a card for the one that is open. */
export function bankView(
  state: GameState,
  content: Content,
  openItem: string | null,
  actions: BankActions,
): View {
  const updates: ((state: GameState) => void)[] = [];
  const purse = h('span', { class: 'qty' });
  updates.push((now) => {
    purse.textContent = formatNumber(now.coins);
  });
  const head = h('section', { class: 'panel card-head purse' }, [
    h('h2', { text: 'Coins' }),
    purse,
  ]);

  // Table order, not arrival order, so a stack never jumps about.
  const held = Object.values(content.items).filter((item) => bankCount(state, item.id) > 0);
  const rows = held.map((item) => {
    const open = item.id === openItem;
    if (open) {
      return itemCard(state, item, content, actions, updates);
    }
    const qty = h('span', { class: 'qty' });
    updates.push((now) => {
      qty.textContent = formatNumber(bankCount(now, item.id));
    });
    return h(
      'button',
      {
        class: 'panel card stack-row',
        attrs: { type: 'button', 'data-item': item.id },
        on: { click: () => actions.open(item.id) },
      },
      [h('div', { class: 'card-head' }, [titled(itemIcon(item.id), item.name), qty])],
    );
  });

  const update = (now: GameState): void => updates.forEach((apply) => apply(now));
  update(state);
  return {
    el: h('div', { class: 'stack' }, [
      head,
      ...rows,
      held.length === 0 &&
        h('section', { class: 'panel empty' }, [
          h('p', { class: 'muted', text: 'Your bank is empty. Go and gather something.' }),
        ]),
    ]),
    update,
  };
}
