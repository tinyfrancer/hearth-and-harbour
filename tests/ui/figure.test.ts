import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp, type App } from '../../src/ui/app';

// The real C-scale figure, with what it was asked to draw written on it, since
// jsdom draws no pixels to look at.
vi.mock('../../src/art/character2', async (original) => {
  const real = await original<typeof import('../../src/art/character2')>();
  return {
    ...real,
    characterCanvas2: (
      look: { skin: string; hair: string; hairColour: string },
      worn: readonly string[],
      size?: 'sheet' | 'thumb',
    ) => {
      const canvas = real.characterCanvas2(look, worn, size);
      canvas.dataset.look = `${look.skin} ${look.hair} ${look.hairColour}`;
      canvas.dataset.worn = [...worn].sort().join(' ');
      canvas.dataset.size = size ?? 'sheet';
      return canvas;
    },
  };
});

const { FIGURE2_W, FIGURE2_H, LOOK_CHOICES2 } = await import('../../src/art/character2');

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
const figure = (): HTMLCanvasElement => q('[data-figure] canvas');
const next = (part: string): void =>
  q<HTMLButtonElement>(`[data-part="${part}"] [aria-label^="Next"]`).click();
const mount = (): App =>
  mountApp(root, { saves: new LocalStorageSaveService(), content: CONTENT, now: () => clock });

/**
 * jsdom has a device pixel ratio of 1 and a wide window, so the game's scale
 * is 1 and the sheet's twice that: two CSS pixels, and two device pixels, to
 * an art pixel.
 */
const expectSheetSize = (canvas: HTMLCanvasElement): void => {
  expect(canvas.style.width).toBe(`${FIGURE2_W * 2}px`);
  expect(canvas.style.height).toBe(`${FIGURE2_H * 2}px`);
  expect([canvas.width, canvas.height]).toEqual([FIGURE2_W * 2, FIGURE2_H * 2]);
  expect(canvas.classList).toContain('pixel-art');
  expect(canvas.getAttribute('aria-label')).toBe('Your character');
};

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
});

describe('the character creator', () => {
  it('shows the C-scale figure, 56 by 72 art pixels at the sheet size', () => {
    mount();
    expect(FIGURE2_W).toBe(56);
    expect(FIGURE2_H).toBe(72);
    expectSheetSize(figure());
    expect(figure().dataset.size).toBe('sheet');
    expect(figure().dataset.worn).toBe('');
  });

  it('redraws the figure in each new choice as it is stepped through, at the same size', () => {
    mount();
    const first = figure();
    next('skin');
    const skin = LOOK_CHOICES2.skin[1]!.id;
    expect(figure()).not.toBe(first);
    expect(figure().dataset.look).toBe(
      `${skin} ${LOOK_CHOICES2.hair[0]!.id} ${LOOK_CHOICES2.hairColour[0]!.id}`,
    );
    next('hair');
    next('hairColour');
    expect(figure().dataset.look).toBe(
      `${skin} ${LOOK_CHOICES2.hair[1]!.id} ${LOOK_CHOICES2.hairColour[1]!.id}`,
    );
    expectSheetSize(figure());
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

  it('shows the C-scale figure large, in the saved look, wearing nothing', () => {
    geared({});
    expectSheetSize(figure());
    expect(figure().dataset.look?.split(' ')[0]).toBe(LOOK_CHOICES2.skin[2]!.id);
    expect(figure().dataset.worn).toBe('');
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
    expect(figure().dataset.worn).toBe('iron_sword');
    q<HTMLButtonElement>('[data-slot="head"]').click();
    q<HTMLButtonElement>('[data-equip="iron_helmet"]').click();
    expect(figure().dataset.worn).toBe('iron_helmet iron_sword');
    expect(q('[data-slot="head"]').dataset.worn).toBe('iron_helmet');
    expectSheetSize(figure());
    q<HTMLButtonElement>('[data-slot="main_hand"]').click();
    press('Take off');
    expect(figure().dataset.worn).toBe('iron_helmet');
  });

  it('redraws only the figure for a new look, and nothing at all as time passes', () => {
    const app = geared({});
    press('Change look');
    const doll = q('.doll');
    const slotsBefore = [...root.querySelectorAll('[data-slot]')];
    const first = figure();
    next('hair');
    expect(figure()).not.toBe(first);
    expect(figure().dataset.look?.split(' ')[1]).toBe(LOOK_CHOICES2.hair[1]!.id);
    // The sheet around it stays as it was: the slots under the thumb are the same ones.
    expect(q('.doll')).toBe(doll);
    expect([...root.querySelectorAll('[data-slot]')]).toEqual(slotsBefore);
    const drawn = figure();
    clock += 5000;
    app.tick();
    expect(figure()).toBe(drawn);
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
});
