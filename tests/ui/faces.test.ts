import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp, type App } from '../../src/ui/app';

// Faces in the menus, driven the way a thumb would. Lane B redraws the faces
// behind the same doors, so nothing here looks at a face's pixels: the doors
// are wrapped to write on each element whose face it is.
vi.mock('../../src/art/portraits2', async (original) => {
  const real = await original<typeof import('../../src/art/portraits2')>();
  return {
    ...real,
    portrait2: (id: string) => {
      const el = real.portrait2(id);
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
    // Not in town, where the hero walks on screen beneath it.
    tab('town');
    expect(root.querySelector('.topbar .who-face')).toBeNull();
  });

  it('crop the header’s face only outside the hero’s safe box', () => {
    // The header's frame is 48 CSS pixels with a 2-pixel border, the face set
    // to its top: on a 3x phone (the largest the smallest face is drawn) it
    // loses 2 CSS pixels each side and 4 at the foot.
    const cssPerArt = portraitScales2(3).mini / 3;
    const shown = PORTRAIT2_SIZE * cssPerArt;
    expect(shown).toBe(48);
    const inside = 48 - 2 * 2;
    const side = (shown - inside) / 2 / cssPerArt;
    const foot = (shown - inside) / cssPerArt;
    const safe = HERO_PORTRAIT2_SAFE;
    expect(safe.x).toBeGreaterThanOrEqual(side);
    expect(PORTRAIT2_SIZE - (safe.x + safe.w)).toBeGreaterThanOrEqual(side);
    expect(PORTRAIT2_SIZE - (safe.y + safe.h)).toBeGreaterThanOrEqual(foot);
  });

  it('show a thieving mark’s face only once art has drawn one', () => {
    playing({ skills: { thieving: 1 } });
    q<HTMLButtonElement>('[data-skill="thieving"]').click();
    const marks = [...root.querySelectorAll<HTMLElement>('.mark')];
    expect(marks.length).toBeGreaterThan(0);
    for (const mark of marks) {
      const drawn = mark.querySelector<HTMLElement>('.portrait2-art');
      // None is drawn today; a mark's card stands whole without one, and no blank frame.
      if (drawn) expect(drawn.dataset.door).toBe(mark.dataset.action);
      expect(mark.querySelector('.portrait.blank')).toBeNull();
    }
  });
});
