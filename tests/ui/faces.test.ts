import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp, type App } from '../../src/ui/app';

// Faces in the menus, driven the way a thumb would. Lane B redraws the faces
// behind the same doors, so nothing here looks at a face's pixels: the doors
// are wrapped to write on each element whose face it is.
// A test may also make the door draw a face it does not have yet, or none.
const door = vi.hoisted(() => ({ drawn: new Set<string>(), blank: new Set<string>() }));
vi.mock('../../src/art/portraits2', async (original) => {
  const real = await original<typeof import('../../src/art/portraits2')>();
  return {
    ...real,
    portrait2: (id: string) => {
      if (door.blank.has(id)) return null;
      let el = real.portrait2(id);
      if (!el && door.drawn.has(id)) {
        el = document.createElement('div');
        el.className = 'portrait2-art';
      }
      if (el instanceof HTMLElement) el.dataset.door = id;
      return el;
    },
    heroPortrait2: (look: { hair?: string }, worn: readonly string[]) => {
      const el = real.heroPortrait2(look, worn) as HTMLElement;
      el.dataset.door = 'hero';
      el.dataset.hair = look.hair ?? '';
      el.dataset.worn = [...worn].sort().join(' ');
      return el;
    },
  };
});

const { HERO_PORTRAIT2_SAFE, PORTRAIT2_SIZE, portraitScales2 } =
  await import('../../src/art/portraits2');
const { HEADER_FACE_CSS, HEADER_FACE_MAX, headerFaceSize } = await import('../../src/ui/face');

let root: HTMLElement;
let clock: number;
const saves = () => new LocalStorageSaveService();
const q = <T extends HTMLElement>(selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`nothing matches ${selector}`);
  return found;
};
const tab = (id: string): void => q<HTMLButtonElement>(`.tab[data-tab="${id}"]`).click();

function playing(extra: Partial<GameState> = {}): App {
  saves().save({
    ...newGame('Cody', clock),
    equipment: {
      main_hand: { item: 'bronze_sword', qty: 1 },
      head: { item: 'iron_helmet', qty: 1 },
    },
    ...extra,
  });
  return mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
}

beforeEach(() => {
  door.drawn.clear();
  door.blank.clear();
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
});

describe('faces in the menus', () => {
  it('come from the C-scale door, in frames the sizes the art draws them at', () => {
    playing({ bounty: { monster: 'goblin_poacher', count: 20, done: 3 } });
    q<HTMLButtonElement>('[data-combat]').click();
    // Every monster in the lists, the bounty-only goblin and wyrm included.
    for (const id of Object.keys(CONTENT.monsters!)) {
      const frame = q(`[data-monster="${id}"] .portrait`);
      expect(frame.classList, id).toContain('small');
      expect(frame.querySelector<HTMLElement>('.portrait2-art')!.dataset.door).toBe(id);
    }
    // The bounty held, on the notice board's page.
    q<HTMLButtonElement>('[data-bounties]').click();
    expect(q('[data-bounty="goblin_poacher"] .portrait2-art').dataset.door).toBe('goblin_poacher');
  });

  it('put the foe and the hero face to face on the fight screen', () => {
    playing();
    q<HTMLButtonElement>('[data-combat]').click();
    q<HTMLButtonElement>('[data-monster="dock_rat"]').click();
    expect(q('[data-foe] .portrait.large .portrait2-art').dataset.door).toBe('dock_rat');
    const hero = q('[data-you] .portrait.small.hero-face .portrait2-art');
    expect(hero.dataset.door).toBe('hero');
    // In what is worn: the helmet is on the face too.
    expect(hero.dataset.worn).toBe('bronze_sword iron_helmet');
    // The foe's face first in its panel, the hero's last in theirs.
    expect(q('[data-foe] .foe-head').firstElementChild!.matches('.portrait')).toBe(true);
    expect(q('[data-you] .foe-head').lastElementChild!.matches('.portrait')).toBe(true);
  });

  it('show the store keeper behind the counter', () => {
    playing();
    tab('bank');
    [...root.querySelectorAll('button')].find((b) => /general store/.test(b.textContent!))!.click();
    expect(q('[data-store] .portrait .portrait2-art').dataset.door).toBe('trader');
  });

  it('show the hero beside their name in the header, a tap from the sheet', () => {
    const app = playing();
    const header = (): HTMLElement => q('.topbar .who-face');
    expect(header().querySelector<HTMLElement>('.portrait.mini .portrait2-art')!.dataset.door).toBe(
      'hero',
    );
    expect(header().getAttribute('aria-label')).toBe('Cody: the character sheet');
    // Kept, not drawn again, while nothing about the look changes.
    const face = header().querySelector('.portrait2-art');
    clock += 1000;
    app.tick();
    tab('bank');
    expect(header().querySelector('.portrait2-art')).toBe(face);
    header().click();
    expect(q('#screen').dataset.tab).toBe('character');
    // Taking the helmet off draws the face again without it.
    q<HTMLButtonElement>('[data-slot="head"]').click();
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Take off')!.click();
    expect(header().querySelector<HTMLElement>('.portrait2-art')!.dataset.worn).toBe(
      'bronze_sword',
    );
    // In town too, the same face, though the hero walks on screen beneath it.
    const kept = header().querySelector('.portrait2-art');
    tab('town');
    expect(header().querySelector('.portrait2-art')).toBe(kept);
  });

  it('size the header’s face crisp and whole at 1x, 2x, 2.625x and 3x', () => {
    const safe = HERO_PORTRAIT2_SAFE;
    const seen: string[] = [];
    for (const dpr of [1, 2, 2.625, 3]) {
      const size = headerFaceSize(dpr);
      // A whole number of device pixels per art pixel, never fewer than the art's smallest face.
      expect(Number.isInteger(size.scale), `${dpr}`).toBe(true);
      expect(size.scale).toBeGreaterThanOrEqual(portraitScales2(dpr).mini);
      expect(size.face).toBeCloseTo((PORTRAIT2_SIZE * size.scale) / dpr, 9);
      // At least a thumb's tap across, and no taller than the header allows.
      expect(size.width).toBeGreaterThanOrEqual(HEADER_FACE_CSS - 1e-9);
      expect(size.height).toBeLessThanOrEqual(HEADER_FACE_MAX + 1e-9);
      // Whole, or cropped only outside the safe box.
      const css = size.scale / dpr;
      expect(size.left).toBeLessThanOrEqual(safe.x * css + 1e-9);
      expect(size.top).toBeLessThanOrEqual(safe.y * css + 1e-9);
      expect(size.left + size.width).toBeGreaterThanOrEqual((safe.x + safe.w) * css - 1e-9);
      expect(size.top + size.height).toBeGreaterThanOrEqual((safe.y + safe.h) * css - 1e-9);
      seen.push(`${dpr}: ${size.scale} ${size.width.toFixed(1)}x${size.height.toFixed(1)}`);
    }
    // 2x and 1x would be 36 and 72 whole; they show the safe box at 72 instead.
    expect(seen).toEqual([
      '1: 1 66.0x56.0',
      '2: 2 66.0x56.0',
      '2.625: 2 54.9x54.9',
      '3: 2 48.0x48.0',
    ]);
  });

  it('write the header face’s size on its frame and canvas', () => {
    playing();
    // jsdom's ratio is 1: the face at one device pixel an art pixel, cropped to the safe box.
    const frame = q('.topbar .who-face .portrait.mini');
    expect(frame.dataset.scale).toBe('1');
    expect(frame.style.width).toBe(`${HERO_PORTRAIT2_SAFE.w + 4}px`);
    expect(frame.style.height).toBe(`${HERO_PORTRAIT2_SAFE.y + HERO_PORTRAIT2_SAFE.h + 4}px`);
    const mini = frame.querySelector<HTMLCanvasElement>('canvas.portrait2-mini')!;
    expect(mini.style.width).toBe(`${mini.width}px`);
    expect(mini.style.marginLeft).toBe(`${-HERO_PORTRAIT2_SAFE.x}px`);
  });

  it('show nothing beside a thieving mark while art has no face for it', () => {
    const marks = Object.values(CONTENT.actions).filter((action) => action.steal);
    expect(marks.map((mark) => mark.id)).toEqual([
      'steal_fisherman',
      'steal_fish_stall',
      'steal_sailor',
      'steal_pedlar',
      'steal_strongbox',
    ]);
    for (const mark of marks) door.blank.add(mark.id);
    playing({ skills: { thieving: 400_000 } });
    q<HTMLButtonElement>('[data-skill="thieving"]').click();
    for (const mark of marks) {
      const card = q(`.mark[data-action="${mark.id}"]`);
      // The card stands whole without one: no frame, no blank initial, its name still there.
      expect(card.querySelector('.portrait'), mark.id).toBeNull();
      expect(card.querySelector('h2')!.textContent).toBe(mark.name);
    }
  });

  it('show a thieving mark’s face from the door the moment art draws one', () => {
    const marks = Object.values(CONTENT.actions).filter((action) => action.steal);
    for (const mark of marks) door.drawn.add(mark.id);
    playing({ skills: { thieving: 400_000 } });
    q<HTMLButtonElement>('[data-skill="thieving"]').click();
    for (const mark of marks) {
      const card = q(`.mark[data-action="${mark.id}"]`);
      const frame = card.querySelector<HTMLElement>('.portrait.small');
      expect(frame, mark.id).not.toBeNull();
      expect(frame!.classList).not.toContain('blank');
      expect(frame!.querySelector<HTMLElement>('.portrait2-art')!.dataset.door).toBe(mark.id);
      // Beside who they are, as a foe's face sits beside its name.
      expect(card.querySelector('.foe-head h2')!.textContent).toBe(mark.name);
    }
  });
});
