import { characterCanvas, type Look as DrawnLook } from '../art/character';
import { itemIcon } from '../art/icons';
import { SLOTS, type Content, type Slot } from '../core/content';
import { equipmentTotals, wearablesFor, wornItemIds } from '../core/equipment';
import { bankCount, type GameState } from '../core/state';
import { button, h, titled } from './dom';
import { formatNumber } from './format';
import { SLOT_NAMES, gearText, statName } from './gear';
import { fullLook, lookPicker } from './look';
import type { View } from './view';

/** What is open under the sheet: one slot's choices, the look, or nothing. */
export type SheetPanel = Slot | 'look' | null;

export interface SheetActions {
  open(panel: SheetPanel): void;
  equip(itemId: string): void;
  unequip(slot: Slot): void;
  /** Keep a new look. The sheet redraws the character itself, so nothing is rebuilt. */
  setLook(look: DrawnLook): void;
}

/** The character drawn large, wearing what is worn. */
function drawn(state: GameState, look = fullLook(state.look)): HTMLCanvasElement {
  return characterCanvas(look, wornItemIds(state), 'sheet');
}

/** The three totals combat will read, named for the style the weapon fights in. */
function totals(state: GameState, content: Content): HTMLElement {
  const { style, attack, strength, armour } = equipmentTotals(state, content);
  const row = (name: string, value: number, stat: string) => [
    h('dt', { text: name }),
    h('dd', { class: 'qty', text: formatNumber(value), attrs: { 'data-total': stat } }),
  ];
  return h('dl', { class: 'totals' }, [
    ...row(statName('attack', style), attack, 'attack'),
    ...row(statName('strength', style), strength, 'strength'),
    ...row('Armour', armour, 'armour'),
  ]);
}

/** One slot's choices: what is in it, to take off, and what the bank holds for it. */
function slotPicker(
  state: GameState,
  slot: Slot,
  content: Content,
  actions: SheetActions,
  updates: ((state: GameState) => void)[],
): HTMLElement {
  const worn = state.equipment[slot];
  const wornDef = worn && content.items[worn.item];
  const held = state.equipment.main_hand;
  const heldDef = held && content.items[held.item];
  const choices = wearablesFor(state, slot, content).map((item) => {
    const count = h('span', { class: 'qty' });
    updates.push((now) => {
      count.textContent = formatNumber(bankCount(now, item.id));
    });
    return h(
      'button',
      {
        class: 'panel card choice-card',
        attrs: { type: 'button', 'data-equip': item.id },
        on: { click: () => actions.equip(item.id) },
      },
      [
        h('div', { class: 'card-head' }, [titled(itemIcon(item.id), item.name), count]),
        h('p', {
          class: 'small muted',
          text: `${gearText(item.equip!)}${item.equip!.twoHanded ? ' · both hands' : ''}`,
        }),
      ],
    );
  });
  return h('section', { class: 'panel stack slot-picker', attrs: { 'data-picker': slot } }, [
    h('h2', { text: SLOT_NAMES[slot] }),
    worn &&
      h('div', { class: 'stack tight worn' }, [
        h('p', {}, [
          `Wearing ${wornDef?.name ?? worn.item}`,
          worn.qty > 1 ? ` × ${formatNumber(worn.qty)}` : '',
        ]),
        wornDef?.equip && h('p', { class: 'small muted', text: gearText(wornDef.equip) }),
        button('Take off', () => actions.unequip(slot)),
      ]),
    slot === 'off_hand' &&
      heldDef?.equip?.twoHanded &&
      h('p', {
        class: 'small muted',
        text: `Your ${heldDef.name} needs both hands. Taking something up here puts it away.`,
      }),
    ...choices,
    choices.length === 0 &&
      h('p', { class: 'muted small', text: 'Nothing in the bank goes here yet.' }),
    button('Close', () => actions.open(null)),
  ]);
}

/**
 * The Character tab: the character drawn large in what they wear, the three
 * totals, the eight slots (tap one to choose from the bank or take it off),
 * and a way to change the look.
 */
export function characterView(
  state: GameState,
  content: Content,
  panel: SheetPanel,
  actions: SheetActions,
): View {
  const updates: ((state: GameState) => void)[] = [];
  const figure = h('div', { class: 'figure' }, [drawn(state)]);

  const lookOpen = panel === 'look';
  const head = h('section', { class: 'panel stack sheet' }, [
    h('h2', { text: state.name }),
    h('div', { class: 'sheet-body' }, [figure, totals(state, content)]),
    lookOpen
      ? h('div', { class: 'stack tight' }, [
          lookPicker(fullLook(state.look), (look) => {
            actions.setLook(look);
            figure.replaceChildren(drawn(state, look));
          }),
          button('Done', () => actions.open(null), 'primary'),
        ])
      : button('Change look', () => actions.open('look')),
  ]);

  const tiles: HTMLElement[] = [];
  SLOTS.forEach((slot, index) => {
    const worn = state.equipment[slot];
    const name = worn ? (content.items[worn.item]?.name ?? worn.item) : 'Nothing';
    const open = panel === slot;
    tiles.push(
      h(
        'button',
        {
          class: `slot${worn ? '' : ' empty'}`,
          attrs: { type: 'button', 'data-slot': slot, 'aria-expanded': String(open) },
          on: { click: () => actions.open(open ? null : slot) },
        },
        [
          h('span', { class: 'slot-name small muted', text: SLOT_NAMES[slot] }),
          h('span', { class: 'slot-item' }, [
            worn ? itemIcon(worn.item) : null,
            h('span', { text: name }),
            worn && worn.qty > 1 ? h('span', { class: 'qty', text: formatNumber(worn.qty) }) : null,
          ]),
        ],
      ),
    );
    // Two slots to a row: an open slot's choices go in under its row, full width.
    const rowOf = (at: number) => Math.floor(at / 2);
    const openIndex = panel && panel !== 'look' ? SLOTS.indexOf(panel) : -1;
    const lastInRow = index % 2 === 1 || index === SLOTS.length - 1;
    if (openIndex >= 0 && lastInRow && rowOf(openIndex) === rowOf(index)) {
      tiles.push(slotPicker(state, panel as Slot, content, actions, updates));
    }
  });

  const update = (now: GameState): void => updates.forEach((apply) => apply(now));
  update(state);
  return {
    el: h('div', { class: 'stack' }, [
      head,
      h('h2', { class: 'group-heading', text: 'Worn' }),
      h('div', { class: 'slots' }, tiles),
    ]),
    update,
  };
}
