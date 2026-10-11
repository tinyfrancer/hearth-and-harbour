import type { Content, ItemDef, PotionDef } from '../core/content';
import { bankCount, skillLevel, type GameState } from '../core/state';
import {
  BANK_SORTS,
  CATEGORIES,
  bankOrder,
  categoryOf,
  shortCount,
  type BankView,
  type Category,
} from './bankOrder';
import { button, h, setText } from './dom';
import { gridIcon, spoken } from './grid';
import { keyedList } from './keyed';
import { activePotion, chargesFor } from '../core/potions';
import { perksFor } from '../core/store';
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
  /** Put a food's whole stack in the food slot. */
  feed(itemId: string): void;
  /** Go to the general store. */
  store(): void;
  /** The sort, filter or search changed: kept for coming back to the tab (and the sort for good). */
  arrange(view: BankView): void;
}

const coins = (amount: number): string =>
  `${formatNumber(amount)} ${amount === 1 ? 'coin' : 'coins'}`;

/**
 * Where an item comes from and what it goes into, read off the action tables,
 * the monsters the character has seen drop it, the dungeons and the shops.
 */
function provenance(
  item: ItemDef,
  content: Content,
  state: GameState,
): { from: string[]; usedIn: string[] } {
  const from: string[] = [];
  const usedIn: string[] = [];
  for (const monster of Object.values(content.monsters ?? {})) {
    if (state.bestiary[monster.id]?.seen.includes(item.id)) from.push(monster.name);
  }
  for (const action of Object.values(content.actions)) {
    const skill = content.skills[action.skill]?.name ?? action.skill;
    if (action.gives.some((entry) => entry.item === item.id)) {
      from.push(`${skill} (${action.name})`);
    }
    if (action.uses?.some((entry) => entry.item === item.id)) {
      usedIn.push(`${skill} (${action.name})`);
    }
  }
  for (const dungeon of Object.values(content.dungeons ?? {})) {
    if (dungeon.loot.includes(item.id)) from.push(dungeon.name);
  }
  if (Object.values(content.shop ?? {}).some((entry) => entry.item === item.id)) {
    from.push('The bounty shop');
  }
  if (Object.values(content.store ?? {}).some((entry) => entry.item === item.id)) {
    from.push('The general store');
  }
  return { from, usedIn };
}

/** What a potion does, as rows for the item card's facts. */
function potionFacts(potion: PotionDef, content: Content, state: GameState): HTMLElement[] {
  return [
    h('dt', { text: 'Does' }),
    h('dd', { class: 'potion-text', text: potionEffectText(potion) }),
    h('dt', { text: 'For' }),
    h('dd', { text: potionSkillsText(potion, content) }),
    h('dt', { text: 'Lasts' }),
    h('dd', { attrs: { 'data-lasts': '' } }, [
      `${formatNumber(chargesFor(state, potion, content))} actions`,
      // Said where it shows: the potion's own number, and what owning the case adds.
      ...perksFor(state, content, 'potions')
        .filter(({ perk }) => perk.potionCharges)
        .map(({ id, perk }) =>
          h('span', {
            class: 'perk-note',
            attrs: { 'data-perk': id },
            text: ` (${formatNumber(potion.charges)}, and ${perk.potionCharges ?? 0}% more from your ${perk.name})`,
          }),
        ),
    ]),
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

/** What wearing a thing needs, marked short until the level is reached, in place. */
function needsLine(
  needs: { skill: string; level: number },
  content: Content,
  updates: ((state: GameState) => void)[],
): HTMLElement {
  const el = h('dd', {
    text: `${content.skills[needs.skill]?.name ?? needs.skill} level ${needs.level}`,
  });
  updates.push((now) => el.classList.toggle('problem', skillLevel(now, needs.skill) < needs.level));
  return el;
}

/** CSS pixels to an art pixel for the picture at the head of an open card: larger than a cell's. */
const CARD_ICON_SCALE = 2;

/**
 * The open card: what a thing is, what to do with it (drink, wear, eat,
 * sell), and where it comes from and goes. The doing comes first, so on a
 * small phone the buttons are on screen without scrolling the card.
 */
function itemCard(
  state: GameState,
  item: ItemDef,
  content: Content,
  actions: BankActions,
  updates: ((state: GameState) => void)[],
): HTMLElement {
  const { from, usedIn } = provenance(item, content, state);
  const needs = item.equip?.requires;
  const held = h('span', { class: 'qty' });
  // How many the sell button will sell: a number, or everything held.
  let chosen: number | 'all' = 1;
  const sellButton = button('', () => {
    actions.sell(item.id, chosen === 'all' ? Infinity : chosen);
  });
  sellButton.classList.add('sell');
  // On a potion the thing to do is drink it, and on gear to wear it, so selling steps back.
  if (!item.potion && !item.equip && !item.heals) sellButton.classList.add('primary');
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
    setText(held, formatNumber(have));
    setText(sellButton, `Sell ${formatNumber(count)} for ${coins(count * item.value)}`);
    sellButton.disabled = count === 0;
    choices.forEach((choice) => {
      choice.setAttribute('aria-pressed', String(choice.dataset.sell === String(chosen)));
    });
  };
  updates.push(refresh);
  const kind = CATEGORIES.find((entry) => entry.id === categoryOf(item, content))!.label;

  return h(
    'section',
    { class: 'stack tight item-card', attrs: { 'data-card': item.id, 'aria-label': item.name } },
    [
      h('div', { class: 'card-head sheet-head' }, [
        gridIcon(item.id, item.name, CARD_ICON_SCALE),
        h('div', { class: 'sheet-title' }, [
          h('h2', { text: item.name }),
          h('p', { class: 'small muted' }, [`${kind} · held `, held]),
        ]),
        button('Close', () => actions.open(null), 'sheet-close'),
      ]),
      h('div', { class: 'sheet-body stack tight' }, [
        h('p', { class: 'small muted', text: item.description }),
        item.potion && drinkButton(item, content, actions, () => latest),
        item.equip && button(`Equip ${item.name}`, () => actions.equip(item.id), 'primary'),
        Boolean(item.heals) &&
          button('Put in the food slot', () => actions.feed(item.id), 'primary'),
        h('div', { class: 'sell-line' }, [
          h('div', { class: 'sell-choices' }, choices),
          sellButton,
        ]),
        h('dl', { class: 'facts small' }, [
          ...(item.potion ? potionFacts(item.potion, content, state) : []),
          ...(item.equip
            ? [
                h('dt', { text: 'Worn' }),
                h('dd', { text: slotText(item.equip) }),
                h('dt', { text: 'Gives' }),
                h('dd', { text: gearText(item.equip) }),
                ...(needs ? [h('dt', { text: 'Needs' }), needsLine(needs, content, updates)] : []),
              ]
            : []),
          ...(item.heals
            ? [h('dt', { text: 'Heals' }), h('dd', { text: `${item.heals} hit points` })]
            : []),
          h('dt', { text: 'From' }),
          h('dd', { text: from.join(', ') || 'Nowhere yet' }),
          h('dt', { text: 'Used in' }),
          h('dd', { text: usedIn.join(', ') || 'Nothing yet' }),
          h('dt', { text: 'Worth' }),
          h('dd', { text: `${coins(item.value)} each` }),
        ]),
      ]),
    ],
  );
}

/** A heading's key among the cells: never an item id. */
const HEADING = '§';

/** Room kept between the open card's top edge and the cell it is about, in CSS pixels. */
const CLEAR = 8;

/**
 * The Bank tab: the purse and the store's door, a search, a sort and a
 * filter, every stack held as a small cell in a grid (its picture and count),
 * and the open one's card pinned at the foot of the screen, over the grid,
 * where the thumb is (Cody: "Too much scrolling, maybe. Shrink the icons of
 * items and have rows, sort features").
 *
 * Built once. Counts move in place every frame. A kind of thing that arrives
 * (a first log, a drop from a kill) gets its cell where the sort puts it, and
 * one that runs out loses it, without a rebuild; whatever the thumb was
 * looking at is held still on the screen while the cells round it move.
 * Opening a card scrolls nothing, unless the card would cover the cell it is
 * about, and then only far enough to show it. The order is worked out again
 * only when what is held changes kind or the player sorts, so a count or a
 * stack's value climbing never shuffles the cells under a thumb.
 */
export function bankView(
  state: GameState,
  content: Content,
  openItem: string | null,
  actions: BankActions,
  arranged: BankView = { sort: 'type', filter: 'all', search: '' },
): View {
  const updates: ((state: GameState) => void)[] = [];
  let view = { ...arranged };
  let open = openItem && content.items[openItem] ? openItem : null;
  let latest = state;

  const purse = h('span', { class: 'qty' });
  updates.push((now) => setText(purse, formatNumber(now.coins)));
  const head = h('div', { class: 'bank-head' }, [
    h('section', { class: 'panel purse bank-purse' }, [
      h('span', { class: 'muted', text: 'Coins' }),
      purse,
    ]),
    content.store &&
      h(
        'button',
        {
          class: 'panel card store-door',
          attrs: { type: 'button', 'data-store-door': '' },
          on: { click: actions.store },
        },
        [
          h('span', { class: 'door-name', text: 'General store' }),
          h('span', { class: 'hint', text: '›' }),
        ],
      ),
  ]);

  const sort = h(
    'select',
    {
      class: 'field bank-sort',
      attrs: { 'aria-label': 'Sort the bank', 'data-bank-sort': '' },
      on: {
        change: () => arrange({ ...view, sort: sort.value as BankView['sort'] }),
      },
    },
    BANK_SORTS.map(({ id, label }) => h('option', { text: label, attrs: { value: id } })),
  );
  sort.value = view.sort;
  const search = h('input', {
    class: 'field bank-search',
    attrs: {
      type: 'search',
      placeholder: 'Find…',
      'aria-label': 'Find in the bank',
      autocomplete: 'off',
      spellcheck: 'false',
      enterkeyhint: 'search',
      'data-bank-search': '',
    },
    on: { input: () => arrange({ ...view, search: search.value }) },
  });
  search.value = view.search;
  const chips = (['all', ...CATEGORIES.map((entry) => entry.id)] as const).map((id) =>
    h('button', {
      class: 'chip',
      text: id === 'all' ? 'All' : CATEGORIES.find((entry) => entry.id === id)!.label,
      attrs: { type: 'button', 'data-filter': id, 'aria-pressed': String(view.filter === id) },
      on: { click: () => arrange({ ...view, filter: view.filter === id ? 'all' : id }) },
    }),
  );
  const tools = h('div', { class: 'bank-tools' }, [
    h('div', { class: 'bank-tools-row' }, [search, sort]),
    h('div', { class: 'chips', attrs: { role: 'group', 'aria-label': 'Show only' } }, chips),
  ]);

  const grid = h('div', { class: 'bank-grid', attrs: { 'data-bank-list': '' } });
  const empty = h('section', { class: 'panel empty' }, [
    h('p', { class: 'muted', text: 'Your bank is empty. Go and gather something.' }),
  ]);
  const none = h('p', { class: 'muted small none-match', text: 'Nothing here matches.' });
  const sheet = h('div', { class: 'bank-sheet', attrs: { 'data-bank-sheet': '' } });
  let cardUpdate: ((state: GameState) => void) | null = null;

  const screenOf = (): HTMLElement | null => grid.closest<HTMLElement>('#screen');

  /**
   * Runs `change` (cells moving, a card opening) and then scrolls by however
   * far it moved `anchor`, so the thing looked at stays where it was.
   */
  const holding = (anchor: HTMLElement | undefined, change: () => void): void => {
    const top = anchor?.isConnected ? anchor.getBoundingClientRect().top : undefined;
    change();
    const screen = screenOf();
    if (!screen || top === undefined || !anchor?.isConnected) return;
    const moved = anchor.getBoundingClientRect().top - top;
    if (moved !== 0) screen.scrollTop += moved;
  };

  /** The first cell whose top is on screen: what the eye is on when nothing is open. */
  const firstSeen = (): HTMLElement | undefined => {
    const screen = screenOf();
    if (!screen) return undefined;
    const from = screen.getBoundingClientRect().top;
    return [...grid.querySelectorAll<HTMLElement>('[data-item]')].find(
      (cell) => cell.getBoundingClientRect().top >= from,
    );
  };

  const cells = keyedList<GameState>(grid, (key, now) => {
    if (key.startsWith(HEADING)) {
      const id = key.slice(HEADING.length) as Category;
      return {
        el: h('h2', {
          class: 'group-heading grid-heading',
          text: CATEGORIES.find((entry) => entry.id === id)!.label,
          attrs: { 'data-heading': id },
        }),
      };
    }
    const item = content.items[key]!;
    const qty = h('span', { class: 'qty cell-qty' });
    const el = h(
      'button',
      {
        class: 'bank-cell',
        attrs: { type: 'button', 'data-item': item.id, 'aria-pressed': String(item.id === open) },
        on: { click: () => show(open === item.id ? null : item.id) },
      },
      [gridIcon(item.id, item.name), spoken(item.name), qty],
    );
    let shown = -1;
    const update = (next: GameState): void => {
      const count = bankCount(next, item.id);
      if (count === shown) return;
      shown = count;
      setText(qty, shortCount(count));
      el.classList.toggle('gone', count === 0);
    };
    update(now);
    return { el, update };
  });

  /** The item ids in the order shown, worked out again only when it must be. */
  let order: string[] = [];
  let heldSign: string | null = null;
  /** Keys for the grid: the order, with a heading before each kind when sorted by type. */
  const keysOf = (): string[] => {
    if (view.sort !== 'type' || view.filter !== 'all') return order;
    const keys: string[] = [];
    let last: Category | null = null;
    for (const id of order) {
      const kind = categoryOf(content.items[id]!, content);
      if (kind !== last) keys.push(HEADING + kind);
      last = kind;
      keys.push(id);
    }
    return keys;
  };
  /** What is held, as one string: when it changes, a kind arrived or ran out. */
  const signOf = (now: GameState): string =>
    Object.keys(content.items)
      .filter((id) => bankCount(now, id) > 0)
      .join(' ');

  const place = (now: GameState, force: boolean): void => {
    const sign = signOf(now);
    if (force || sign !== heldSign) {
      heldSign = sign;
      const next = bankOrder(now, content, view, open);
      const changed = next.length !== order.length || next.some((id, at) => id !== order[at]);
      order = next;
      if (changed) {
        const anchor = (open ? cells.get(open) : undefined) ?? firstSeen();
        holding(anchor, () => cells.sync(keysOf(), now));
      }
    }
    cells.sync(keysOf(), now);
    const anything = sign !== '' || open !== null;
    empty.hidden = anything;
    tools.hidden = !anything;
    none.hidden = !anything || order.length > 0;
  };

  /** Open a card (or close it, with null), keeping the cell it is about in sight. */
  const show = (itemId: string | null): void => {
    const was = open;
    open = itemId;
    actions.open(itemId);
    if (was) cells.get(was)?.setAttribute('aria-pressed', 'false');
    const cell = itemId ? cells.get(itemId) : was ? cells.get(was) : undefined;
    holding(cell, () => {
      // A stack that ran out while its card was open has no cell to go back to.
      if (was && bankCount(latest, was) === 0) place(latest, true);
      if (!itemId) {
        sheet.replaceChildren();
        sheet.hidden = true;
        cardUpdate = null;
        return;
      }
      cells.get(itemId)?.setAttribute('aria-pressed', 'true');
      const own: ((state: GameState) => void)[] = [];
      sheet.replaceChildren(itemCard(latest, content.items[itemId]!, content, shown, own));
      sheet.hidden = false;
      cardUpdate = (next) => own.forEach((apply) => apply(next));
      cardUpdate(latest);
    });
    // The card stands over the foot of the screen: lift the cell clear of it if it is under it.
    const screen = screenOf();
    const target = itemId ? cells.get(itemId) : undefined;
    if (screen && target && !sheet.hidden) {
      const card = sheet.getBoundingClientRect();
      const under = target.getBoundingClientRect().bottom + CLEAR - card.top;
      // A card with no height has not been laid out (no screen to measure): leave the scroll be.
      if (card.height > 0 && under > 0) screen.scrollTop += under;
    }
  };
  const shown: BankActions = { ...actions, open: show };

  const arrange = (next: BankView): void => {
    view = next;
    actions.arrange(next);
    chips.forEach((chip) =>
      chip.setAttribute('aria-pressed', String(chip.dataset.filter === next.filter)),
    );
    place(latest, true);
  };

  const update = (now: GameState): void => {
    latest = now;
    updates.forEach((apply) => apply(now));
    place(now, false);
    cardUpdate?.(now);
  };
  sheet.hidden = true;
  place(state, true);
  if (open) show(open);
  update(state);
  return {
    el: h('div', { class: 'stack bank' }, [head, tools, grid, none, empty, sheet]),
    update,
  };
}
