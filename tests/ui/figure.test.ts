import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FIGURE2_H, FIGURE2_W, IDLE2_FRAME_MS, LOOK_CHOICES2 } from '../../src/art/character2';
import { itemIconPicture } from '../../src/art/icons';
import { newGame } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp, scrollToChoose, scrollToShow, type App } from '../../src/ui/app';
import { sheetScale } from '../../src/ui/characterScreen';
import { creatorScale } from '../../src/ui/createScreen';
import { ICON_ART, breathAt, deviceScale, dollSlotSize } from '../../src/ui/figure';

// The character drawn large in the menus: lane B's C-scale figure, breathing,
// at a whole number of device pixels to an art pixel, in the creator and on
// the sheet, driven the way a thumb would. jsdom draws no pixels and lays
// nothing out, so what the figure shows is read from what the canvas says of
// itself, its size from the canvas, and where things sit on a phone from the
// order they are built in and from rectangles given to it. That the pixels
// are crisp, and how it all looks at 360 and 390 wide, is checked by
// screenshot (docs/status/lane-a.md, waves 11 and 12).

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

/** The figure at `scale` CSS pixels to an art pixel (jsdom's device pixel ratio is 1). */
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
  // On a breath's first frame, so the next tick shows the first breath.
  clock = IDLE2_FRAME_MS * 10;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the figure’s scale', () => {
  it('is a whole number of device pixels to an art pixel on every phone checked', () => {
    // 3 CSS pixels: 9 device pixels at 3x, 6 at 2x, 8 at 2.625x (3.05 CSS pixels).
    expect(deviceScale(3, 3)).toBe(9);
    expect(deviceScale(3, 2)).toBe(6);
    expect(deviceScale(3, 2.625)).toBe(8);
    expect(deviceScale(4, 2.625)).toBe(11);
  });

  it('draws the canvas at that many device pixels and sizes it to land on them', () => {
    vi.stubGlobal('devicePixelRatio', 2.625);
    try {
      mount();
      const canvas = figure();
      expect([canvas.width, canvas.height]).toEqual([FIGURE2_W * 8, FIGURE2_H * 8]);
      expect(canvas.style.width).toBe(`${(FIGURE2_W * 8) / 2.625}px`);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fills the creator: four to one on a tall phone, three on a 360 x 740 one', () => {
    expect(creatorScale(844, 390)).toBe(4);
    expect(creatorScale(915, 412)).toBe(4);
    expect(creatorScale(932, 430)).toBe(4);
    expect(creatorScale(740, 360)).toBe(3);
    expect(creatorScale(568, 320)).toBe(2);
  });

  it('fills the sheet between the doll’s squares: three to one from 356 wide, two below', () => {
    expect(sheetScale(390)).toBe(3);
    expect(sheetScale(360)).toBe(3);
    expect(sheetScale(356)).toBe(3);
    expect(sheetScale(355)).toBe(2);
    expect(sheetScale(320)).toBe(2);
    // No bigger on a wide screen: the app is never wider than 480.
    expect(sheetScale(1024)).toBe(3);
    // On the phones checked, beside squares at the same grain.
    expect(sheetScale(360, 2)).toBe(3);
    expect(sheetScale(360, 3)).toBe(3);
    expect(sheetScale(412, 2.625)).toBe(3);
    // At 2.625x three is 3.05 CSS pixels and the squares 77.1: 361 wide is the least.
    expect(sheetScale(361, 2.625)).toBe(3);
    expect(sheetScale(360, 2.625)).toBe(2);
  });

  it('breathes in and out every IDLE2_FRAME_MS', () => {
    expect(breathAt(0)).toBe(0);
    expect(breathAt(IDLE2_FRAME_MS - 1)).toBe(0);
    expect(breathAt(IDLE2_FRAME_MS)).toBe(1);
    expect(breathAt(IDLE2_FRAME_MS * 2)).toBe(0);
  });
});

describe('the character creator', () => {
  it('shows the C-scale figure large, wearing nothing, as the middle of the form', () => {
    mount();
    expect(FIGURE2_W).toBe(56);
    expect(FIGURE2_H).toBe(72);
    // jsdom's window is 1024 x 768: three to one.
    expectScale(figure(), 3);
    expect(figure().dataset.worn).toBe('');
  });

  it('redraws the figure on the same canvas in each new choice as it is stepped through', () => {
    mount();
    const canvas = figure();
    next('skin');
    const skin = LOOK_CHOICES2.skin[1]!.id;
    expect(figure()).toBe(canvas);
    expect(figure().dataset.look).toBe(
      `${skin} ${LOOK_CHOICES2.hair[0]!.id} ${LOOK_CHOICES2.hairColour[0]!.id}`,
    );
    next('hair');
    next('hairColour');
    expect(figure().dataset.look).toBe(
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

  it('breathes on the app’s clock before there is a character', () => {
    const app = mount();
    const canvas = figure();
    expect(canvas.dataset.breath).toBe('0');
    clock += IDLE2_FRAME_MS;
    app.tick();
    expect(figure()).toBe(canvas);
    expect(canvas.dataset.breath).toBe('1');
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
  const wear = (slot: string, item: string): void => {
    q<HTMLButtonElement>(`[data-slot="${slot}"]`).click();
    q<HTMLButtonElement>(`[data-equip="${item}"]`).click();
  };

  it('shows the C-scale figure large, three pixels an art pixel, in the saved look', () => {
    geared({});
    expectScale(figure(), 3);
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
    wear('main_hand', 'iron_sword');
    expect(figure().dataset.worn).toBe('iron_sword');
    wear('head', 'iron_helmet');
    expect(figure().dataset.worn).toBe('iron_helmet iron_sword');
    expect(q('[data-slot="head"]').dataset.worn).toBe('iron_helmet');
    expectScale(figure(), 3);
    q<HTMLButtonElement>('[data-slot="main_hand"]').click();
    press('Take off');
    expect(figure().dataset.worn).toBe('iron_helmet');
  });

  it('redraws only the figure, on its own canvas, for a new look', () => {
    geared({});
    press('Change look');
    const doll = q('.doll');
    const slotsBefore = [...root.querySelectorAll('[data-slot]')];
    const canvas = figure();
    next('hair');
    expect(figure()).toBe(canvas);
    expect(figure().dataset.look?.split(' ')[1]).toBe(LOOK_CHOICES2.hair[1]!.id);
    // The sheet around it stays as it was: the slots under the thumb are the same ones.
    expect(q('.doll')).toBe(doll);
    expect([...root.querySelectorAll('[data-slot]')]).toEqual(slotsBefore);
  });

  it('breathes in place on the app’s tick, drawing only when the breath changes', () => {
    const app = geared({});
    const sheet = q('.sheet');
    const canvas = figure();
    const draws = (): number => Number(canvas.dataset.draws);
    const before = draws();
    // Frames within the same breath draw nothing.
    for (let i = 0; i < 5; i++) {
      clock += 16;
      app.tick();
    }
    expect(canvas.dataset.breath).toBe('0');
    expect(draws()).toBe(before);
    // The breath in: the same canvas, drawn once.
    clock += IDLE2_FRAME_MS;
    app.tick();
    expect(canvas.dataset.breath).toBe('1');
    expect(draws()).toBe(before + 1);
    clock += 16;
    app.tick();
    expect(draws()).toBe(before + 1);
    // And out again. Nothing around it was rebuilt.
    clock += IDLE2_FRAME_MS;
    app.tick();
    expect(canvas.dataset.breath).toBe('0');
    expect(draws()).toBe(before + 2);
    expect(figure()).toBe(canvas);
    expect(q('.sheet')).toBe(sheet);
    expect(root.querySelectorAll('[data-figure] canvas')).toHaveLength(1);
  });

  it('shows what each square holds by its icon, and the arrows left', () => {
    geared({ oak_shortbow: 1, bronze_arrows: 120 });
    wear('main_hand', 'oak_shortbow');
    wear('ammo', 'bronze_arrows');
    expect(q('[data-slot="main_hand"] canvas.icon')).toBeDefined();
    expect(q('[data-slot="ammo"] .slot-qty').textContent).toBe('120');
    expect(q('[data-slot="ammo"]').getAttribute('aria-label')).toBe('Ammunition: Bronze arrows');
    expect(q('[data-slot="wrist"]').textContent).toBe('Wrist');
  });

  it('fills a square with what is worn at the hero’s grain, three CSS pixels an art pixel', () => {
    // At 3x the doll shows the 24-pixel icon at 9 device pixels an art pixel (72 CSS, the
    // square's inside, as the hero beside it); the bank's choices under the doll stay at 32.
    vi.stubGlobal('devicePixelRatio', 3);
    try {
      geared({ iron_sword: 1, iron_helmet: 1 });
      wear('main_hand', 'iron_sword');
      const sword = q<HTMLCanvasElement>('[data-slot="main_hand"] canvas.doll-icon');
      expect([sword.width, sword.height]).toEqual([216, 216]);
      expect([sword.style.width, sword.style.height]).toEqual(['72px', '72px']);
      expect(sword.dataset.per).toBe(String(deviceScale(3, 3)));
      // The square is the icon and its 2-pixel border, so the icon fills it, centred.
      expect(q('.doll').style.getPropertyValue('--slot')).toBe('76px');
      expect(dollSlotSize(3)).toBe(76);
      q<HTMLButtonElement>('[data-slot="head"]').click();
      const choice = q<HTMLCanvasElement>('[data-equip="iron_helmet"] canvas.icon');
      expect(choice.style.width).toBe('32px');
      expect(choice.classList).not.toContain('doll-icon');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps the doll’s icons whole and centred at 2x and at 2.625x', () => {
    // Device pixels an art pixel: 6 at 2x (72 CSS), 8 at 2.625x (73.14 CSS). The canvas
    // holds the picture alone (art pads its own at the right and foot there), and the
    // square is sized to it, so it sits in the middle.
    for (const [dpr, per] of [
      [2, 6],
      [2.625, 8],
    ] as const) {
      vi.stubGlobal('devicePixelRatio', dpr);
      try {
        geared({ iron_sword: 1 });
        wear('main_hand', 'iron_sword');
        const sword = q<HTMLCanvasElement>('[data-slot="main_hand"] canvas.doll-icon');
        expect([sword.width, sword.height]).toEqual([ICON_ART * per, ICON_ART * per]);
        expect(parseFloat(sword.style.width) * dpr).toBeCloseTo(ICON_ART * per, 9);
        expect(dollSlotSize(dpr)).toBeCloseTo((ICON_ART * per) / dpr + 4, 9);
      } finally {
        vi.unstubAllGlobals();
      }
    }
  });

  it('sizes the squares from art’s own icons', () => {
    for (const id of ['iron_sword', 'iron_helmet', 'shell_necklace', 'bronze_arrows']) {
      const pic = itemIconPicture(id)!;
      expect([pic.grid.w, pic.grid.h], id).toEqual([ICON_ART, ICON_ART]);
    }
  });

  it('names what is worn under the doll, in its order, without a slot being opened', () => {
    geared({ oak_shortbow: 1, bronze_arrows: 120, linen_hood: 1 });
    wear('main_hand', 'oak_shortbow');
    wear('ammo', 'bronze_arrows');
    wear('head', 'linen_hood');
    expect(root.querySelector('[data-picker]')).toBeNull();
    // Row by row, the body's slot then what is held beside it, so a name that wraps keeps
    // its neighbour level with it.
    const lines = [...q('.worn-lists').querySelectorAll('li')].map((li) => li.textContent);
    expect(lines).toEqual([
      'Linen hood',
      'Oak shortbow',
      'Neck: nothing',
      'Off hand: nothing',
      'Body: nothing',
      'Wrist: nothing',
      'Legs: nothing',
      'Bronze arrows',
    ]);
    // Straight under the doll, and dimmed where empty; the squares already say it all to a screen reader.
    expect(q('.doll').nextElementSibling!.matches('.worn-lists')).toBe(true);
    expect(q('[data-worn-slot="neck"]').classList).toContain('empty');
    expect(q('.worn-lists').getAttribute('aria-hidden')).toBe('true');
  });

  it('opens a slot’s choices straight under the doll, in place of the names', () => {
    geared({ iron_helmet: 1 });
    q<HTMLButtonElement>('[data-slot="head"]').click();
    expect(q('.doll').nextElementSibling!.matches('[data-picker="head"]')).toBe(true);
    expect(root.querySelector('.worn-lists')).toBeNull();
    q<HTMLButtonElement>('[data-slot="head"]').click();
    expect(root.querySelector('[data-picker]')).toBeNull();
    expect(q('.doll').nextElementSibling!.matches('.worn-lists')).toBe(true);
  });

  it('brings an opened slot’s choices into view on a 360 x 740 phone, under the doll', () => {
    geared({ iron_helmet: 1, bronze_helmet: 1, leather_cap: 1 });
    // The screen between the bars on a 360 x 740 phone, scrolled down a little by the
    // player; the choices open under the doll and run past the screen's foot.
    const screen = (): HTMLElement => q('#screen');
    screen().scrollTop = 40;
    const rects: Record<string, Partial<DOMRect>> = {
      screen: { top: 74, bottom: 678 },
      doll: { top: 90, bottom: 420 },
      picker: { top: 430, bottom: 1100 },
    };
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const r =
        this.id === 'screen'
          ? rects.screen
          : this.matches('[data-picker]')
            ? rects.picker
            : this.matches('.doll')
              ? rects.doll
              : {};
      return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, ...r } as DOMRect;
    });
    q<HTMLButtonElement>('[data-slot="head"]').click();
    // Kept where the player had it, then moved only until the doll reaches the screen's top,
    // where it stays while the choices scroll beneath it.
    expect(screen().scrollTop).toBe(40 + (90 - 74));
    expect(q('.sheet').classList).toContain('choosing');
    // Already at the top (stuck there): left alone.
    rects.doll = { top: 74, bottom: 404 };
    screen().scrollTop = 300;
    q<HTMLButtonElement>('[data-slot="neck"]').click();
    expect(screen().scrollTop).toBe(300);
  });

  it('does not keep the doll at the top while the look is changed or nothing is open', () => {
    geared({});
    expect(q('.sheet').classList).not.toContain('choosing');
    press('Change look');
    expect(q('.sheet').classList).not.toContain('choosing');
  });

  it('scrolls for choices under the doll no further than the doll reaching the top', () => {
    const r = (top: number, bottom: number) => ({ top, bottom }) as DOMRect;
    // The choices fit below the doll once scrolled a little: just that.
    expect(scrollToChoose(r(74, 678), r(100, 420), r(430, 690))).toBe(690 + 8 - 678);
    // They do not: the doll to the top, no further.
    expect(scrollToChoose(r(74, 678), r(100, 420), r(430, 1500))).toBe(100 - 74);
    // In view already, or the doll already at the top: nothing.
    expect(scrollToChoose(r(74, 678), r(100, 420), r(430, 600))).toBe(0);
    expect(scrollToChoose(r(74, 678), r(74, 404), r(414, 1500))).toBe(0);
  });

  it('scrolls no further than it must, and never up', () => {
    const r = (top: number, bottom: number) => ({ top, bottom }) as DOMRect;
    // Already in view: stays.
    expect(scrollToShow(r(62, 678), r(300, 600))).toBe(0);
    // Its foot below: just enough to show it whole.
    expect(scrollToShow(r(62, 678), r(400, 700))).toBe(700 + 8 - 678);
    // Taller than the screen: its top to the top, no more.
    expect(scrollToShow(r(62, 678), r(470, 1500))).toBe(470 - 8 - 62);
    // Above: left alone.
    expect(scrollToShow(r(62, 678), r(-200, 20))).toBe(0);
  });
});
