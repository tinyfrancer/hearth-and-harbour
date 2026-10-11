import type { Content, ItemDef, PotionDef } from '../core/content';
import { bankCount, skillLevel, type GameState } from '../core/state';
import { itemIcon } from '../art/icons';
import { button, h, setText, titled } from './dom';
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

/** The item card: what a thing is, where it comes from, what it is for, and selling it. */
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
    item.potion && drinkButton(item, content, actions, () => latest),
    item.equip && button(`Equip ${item.name}`, () => actions.equip(item.id), 'primary'),
    Boolean(item.heals) && button('Put in the food slot', () => actions.feed(item.id), 'primary'),
    h('div', { class: 'row' }, choices),
    sellButton,
    button('Close', () => actions.open(null)),
  ]);
}

/**
 * The Bank tab: coins, every stack held, and a card for the one that is open.
 *
 * Built once. A stack that arrives (a first log, a drop from a kill) gets its
 * row where the table puts it, and one that runs out loses its row, in place;
 * opening a card swaps it for its row where it stands, and closing it swaps
 * it back. Nothing else on the page is rebuilt, so the page never jumps back
 * to the top (Cody: "selecting an item ... always scrolls you back to the top").
 */
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
  const store =
    content.store &&
    h(
      'button',
      {
        class: 'panel card',
        attrs: { type: 'button', 'data-store-door': '' },
        on: { click: actions.store },
      },
      [
        h('div', { class: 'card-head' }, [
          h('h2', { text: 'The general store' }),
          h('span', { class: 'hint', text: '›' }),
        ]),
        h('p', {
          class: 'small muted',
          text: 'Sells what a beginner needs, and a few things worth saving for.',
        }),
      ],
    );

  let open = openItem;
  let latest = state;
  const list = h('div', { class: 'stack', attrs: { 'data-bank-list': '' } });
  const empty = h('section', { class: 'panel empty' }, [
    h('p', { class: 'muted', text: 'Your bank is empty. Go and gather something.' }),
  ]);

  /**
   * Open a card (or close it, with null) where it stands. The thing tapped
   * keeps its place on the screen: a card closing above it would otherwise
   * pull it up by the card's height.
   */
  const show = (itemId: string | null): void => {
    const was = open;
    const anchor = itemId ?? was;
    const top = anchor ? rows.get(anchor)?.getBoundingClientRect().top : undefined;
    open = itemId;
    actions.open(itemId);
    if (was) rows.rebuild(was, latest);
    if (itemId) rows.rebuild(itemId, latest);
    // A stack that ran out while its card was open has no row to go back to.
    if (was && bankCount(latest, was) === 0) rows.sync(keysOf(latest), latest);
    const screen = list.closest<HTMLElement>('#screen');
    const moved = anchor ? rows.get(anchor)?.getBoundingClientRect().top : undefined;
    if (screen && top !== undefined && moved !== undefined && moved !== top) {
      screen.scrollTop += moved - top;
    }
  };
  const shown: BankActions = { ...actions, open: show };

  const rows = keyedList<GameState>(list, (id, now) => {
    const item = content.items[id]!;
    const own: ((state: GameState) => void)[] = [];
    if (id === open) {
      const el = itemCard(now, item, content, shown, own);
      return { el, update: (next) => own.forEach((apply) => apply(next)) };
    }
    const qty = h('span', { class: 'qty' });
    const el = h(
      'button',
      {
        class: 'panel card stack-row',
        attrs: { type: 'button', 'data-item': item.id },
        on: { click: () => show(item.id) },
      },
      [h('div', { class: 'card-head' }, [titled(itemIcon(item.id), item.name), qty])],
    );
    return { el, update: (next) => setText(qty, formatNumber(bankCount(next, item.id))) };
  });

  // Table order, not arrival order, so a stack never jumps about. The open
  // card stays while it is open, even if the last of its stack goes by itself.
  const keysOf = (now: GameState): string[] =>
    Object.values(content.items)
      .filter((item) => bankCount(now, item.id) > 0 || item.id === open)
      .map((item) => item.id);

  const update = (now: GameState): void => {
    latest = now;
    updates.forEach((apply) => apply(now));
    const keys = keysOf(now);
    rows.sync(keys, now);
    empty.hidden = keys.length > 0;
  };
  update(state);
  return {
    el: h('div', { class: 'stack' }, [head, store, list, empty]),
    update,
  };
}
