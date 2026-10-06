import type { Look as DrawnLook } from '../art/character';
import { FIGURE2_W } from '../art/character2';
import { itemIcon } from '../art/icons';
import { type Content, type Slot } from '../core/content';
import { equipmentTotals, unmetRequirement, wearablesFor, wornItemIds } from '../core/equipment';
import { bankCount, type GameState } from '../core/state';
import { button, h, titled } from './dom';
import { formatNumber } from './format';
import { SLOT_NAMES, gearText, statName } from './gear';
import { recordsEntry } from './logScreen';
import { heroFigure } from './figure';
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
  /** Open the collection log or the achievements. */
  records(page: 'log' | 'achievements'): void;
}

/**
 * What the doll leaves the figure, across, on a screen `width` CSS pixels
 * wide: the screen's and the sheet's padding and borders, the two columns of
 * 56-pixel squares and their gaps, and the frame's own border.
 */
const DOLL_TAKES = 32 + 4 + 20 + 112 + 16 + 4;

/**
 * CSS pixels to an art pixel for the figure on the sheet: three wherever the
 * doll leaves room for him whole (every phone from 356 wide), so he fills his
 * frame from the floor to just under its top; two on anything narrower.
 */
export function sheetScale(width = typeof innerWidth === 'number' ? innerWidth : 390): number {
  const room = Math.min(width, 480) - DOLL_TAKES;
  return Math.max(2, Math.min(3, Math.floor(room / FIGURE2_W)));
}

/** The three totals combat will read, named for the style the weapon fights in. */
function totals(state: GameState, content: Content): HTMLElement {
  const { style, attack, strength, armour } = equipmentTotals(state, content);
  const row = (name: string, value: number, stat: string) =>
    h('div', {}, [
      h('dt', { text: name }),
      h('dd', { class: 'qty', text: formatNumber(value), attrs: { 'data-total': stat } }),
    ]);
  return h('dl', { class: 'totals' }, [
    row(statName('attack', style), attack, 'attack'),
    row(statName('strength', style), strength, 'strength'),
    row('Armour', armour, 'armour'),
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
    const short = unmetRequirement(state, item.id, content);
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
        // Still offered when the level is short, so the player can see what to aim for.
        short && h('p', { class: 'small problem', text: short }),
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

/** The slots down each side of the figure: what is worn on the body on the left, what is held and carried on the right. */
const DOLL: readonly (readonly Slot[])[] = [
  ['head', 'neck', 'body', 'legs'],
  ['main_hand', 'off_hand', 'wrist', 'ammo'],
];

/** What an empty slot says inside its square: its name, short where the full one will not fit. */
const slotWord = (slot: Slot): string => (slot === 'ammo' ? 'Ammo' : SLOT_NAMES[slot]);

/**
 * What is worn, by name, at a glance: two columns under the doll in the
 * doll's own order (the body's slots on the left, what is held and carried
 * on the right), a line each, so nothing needs a tap to be read. An empty
 * slot says which it is, dimmed. Screen readers have all this from the
 * squares already, so it is hidden from them.
 */
function wornList(state: GameState, content: Content): HTMLElement {
  const column = (slots: readonly Slot[]): HTMLElement =>
    h(
      'ul',
      { class: 'worn-list' },
      slots.map((slot) => {
        const worn = state.equipment[slot];
        return h('li', {
          class: worn ? '' : 'empty',
          text: worn ? (content.items[worn.item]?.name ?? worn.item) : `${slotWord(slot)}: nothing`,
          attrs: { 'data-worn-slot': slot },
        });
      }),
    );
  return h('div', { class: 'worn-lists', attrs: { 'aria-hidden': 'true' } }, DOLL.map(column));
}

/**
 * The Character tab: the character drawn large in what they wear, breathing,
 * with the eight slots around them like a paper doll and what is worn named
 * beneath. Tap a slot and its choices open right there, under the doll, in
 * place of the names. Then the three totals and a way to change the look.
 *
 * Built once; each frame only the breath moves, and the figure's canvas is
 * redrawn only when the breath changes.
 */
export function characterView(
  state: GameState,
  content: Content,
  panel: SheetPanel,
  actions: SheetActions,
): View {
  const updates: ((state: GameState, now?: number) => void)[] = [];
  const figure = heroFigure(fullLook(state.look), wornItemIds(state), sheetScale());
  const stage = h('div', { class: 'figure stage', attrs: { 'data-figure': '' } }, [figure.el]);
  updates.push((_, now) => {
    if (now !== undefined) figure.breathe(now);
  });

  const square = (slot: Slot): HTMLElement => {
    const worn = state.equipment[slot];
    const name = worn ? (content.items[worn.item]?.name ?? worn.item) : 'Nothing';
    const open = panel === slot;
    const icon = worn ? itemIcon(worn.item) : null;
    const count = worn && slot === 'ammo' ? h('span', { class: 'slot-qty qty' }) : null;
    if (count) {
      // Arrows go as they are shot, with the sheet open.
      updates.push((now) => {
        const left = now.equipment.ammo?.item === worn!.item ? now.equipment.ammo.qty : 0;
        count.textContent = formatNumber(left);
      });
    }
    return h(
      'button',
      {
        class: `slot${worn ? '' : ' empty'}`,
        attrs: {
          type: 'button',
          'data-slot': slot,
          'data-worn': worn?.item ?? '',
          'aria-expanded': String(open),
          'aria-label': `${SLOT_NAMES[slot]}: ${name}`,
        },
        on: { click: () => actions.open(open ? null : slot) },
      },
      [
        worn
          ? (icon ?? h('span', { class: 'slot-word', text: name }))
          : h('span', { class: 'slot-word', text: slotWord(slot) }),
        count,
      ],
    );
  };

  const lookOpen = panel === 'look';
  // An open slot's choices come straight under the doll, where the thumb that opened it is.
  const picker =
    panel && panel !== 'look' ? slotPicker(state, panel, content, actions, updates) : null;
  const head = h('section', { class: 'panel stack sheet' }, [
    h('h2', { class: 'sheet-name', text: state.name }),
    h('div', { class: 'doll' }, [
      h('div', { class: 'doll-side' }, DOLL[0]!.map(square)),
      stage,
      h('div', { class: 'doll-side' }, DOLL[1]!.map(square)),
    ]),
    picker ?? wornList(state, content),
    totals(state, content),
    lookOpen
      ? h('div', { class: 'stack tight', attrs: { 'data-look-picker': '' } }, [
          lookPicker(fullLook(state.look), (look) => {
            actions.setLook(look);
            // Only the figure changes, on the same canvas: the steppers stay under the thumb.
            figure.dress(look, wornItemIds(state));
          }),
          button('Done', () => actions.open(null), 'primary'),
        ])
      : button('Change look', () => actions.open('look')),
  ]);

  const records = recordsEntry(state, content, actions.records);
  updates.push(records.update!);
  const update = (now: GameState, ms?: number): void => updates.forEach((apply) => apply(now, ms));
  update(state);
  return {
    el: h('div', { class: 'stack' }, [
      head,
      h('h2', { class: 'group-heading', text: 'Records' }),
      records.el,
    ]),
    update,
  };
}
