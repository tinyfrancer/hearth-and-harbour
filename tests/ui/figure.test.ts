import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FIGURE2_H, FIGURE2_W, IDLE2_FRAME_MS, LOOK_CHOICES2 } from '../../src/art/character2';
import { newGame } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp, scrollToShow, type App } from '../../src/ui/app';
import { sheetScale } from '../../src/ui/characterScreen';
import { creatorScale } from '../../src/ui/createScreen';

// The character drawn in the menus: lane B's C-scale figure at a whole number
// of CSS pixels to an art pixel, in the creator and on the sheet, driven the
// way a thumb would. jsdom draws no pixels, so what the figure shows is read
// from the frame's own data, and its size from the canvas.

let root: HTMLElement;
let clock: number;
const q = <T extends HTMLElement>(selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`nothing matches ${selector}`);
  return found;
};
const press = (label: string): void => {
  const found = [...root.querySelectorAll('button')].find((b) => b.textContent === label);
  if (!found) throw new Error(`no button says ${label}`);
  found.click();
};
const frame = (): HTMLElement => q('[data-figure]');
/** The canvas shown: the figure breathes, one canvas a breath. */
const figure = (): HTMLCanvasElement => q('[data-figure] canvas:not([hidden])');
const next = (part: string): void =>
  q<HTMLButtonElement>(`[data-part="${part}"] [aria-label^="Next"]`).click();
const mount = (): App =>
  mountApp(root, { saves: new LocalStorageSaveService(), content: CONTENT, now: () => clock });

/**
 * jsdom has a device pixel ratio of 1 and a window 1024 x 768: the sheet's
 * figure is three CSS pixels to an art pixel, and so is the creator's.
 */
const expectScale = (canvas: HTMLCanvasElement, scale: number): void => {
  expect(canvas.style.width).toBe(`${FIGURE2_W * scale}px`);
  expect(canvas.style.height).toBe(`${FIGURE2_H * scale}px`);
  expect([canvas.width, canvas.height]).toEqual([FIGURE2_W * scale, FIGURE2_H * scale]);
  expect(canvas.classList).toContain('pixel-art');
  expect(canvas.getAttribute('aria-label')).toBe('Your character');
};

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the character creator', () => {
  it('shows the C-scale figure large, at a whole number of pixels, as the middle of the screen', () => {
    mount();
    expect(FIGURE2_W).toBe(56);
    expect(FIGURE2_H).toBe(72);
    expectScale(figure(), 3);
    expect(frame().dataset.worn).toBe('');
    // Four CSS pixels an art pixel on a tall phone, three on a 360 x 740 one and two on a narrow one.
    expect(creatorScale(844, 390)).toBe(4);
    expect(creatorScale(932, 430)).toBe(4);
    expect(creatorScale(740, 360)).toBe(3);
    expect(creatorScale(568, 320)).toBe(2);
  });

  it('redraws the figure in each new choice as it is stepped through, at the same size', () => {
    mount();
    const first = figure();
    next('skin');
    const skin = LOOK_CHOICES2.skin[1]!.id;
    expect(figure()).not.toBe(first);
    expect(frame().dataset.look).toBe(
      `${skin} ${LOOK_CHOICES2.hair[0]!.id} ${LOOK_CHOICES2.hairColour[0]!.id}`,
    );
    next('hair');
    next('hairColour');
    expect(frame().dataset.look).toBe(
      `${skin} ${LOOK_CHOICES2.hair[1]!.id} ${LOOK_CHOICES2.hairColour[1]!.id}`,
    );
    expectScale(figure(), 3);
  });

  it('keeps the choices between the figure and the name, so a step shows at once', () => {
    mount();
    const order = [...q('form').children].map((el) =>
      el.matches('[data-figure]')
        ? 'figure'
        : el.matches('.look-picker')
          ? 'look'
          : el.matches('input')
            ? 'name'
            : null,
    );
    expect(order.filter(Boolean)).toEqual(['figure', 'look', 'name']);
  });
});

describe('the character sheet', () => {
  const geared = (bank: Record<string, number>): App => {
    const ten = xpForLevel(10);
    new LocalStorageSaveService().save({
      ...newGame('Cody', clock, { skin: LOOK_CHOICES2.skin[2]!.id }),
      bank,
      skills: { melee: ten, ranged: ten, defence: ten },
    });
    const app = mount();
    q<HTMLButtonElement>('.tab[data-tab="character"]').click();
    return app;
  };

  it('shows the C-scale figure large, three pixels an art pixel, in the saved look, wearing nothing', () => {
    geared({});
    expectScale(figure(), 3);
    expect(sheetScale(390)).toBe(3);
    expect(sheetScale(360)).toBe(3);
    // Narrower than the doll leaves room for at three: two.
    expect(sheetScale(320)).toBe(2);
    expect(frame().dataset.look?.split(' ')[0]).toBe(LOOK_CHOICES2.skin[2]!.id);
    expect(frame().dataset.worn).toBe('');
  });

  it('puts the eight slots either side of the figure', () => {
    geared({});
    const sides = [...root.querySelectorAll('.doll > *')];
    expect(
      sides.map((el) => (el.matches('[data-figure]') ? 'figure' : el.children.length)),
    ).toEqual([4, 'figure', 4]);
  });

  it('dresses the figure in what is equipped, and undresses it', () => {
    geared({ iron_sword: 1, iron_helmet: 1 });
    q<HTMLButtonElement>('[data-slot="main_hand"]').click();
    q<HTMLButtonElement>('[data-equip="iron_sword"]').click();
    expect(frame().dataset.worn).toBe('iron_sword');
    q<HTMLButtonElement>('[data-slot="head"]').click();
    q<HTMLButtonElement>('[data-equip="iron_helmet"]').click();
    expect(frame().dataset.worn).toBe('iron_helmet iron_sword');
    expect(q('[data-slot="head"]').dataset.worn).toBe('iron_helmet');
    expectScale(figure(), 3);
    q<HTMLButtonElement>('[data-slot="main_hand"]').click();
    press('Take off');
    expect(frame().dataset.worn).toBe('iron_helmet');
  });

  it('redraws only the figure for a new look, and nothing but the breath as time passes', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const app = geared({});
    press('Change look');
    const doll = q('.doll');
    const slotsBefore = [...root.querySelectorAll('[data-slot]')];
    const first = figure();
    next('hair');
    expect(figure()).not.toBe(first);
    expect(frame().dataset.look?.split(' ')[1]).toBe(LOOK_CHOICES2.hair[1]!.id);
    // The sheet around it stays as it was: the slots under the thumb are the same ones.
    expect(q('.doll')).toBe(doll);
    expect([...root.querySelectorAll('[data-slot]')]).toEqual(slotsBefore);
    const drawn = figure();
    clock += 5000;
    app.tick();
    expect(figure()).toBe(drawn);
    // A breath in: the other canvas shows, in place; then the first again. Nothing is rebuilt.
    now = IDLE2_FRAME_MS;
    app.tick();
    const breathIn = figure();
    expect(breathIn).not.toBe(drawn);
    expect(breathIn.dataset.breath).toBe('1');
    expectScale(breathIn, 3);
    expect(q('.doll')).toBe(doll);
    now = IDLE2_FRAME_MS * 2;
    app.tick();
    expect(figure()).toBe(drawn);
    expect(frame().querySelectorAll('canvas')).toHaveLength(2);
  });

  it('shows what each square holds by its icon, and the arrows left', () => {
    geared({ oak_shortbow: 1, bronze_arrows: 120 });
    q<HTMLButtonElement>('[data-slot="main_hand"]').click();
    q<HTMLButtonElement>('[data-equip="oak_shortbow"]').click();
    q<HTMLButtonElement>('[data-slot="ammo"]').click();
    q<HTMLButtonElement>('[data-equip="bronze_arrows"]').click();
    expect(q('[data-slot="main_hand"] canvas.icon')).toBeDefined();
    expect(q('[data-slot="ammo"] .slot-qty').textContent).toBe('120');
    expect(q('[data-slot="ammo"]').getAttribute('aria-label')).toBe('Ammunition: Bronze arrows');
    expect(q('[data-slot="wrist"]').textContent).toBe('Wrist');
  });

  it('names what is worn at a glance, under the doll in its order, without opening a slot', () => {
    geared({ oak_shortbow: 1, bronze_arrows: 120, linen_hood: 1 });
    for (const [slot, item] of [
      ['main_hand', 'oak_shortbow'],
      ['ammo', 'bronze_arrows'],
      ['head', 'linen_hood'],
    ] as const) {
      q<HTMLButtonElement>(`[data-slot="${slot}"]`).click();
      q<HTMLButtonElement>(`[data-equip="${item}"]`).click();
    }
    const lines = (side: number) =>
      [...root.querySelectorAll('.worn-list')[side]!.querySelectorAll('li')].map(
        (li) => li.textContent,
      );
    expect(lines(0)).toEqual(['Linen hood', 'Neck: empty', 'Body: empty', 'Legs: empty']);
    expect(lines(1)).toEqual(['Oak shortbow', 'Off hand: empty', 'Wrist: empty', 'Bronze arrows']);
    // Dimmed where empty; the squares already say it all to a screen reader.
    expect(q('[data-worn-slot="neck"]').classList).toContain('empty');
    expect(q('.worn-lists').getAttribute('aria-hidden')).toBe('true');
    // Every square is still a whole thumb's worth: the names are not squeezed into them.
    for (const square of root.querySelectorAll('[data-slot]'))
      expect(square.querySelector('.worn-list')).toBeNull();
  });

  it('opens a slot’s choices straight under the doll, in place of the names', () => {
    geared({ iron_helmet: 1 });
    q<HTMLButtonElement>('[data-slot="head"]').click();
    const sheet = q('.sheet');
    const order = [...sheet.children].map((el) =>
      el.matches('.doll') ? 'doll' : el.matches('[data-picker]') ? 'choices' : null,
    );
    expect(order.filter(Boolean)).toEqual(['doll', 'choices']);
    expect(root.querySelector('.worn-lists')).toBeNull();
    q<HTMLButtonElement>('[data-slot="head"]').click();
    expect(root.querySelector('[data-picker]')).toBeNull();
    expect(root.querySelector('.worn-lists')).not.toBeNull();
  });

  it('brings an opened slot’s choices into view on a short phone, from where the sheet was', () => {
    geared({ iron_helmet: 1, bronze_helmet: 1, leather_cap: 1 });
    // A 360 x 740 phone: the screen between the bars, scrolled down a little by the player.
    const screen = (): HTMLElement => q('#screen');
    screen().scrollTop = 40;
    const rects: Record<string, Partial<DOMRect>> = {
      screen: { top: 50, bottom: 680 },
      picker: { top: 470, bottom: 1100 },
    };
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const r =
        this.id === 'screen' ? rects.screen : this.matches('[data-picker]') ? rects.picker : {};
      return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, ...r } as DOMRect;
    });
    q<HTMLButtonElement>('[data-slot="head"]').click();
    // Kept where the player had it, then moved just far enough for the choices to start at the top.
    expect(screen().scrollTop).toBe(40 + (470 - 8 - 50));
  });

  it('scrolls no further than it must, and never up', () => {
    const r = (top: number, bottom: number) => ({ top, bottom }) as DOMRect;
    // Already in view: stays.
    expect(scrollToShow(r(50, 680), r(300, 600))).toBe(0);
    // Its foot below: just enough to show it whole.
    expect(scrollToShow(r(50, 680), r(400, 700))).toBe(700 + 8 - 680);
    // Taller than the screen: its top to the top, no more.
    expect(scrollToShow(r(50, 680), r(470, 1500))).toBe(470 - 8 - 50);
    // Above: left alone.
    expect(scrollToShow(r(50, 680), r(-200, 20))).toBe(0);
  });
});
