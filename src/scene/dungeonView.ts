/*
 * A dungeon run on screen: the room on the stage with whatever fights in it,
 * the hero's health and his target's at the top, the ability and food
 * buttons under the left thumb, the prompt to turn the phone on its side, the
 * way out, the dark of going through a door, and the results at the end. The
 * rules are in `dungeon.ts` and `battle.ts`; this only shows them and passes
 * on time, taps and presses. Where the run is lives with the Town tab
 * (`townView.ts`), so a rebuilt tab finds it as it was.
 */
import { DAY } from '../art/palette';
import { pixelCanvas } from '../art/canvas';
import { itemIcon, skillIcon } from '../art/icons';
import { portrait } from '../art/portraits';
import { PLAYER_ATTACK_MS } from '../core/combat';
import type { Content } from '../core/content';
import type { GameState } from '../core/state';
import { button, h } from '../ui/dom';
import type { View } from '../ui/view';
import {
  ABILITIES,
  FOOD_MS,
  abilityProblem,
  alive,
  arrowsLeft,
  bossOf,
  cooldownLeft,
  eat,
  foeAt,
  foodLeft,
  foodProblem,
  held,
  stopChasing,
  targetFoe,
  tideOf,
  useAbility,
  type Battle,
  type Tally,
} from './battle';
import {
  advanceRun,
  doorwayDark,
  groundNow,
  placeOf,
  runTime,
  sideways,
  type Dungeon,
  type Run,
} from './dungeon';
import { fightExtra } from './fightArt';
import { abilityPicture, foeKind } from './foes';
import { canvasOf } from './draw';
import { roomLook } from './grottoArt';
import type { Hero } from './hero';
import type { Play } from './play';
import { dungeonScale } from './scale';
import { stage, type Insets } from './stage';
import { HIGH_WATER, gaugeLevel, rising, type TideNow } from './tide';
import { HERO_FEET } from './townArt';
import { DUSK } from '../art/palette';

/**
 * Room kept at the screen's edges, in CSS pixels: the health bars and the
 * Leave button at the top, the notches at the sides of a phone on its side,
 * and the ability bar at the bottom. The camera keeps the hero clear of all
 * of it.
 */
export const DUNGEON_INSETS: Insets = { top: 64, right: 56, bottom: 80, left: 56 };

export interface DungeonViewOptions {
  readonly dungeon: Dungeon;
  readonly content: Content;
  /** The run as it stands, and a way to keep it when it changes. */
  readonly run: () => Run;
  readonly keep: (run: Run) => void;
  readonly hero: Hero;
  /** The player chose to go back to town: from Leave (once confirmed) or the results. */
  readonly leave: () => void;
  /** The run has just ended by itself: the last room cleared, or the hero down. */
  readonly finished: () => void;
}

/** Whole seconds left on a cooldown, as the button shows it. */
export function secondsLeft(ms: number): string {
  return ms > 0 ? String(Math.ceil(ms / 1000)) : '';
}

/** How full a bar is, in hundredths: a bar moves only when this does. */
const fraction = (part: number, whole: number): number =>
  Math.round((100 * Math.max(0, Math.min(part, whole))) / Math.max(1, whole)) / 100;

/** Sets text only when it changes, so a frame does not touch the page for nothing. */
function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

/**
 * Fills a bar (across) or a shade (upwards) by a transform rather than its
 * size, so a bar moving every frame costs no layout, only the compositor.
 */
function fill(el: HTMLElement, axis: 'X' | 'Y', k: number): void {
  const value = `scale${axis}(${k})`;
  if (el.style.transform !== value) el.style.transform = value;
}

/** A picture for a button, two CSS pixels to the art pixel. */
function buttonPicture(id: string): HTMLCanvasElement | null {
  const pic = abilityPicture(id);
  if (!pic) return null;
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const canvas = pixelCanvas(pic, { palette: DAY, scale: Math.round(2 * dpr), dpr });
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

/** One of the buttons under the thumb: a picture, a name, and a shade that drains as it cools. */
interface FightButton {
  readonly el: HTMLButtonElement;
  readonly shade: HTMLElement;
  readonly count: HTMLElement;
}

function fightButton(
  name: string,
  picture: Element | null,
  extraClass: string,
  act: () => void,
): FightButton {
  const shade = h('span', { class: 'fight-shade', attrs: { 'aria-hidden': 'true' } });
  const count = h('span', { class: 'fight-count' });
  const el = h(
    'button',
    { class: `fight-button ${extraClass}`.trim(), attrs: { type: 'button', 'aria-label': name } },
    [picture, h('span', { class: 'fight-name', text: name }), shade, count],
  );
  // Pressed means used: on the press, not the lift, as a fight needs.
  el.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    act();
  });
  el.addEventListener('click', (event) => {
    // A keyboard's press (no pointer) arrives only as a click.
    if (event.detail === 0) act();
  });
  return { el, shade, count };
}

/** What the tide gauge says the water is doing. */
export function tideWords(tide: TideNow, clock: number): string {
  if (rising(tide, clock)) return 'Rising';
  if (tide.next && tide.next.level < tide.level && tide.next.at - clock <= 3000) return 'Falling';
  if (tide.level === 0) return 'Low tide';
  if (tide.level === HIGH_WATER) return 'High tide';
  return tide.next && tide.next.level > tide.level ? 'Flowing' : 'Ebbing';
}

/** One line of results: an icon if there is one, a name, and an amount. */
function resultLine(icon: Element | null, name: string, amount: string): HTMLElement {
  return h('li', {}, [
    h('span', { class: 'run-icon' }, [icon]),
    h('span', { class: 'run-what', text: name }),
    h('span', { class: 'run-amount', text: amount }),
  ]);
}

export function dungeonView(options: DungeonViewOptions): View {
  const { dungeon, hero, content } = options;
  const room = h('div', { class: 'dungeon-room' });
  const fade = h('div', { class: 'dungeon-fade', attrs: { 'aria-hidden': 'true' } });

  const promptLine = h('p');
  const prompt = h(
    'section',
    { class: 'dungeon-prompt', attrs: { 'aria-label': 'Turn your phone on its side' } },
    [
      h('div', { class: 'dungeon-phone', attrs: { 'aria-hidden': 'true' } }),
      h('h2', { text: 'Turn your phone on its side' }),
      promptLine,
    ],
  );

  const confirm = h('div', { class: 'dungeon-confirm', attrs: { role: 'group' } });
  const leaveButton = h('button', {
    class: 'btn dungeon-leave',
    text: 'Leave',
    attrs: { type: 'button' },
    on: {
      click: () => {
        // Asks once more: a stray thumb should not end a run.
        if (confirm.childElementCount > 0) return;
        leaveButton.hidden = true;
        confirm.replaceChildren(
          h('p', { text: 'Row back to town? You keep what you’ve picked up.' }),
          h('div', { class: 'row' }, [
            button('Row back', () => options.leave(), 'primary'),
            button('Stay', () => {
              confirm.replaceChildren();
              leaveButton.hidden = false;
            }),
          ]),
        );
      },
    },
  });
  const way = h('div', { class: 'dungeon-way' }, [leaveButton, confirm]);

  /* ----- Health at the top: the hero's on the left, his target's in the middle ----- */

  const heroFill = h('span', { class: 'fight-fill' });
  const heroNumbers = h('span', { class: 'fight-numbers' });
  const heroSwing = h('span', { class: 'fight-swing-fill' });
  const heroPanel = h('div', { class: 'fight-hero', attrs: { 'aria-label': 'Your health' } }, [
    h('span', { class: 'fight-heart', attrs: { 'aria-hidden': 'true' } }),
    h('span', { class: 'fight-track' }, [heroFill, heroNumbers]),
    h('span', { class: 'fight-swing', attrs: { 'aria-hidden': 'true' } }, [heroSwing]),
  ]);

  const targetFace = h('span', { class: 'fight-face' });
  const targetName = h('span', { class: 'fight-target-name' });
  const targetFill = h('span', { class: 'fight-fill' });
  const targetNumbers = h('span', { class: 'fight-numbers' });
  const targetPanel = h('div', { class: 'fight-target', attrs: { 'aria-label': 'Your target' } }, [
    targetFace,
    h('span', { class: 'fight-target-body' }, [
      targetName,
      h('span', { class: 'fight-track' }, [targetFill, targetNumbers]),
    ]),
  ]);
  targetPanel.hidden = true;
  let targetShown: string | null = null;

  /* ----- A boss's health, in the target's place while he stands; the tide beside Leave ----- */

  const bossName = h('span', { class: 'fight-target-name' });
  const bossFill = h('span', { class: 'fight-fill' });
  const bossNumbers = h('span', { class: 'fight-numbers' });
  // His phases as notches across the bar where each begins, so the bar itself says how near the next is.
  const bossPhases = h('span', { class: 'fight-phases', attrs: { 'aria-hidden': 'true' } }, [
    h('i'),
    h('i'),
    h('i'),
  ]);
  const bossFace = h('span', { class: 'fight-face' });
  const bossPanel = h(
    'div',
    { class: 'fight-target fight-boss', attrs: { 'aria-label': 'The captain' } },
    [
      bossFace,
      h('span', { class: 'fight-target-body' }, [
        h('span', { class: 'fight-boss-head' }, [bossName]),
        h('span', { class: 'fight-track' }, [bossFill, bossPhases, bossNumbers]),
      ]),
    ],
  );
  bossPanel.hidden = true;
  let bossShown: string | null = null;

  const tideWater = h('span', { class: 'tide-water' });
  const tideWord = h('span', { class: 'tide-word' });
  const tideArrow = h('span', { class: 'tide-arrow', attrs: { 'aria-hidden': 'true' } });
  const tidePanel = h('div', { class: 'tide-gauge', attrs: { role: 'img' } }, [
    h('span', { class: 'tide-scale', attrs: { 'aria-hidden': 'true' } }, [
      tideWater,
      h('i'),
      h('i'),
      h('i'),
    ]),
    h('span', { class: 'tide-body' }, [h('span', { class: 'tide-label', text: 'Tide' }), tideWord]),
    tideArrow,
  ]);
  tidePanel.hidden = true;

  /** The room's name, shown for a moment as the hero comes in. */
  const title = h('div', { class: 'dungeon-title', attrs: { 'aria-live': 'polite' } });

  /* ----- The buttons under the left thumb ----- */

  const battleOf = (): Battle | null => options.run().battle;
  const style = battleOf()?.fighter.style ?? 'melee';
  const abilities = ABILITIES[style];

  const press = (slot: 0 | 1): void => {
    const run = options.run();
    if (!run.battle || run.finished || run.doorway) return;
    const used = useAbility(run.battle, placeOf(dungeon, run), run.play, slot);
    if (used.battle === run.battle) return;
    options.keep({ ...run, battle: used.battle, play: used.play });
  };
  const eatOne = (): void => {
    const run = options.run();
    if (!run.battle || run.finished || run.doorway) return;
    const fed = eat(run.battle, run.play.walker.at);
    if (fed !== run.battle) options.keep({ ...run, battle: fed });
  };

  const abilityButtons = abilities.map((a, i) =>
    fightButton(a.name, buttonPicture(a.id), '', () => press(i as 0 | 1)),
  );
  const food = battleOf()?.fighter.food ?? null;
  const foodButton = food ? fightButton('Eat', itemIcon(food.item), 'fight-food', eatOne) : null;
  const bar = h('div', { class: 'fight-bar' }, [
    ...abilityButtons.map((b) => b.el),
    foodButton?.el ?? null,
  ]);
  const hud = h('div', { class: 'fight-hud' }, [
    heroPanel,
    targetPanel,
    bossPanel,
    tidePanel,
    title,
    bar,
  ]);
  if (!battleOf()) hud.hidden = true;

  const root = h('div', { class: 'dungeon' }, [room, hud, fade, prompt, way]);

  /** The view's size in CSS pixels: whether the phone is on its side. */
  let size = { width: 0, height: 0 };
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(([entry]) => {
      if (!root.isConnected) {
        observer.disconnect();
        return;
      }
      if (entry) size = { width: entry.contentRect.width, height: entry.contentRect.height };
    });
    observer.observe(root);
  }

  let roomShown = '';
  /** The walker as last handed to the stage: a different one back means a tap moved him. */
  let given: Play = options.run().play;
  let roomView: View | null = null;
  let look = roomLook(dungeon.rooms[options.run().room]!);
  /** Grounds of the room still to paint ahead of the tide: one a frame, so none is painted mid-fight. */
  let unpainted: ReturnType<typeof look.grounds> = [];
  const playing = (): boolean => sideways(size) && !options.run().finished;

  /** The room's ground as the tide has it now, darkening where it is about to come in. */
  const groundFor = (run: Run) => {
    if (!run.battle) return look.groundAt(0, false);
    const tide = tideOf(run.battle, placeOf(dungeon, run));
    return look.groundAt(tide.level, rising(tide, run.battle.clock));
  };

  const showRoom = (): void => {
    const run = options.run();
    const here = dungeon.rooms[run.room]!;
    look = roomLook(here);
    look.lock.map = groundNow(dungeon, run);
    unpainted = look.grounds();
    given = run.play;
    roomShown = run.room;
    const walkerAt = hero.atIn(look.lights);
    roomView = stage({
      scene: look.scene,
      art: {
        ground: look.groundAt(0, false),
        groundNow: () => groundFor(options.run()),
        heroFeet: HERO_FEET,
        walkerAt: (feet, facing, palette) => walkerAt(feet, facing, palette.lightsOn),
        shadowAt: look.shadowAt,
      },
      // A sea cave at dusk, lit by its lanterns.
      time: 'dusk',
      play: run.play,
      keep: () => {},
      press: () => {},
      scaleOf: dungeonScale,
      insets: DUNGEON_INSETS,
      frozen: () => !playing(),
      drive: (play, ms) => {
        const before = options.run();
        const after = advanceRun(dungeon, before, play === given ? before.play : play, ms);
        options.keep(after);
        given = after.play;
        return after.play;
      },
      tap: (point, min, play) => {
        const run = options.run();
        if (!run.battle || run.finished || run.doorway) return null;
        const from = play === given ? run.play : play;
        // Being carried by the sea, a tap does nothing until he is on his feet.
        if (run.battle.wash) return from;
        const foe = foeAt(run.battle, run.room, point, min);
        if (!foe || held(run.battle, placeOf(dungeon, run), foe)) {
          options.keep({ ...run, battle: stopChasing(run.battle), play: from });
          return null;
        }
        const aimed = targetFoe(run.battle, placeOf(dungeon, run), from, foe.key);
        options.keep({ ...run, battle: aimed.battle, play: aimed.play });
        given = aimed.play;
        return aimed.play;
      },
      extra: (_now, palette) => fightExtra(dungeon, options.run(), palette),
      label: 'A sea cave. Tap the ground to walk there, or something to fight it.',
      fallback: 'The grotto needs a browser that can draw on a canvas.',
    });
    room.replaceChildren(roomView.el);
    if (here.title) {
      title.textContent = here.title;
      // Played again from the start for each room.
      title.classList.remove('shown');
      void title.offsetWidth;
      title.classList.add('shown');
    }
  };

  let results: HTMLElement | null = null;
  const showResults = (): void => {
    if (results) return;
    leaveButton.hidden = true;
    confirm.replaceChildren();
    hud.hidden = true;
    const run = options.run();
    const tally: Tally | null = run.battle?.tally ?? null;
    const fell = run.ending === 'fell';
    const title = !run.battle
      ? 'You reached the end'
      : fell
        ? 'Washed back to town'
        : 'The grotto is cleared';
    const line = !run.battle
      ? 'Nothing down here yet but a damp floor and a good echo. Someone will be along to fill it.'
      : fell
        ? 'The tide put you back on the quay, damp but whole. Everything you picked up came with you.'
        : 'The captain has been seen off, and his crew with him. Their belongings have come with you.';
    const facts: HTMLElement[] = [
      h('p', { class: 'dungeon-time', text: `Time taken: ${runTime(run.ms)}` }),
    ];
    const earned: HTMLElement[] = [];
    if (tally) {
      facts.push(h('p', { text: `Kills: ${tally.kills}` }));
      if (tally.eaten > 0) facts.push(h('p', { text: `Eaten: ${tally.eaten}` }));
      if (tally.shot > 0) facts.push(h('p', { text: `Arrows shot: ${tally.shot}` }));
      for (const [skill, xp] of Object.entries(tally.xp)) {
        earned.push(
          resultLine(skillIcon(skill), content.skills[skill]?.name ?? skill, `+${xp} XP`),
        );
      }
      if (tally.coins > 0) earned.push(resultLine(null, 'Coins', `+${tally.coins}`));
      for (const [item, qty] of Object.entries(tally.loot)) {
        earned.push(resultLine(itemIcon(item), content.items[item]?.name ?? item, `×${qty}`));
      }
      if (earned.length === 0)
        earned.push(h('li', { class: 'muted', text: 'Nothing, this time.' }));
    }
    results = h('section', { class: 'dungeon-results', attrs: { 'aria-label': 'Results' } }, [
      h('div', { class: `dungeon-card${tally ? ' run-card' : ''}` }, [
        h('div', { class: 'run-head' }, [
          h('h2', { text: title }),
          h('p', { class: 'muted', text: line }),
          ...facts,
          button('Back to town', () => options.leave(), 'primary'),
        ]),
        tally ? h('ul', { class: 'run-earned', attrs: { 'aria-label': 'Earned' } }, earned) : null,
      ]),
    ]);
    root.append(results);
  };

  /** The top and bottom of the fight, brought up to date: only what changed is touched. */
  const showFight = (run: Run): void => {
    const battle = run.battle;
    if (!battle) return;
    const me = battle.fighter;
    fill(heroFill, 'X', fraction(battle.hp, me.maxHp));
    setText(heroNumbers, `${battle.hp}/${me.maxHp}`);
    heroPanel.classList.toggle('low', battle.hp * 4 <= me.maxHp);
    fill(heroSwing, 'X', fraction(PLAYER_ATTACK_MS - battle.blowMs, PLAYER_ATTACK_MS));

    // A boss in the room: his health holds the middle while he stands, whoever is the target.
    const boss = bossOf(battle, run.room);
    const bossUp = !!boss && alive(boss) && boss.aware;
    bossPanel.hidden = !bossUp;
    if (boss && bossUp) {
      const def = battle.monsters[boss.monster]!;
      if (bossShown !== boss.monster) {
        bossShown = boss.monster;
        setText(bossName, def.name);
        const face = portrait(boss.monster);
        bossFace.replaceChildren(...(face ? [face] : []));
        bossFace.hidden = !face;
      }
      fill(bossFill, 'X', fraction(boss.hp, def.hp));
      setText(bossNumbers, `${boss.hp}/${def.hp}`);
      const phases = foeKind(boss.monster).boss?.phases ?? [];
      [...bossPhases.children].forEach((notch, i) => {
        const at = phases[i];
        const el = notch as HTMLElement;
        el.hidden = at === undefined;
        if (at === undefined) return;
        el.style.left = `${(at * 100).toFixed(2)}%`;
        // Passed once he is into the phase it marks.
        el.classList.toggle('done', boss.phase > i + 1);
      });
    }

    const target = battle.foes.find((f) => f.key === battle.target && alive(f)) ?? null;
    targetPanel.hidden = !target || bossUp;
    if (target && !bossUp) {
      const def = battle.monsters[target.monster]!;
      if (targetShown !== target.monster) {
        targetShown = target.monster;
        setText(targetName, `${def.name} · ${def.level}`);
        const face = portrait(target.monster);
        targetFace.replaceChildren(...(face ? [face] : []));
        targetFace.hidden = !face;
      }
      fill(targetFill, 'X', fraction(target.hp, def.hp));
      setText(targetNumbers, `${target.hp}/${def.hp}`);
    }

    const place = placeOf(dungeon, run);
    const tidal = place.ground.tidal || place.ground.ownTide;
    tidePanel.hidden = !tidal;
    if (tidal) {
      const tide = tideOf(battle, place);
      // The water creeps up the gauge through each warning, so what is coming shows before it comes.
      fill(tideWater, 'Y', Math.round((100 * gaugeLevel(tide, battle.clock)) / HIGH_WATER) / 100);
      const words = tideWords(tide, battle.clock);
      setText(tideWord, words);
      const dir =
        tide.next && tide.next.at - battle.clock <= 3000
          ? tide.next.level > tide.level
            ? 'up'
            : 'down'
          : '';
      if (tideArrow.dataset.dir !== dir) tideArrow.dataset.dir = dir;
      tidePanel.classList.toggle('warn', dir === 'up');
      if (tidePanel.getAttribute('aria-label') !== `Tide: ${words}`)
        tidePanel.setAttribute('aria-label', `Tide: ${words}`);
    }
    abilityButtons.forEach((b, i) => {
      const slot = i as 0 | 1;
      const left = cooldownLeft(battle, slot === 0 ? 'first' : 'second');
      const ability = abilities[slot];
      const problem = abilityProblem(battle, place, run.play, slot);
      b.el.dataset.state = left > 0 ? 'cooling' : problem ? 'idle' : 'ready';
      fill(b.shade, 'Y', fraction(left, ability.cooldownMs));
      setText(b.count, secondsLeft(left));
    });
    if (style === 'ranged') {
      const quiver = abilityButtons[0]!;
      quiver.el.dataset.arrows = String(arrowsLeft(battle));
    }
    if (foodButton) {
      const left = cooldownLeft(battle, 'food');
      const problem = foodProblem(battle);
      foodButton.el.dataset.state =
        problem === 'none' ? 'empty' : left > 0 ? 'cooling' : problem ? 'idle' : 'ready';
      fill(foodButton.shade, 'Y', fraction(left, FOOD_MS));
      setText(foodButton.count, String(foodLeft(battle)));
    }
  };

  showRoom();
  if (options.run().finished) showResults();

  return {
    el: root,
    update: (state: GameState) => {
      const before = options.run();
      const ready = sideways(size);
      prompt.hidden = ready || before.finished;
      promptLine.textContent =
        before.ms > 0
          ? 'The grotto will wait. Nothing in it is going anywhere.'
          : 'The grotto is wide and low. So, to be fair, is the boat.';
      look.lock.map = groundNow(dungeon, before);
      roomView?.update?.(state);
      // Paint one of the room's tides ahead of time each frame, so the sea never stops a frame to be drawn.
      const next = unpainted.pop();
      if (next) canvasOf(next, DUSK);
      const after = options.run();
      if (after.room !== roomShown) showRoom();
      // And again after the frame, so a tap before the next one walks on the ground as it is now.
      else look.lock.map = groundNow(dungeon, after);
      if (after.finished && !before.finished) {
        showResults();
        options.finished();
      }
      showFight(after);
      fade.style.opacity = String(doorwayDark(after.doorway));
    },
  };
}
