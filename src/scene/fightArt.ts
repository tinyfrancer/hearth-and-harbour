/*
 * A dungeon fight on screen at the C scale: the cast in the art lane's poses
 * (`foeSprite2`/`foePicture2`, lit by the lanterns near them), their contact
 * shadows, the marked ground of every heavy attack, the sea about to come in,
 * loot on the floor, barred doors and cells, and over everyone their health,
 * the target's mark, numbers that float up and things in flight. Everything
 * here is read from the run (`battle.ts` decides it all); this only puts
 * pixels where it says.
 *
 * Two layers. The room's canvas holds one pixel per art pixel and is
 * enlarged by the browser: figures, shadows, marks on the ground, kegs in the
 * air, all in whole art pixels. Words and the thin lines read over the fight
 * (health bars, the blow coming, numbers, what the captain shouts, a foe's
 * warning and the target's chevron) go on an overlay canvas at the screen's
 * own resolution (`overlay`), so text is sharp. The marks on the ground stay
 * on the room's canvas, under the figures standing in them: an outline laid
 * over the top would cross the feet it is there to judge.
 *
 * The three kinds of big hit read apart at a glance, by shape and colour:
 * circles in red (a slam, a keg), lines in hatched fire (cannon), and a pale
 * steel arc (the anchor). The sea's warning is blue: wet sand and ripples on
 * the ground it is about to cover.
 */
import {
  CAVE_DUSK,
  type CavePalette,
  FOE2_POSES,
  FOE2_SIZES,
  FUSE_LIGHT2,
  dungeonPropSprite2,
  dungeonProp2,
  flicker2,
  foeFrames2,
  foePicture2,
  foeSprite2,
  foeSize2,
  type Foe2Pose,
  type Foe2Size,
  type Light2,
} from '../art/dungeonArt2';
import { STRIKE2_FRAMES, STRIKE2_HIT_FRAME, WALK2_STRIDE, type Facing2 } from '../art/character2';
import { addGlow, type Glow } from '../art/raster';
import type { Mat } from '../art/town2/ramps';
import {
  EFFECT_MS,
  SAY_MS,
  TICK_MS,
  alive,
  held,
  inReach,
  laneDistance,
  mapOf,
  roomLocked,
  tideOf,
  type Battle,
  type Effect,
  type Foe,
  type Telegraph,
} from './battle';
import { shownApart, type Figure } from './apart';
import { overlaps, type Placed, type Standing } from './draw';
import { placeOf, type Door, type Dungeon, type Room, type Run } from './dungeon';
import { DUNGEON, far } from './dungeonMetrics';
import { breathFrame, type Pose2 } from './figures2';
import { bodyMid, foeKind, type FoeKind } from './foes';
import { tileAt } from './ground';
import {
  CaveShadow,
  doorPieces,
  glowsIn,
  heroPoolIn,
  isDark,
  lightsOf,
  glowSig,
  HERO_POOL_RISE,
  litPicture,
  litness,
  nightRule,
  ownLight,
  shadeIn,
  paintCells,
  IN_THE_DARK,
  NIGHT_RGB,
  perchLift,
  type RoomLook,
} from './grottoArt';
import { sayingOf } from './dungeons';
import {
  BURROW_ERUPTION2_FRAMES,
  BURROW_ERUPTION2_FRAME_MS,
  BURROW_MOUND2_FRAMES,
  POST_LANTERN2_FRAMES,
  POST_LANTERN2_FRAME_MS,
  SPORE_CLOUD2_FRAMES,
  SPORE_CLOUD2_FRAME_MS,
  burrowEruption2,
  burrowMound2,
  FOE2_SPECIALS,
  foeArtId,
  foeSpecial2,
  foeSpecialSprite2,
  lampPicture,
  postLanternFrame2,
  postLanternShines,
  sporeCloud2,
  type BurrowPiece2,
  type PostLanternState,
} from './fromLaneB';
import { LIGHT_MS, lampFoot, type Cloud } from './light';
import type { Facing } from './play';
import type { StageExtra } from './stage';
import type { Box } from './things';
import { rising, type TideNow } from './tide';
import type { Cell, Point } from './tileMap';

/** A tile's side, in art pixels. */
const T = DUNGEON.tile;

/** How long someone struck shows the flash of the blow. */
export const FLASH_MS = 120;
/** How long after that they show the recoil. */
export const HURT_MS = 320;
/** How long a foe's blow shows, its weapon out along the line of it. */
export const STRIKE_MS = 250;
/** How long a fallen foe stays: buckling, then down, then gone. */
export const FALL_MS = 900;
/** How long barred doors take to lift once a room is clear. */
export const DOOR_LIFT_MS = 500;
/** How long a heavy blow's landing shows. */
const LANDED_MS = 300;
/** How long an arrow is in the air, to the eye (it has already landed by the rules). */
const ARROW_MS = 160;
/** A thrown keg is in the air for this part of its warning, then lies burning where it fell. */
const KEG_FLIGHT = 0.4;
/** How high a flying thing is drawn above where it is. */
const FLY_RISE = far(10);
/**
 * How far the ground passes under a creature a frame of its walk, in art
 * pixels: the art lane's four frames of moved parts (people walk on the
 * hero's rig, by `WALK2_STRIDE`).
 */
export const CREATURE_STRIDE = 6;
/**
 * How long each frame of the hero's blow shows (lane B's `STRIKE2_FRAMES`, the
 * blow on `STRIKE2_HIT_FRAME`: about 90 to 110 ms reads well, lane B says),
 * and how much longer the recovery is held before he stands again.
 */
export const STRIKE2_FRAME_MS = 100;
export const STRIKE2_HOLD_MS = 150;

const FONT = "'HH Digits', 'Pixelify Sans', ui-monospace, monospace";
const WORDS = "'Pixelify Sans', ui-monospace, monospace";

/** A colour of the cave's dusk, by the town's materials. */
const tone = (m: Mat, step: number): string => CAVE_DUSK.colours[m][step]!;
export const FIGHT_COLOURS = {
  ink: tone('shade', 2),
  shade: tone('shade', 0),
  red: tone('crimson', 2),
  redDark: tone('crimson', 4),
  fire1: tone('fire', 1),
  fire2: tone('fire', 3),
  fire3: tone('fire', 4),
  metal1: tone('iron', 1),
  metal2: tone('iron', 2),
  metal3: tone('iron', 4),
  white: tone('sail', 0),
  foam: tone('sea', 0),
  smoke: tone('smoke', 2),
  gold: tone('gold', 1),
  green: tone('grass', 1),
  greenDark: tone('pine', 2),
  wood: tone('wood', 2),
  sand: tone('sand', 1),
  stone: tone('rock', 1),
  hurt: tone('crimson', 1),
  heal: tone('grass', 0),
  // The Burrow's (wave 19): spores, earth, a moth's dusk, a lantern's flame.
  spore1: tone('moss', 0),
  spore2: tone('moss', 2),
  spore3: tone('moss', 4),
  dirt1: tone('dirt', 2),
  dirt2: tone('dirt', 4),
  moth: tone('violet', 1),
  mothDark: tone('plum', 3),
  flame: tone('fire', 0),
} as const;
const C = FIGHT_COLOURS;

/* ----- Who stands how ----- */

/** How a foe is drawn this moment: the art lane's pose, its frame, which way, and the captain's phase. */
export interface FoeShown {
  readonly pose: Foe2Pose;
  readonly frame: number;
  readonly facing: Facing;
  readonly phase: number;
  /** One of its own moves beyond the common poses (lane B's `FOE2_SPECIALS`), shown in their place. */
  readonly special?: string;
}

/** Whether lane B draws a foe's special move. */
const hasSpecial = (monster: string, move: string): boolean =>
  !!FOE2_SPECIALS[foeArtId(monster)]?.[move];

/** How long a guard is shown braced behind its shield after a blow glances off it. */
export const BLOCK_SHOWN_MS = 350;
/** How long a hound is shown running down its lane after a charge (it is at the end by the rules). */
export const CHARGE_SHOWN_MS = 280;
/** How long a moth is shown wrapping a flame before it goes out. */
export const SNUFF_SHOWN_MS = 1000;
/** How long a burrowing boss is shown sinking as it goes under, before only its mound is left. */
export const DIVE_SHOWN_MS = 420;
/** How long it is shown climbing out where it comes up, over lane B's eruption. */
export const RISE_SHOWN_MS = 360;

/**
 * A burrowing boss's sinking as it goes under, if it is still being shown:
 * where it went down and the frame of lane B's `burrow` (0 to 2). The rules
 * have it under at once; this is drawing only.
 */
export function diveShown(
  foe: Foe,
  clock: number,
  effects: readonly Effect[],
): { at: Point; frame: number } | null {
  if (!hasSpecial(foe.monster, 'burrow')) return null;
  const e = effects.find((x) => x.kind === 'dive' && x.who === foe.key);
  if (!e || e.kind !== 'dive' || clock - e.from >= DIVE_SHOWN_MS) return null;
  const n = FOE2_SPECIALS[foeArtId(foe.monster)]!.burrow!;
  return { at: e.at, frame: Math.min(n - 1, Math.floor(((clock - e.from) / DIVE_SHOWN_MS) * n)) };
}

/**
 * Where a foe is drawn this frame, if not at its feet: a hound in the first
 * moment after its charge lands, still running down its lane to where the
 * rules have put it. Drawing only.
 */
export function chargeShownAt(foe: Foe, clock: number, effects: readonly Effect[]): Point | null {
  if (!hasSpecial(foe.monster, 'charge')) return null;
  const e = effects.find(
    (x) =>
      x.kind === 'charge' &&
      clock - x.from < CHARGE_SHOWN_MS &&
      Math.abs(x.to.x - foe.at.x) < 1 &&
      Math.abs(x.to.y - foe.at.y) < 1,
  );
  if (!e || e.kind !== 'charge') return null;
  const k = Math.max(0, Math.min(1, (clock - e.from) / CHARGE_SHOWN_MS));
  return { x: e.at.x + (e.to.x - e.at.x) * k, y: e.at.y + (e.to.y - e.at.y) * k };
}

/** Whether a foe walks on legs like the hero's (people), or is a creature with its own few frames. */
const isPerson = (monster: string): boolean => {
  const s = FOE2_SIZES[monster];
  return !!s && s.w === 56 && s.h === 72;
};

/**
 * A foe's pose from its state, as the art lane's B10a asks: falling once
 * down (buckling, then down); the flash of a blow just taken, then the
 * recoil; the wind-up while a heavy blow is marked; the blow itself just
 * after it lands (an ordinary one, or a heavy one); walking (a frame for each
 * stride of ground, people by the hero's stride); otherwise standing and
 * breathing. Facing as it faces; the captain in his phase.
 */
export function foePose(
  foe: Foe,
  clock: number,
  speedMs: number,
  kind: FoeKind,
  effects: readonly Effect[] = [],
): FoeShown {
  const facing = foe.facing;
  const phase = Math.max(1, foe.phase);
  const frames = foeFrames2(foeArtId(foe.monster));
  const count = (pose: Foe2Pose): number => Math.max(1, frames?.[pose] ?? 1);
  const shown = (pose: Foe2Pose, frame = 0): FoeShown => ({ pose, frame, facing, phase });
  // Its frame wrapped to the move's own count, so a looping move is the same few pictures.
  const special = (move: string, frame = 0): FoeShown | null => {
    const n = FOE2_SPECIALS[foeArtId(foe.monster)]?.[move];
    return n ? { pose: 'idle', frame: ((frame % n) + n) % n, facing, phase, special: move } : null;
  };
  // The Burrow's creatures' own moves (lane B, B20), each where the rules have it doing the thing.
  if (foe.diedAt !== null) {
    // A puff bursts as it falls (its cloud is the rules'), then lies a husk.
    const burst =
      kind.bursts &&
      special('burst', Math.min(2, Math.floor(((clock - foe.diedAt) / FALL_MS) * 3)));
    if (burst) return burst;
    return shown('fall', clock - foe.diedAt < FALL_MS / 3 ? 0 : 1);
  }
  const since = clock - foe.struckAt;
  if (since < FLASH_MS) return shown('flash');
  if (since < HURT_MS) return shown('hurt');
  // Just come up out of the ground (lane B's `erupt`, over its eruption).
  if (kind.boss?.burrow && hasSpecial(foe.monster, 'erupt')) {
    const up = effects.find(
      (e) =>
        e.kind === 'erupt' &&
        clock - e.from < RISE_SHOWN_MS &&
        Math.abs(e.at.x - foe.at.x) < 1 &&
        Math.abs(e.at.y - foe.at.y) < 1,
    );
    if (up) {
      const n = FOE2_SPECIALS[foeArtId(foe.monster)]!.erupt!;
      return special(
        'erupt',
        Math.min(n - 1, Math.floor(((clock - up.from) / RISE_SHOWN_MS) * n)),
      )!;
    }
  }
  // Dazzled by a lantern (a burrower held fast where it came up): lane B's `stunned`, looping;
  // where it has none, reeling, by turns hurt and not.
  if (kind.boss?.burrow && foe.stuck !== undefined && foe.stuck > clock)
    return (
      special('stunned', Math.floor(clock / 220)) ??
      shown(Math.floor(clock / 220) % 2 === 0 ? 'hurt' : 'idle')
    );
  // A hound running down its lane, the first moment after the charge.
  if (chargeShownAt(foe, clock, effects))
    return (
      special('charge', Math.floor(clock / 70)) ??
      shown('walk', Math.floor(clock / 70) % count('walk'))
    );
  // Stuck fast where its charge ended.
  if (foe.stuck !== undefined && foe.stuck > clock) {
    const stuck = special('stuck', Math.floor(clock / 260));
    if (stuck) return stuck;
  }
  // A guard braced as a blow glances off its shield, or turning to face him.
  if (kind.guard) {
    const top = foe.at.y - kind.box.h;
    const blocked = effects.some(
      (e) =>
        e.kind === 'blocked' &&
        clock - e.from < BLOCK_SHOWN_MS &&
        Math.abs(e.at.x - foe.at.x) < 1 &&
        Math.abs(e.at.y - top) < 1,
    );
    if (blocked && !foe.heavy) return special('block') ?? shown('idle');
    if (foe.turnAt !== undefined && foe.turnAt > clock && !foe.heavy) {
      const k = 1 - (foe.turnAt - clock) / kind.guard.turnMs;
      const turn = special('turn', k < 0.5 ? 0 : 1);
      if (turn) return turn;
    }
  }
  if (foe.heavy) {
    const t = foe.heavy;
    const k = Math.max(0, Math.min(0.999, (clock - t.from) / Math.max(1, t.lands - t.from)));
    // A puff swelling round as its cloud comes; a hound crouched to run down its lane.
    const own =
      (kind.bursts && special('swell', Math.floor(k * 3))) ||
      (t.shape === 'lane' && special('crouch', Math.floor(clock / 200)));
    if (own) return own;
    return shown('windup');
  }
  // A moth at a lantern: beating beside the flame, and wrapping it in its last second.
  if (kind.seeksLight && foe.snuff) {
    const left = foe.snuff.until - clock;
    const moth =
      left < SNUFF_SHOWN_MS
        ? special('snuff', Math.floor(((SNUFF_SHOWN_MS - Math.max(0, left)) / SNUFF_SHOWN_MS) * 3))
        : special('hover', Math.floor(clock / 90));
    if (moth) return moth;
  }
  const heavy = kind.heavy;
  const landed = heavy && foe.aware && heavy.everyMs - foe.heavyMs < STRIKE_MS;
  const blow = foe.engaged && speedMs - foe.blowMs < STRIKE_MS;
  if (landed || blow) return shown('strike');
  const flying = !!foe.flight && (foe.flight.mode === 'in' || foe.flight.mode === 'out');
  if ((foe.path.length > 0 && !foe.wash) || flying) {
    const stride = isPerson(foe.monster) ? WALK2_STRIDE : CREATURE_STRIDE;
    return shown('walk', Math.floor(foe.walked / stride) % count('walk'));
  }
  // Each one breathes a little out of step with the others.
  const offset = (Number(foe.key.split(' ').at(-1)) || 0) * 330;
  return shown('idle', breathFrame(clock, offset) % count('idle'));
}

/** How a foe's sizes are known: the art lane's table, or a guess for one it has not drawn. */
function sizeOf(monster: string): Foe2Size {
  return (
    foeSize2(foeArtId(monster)) ?? {
      w: 40,
      h: 40,
      anchor: { x: 20, y: 39 },
      tall: 36,
      front: 18,
      back: 18,
      strike: 20,
      box: foeKind(monster).box,
      shadow: 12,
      hover: 0,
    }
  );
}

/**
 * How far above where it is a foe is drawn: a bird on its perch sits on the
 * post's seat, and flies a little above the ground, settling onto it as it
 * comes down; anything else stands where it is.
 */
export function liftOf(room: Room, foe: Foe): number {
  // On the wing all the time (a moth): as high as its row says.
  if (!foe.flight) return foeKind(foe.monster).hovers ?? 0;
  if (foe.flight.mode === 'down') return 0;
  const perch = room.perches[foe.flight.perch];
  const seat = perch ? perchLift(room, perch) : FLY_RISE;
  if (foe.flight.mode === 'perch') return seat;
  // In the air: from the seat's height near the perch to a little over the ground away from it.
  const d = perch ? Math.hypot(foe.at.x - perch.x, foe.at.y - perch.y) : Infinity;
  const k = Math.max(0, 1 - d / (2 * T));
  return Math.round(FLY_RISE + (seat - FLY_RISE) * k);
}

/** When the hero last struck, on the run's clock: his blows are the fight's 'hit' and 'miss' on foes. */
export function heroStruckAt(battle: Battle): number {
  return battle.effects.reduce(
    (t, e) => ((e.kind === 'hit' || e.kind === 'miss') && e.on === 'foe' ? Math.max(t, e.from) : t),
    -Infinity,
  );
}

/** A strike as drawn: how many frames, which one is the blow, and how long each shows. */
export interface StrikeTiming {
  readonly frames: number;
  readonly hit: number;
  readonly frameMs: number;
  /** How much longer the last frame (the recovery) is held. */
  readonly holdMs?: number;
}

/**
 * Which frame of his strike the hero shows now, or null for none: timed so
 * that the blow's frame (`hit`) shows exactly when the blow falls on the
 * fight's clock. The frames before it play as his next blow comes due (when
 * `coming`: a target in reach), from where the fight's state says it will
 * fall (the next tick his swing timer reaches nothing); the frames after it
 * play from when it fell. Drawn from the state and the time alone: nothing
 * here changes when a blow falls, and a blow that does not come (the target
 * steps out of reach at the last) just ends the wind-up.
 */
export function heroStrikeFrame(
  battle: Battle,
  coming: boolean,
  timing: StrikeTiming,
): number | null {
  const { frames, hit, frameMs, holdMs = 0 } = timing;
  const clock = battle.clock;
  const age = clock - heroStruckAt(battle);
  if (age >= 0 && age < (frames - hit) * frameMs + holdMs)
    return Math.min(frames - 1, hit + Math.floor(age / frameMs));
  if (!coming || battle.over || battle.wash || battle.blowMs <= 0) return null;
  // His swing timer moves on ticks: the blow falls on the tick it reaches nothing.
  const due = Math.floor(clock / TICK_MS + 1e-9) * TICK_MS + battle.blowMs;
  const toGo = due - clock;
  if (toGo <= 0 || toGo > hit * frameMs) return null;
  return hit - Math.ceil(toGo / frameMs);
}

/** The hero's blow as lane B draws it: four frames, the blow on the third, the recovery held. */
export const HERO_STRIKE: StrikeTiming = {
  frames: STRIKE2_FRAMES,
  hit: STRIKE2_HIT_FRAME,
  frameMs: STRIKE2_FRAME_MS,
  holdMs: STRIKE2_HOLD_MS,
};

/**
 * The hero's pose in a fight this moment if he is striking (`heroStrikeFrame`
 * with lane B's blow), facing his target: across as he faces, or toward the
 * camera or away when it is more above or below him than beside; null when
 * he is not, and he walks or breathes as anywhere else.
 */
export function heroStrikePose(dungeon: Dungeon, run: Run): Pose2 | null {
  const battle = run.battle;
  if (!battle) return null;
  const hero = run.play.walker.at;
  const target = battle.foes.find((f) => f.key === battle.target && f.room === run.room) ?? null;
  const place = placeOf(dungeon, run);
  const coming =
    !!target && !held(battle, place, target) && inReach(battle, mapOf(battle, place), hero, target);
  const frame = heroStrikeFrame(battle, coming, HERO_STRIKE);
  if (frame === null) return null;
  const dx = target ? target.at.x - hero.x : 0;
  const dy = target ? target.at.y - hero.y : 0;
  const facing: Facing2 =
    Math.abs(dy) > 1.5 * Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : run.play.facing;
  return { walking: false, striking: true, facing, frame };
}

/** A picture's pixels in one colour: how the hero looks for a moment when struck. Made once per picture. */
const flashes = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();

export function flashOf(image: HTMLCanvasElement, colour: string): HTMLCanvasElement {
  let byColour = flashes.get(image);
  if (!byColour) {
    byColour = new Map();
    flashes.set(image, byColour);
  }
  const made = byColour.get(colour);
  if (made) return made;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return image;
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  byColour.set(colour, canvas);
  return canvas;
}

/** Whether someone struck at `at` is still showing it at `clock`. */
export const flashing = (at: number, clock: number): boolean => clock - at < FLASH_MS;

/* ----- Foes' pictures, lit by the lanterns near them ----- */

/** How finely a foe's light follows it, in art pixels: one lit picture per step of this. */
const LIGHT_STEP = 6;
/** Lit pictures kept per foe; the least lately shown goes first. */
const LIT_KEPT = 32;

/**
 * Each foe's pictures, lit: the art lane's kept sprite where no lantern
 * reaches, otherwise its frame painted with the glows that reach it, one per
 * pose and place (to `LIGHT_STEP`), the last few kept.
 */
export class FoePictures {
  private readonly lit: Map<string, Map<string, HTMLCanvasElement | null>>;
  private readonly glows: readonly Glow[];
  private readonly palette: CavePalette;
  /**
   * Lit by `glows`, in a cave's palette (the grotto's dusk unless said).
   * `kept`, where given, is where its lit pictures are kept, shared with the
   * other looks of the room by its lanterns: each picture is keyed by the
   * glows that light it, so a lantern lit or put out paints again only the
   * foes its light reaches.
   */
  constructor(
    glows: readonly Glow[],
    palette: CavePalette = CAVE_DUSK,
    kept?: Map<string, Map<string, HTMLCanvasElement | null>>,
  ) {
    this.glows = glows;
    this.palette = palette;
    this.lit = kept ?? new Map();
  }

  /** The foe drawn as `shown` with its feet at `feet`: its canvas and where its feet are on it. */
  at(
    monster: string,
    key: string,
    shown: FoeShown,
    feet: Point,
    // A level of the dark's own palette (a room painted by palettes, `NightRule`): its own pictures.
    inPalette: CavePalette = this.palette,
  ): { image: HTMLCanvasElement; feet: Point; glows: readonly Glow[] } | null {
    const art = foeArtId(monster);
    const pic = shown.special
      ? foeSpecial2(art, shown.special, shown.facing, shown.frame, shown.phase)
      : foePicture2(art, shown.pose, shown.facing, shown.frame, shown.phase);
    if (!pic) return null;
    const plain = shown.special
      ? foeSpecialSprite2(art, shown.special, shown.facing, shown.frame, shown.phase, inPalette)
      : foeSprite2(art, shown.pose, shown.facing, shown.frame, shown.phase, inPalette);
    if (!plain) return null;
    const qx = Math.round(feet.x / LIGHT_STEP) * LIGHT_STEP;
    const qy = Math.round(feet.y / LIGHT_STEP) * LIGHT_STEP;
    const { w, h } = pic.picture.grid;
    const box = { x: qx - pic.feet.x, y: qy - pic.feet.y, w, h };
    const local = glowsIn(this.glows, box, inPalette);
    if (local.length === 0) return { image: plain, feet: pic.feet, glows: pic.picture.glows };
    let mine = this.lit.get(key);
    if (!mine) {
      mine = new Map();
      this.lit.set(key, mine);
    }
    const k = `${monster} ${shown.special ?? shown.pose} ${shown.facing} ${shown.frame} ${shown.phase} ${qx} ${qy} ${glowSig(local)} ${inPalette.key ?? inPalette.name}`;
    let image = mine.get(k);
    if (image === undefined) {
      // The least lately shown goes, and lends its canvas to this one: a new canvas a step was
      // new memory and a new context each time a foe walked by a light.
      let spare: HTMLCanvasElement | undefined;
      if (mine.size >= LIT_KEPT) {
        const oldest = mine.keys().next().value!;
        spare = mine.get(oldest) ?? undefined;
        mine.delete(oldest);
      }
      image = paintCells(
        { grid: pic.picture.grid, glows: [...pic.picture.glows, ...local] },
        spare,
        inPalette,
      );
      mine.set(k, image);
    } else {
      // Shown again: last to go.
      mine.delete(k);
      mine.set(k, image);
    }
    return { image: image ?? plain, feet: pic.feet, glows: pic.picture.glows };
  }
}

/**
 * Every picture of each of `monsters` drawn now (every pose, frame, facing
 * and, for a boss drawn by phase, phase), so none is first drawn mid-fight:
 * drawing a creature's frame is the art lane's work, and a big one's first
 * frames cost a slow phone a tenth of a second each. Called where a pause
 * cannot be seen (a door's dark, the boat rowing out). Kept by the art lane.
 */
export function warmFoes(monsters: Iterable<string>, palette: CavePalette = CAVE_DUSK): void {
  const done = new Set<string>();
  for (const monster of monsters) {
    const art = foeArtId(monster);
    if (done.has(art)) continue;
    done.add(art);
    const frames = foeFrames2(art);
    if (!frames) continue;
    const phases = art === 'brinebeard' ? [1, 2, 3] : [1];
    for (const pose of FOE2_POSES)
      for (let f = 0; f < (frames[pose] ?? 0); f++)
        for (const facing of ['right', 'left'] as const)
          for (const phase of phases) foeSprite2(art, pose, facing, f, phase, palette);
    for (const [move, n] of Object.entries(FOE2_SPECIALS[art] ?? {}))
      for (let f = 0; f < n; f++)
        for (const facing of ['right', 'left'] as const)
          for (const phase of phases) foeSpecialSprite2(art, move, facing, f, phase, palette);
  }
}

/** The monsters a room may show: who waits in it, and whom its boss calls in each phase. */
export function castIn(room: Room): string[] {
  const out = new Set<string>();
  for (const f of room.foes) {
    out.add(f.monster);
    const boss = foeKind(f.monster).boss;
    if (boss) {
      out.add(boss.calls.monster);
      for (const m of boss.more ?? []) out.add(m.monster);
    }
  }
  return [...out];
}

/** Whether a foe drawn so carries a light of its own (the powder monkey's fuse): it is lit by it. */
function carriesLight(monster: string, shown: FoeShown): boolean {
  const art = foeArtId(monster);
  const pic = shown.special
    ? foeSpecial2(art, shown.special, shown.facing, shown.frame, shown.phase)
    : foePicture2(art, shown.pose, shown.facing, shown.frame, shown.phase);
  return !!pic && pic.picture.glows.length > 0;
}

/* ----- Drawing in whole art pixels ----- */

/** A filled circle in whole pixels, row by row. */
function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  if (r < 0.5) return;
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  const R = Math.floor(r);
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(x0 - half, y0 + dy, 2 * half + 1, 1);
  }
}

/** A circle's edge, `thick` pixels wide, in whole pixels. */
function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, thick = 1): void {
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  const R = Math.floor(r);
  const inner = r - thick;
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    const inHalf = Math.abs(dy) < inner ? Math.floor(Math.sqrt(inner * inner - dy * dy)) : -1;
    if (inHalf < 0) {
      ctx.fillRect(x0 - half, y0 + dy, 2 * half + 1, 1);
    } else {
      ctx.fillRect(x0 - half, y0 + dy, half - inHalf, 1);
      ctx.fillRect(x0 + inHalf + 1, y0 + dy, half - inHalf, 1);
    }
  }
}

/** Each oval's edge as runs along its rows, worked out once per size. */
const ovals = new Map<string, readonly [number, number, number][]>();

/** A flat ellipse's edge, for the marks at someone's feet: a few runs of pixels a row. */
function oval(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  const key = `${rx} ${ry}`;
  let runs = ovals.get(key);
  if (!runs) {
    const rows = new Map<number, Set<number>>();
    for (let a = 0; a < 96; a++) {
      const t = (a / 96) * Math.PI * 2;
      const y = Math.round(Math.sin(t) * ry);
      const row = rows.get(y) ?? new Set<number>();
      row.add(Math.round(Math.cos(t) * rx));
      rows.set(y, row);
    }
    const made: [number, number, number][] = [];
    for (const [dy, xs] of rows) {
      const sorted = [...xs].sort((a, b) => a - b);
      let from = sorted[0]!;
      let to = from;
      for (const x of sorted.slice(1)) {
        if (x === to + 1) to = x;
        else {
          made.push([dy, from, to - from + 1]);
          from = to = x;
        }
      }
      made.push([dy, from, to - from + 1]);
    }
    runs = made;
    ovals.set(key, runs);
  }
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  for (const [dy, from, length] of runs) ctx.fillRect(x0 + from, y0 + dy, length, 1);
}

/** A wedge's rows: for each, where a run of its pixels starts and how long it is. */
export type Spans = readonly (readonly [dy: number, from: number, length: number])[];

/** Wedges worked out already, by their shape: a swing draws the same few every frame. */
const spansMade = new Map<string, Spans>();
const SPANS_KEPT = 96;

/** Each pixel's distance and angle from a disc's middle, by its whole radius: worked out once a size. */
const discTables = new Map<number, { dist: Float64Array; angle: Float64Array }>();
function discTable(R: number): { dist: Float64Array; angle: Float64Array } {
  let t = discTables.get(R);
  if (!t) {
    const n = 2 * R + 1;
    t = { dist: new Float64Array(n * n), angle: new Float64Array(n * n) };
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        t.dist[(dy + R) * n + dx + R] = Math.hypot(dx, dy);
        t.angle[(dy + R) * n + dx + R] = Math.atan2(dy, dx);
      }
    discTables.set(R, t);
  }
  return t;
}

function wedgeSpans(r: number, facing: number, half: number, inner: number): Spans {
  const key = `${r} ${facing.toFixed(4)} ${half.toFixed(4)} ${inner}`;
  let spans = spansMade.get(key);
  if (spans) return spans;
  const out: [number, number, number][] = [];
  const R = Math.ceil(r);
  const n = 2 * R + 1;
  const table = discTable(R);
  const TURN = 2 * Math.PI;
  for (let dy = -R; dy <= R; dy++) {
    // Where the current stretch of the row began; null between stretches.
    let run: number | null = null;
    for (let dx = -R; dx <= R + 1; dx++) {
      const at = (dy + R) * n + dx + R;
      const d = dx <= R ? table.dist[at]! : Infinity;
      // The angle off its facing, folded into a half turn either way (as `inWedge` has it), from
      // the pixel's own angle worked out once a size.
      let turn = d <= r && d >= inner ? table.angle[at]! - facing : 0;
      turn -= TURN * Math.round(turn / TURN);
      const inside = d <= r && d >= inner && Math.abs(turn) <= half + 1e-12;
      if (inside && run === null) run = dx;
      if (!inside && run !== null) {
        out.push([dy, run, dx - run]);
        run = null;
      }
    }
  }
  spans = out;
  if (spansMade.size >= SPANS_KEPT) spansMade.delete(spansMade.keys().next().value!);
  spansMade.set(key, spans);
  return spans;
}

/** A filled wedge of a disc, row by row: the pixels within `r` and the angle. */
function wedge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  facing: number,
  half: number,
  inner = 0,
): void {
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  for (const [dy, from, length] of wedgeSpans(r, facing, half, inner))
    ctx.fillRect(x0 + from, y0 + dy, length, 1);
}

/** How far through its warning a heavy attack is, 0 to 1. */
export function telegraphProgress(t: Telegraph, clock: number): number {
  return Math.min(1, Math.max(0, (clock - t.from) / (t.lands - t.from)));
}

/**
 * A circle's mark (a slam, a keg): the whole circle faintly, its edge solid
 * from the start so where it will land is never in doubt, and a fill growing
 * from the middle that reaches the edge as it lands. The edge flickers at the end.
 */
function drawCircle(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number): void {
  const k = telegraphProgress(t, clock);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = C.redDark;
  disc(ctx, t.at.x, t.at.y, t.radius);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = C.red;
  disc(ctx, t.at.x, t.at.y, t.radius * k);
  ctx.globalAlpha = 1;
  const late = t.lands - clock <= 300;
  ctx.fillStyle = late && Math.floor(clock / 75) % 2 === 0 ? C.fire1 : C.fire2;
  ring(ctx, t.at.x, t.at.y, t.radius, 2);
  ctx.fillStyle = C.ink;
  ring(ctx, t.at.x, t.at.y, t.radius + 1, 1);
}

/**
 * A cannon volley's line: a strip straight down the room, hatched in fire
 * with solid edges, the hatching marching down it, and the shots' shadows
 * growing along it as they come.
 */
function drawLine(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number): void {
  const k = telegraphProgress(t, clock);
  const x = Math.round(t.at.x - t.radius);
  const w = Math.round(2 * t.radius);
  const top = Math.round(t.at.y);
  const bottom = Math.round(t.bottom ?? t.at.y);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = C.fire3;
  ctx.fillRect(x, top, w, bottom - top);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = C.fire2;
  const shift = Math.floor(clock / 60) % 12;
  for (let y = top - 12 + shift; y < bottom; y += 12) {
    for (let i = 0; i < w; i++) {
      const yy = y + i;
      if (yy >= top && yy < bottom) ctx.fillRect(x + i, yy, 1, 4);
    }
  }
  ctx.globalAlpha = 1;
  const late = t.lands - clock <= 300;
  ctx.fillStyle = late && Math.floor(clock / 75) % 2 === 0 ? C.fire1 : C.fire2;
  ctx.fillRect(x - 1, top, 2, bottom - top);
  ctx.fillRect(x + w - 1, top, 2, bottom - top);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x - 2, top, 1, bottom - top);
  ctx.fillRect(x + w + 1, top, 1, bottom - top);
  // The shots' shadows, growing along the line as they come down.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = C.ink;
  for (let y = top + 36; y < bottom - 12; y += 72) disc(ctx, t.at.x, y, 1 + k * (t.radius - 4));
  ctx.globalAlpha = 1;
}

/**
 * The anchor's sweep: a wedge of the ground before him in pale steel, its
 * rim bright, filling round from one side to the other as he swings, so it
 * reads apart from a red circle and from a fiery line.
 */
function drawArc(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number): void {
  // The swing's progress in sixteenths, so its wedges are the same few each swing.
  const k = Math.round(telegraphProgress(t, clock) * 16) / 16;
  const facing = t.facing ?? 0;
  const half = (t.spread ?? Math.PI) / 2;
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = C.metal1;
  wedge(ctx, t.at.x, t.at.y, t.radius, facing, half);
  // The swing coming round, from one edge of the wedge towards the other.
  const from = facing - half;
  const sweep = 2 * half * k;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = C.white;
  wedge(ctx, t.at.x, t.at.y, t.radius, from + sweep / 2, sweep / 2);
  ctx.globalAlpha = 1;
  const late = t.lands - clock <= 300;
  ctx.fillStyle = late && Math.floor(clock / 75) % 2 === 0 ? C.white : C.metal2;
  wedge(ctx, t.at.x, t.at.y, t.radius, facing, half, t.radius - 2);
  ctx.fillStyle = C.ink;
  wedge(ctx, t.at.x, t.at.y, t.radius + 1, facing, half, t.radius);
  // The wedge's two straight edges.
  ctx.fillStyle = C.metal2;
  for (const a of [facing - half, facing + half]) {
    for (let r = 6; r < t.radius; r += 1)
      ctx.fillRect(
        Math.round(t.at.x + Math.cos(a) * r),
        Math.round(t.at.y + Math.sin(a) * r),
        1,
        1,
      );
  }
}

/**
 * A puff's cloud coming (a circle that leaves spores): drawn as a slam's is,
 * in the spores' greens, so what lands there and what it leaves read apart
 * from a red slam at a glance.
 */
function drawSporeCircle(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number): void {
  const k = telegraphProgress(t, clock);
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = C.spore3;
  disc(ctx, t.at.x, t.at.y, t.radius);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = C.spore2;
  disc(ctx, t.at.x, t.at.y, t.radius * k);
  ctx.globalAlpha = 1;
  const late = t.lands - clock <= 300;
  ctx.fillStyle = late && Math.floor(clock / 75) % 2 === 0 ? C.spore1 : C.spore2;
  ring(ctx, t.at.x, t.at.y, t.radius, 2);
  ctx.fillStyle = C.ink;
  ring(ctx, t.at.x, t.at.y, t.radius + 1, 1);
}

/** How many lanes' shapes are kept: a room has a hound or two, each charging a few times. */
const LANES_KEPT = 24;
/** Each lane's rows, worked out once while it is marked: a charge's ground is the same all along it. */
const laneRows = new Map<string, Spans>();

/** A lane's pixels as rows of runs, inside its edge (`radius` either side of its middle line). */
/** A lane's shape as text: what its pixels depend on (a battle's tick makes its marks anew). */
const laneKey = (t: Telegraph): string =>
  `${t.at.x},${t.at.y},${t.to?.x ?? t.at.x},${t.to?.y ?? t.at.y},${t.radius}`;

function laneSpans(t: Telegraph): Spans {
  let spans = laneRows.get(laneKey(t));
  if (spans) return spans;
  const to = t.to ?? t.at;
  const r = t.radius;
  const x0 = Math.floor(Math.min(t.at.x, to.x) - r - 1);
  const x1 = Math.ceil(Math.max(t.at.x, to.x) + r + 1);
  const y0 = Math.floor(Math.min(t.at.y, to.y) - r - 1);
  const y1 = Math.ceil(Math.max(t.at.y, to.y) + r + 1);
  const out: [number, number, number][] = [];
  for (let y = y0; y <= y1; y++) {
    let run: number | null = null;
    for (let x = x0; x <= x1 + 1; x++) {
      const inside = x <= x1 && laneDistance(t, { x: x + 0.5, y: y + 0.5 }) <= r;
      if (inside && run === null) run = x;
      if (!inside && run !== null) {
        out.push([y, run, x - run]);
        run = null;
      }
    }
  }
  spans = out;
  if (laneRows.size >= LANES_KEPT) laneRows.delete(laneRows.keys().next().value!);
  laneRows.set(laneKey(t), spans);
  return spans;
}

/** Each lane's edge pixels, all round (long sides as well as ends), worked out once. */
const laneEdges = new Map<string, readonly (readonly [x: number, y: number])[]>();

function laneEdge(t: Telegraph): readonly (readonly [x: number, y: number])[] {
  let edge = laneEdges.get(laneKey(t));
  if (edge) return edge;
  // Its pixels marked on a grid over its box, a pixel's border round it: an edge pixel is one
  // with a side not in the lane (a grid, not a set of names: a new lane is drawn in its frame).
  const spans = laneSpans(t);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [y, x, n] of spans) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x + n - 1);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const w = x1 - x0 + 3;
  const inside = new Uint8Array(Math.max(0, w * (y1 - y0 + 3)));
  const at = (x: number, y: number): number => (y - y0 + 1) * w + (x - x0 + 1);
  for (const [y, x, n] of spans) inside.fill(1, at(x, y), at(x, y) + n);
  const out: [number, number][] = [];
  for (const [y, x, n] of spans)
    for (let i = 0; i < n; i++) {
      const px = x + i;
      const k = at(px, y);
      if (!inside[k - 1] || !inside[k + 1] || !inside[k - w] || !inside[k + w]) out.push([px, y]);
    }
  edge = out;
  if (laneEdges.size >= LANES_KEPT) laneEdges.delete(laneEdges.keys().next().value!);
  laneEdges.set(laneKey(t), edge);
  return edge;
}

/** A lane's edge as runs along its rows (`laneEdge`'s pixels, joined), worked out once: two fills a run. */
const laneEdgeRows = new Map<string, Spans>();
function laneEdgeRuns(t: Telegraph): Spans {
  let runs = laneEdgeRows.get(laneKey(t));
  if (runs) return runs;
  const sorted = [...laneEdge(t)].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const out: [number, number, number][] = [];
  for (const [x, y] of sorted) {
    const last = out.at(-1);
    if (last && last[0] === y && last[1] + last[2] === x) last[2] += 1;
    else out.push([y, x, 1]);
  }
  runs = out;
  if (laneEdgeRows.size >= LANES_KEPT) laneEdgeRows.delete(laneEdgeRows.keys().next().value!);
  laneEdgeRows.set(laneKey(t), runs);
  return runs;
}

/**
 * The part of a lane filled as its charge comes (`k` of the way, 0 to 1,
 * from the charger's end): every pixel of it whose middle is no further
 * along than `k`, as runs along its rows. How far along a pixel is grows
 * steadily along its row, so what is filled of a row is one stretch from
 * the end nearer the charger, found by sum: one fill a row.
 */
export function laneFill(t: Telegraph, k: number): Spans {
  const to = t.to ?? t.at;
  const dx = to.x - t.at.x;
  const dy = to.y - t.at.y;
  const per = Math.hypot(dx, dy) ** 2 || 1;
  const step = dx / per;
  const out: [number, number, number][] = [];
  for (const [y, x, n] of laneSpans(t)) {
    const first = ((x + 0.5 - t.at.x) * dx + (y + 0.5 - t.at.y) * dy) / per;
    if (step === 0) {
      if (first <= k) out.push([y, x, n]);
    } else if (step > 0) {
      const m = Math.max(0, Math.min(n, Math.floor((k - first) / step + 1e-9) + 1));
      if (m > 0) out.push([y, x, m]);
    } else {
      const from = Math.max(0, Math.min(n, Math.ceil((k - first) / step - 1e-9)));
      if (from < n) out.push([y, x + from, n - from]);
    }
  }
  return out;
}

/**
 * A charge's lane: the ground it will run through, red as a slam's, edged,
 * filling from the charger's end as it comes, and chevrons marching along it
 * the way it will go, so which way it comes and where it stops read at once.
 */
function drawLane(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number): void {
  const k = telegraphProgress(t, clock);
  const to = t.to ?? t.at;
  const spans = laneSpans(t);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = C.red;
  for (const [y, x, n] of spans) ctx.fillRect(x, y, n, 1);
  // Filling from the charger toward the far end as the charge comes.
  const dx = to.x - t.at.x;
  const dy = to.y - t.at.y;
  const length = Math.hypot(dx, dy) || 1;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = C.red;
  for (const [y, x, n] of laneFill(t, k)) ctx.fillRect(x, y, n, 1);
  ctx.globalAlpha = 1;
  // The edge, all the way round: dark under, bright on top, so it reads on any floor.
  const late = t.lands - clock <= 300;
  const edge = laneEdgeRuns(t);
  ctx.fillStyle = C.ink;
  for (const [y, x, n] of edge) ctx.fillRect(x, y + 1, n, 1);
  ctx.fillStyle = late && Math.floor(clock / 75) % 2 === 0 ? C.fire1 : C.fire2;
  for (const [y, x, n] of edge) ctx.fillRect(x, y, n, 1);
  // Chevrons along the middle, marching the way it will run.
  const ux = dx / length;
  const uy = dy / length;
  const shift = (clock / 12) % 24;
  ctx.fillStyle = C.fire1;
  for (let s = 12 + shift; s < length - 8; s += 24) {
    const cx = t.at.x + ux * s;
    const cy = t.at.y + uy * s;
    for (let j = -4; j <= 4; j++) {
      const back = 4 - Math.abs(j);
      ctx.fillRect(Math.round(cx - ux * back - uy * j), Math.round(cy - uy * back + ux * j), 2, 2);
    }
  }
  // Where it stops: a bar across the far end.
  ctx.fillStyle = C.ink;
  for (let j = -t.radius; j <= t.radius; j++)
    ctx.fillRect(Math.round(to.x + ux * 2 - uy * j), Math.round(to.y + uy * 2 + ux * j), 2, 2);
}

function drawMark(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number): void {
  if (t.shape === 'line') drawLine(ctx, t, clock);
  else if (t.shape === 'arc') drawArc(ctx, t, clock);
  else if (t.shape === 'lane') drawLane(ctx, t, clock);
  else if (t.spores) drawSporeCircle(ctx, t, clock);
  else drawCircle(ctx, t, clock);
}

/**
 * Lane B's Burrow pieces (B20), each drawn once by a key naming the piece and
 * its frame (the art lane draws one afresh each time it is asked: a cloud's
 * spores every frame were a tenth of the frame's budget), and painted once
 * in each palette.
 */
const pieces = new Map<string, BurrowPiece2>();
const pieceCanvases = new Map<string, HTMLCanvasElement | null>();
function pieceOf(key: string, piece: () => BurrowPiece2): BurrowPiece2 {
  let made = pieces.get(key);
  if (!made) {
    made = piece();
    pieces.set(key, made);
  }
  return made;
}
function pieceCanvas(
  key: string,
  piece: () => BurrowPiece2,
  palette: CavePalette,
): { image: HTMLCanvasElement; anchor: Point } | null {
  const made = pieceOf(key, piece);
  const k = `${key} ${palette.key ?? palette.name}`;
  if (!pieceCanvases.has(k)) pieceCanvases.set(k, paintCells(made.picture, undefined, palette));
  const image = pieceCanvases.get(k);
  return image ? { image, anchor: made.anchor } : null;
}

/** Where a piece drawn at `at` (its anchor) lies, art pixels: for what must be drawn again. */
function pieceBox(key: string, piece: () => BurrowPiece2, at: Point): Box {
  const p = pieceOf(key, piece);
  return {
    x: Math.round(at.x - p.anchor.x) - 1,
    y: Math.round(at.y - p.anchor.y) - 1,
    w: p.picture.grid.w + 2,
    h: p.picture.grid.h + 2,
  };
}

/**
 * A cloud of spores as lane B draws it (B20: a haze the floor shows through,
 * drifting a frame at a time), fading as it settles, its edge kept solid in
 * a pixel's line so where it hurts is never in doubt; one burning off in a
 * lantern's light goes warm at the edge.
 */
function drawCloudArt(
  ctx: CanvasRenderingContext2D,
  c: Cloud,
  clock: number,
  palette: CavePalette,
): void {
  const r = Math.round(c.radius);
  const frame = Math.floor((clock - c.from) / SPORE_CLOUD2_FRAME_MS) % SPORE_CLOUD2_FRAMES;
  const art = pieceCanvas(`cloud ${r} ${frame}`, () => sporeCloud2(r, frame), palette);
  if (!art) return drawCloud(ctx, c, clock);
  const left = Math.max(0, c.until - clock);
  const fade = Math.min(1, left / 600);
  ctx.globalAlpha = (c.burning ? 0.6 : 1) * fade;
  ctx.drawImage(art.image, Math.round(c.at.x - art.anchor.x), Math.round(c.at.y - art.anchor.y));
  ctx.globalAlpha = 0.85 * fade;
  ctx.fillStyle = c.burning ? C.fire2 : C.spore1;
  ring(ctx, c.at.x, c.at.y, c.radius, 1);
  ctx.globalAlpha = 1;
}

/**
 * A cloud of spores where it hangs: a haze over the ground, specks drifting
 * in it, its edge solid so where it hurts is never in doubt; one burning off
 * in a lantern's light thins and goes warm at the edge.
 */
function drawCloud(ctx: CanvasRenderingContext2D, c: Cloud, clock: number): void {
  const left = Math.max(0, c.until - clock);
  const fade = Math.min(1, left / 600);
  ctx.globalAlpha = (c.burning ? 0.16 : 0.28) * fade;
  ctx.fillStyle = C.spore2;
  disc(ctx, c.at.x, c.at.y, c.radius);
  ctx.globalAlpha = 0.85 * fade;
  ctx.fillStyle = c.burning ? C.fire2 : C.spore1;
  ring(ctx, c.at.x, c.at.y, c.radius, 1);
  // Specks drifting up and round in it, the same few each time.
  ctx.fillStyle = c.burning ? C.flame : C.spore1;
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39996 + (clock - c.from) / (900 + i * 37);
    const r = c.radius * (0.25 + ((i * 0.37) % 0.7));
    const x = c.at.x + Math.cos(a) * r;
    const y = c.at.y + Math.sin(a) * r * 0.8 - ((clock / 40 + i * 7) % 10);
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

/** Where a lantern on a post's flame is, in the room: from its picture's light, over its foot. */
function flameOf(cell: Cell): Point {
  const foot = lampFoot(cell);
  const pic = lampPicture(true);
  if (!pic?.light) return { x: foot.x, y: foot.y - 44 };
  return { x: foot.x - pic.foot + pic.light.x, y: foot.y - pic.base + pic.light.y };
}

/** How long a lantern flares as the king comes up into its light and is dazzled by it. */
export const FLARE_MS = 900;

/**
 * A lantern flaring as the king comes up under it: a burst of light from its
 * flame, rays shooting out and fading, so where the dazzle came from (and
 * that the lantern went out with it) is seen. Art pixels.
 */
function drawFlare(ctx: CanvasRenderingContext2D, at: Point, age: number): void {
  const t = Math.min(1, Math.max(0, age / FLARE_MS));
  const x0 = Math.round(at.x);
  const y0 = Math.round(at.y);
  // The flash: a disc of white then gold, shrinking.
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = t < 0.3 ? C.white : C.gold;
  disc(ctx, x0, y0, 7 * (1 - t) + 2);
  // Eight rays, out from the flame.
  const reach = 8 + 22 * t;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    for (let r = 4 + 14 * t; r < reach; r += 1)
      ctx.fillRect(Math.round(x0 + Math.cos(a) * r), Math.round(y0 + Math.sin(a) * r * 0.8), 2, 2);
  }
  ctx.globalAlpha = 1;
}

/** A boss under the ground: a mound of earth heaving where it is, a few clods flying off it. */
function drawMound(ctx: CanvasRenderingContext2D, at: Point, clock: number): void {
  const heave = Math.floor(clock / 140) % 3;
  const x = Math.round(at.x);
  const y = Math.round(at.y);
  ctx.fillStyle = C.ink;
  oval(ctx, x, y - 2, 17, 6);
  ctx.fillStyle = C.dirt2;
  for (let dy = 0; dy < 7 + heave; dy++) {
    const half = Math.round(16 * Math.sqrt(1 - (dy / (8 + heave)) ** 2));
    ctx.fillRect(x - half, y - 2 - dy, 2 * half + 1, 1);
  }
  ctx.fillStyle = C.dirt1;
  for (let dy = 3; dy < 7 + heave; dy++) {
    const half = Math.round(9 * Math.sqrt(1 - (dy / (8 + heave)) ** 2));
    ctx.fillRect(x - half - 3, y - 2 - dy, 2 * half, 1);
  }
  for (let i = 0; i < 3; i++) {
    const t = (((clock / 500 + i / 3) % 1) + 1) % 1;
    ctx.fillRect(
      Math.round(x + (i - 1) * 9 * t),
      Math.round(y - 10 - Math.sin(Math.PI * t) * 12),
      2,
      2,
    );
  }
}

/** A blow landing: the shape flashing, a keg's blast or its hiss, a volley's splashes down its line. */
function drawLanded(
  ctx: CanvasRenderingContext2D,
  e: Extract<Effect, { kind: 'landed' }>,
  clock: number,
): void {
  const age = clock - e.from;
  if (e.doused) {
    // A keg in the water: a puff of steam, and nothing more.
    const k = age / EFFECT_MS;
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.fillStyle = C.smoke;
    for (const [dx, dy, r] of [
      [0, -6, 4],
      [-6, -10, 3],
      [6, -13, 3],
    ] as const)
      disc(ctx, e.at.x + dx, e.at.y + dy - k * 15, r + k * 3);
    ctx.globalAlpha = 1;
    return;
  }
  if (age >= LANDED_MS) return;
  const fade = 1 - age / LANDED_MS;
  const t = e.mark;
  ctx.globalAlpha = 0.7 * fade;
  if (t.shape === 'line') {
    ctx.fillStyle = C.fire1;
    const top = Math.round(t.at.y);
    const bottom = Math.round(t.bottom ?? t.at.y);
    ctx.fillRect(Math.round(t.at.x - t.radius), top, Math.round(2 * t.radius), bottom - top);
    ctx.fillStyle = C.foam;
    for (let y = top + 36; y < bottom - 12; y += 72) disc(ctx, t.at.x, y, t.radius + 3);
  } else if (t.shape === 'arc') {
    ctx.fillStyle = C.white;
    wedge(ctx, t.at.x, t.at.y, t.radius, t.facing ?? 0, (t.spread ?? Math.PI) / 2);
  } else {
    ctx.fillStyle = C.fire1;
    disc(ctx, e.at.x, e.at.y, e.radius);
  }
  ctx.globalAlpha = 1;
}

/* ----- Drawing at the screen's resolution: words and thin lines ----- */

/**
 * Words with a dark edge, centred on `x`, so they read over any ground.
 * `size` and the edge are in CSS pixels; `k` is art pixels per CSS pixel.
 */
function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  colour: string,
  k: number,
  font = FONT,
): void {
  ctx.font = `${size * k}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * k;
  ctx.strokeStyle = C.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
}

/** Words over a speaker's head, in a box with a tail, kept inside the room. */
function speech(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  k: number,
  // Never higher than this (clear of the panels along the top): under its feet instead, from `feet`.
  minTop = -Infinity,
  feet = y,
): void {
  ctx.font = `${13 * k}px ${WORDS}`;
  const pad = 6 * k;
  const w = Math.ceil(ctx.measureText(text).width) + 2 * pad;
  const h = 18 * k;
  const left = Math.min(Math.max(4, x - w / 2), width - w - 4);
  const above = y - h - 6 * k;
  const under = above < minTop;
  const top = under ? feet + 6 * k : above;
  // The tail points at the speaker: down from a bubble over its head, up from one under its feet.
  const tail = under ? top - 5 * k : top + h;
  ctx.fillStyle = C.ink;
  ctx.fillRect(left - k, top - k, w + 2 * k, h + 2 * k);
  ctx.fillRect(x - 4 * k, tail, 9 * k, 5 * k);
  ctx.fillStyle = C.white;
  ctx.fillRect(left, top, w, h);
  ctx.fillRect(x - 3 * k, under ? tail + 2 * k : tail, 7 * k, 3 * k);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, left + pad, top + 13 * k);
}

/** How tall a foe stands above its feet, as drawn: its drawing or its tap box, whichever is taller. */
function standsOf(monster: string): number {
  const size = sizeOf(monster);
  return Math.max(size.tall, foeKind(monster).box.h);
}

/** A foe's health over its head, its blow coming, a parrot's rally on it, and the target's mark. */
function drawFoeOver(
  ctx: CanvasRenderingContext2D,
  battle: Battle,
  foe: Foe,
  shownX: number,
  lift: number,
  targeted: boolean,
  k: number,
): void {
  const def = battle.monsters[foe.monster]!;
  const kind = foeKind(foe.monster);
  const w = Math.max(24, Math.min(54, kind.box.w));
  const x = shownX - w / 2;
  const y = Math.round(foe.at.y - lift - standsOf(foe.monster) - 8);
  const bar = 4 * k;
  if (!kind.boss) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(x - k, y - k, w + 2 * k, bar + 2 * k);
    ctx.fillStyle = C.shade;
    ctx.fillRect(x, y, w, bar);
    ctx.fillStyle = C.hurt;
    ctx.fillRect(x, y, (w * foe.hp) / def.hp, bar);
  }
  if (foe.engaged && !foe.heavy) {
    // The next ordinary blow, filling; it turns hot just before it falls.
    const f = Math.min(1, Math.max(0, 1 - foe.blowMs / def.speedMs));
    ctx.fillStyle = C.ink;
    ctx.fillRect(x - k, y + bar + k, w + 2 * k, 3 * k);
    ctx.fillStyle = foe.blowMs <= 500 ? C.fire1 : C.metal2;
    ctx.fillRect(x, y + bar + 2 * k, w * f, k);
  }
  if (foe.rallied) {
    // Egged on by the parrot: a pair of bold green chevrons over his head, flickering.
    const on = Math.floor(battle.clock / 200) % 2 === 0;
    const cx = shownX + w / 2 + 4 * k;
    const cy = y - 12 * k;
    const s = 2 * k;
    ctx.fillStyle = C.ink;
    ctx.fillRect(cx - k, cy - k, 15 * k, 12 * k);
    ctx.fillStyle = on ? C.green : C.greenDark;
    for (const dx of [0, 6]) {
      for (let i = 0; i < 5; i++) {
        const off = i < 3 ? i : 4 - i;
        ctx.fillRect(cx + (dx + off) * k, cy + i * s, s, s);
      }
    }
  }
  if (foe.heavy) {
    // Winding up something big.
    const blink = Math.floor(battle.clock / 120) % 2 === 0;
    label(ctx, '!', shownX, y - 3 * k, 18, blink ? C.fire1 : C.fire2, k);
  } else if (targeted) {
    const tx = shownX;
    const ty = y - 5 * k;
    ctx.fillStyle = C.ink;
    ctx.fillRect(tx - 6 * k, ty - 6 * k, 13 * k, 3 * k);
    ctx.fillRect(tx - 5 * k, ty - 3 * k, 11 * k, 3 * k);
    ctx.fillRect(tx - 3 * k, ty, 7 * k, 3 * k);
    ctx.fillStyle = C.gold;
    ctx.fillRect(tx - 5 * k, ty - 5 * k, 11 * k, k);
    ctx.fillRect(tx - 4 * k, ty - 2 * k, 9 * k, k);
    ctx.fillRect(tx - 2 * k, ty + k, 5 * k, k);
  }
}

/** The module's `label`, by another name where a function shadows it. */
const drawLabel = (...a: Parameters<typeof label>): void => label(...a);

/** A number, a word or a glint over someone, drawn at the screen's resolution. */
function drawEffectOver(
  ctx: CanvasRenderingContext2D,
  e: Effect,
  clock: number,
  hero: Point,
  heroTall: number,
  k: number,
  nudge = 0,
  top = -Infinity,
): void {
  // A word is never put higher than `top` (art pixels): clear of the panels along the top.
  const label = (
    c: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    ...rest: [number, string, number, string?]
  ): void => drawLabel(c, text, x, Math.max(y, top + rest[0] * rest[2]), ...rest);
  const age = clock - e.from;
  const t = age / EFFECT_MS;
  const rise = Math.round(t * 18);
  ctx.globalAlpha = t > 0.66 ? Math.max(0, (1 - t) * 3) : 1;
  const overHero = hero.y - heroTall - 6;
  switch (e.kind) {
    case 'hit': {
      const top = e.on === 'hero' ? overHero : e.at.y - 12;
      const x = (e.on === 'hero' ? hero.x - 14 : e.at.x) + nudge;
      label(ctx, String(e.amount), x, top - rise, 18, e.on === 'hero' ? C.hurt : C.white, k);
      break;
    }
    case 'miss': {
      const top = e.on === 'hero' ? overHero : e.at.y - 12;
      const x = (e.on === 'hero' ? hero.x - 14 : e.at.x) + nudge;
      label(ctx, 'miss', x, top - rise, 13, C.metal2, k, WORDS);
      break;
    }
    case 'heal':
      label(ctx, `+${e.amount}`, hero.x + 18, overHero - rise, 17, C.heal, k);
      break;
    case 'empty':
      label(ctx, 'Out of arrows', hero.x, overHero - 4 - rise, 13, C.sand, k, WORDS);
      break;
    case 'splash':
      label(ctx, 'splash', e.at.x, e.at.y - heroTall - 12 - rise, 13, C.white, k, WORDS);
      break;
    case 'landed':
      if (e.doused) label(ctx, 'fizz', e.at.x, e.at.y - 26 - rise, 13, C.smoke, k, WORDS);
      break;
    case 'reel':
      label(ctx, 'Staggered!', e.at.x, e.at.y - 22 - rise, 14, C.gold, k, WORDS);
      break;
    case 'blocked':
      label(ctx, 'Blocked', e.at.x, e.at.y - 12 - rise, 14, C.metal2, k, WORDS);
      break;
    case 'dazzled':
      label(ctx, 'Dazzled!', e.at.x, e.at.y - 12 - rise, 15, C.flame, k, WORDS);
      break;
    case 'interrupted':
      label(ctx, 'Put out!', hero.x, overHero - 4 - rise, 14, C.hurt, k, WORDS);
      break;
    case 'lit':
      label(ctx, 'Lit', e.at.x, e.at.y - 70 - rise, 14, C.flame, k, WORDS);
      break;
    case 'snuffed':
      label(ctx, 'Out', e.at.x, e.at.y - 70 - rise, 14, C.smoke, k, WORDS);
      break;
    default:
      break;
  }
  ctx.globalAlpha = 1;
}

/** Things in the air or on the floor drawn in art pixels: loot glints, arrows, foam, dust, a swing. */
function drawEffectArt(ctx: CanvasRenderingContext2D, e: Effect, clock: number): void {
  const age = clock - e.from;
  const t = age / EFFECT_MS;
  const rise = Math.round(t * 18);
  ctx.globalAlpha = t > 0.66 ? Math.max(0, (1 - t) * 3) : 1;
  switch (e.kind) {
    case 'loot':
      ctx.fillStyle = C.gold;
      for (const [dx, dy] of [
        [0, 0],
        [-6, 4],
        [6, 3],
      ] as const)
        ctx.fillRect(Math.round(e.at.x) + dx, Math.round(e.at.y) - 12 - rise * 2 + dy, 1, 3);
      break;
    case 'shot': {
      if (age > ARROW_MS) break;
      ctx.globalAlpha = 1;
      const k = age / ARROW_MS;
      const from = { x: e.at.x, y: e.at.y - 34 };
      const to = { x: e.to.x, y: e.to.y - 14 };
      const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      const ux = (to.x - from.x) / len;
      const uy = (to.y - from.y) / len;
      const x = from.x + (to.x - from.x) * k;
      const y = from.y + (to.y - from.y) * k;
      ctx.fillStyle = C.wood;
      for (let i = 1; i < 10; i++)
        ctx.fillRect(Math.round(x - ux * i), Math.round(y - uy * i), 1, 1);
      ctx.fillStyle = C.metal1;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      break;
    }
    case 'splash': {
      // Washed off: rings of foam spreading where he stood.
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = C.foam;
      ring(ctx, e.at.x, e.at.y, 6 + t * 21, 1);
      ring(ctx, e.at.x, e.at.y, 3 + t * 12, 1);
      break;
    }
    case 'lit': {
      // A lantern catching: a ring of light spreading from its flame.
      const at = { x: e.at.x, y: e.at.y - 44 };
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = C.flame;
      ring(ctx, at.x, at.y, 4 + t * 30, 1);
      ring(ctx, at.x, at.y, 2 + t * 16, 1);
      break;
    }
    case 'snuffed': {
      // Put out: a curl of smoke from where the flame was.
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = C.smoke;
      for (const [dx, dy, r] of [
        [0, -44, 3],
        [-4, -50, 2],
        [3, -56, 2],
      ] as const)
        disc(ctx, e.at.x + dx + Math.sin(t * 6 + dy) * 2, e.at.y + dy - t * 14, r + t * 2);
      break;
    }
    case 'charge': {
      // The charge itself, a streak down its lane in the first moment after it lands.
      if (age > 260) break;
      const k = age / 260;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = C.wood;
      for (let i = 0; i < 24; i++) {
        const f = Math.max(0, k - i / 60);
        ctx.fillRect(
          Math.round(e.at.x + (e.to.x - e.at.x) * f),
          Math.round(e.at.y + (e.to.y - e.at.y) * f) - 10 + (i % 3) * 4,
          3,
          1,
        );
      }
      break;
    }
    case 'erupt': {
      // Up out of the ground: clods thrown out and falling.
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = C.dirt1;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const d = 6 + t * 30;
        ctx.fillRect(
          Math.round(e.at.x + Math.cos(a) * d),
          Math.round(e.at.y + Math.sin(a) * d * 0.6 - Math.sin(Math.PI * t) * 16),
          3,
          3,
        );
      }
      break;
    }
    case 'released': {
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = C.stone;
      for (const [dx, dy] of [
        [-9, -3],
        [8, -6],
        [0, 4],
        [-4, 8],
      ] as const)
        ctx.fillRect(Math.round(e.at.x + dx * (1 + t)), Math.round(e.at.y + dy * (1 + t)), 2, 2);
      break;
    }
    default:
      break;
  }
  ctx.globalAlpha = 1;
}

/* ----- The room's pieces a fight adds ----- */

const around = (at: Point, r: number): Box => ({
  x: Math.floor(at.x - r - 2),
  y: Math.floor(at.y - r - 2),
  w: Math.ceil(2 * r + 5),
  h: Math.ceil(2 * r + 5),
});

function markBox(t: Telegraph): Box {
  if (t.shape === 'lane') {
    const to = t.to ?? t.at;
    const r = t.radius + 6;
    const x = Math.floor(Math.min(t.at.x, to.x) - r);
    const y = Math.floor(Math.min(t.at.y, to.y) - r);
    return {
      x,
      y,
      w: Math.ceil(Math.max(t.at.x, to.x) + r) - x + 1,
      h: Math.ceil(Math.max(t.at.y, to.y) + r) - y + 1,
    };
  }
  if (t.shape === 'line') {
    const top = Math.floor(t.at.y) - 2;
    return {
      x: Math.floor(t.at.x - t.radius) - 4,
      y: top,
      w: Math.ceil(2 * t.radius) + 9,
      h: Math.ceil((t.bottom ?? t.at.y) - top) + 4,
    };
  }
  return around(t.at, t.radius + 2);
}

/** The ground the sea is about to cover in a room: each tile that changes at the next rise. */
const coming = new WeakMap<Room, Map<number, Cell[]>>();

function aboutToFlood(room: Room, level: number): Cell[] {
  let byLevel = coming.get(room);
  if (!byLevel) {
    byLevel = new Map();
    coming.set(room, byLevel);
  }
  let cells = byLevel.get(level);
  if (!cells) {
    cells = [];
    const g = room.ground;
    const all = { level, shut: false, released: g.bars.length };
    for (let row = 0; row < g.rows; row++) {
      for (let col = 0; col < g.cols; col++) {
        if (g.heights[row]![col]! < 0) continue;
        if (tileAt(g, col, row, all) !== tileAt(g, col, row, { ...all, level: level + 1 }))
          cells.push({ col, row });
      }
    }
    byLevel.set(level, cells);
  }
  return cells;
}

/** The sea creeping in over ground it is about to cover: foam ripples drifting across it. */
function drawRipples(ctx: CanvasRenderingContext2D, cells: readonly Cell[], clock: number): void {
  const phase = Math.floor(clock / 160);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = C.foam;
  for (const c of cells) {
    const x = c.col * T;
    const y = c.row * T;
    for (let i = 0; i < 2; i++) {
      const row = (((c.col * 5 + c.row * 3 + i * 7 + phase) % 6) + 6) % 6;
      const at = ((c.col * 11 + i * 5 + phase * 2) % 16) + 2;
      ctx.fillRect(x + at, y + 3 + row * 3 + i * 4, 6, 1);
    }
  }
  ctx.globalAlpha = 1;
}

/** Loot on the floor as drawn: its picture, and where on it the floor is. */
export interface LootArt {
  readonly image: HTMLCanvasElement;
  readonly feet: Point;
}

/**
 * Loot on the floor: the art lane's `loot_pile` prop (`dungeonProp2`), stood
 * on its foot, in the cave's dusk. Null where nothing can be painted.
 */
export function lootArt(): LootArt | null {
  const pile = dungeonProp2('loot_pile');
  const image = pile && dungeonPropSprite2('loot_pile', CAVE_DUSK);
  return pile && image ? { image, feet: { x: pile.foot, y: pile.base } } : null;
}

/** The half-width of a lit fuse's glow on its canvas. */
const FUSE_R = Math.ceil(FUSE_LIGHT2.radius);
/** How many strengths of a fuse's flicker are painted. */
const FUSE_STEPS = 4;
const fuseGlows: (HTMLCanvasElement | null)[] = [];

/**
 * A lit fuse's light on what is about it, at a strength (its glow wavering
 * by `flicker2`): light alone, laid over the ground under everyone, in a few
 * painted steps of strength.
 */
function fuseGlow(strength: number): HTMLCanvasElement | null {
  if (typeof ImageData === 'undefined' || typeof document === 'undefined') return null;
  const i = Math.max(
    0,
    Math.min(FUSE_STEPS - 1, Math.round((strength / FUSE_LIGHT2.strength) * (FUSE_STEPS - 1))),
  );
  if (fuseGlows[i] !== undefined) return fuseGlows[i]!;
  const size = 2 * FUSE_R + 1;
  const px = new Float64Array(size * size * 4);
  // Half the fuse's strength on the ground: the flame is in his hands, above it.
  addGlow(px, size, size, {
    x: FUSE_R + 0.5,
    y: FUSE_R + 0.5,
    radius: FUSE_LIGHT2.radius,
    strength: (0.5 * FUSE_LIGHT2.strength * (i + 1)) / FUSE_STEPS,
  });
  const data = new Uint8ClampedArray(px.length);
  for (let j = 0; j < px.length; j++) data[j] = px[j]!;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d')?.putImageData(new ImageData(data, size, size), 0, 0);
  fuseGlows[i] = canvas;
  return canvas;
}

/** The pictures a run's fight is drawn with that do not change with the foe: kept per room look. */
export interface FightArt {
  readonly foes: FoePictures;
  readonly shadows: Map<string, CaveShadow>;
  readonly loot: LootArt | null;
  /**
   * How open the doors were drawn last frame, and the doors' pictures then: a
   * change (fading, or a run put in place with them open) draws them again.
   */
  readonly doorsDrawn: { opening: number; shown: readonly unknown[] | null };
}

/** What a fight in a room draws with, made once for the room's look. */
/** Foes' lit pictures kept for every look of a room by its lanterns (they share its ground). */
const foesKept = new WeakMap<object, Map<string, Map<string, HTMLCanvasElement | null>>>();

export function fightArtFor(look: RoomLook): FightArt {
  let kept = foesKept.get(look.room.ground);
  if (!kept) {
    kept = new Map();
    foesKept.set(look.room.ground, kept);
  }
  return {
    foes: new FoePictures(look.glows, look.theme.palette, kept),
    shadows: new Map(),
    loot: lootArt(),
    doorsDrawn: { opening: -1, shown: null },
  };
}

/* ----- The way onward ----- */

/** How long, once a room's doors open, the way onward pulses before its arrow only bobs. */
export const WAY_PULSE_MS = 2400;
/** How long a tap on a barred door says so. */
export const BARRED_SAY_MS = 1200;

/**
 * How far a room's doors have opened, 0 (barred) to 1 (open), on the fight's
 * clock: they fade from barred to open over `DOOR_LIFT_MS` once the room is
 * clear, the light from beyond coming on as they do.
 */
export function doorsOpen(battle: Battle, room: string): number {
  if (roomLocked(battle, room)) return 0;
  const at = battle.opened[room];
  if (at === undefined) return 1;
  return Math.max(0, Math.min(1, (battle.clock - at) / DOOR_LIFT_MS));
}

/**
 * The doors in the run's room that are the way onward: open, and leading to
 * a room not yet cleared. None while the room is shut, and none in the last
 * room (it has no door onward). Drawing only: the rules let him through any
 * open door.
 */
export function wayOnward(dungeon: Dungeon, run: Run): Door[] {
  const battle = run.battle;
  if (!battle || run.finished || roomLocked(battle, run.room)) return [];
  const room = dungeon.rooms[run.room];
  if (!room) return [];
  return room.doors.filter((d) => battle.opened[d.to] === undefined);
}

/** Which way is out through a door: -1 west, 1 east (0 for a door in the wall the viewer faces). */
const outward = (door: Door): number => Math.sign(door.cell.col - door.inside.col);

/** What a fight's frame is told beyond the run: what is on screen, and a tap on a barred door. */
export interface FightExtraOptions {
  /** What the camera showed last frame, in art pixels, less the edges kept for buttons. */
  readonly view?: Box | null;
  /** A barred door tapped, by letter, and when on the fight's clock. */
  readonly barredTap?: { readonly letter: string; readonly at: number } | null;
}

/** A chevron pointing `dir` (-1 left, 1 right), `size` CSS pixels tall, centred on (x, y). */
function chevron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  size: number,
  k: number,
): void {
  const h = (size * k) / 2;
  const w = h * 0.9;
  ctx.beginPath();
  ctx.moveTo(x - dir * w, y - h);
  ctx.lineTo(x + dir * w, y);
  ctx.lineTo(x - dir * w, y + h);
  ctx.lineTo(x - dir * w * 0.15, y);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * k;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.fillStyle = C.gold;
  ctx.fill();
}

/** How far above a door's middle its arrow is drawn: over its opening, clear of the floor. */
const WAY_RISE = 30;

/**
 * The way onward marked at the screen's resolution: over each door onward a
 * gold arrow bobbing out through it, rings spreading from it for the first
 * moments after it opens, and, while it is off the screen, an arrow at the
 * screen's edge pointing to it. Gives the boxes it draws in (art pixels).
 */
export function wayMarks(
  dungeon: Dungeon,
  run: Run,
  view?: Box | null,
): { boxes: Box[]; edges: Point[]; draw: (ctx: CanvasRenderingContext2D, k: number) => void } {
  const battle = run.battle;
  const doors = battle && !run.doorway ? wayOnward(dungeon, run) : [];
  if (!battle || doors.length === 0) return { boxes: [], edges: [], draw: () => {} };
  const clock = battle.clock;
  const since = clock - (battle.opened[run.room] ?? -Infinity);
  const boxes: Box[] = [];
  const edges: Point[] = [];
  const marks = doors.map((door) => {
    const cx = door.cell.col * T + T / 2;
    const cy = door.cell.row * T + T / 2;
    const dir = outward(door) || 1;
    const onScreen =
      !view || (cx >= view.x && cx <= view.x + view.w && cy >= view.y && cy <= view.y + view.h);
    boxes.push({ x: cx - 60, y: cy - WAY_RISE - 60, w: 120, h: 120 });
    let edge: Point | null = null;
    if (!onScreen && view) {
      const m = 14;
      edge = {
        x: Math.max(view.x + m, Math.min(view.x + view.w - m, cx)),
        y: Math.max(view.y + m, Math.min(view.y + view.h - m, cy - WAY_RISE)),
      };
      edges.push(edge);
      boxes.push({ x: edge.x - 30, y: edge.y - 30, w: 60, h: 60 });
    }
    return { cx, cy, dir, edge, toward: Math.sign(cx - (edge?.x ?? cx)) || dir };
  });
  return {
    boxes,
    edges,
    draw(ctx, k) {
      // A bob out through the door, once every 900 ms.
      const bob = Math.sin((clock / 900) * 2 * Math.PI) * 0.5 + 0.5;
      const fresh = since < WAY_PULSE_MS;
      for (const m of marks) {
        if (fresh) {
          // Rings spreading from the door as it opens, two at a time.
          for (const phase of [0, 0.5]) {
            const p = (((since / 1200 + phase) % 1) + 1) % 1;
            const r = 10 + p * 40;
            ctx.globalAlpha = (1 - p) * 0.9;
            ctx.strokeStyle = C.gold;
            ctx.lineWidth = 2 * k;
            ctx.beginPath();
            ctx.ellipse(m.cx, m.cy - 6, r, r * 0.8, 0, 0, 2 * Math.PI);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        chevron(ctx, m.cx + m.dir * bob * 4 * k, m.cy - WAY_RISE, m.dir, fresh ? 24 : 18, k);
        if (m.edge) chevron(ctx, m.edge.x + m.toward * bob * 5 * k, m.edge.y, m.toward, 28, k);
      }
    },
  };
}

/** The ground's state of the tide in a run, as the room's look keys it. */
export function tideStateOf(dungeon: Dungeon, run: Run): { level: number; warn: boolean } {
  if (!run.battle) return { level: 0, warn: false };
  const tide = tideOf(run.battle, placeOf(dungeon, run));
  return { level: tide.level, warn: rising(tide, run.battle.clock) };
}

/** How tall the hero stands above his feet, for what floats over him. */
export const HERO_TALL = 66;

/** Half the hero's body across, in art pixels, as `apart.ts` reckons him: his box, less its edge. */
export const HERO_HALF = 13;

/**
 * Everyone fighting in a run's room as `shownApart` reckons them: the hero,
 * and each foe standing on the ground (or falling, counting less as it
 * goes), its body either side of its feet from the art lane's sizes. A bird
 * in the air, someone behind bars, and a crew that has fled are left out.
 */
export function fightFigures(dungeon: Dungeon, run: Run): Figure[] {
  const battle = run.battle;
  const hero: Figure = {
    key: 'hero',
    at: run.play.walker.at,
    left: HERO_HALF,
    right: HERO_HALF,
    rank: 0,
    weight: 1,
  };
  if (!battle) return [hero];
  const place = placeOf(dungeon, run);
  const out: Figure[] = [hero];
  for (const foe of battle.foes) {
    if (foe.room !== run.room || foe.fled || foe.under || held(battle, place, foe)) continue;
    if (foe.flight && foe.flight.mode !== 'down') continue;
    const weight = alive(foe) ? 1 : Math.max(0, 1 - (battle.clock - foe.diedAt!) / FALL_MS);
    if (weight <= 0) continue;
    const size = sizeOf(foe.monster);
    // A body centred off its feet (`mid`) has a box as wide as all of it: less that, as before.
    const half = size.box.w / 2 - Math.abs(size.mid ?? 0);
    // The body ahead of the feet and behind them, less a weapon held clear of it.
    const front = Math.min(size.front, half + 8);
    const back = Math.min(size.back, half + 8);
    const right = foe.facing === 'right';
    out.push({
      key: foe.key,
      at: foe.at,
      left: right ? back : front,
      right: right ? front : back,
      rank: foeKind(foe.monster).boss || size.box.w >= 48 ? 2 : 1,
      weight,
    });
  }
  return out;
}

/** How far to the side each figure in a run's room is drawn from its feet, by key (`'hero'` for him). */
export function fightApart(dungeon: Dungeon, run: Run): Map<string, number> {
  return shownApart(fightFigures(dungeon, run));
}

const dimmed = new WeakMap<object, Partial<Record<1 | 2, HTMLCanvasElement>>>();

/**
 * A figure as a darker day shows it beyond the light: its own pixels, each
 * taken toward the cave's night as the ground is (`IN_THE_DARK`), its shape and outline
 * whole, so it reads as something there in the dark. Kept for each picture.
 * Where nothing can paint (tests), the picture as it is.
 */
export function inTheDark<T extends CanvasImageSource & { width: number; height: number }>(
  image: T,
  how: 1 | 2,
): T | HTMLCanvasElement {
  let made = dimmed.get(image);
  if (made?.[how]) return made[how]!;
  if (typeof document === 'undefined' || !(image.width > 0)) return image;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return image;
  ctx.drawImage(image, 0, 0);
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const k = IN_THE_DARK[how];
  const d = px.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    d[i] = Math.round(d[i]! * k + NIGHT_RGB[0] * (1 - k));
    d[i + 1] = Math.round(d[i + 1]! * k + NIGHT_RGB[1] * (1 - k));
    d[i + 2] = Math.round(d[i + 2]! * k + NIGHT_RGB[2] * (1 - k));
  }
  ctx.putImageData(px, 0, 0);
  made ??= {};
  made[how] = canvas;
  dimmed.set(image, made);
  return canvas;
}

/**
 * Everything a run's fight adds to the stage this frame: the cast standing,
 * their shadows, what lies on the ground, what is over them in art pixels,
 * and the words and lines at the screen's resolution.
 */
export function fightExtra(
  dungeon: Dungeon,
  run: Run,
  look: RoomLook,
  art: FightArt,
  options: FightExtraOptions = {},
): StageExtra {
  const battle = run.battle;
  if (!battle) return { actors: [], boxes: [] };
  const clock = battle.clock;
  const hero = run.play.walker.at;
  const room = dungeon.rooms[run.room]!;
  const place = placeOf(dungeon, run);
  const state = tideStateOf(dungeon, run);
  // The doors: barred while anything in the room stands, then open, fading in with the light beyond.
  const opening = doorsOpen(battle, run.room);
  const doors = look.doorsAt(state.level, state.warn);
  const cells = look.cellsAt(state.level, state.warn, opening > 0);
  const kinds = look.kindsAt(state.level, state.warn);
  const here = battle.foes.filter(
    (f) => f.room === run.room && !f.fled && (alive(f) || clock - f.diedAt! < FALL_MS),
  );
  // Drawn a little apart where two would be painted over each other; nobody's place in the fight moves.
  const apart = fightApart(dungeon, run);
  const shownX = (foe: Foe): number => foe.at.x + (apart.get(foe.key) ?? 0);
  // The middle of its body as drawn: a long tail puts it behind the feet (`bodyMid`).
  const midX = (foe: Foe): number => shownX(foe) + bodyMid(foe.monster, foe.facing);
  const actors: Standing[] = [];
  const shadows: Placed[] = [];
  const fuses: Point[] = [];
  const boxes: Box[] = [];
  // A darker day, or a room of lanterns: the lanterns' pools as the look shown has them (those
  // burning; an open door's light too), and his own.
  const seenRoom = look.room;
  const dark = isDark(seenRoom);
  const heroPool = heroPoolIn(seenRoom);
  const pools = dark
    ? [
        ...lightsOf(seenRoom),
        ...(opening > 0 ? doorPieces(seenRoom).flatMap((d) => (d.light ? [d.light] : [])) : []),
      ]
    : [];
  // The room's rule for its dark, and its pools with his own light among them (for a figure's level).
  const rule = nightRule(seenRoom);
  const poolsAndHero: Light2[] = dark
    ? [
        ...pools,
        {
          x: hero.x,
          y: hero.y - HERO_POOL_RISE,
          drop: 0,
          pool: heroPool,
          radius: 0,
          strength: 0,
          flicker: 0,
        },
      ]
    : [];
  // The room's dark layers (shut doors only: an open door's light is not in them) and his own light.
  const layers = dark && opening === 0 ? look.darkAt(state.level, state.warn) : null;
  const own = layers ? ownLight(heroPool) : null;
  own?.placeAt(hero);
  // A boss under the ground is a heaving mound, not a body; what it is about to do is marked.
  const mounds: Point[] = [];
  for (const foe of here) {
    if (foe.under && alive(foe)) {
      if (foe.heavy) boxes.push(markBox(foe.heavy));
      // Sinking out of sight where it went down (lane B's `burrow`), and then only its mound.
      const dive = diveShown(foe, clock, battle.effects);
      const sinking =
        dive &&
        art.foes.at(
          foe.monster,
          foe.key,
          {
            pose: 'idle',
            frame: dive.frame,
            facing: foe.facing,
            phase: Math.max(1, foe.phase),
            special: 'burrow',
          },
          { x: Math.round(dive.at.x), y: Math.round(dive.at.y) },
          // In the dark, as dark as where it went down (as any figure: by the level at its feet).
          dark && rule.palette(1)
            ? (rule.palette(Math.min(rule.levelAt(poolsAndHero, dive.at.x, dive.at.y), 3)) ??
                look.theme.palette)
            : look.theme.palette,
        );
      if (dive && sinking) {
        const x = Math.round(dive.at.x) - sinking.feet.x;
        const y = Math.round(dive.at.y) - sinking.feet.y;
        actors.push({ image: sinking.image, x, y, base: Math.round(dive.at.y) });
        boxes.push({ x: x - 1, y: y - 1, w: sinking.image.width + 2, h: sinking.image.height + 2 });
        continue;
      }
      mounds.push(foe.at);
      boxes.push(
        around(foe.at, 30),
        pieceBox('mound 0', () => burrowMound2(0), foe.at),
      );
      continue;
    }
    // A fallen foe blinks out at the last.
    if (!alive(foe) && clock - foe.diedAt! > FALL_MS - 240 && Math.floor(clock / 80) % 2 === 1)
      continue;
    const def = battle.monsters[foe.monster];
    const kind = foeKind(foe.monster);
    const shown = foePose(foe, clock, def?.speedMs ?? 2000, kind, battle.effects);
    const lift = liftOf(room, foe);
    // A hound still running down its lane is drawn on its way (it is at the end by the rules).
    const running = chargeShownAt(foe, clock, battle.effects);
    const feet = running
      ? { x: Math.round(running.x), y: Math.round(running.y) - lift }
      : { x: Math.round(shownX(foe)), y: Math.round(foe.at.y) - lift };
    // In a room painted by palettes (the Burrow), a figure is drawn in the palette of the level of
    // the dark at its feet (its own light, if it carries one, keeps it lit).
    const level =
      dark && rule.palette(1) && !carriesLight(foe.monster, shown)
        ? Math.min(rule.levelAt(poolsAndHero, foe.at.x, foe.at.y), 3)
        : 0;
    const drawn = art.foes.at(
      foe.monster,
      foe.key,
      shown,
      feet,
      level > 0 ? rule.palette(level)! : look.theme.palette,
    );
    const size = sizeOf(foe.monster);
    if (drawn) {
      // A bird on its perch sorts in front of the post it sits on.
      const base = lift > 0 && foe.flight?.mode === 'perch' ? Math.round(foe.at.y) + 11 : feet.y;
      // Out of every pool of light on a darker day, a dim shape (one carrying a light is lit by
      // it); what it is about to do is drawn on the ground and over it, never dimmed.
      const shade =
        dark && !rule.palette(1) && drawn.glows.length === 0
          ? litness(pools, hero, foe.at, heroPool)
          : 0;
      actors.push({
        image: shade ? inTheDark(drawn.image, shade) : drawn.image,
        x: feet.x - drawn.feet.x,
        y: feet.y - drawn.feet.y,
        base,
      });
      boxes.push({
        x: feet.x - drawn.feet.x - 1,
        y: feet.y - drawn.feet.y - 1,
        w: drawn.image.width + 2,
        h: drawn.image.height + 2,
      });
      // What glows in its hands (the powder monkey's lit fuse) lights the ground about him.
      for (const g of drawn.glows) {
        const at = { x: feet.x - drawn.feet.x + g.x, y: feet.y - drawn.feet.y + g.y };
        fuses.push(at);
        boxes.push(around(at, FUSE_LIGHT2.radius + 1));
      }
    }
    // A contact shadow under anything standing on the ground.
    if (lift === 0 && cells && size.shadow > 0) {
      let shadow = art.shadows.get(foe.key);
      if (!shadow) {
        shadow = new CaveShadow();
        art.shadows.set(foe.key, shadow);
      }
      // Under the middle of its body, not its front feet (`bodyMid`).
      const under = { x: Math.round(midX(foe)), y: feet.y };
      // On a darker day as dark as the ground it falls on: by the room's dark layers, painted
      // again for his light only while it reaches the shadow.
      const ry = Math.max(2, Math.round(size.shadow / 4));
      const near =
        own &&
        own.reaches({
          x: under.x - size.shadow,
          y: under.y - ry,
          w: 2 * size.shadow + 1,
          h: 2 * ry + 1,
        });
      const placed = shadow.at(
        cells,
        kinds,
        look.glows,
        under,
        size.shadow,
        look.theme.palette,
        layers && own
          ? (x, y) => shadeIn(layers, own, x, y)
          : dark
            ? (x, y) => Math.min(rule.levelAt(poolsAndHero, x, y), 3)
            : undefined,
        layers
          ? `${near ? `${Math.round(hero.x)} ${Math.round(hero.y)}` : '-'} ${seenRoom.lit ?? ''}`
          : dark
            ? `${Math.round(hero.x)} ${Math.round(hero.y)} ${opening > 0} ${seenRoom.lit ?? ''}`
            : '',
        rule,
      );
      if (placed) {
        shadows.push(placed);
        boxes.push({
          x: placed.x,
          y: placed.y,
          w: placed.image.width,
          h: placed.image.height,
        });
      }
    }
    // The rings at its feet.
    const rx = Math.round(kind.box.w / 2) + 6;
    boxes.push(around({ x: midX(foe), y: feet.y }, rx + 2));
    const t = foe.heavy;
    if (t) {
      boxes.push(markBox(t));
      if (t.origin) {
        const x = Math.floor(Math.min(t.origin.x, t.at.x)) - 16;
        const y = Math.floor(Math.min(t.origin.y, t.at.y)) - 100;
        boxes.push({
          x,
          y,
          w: Math.ceil(Math.abs(t.origin.x - t.at.x)) + 33,
          h: Math.ceil(Math.abs(t.origin.y - t.at.y)) + 120,
        });
      }
    }
    if (kind.rally) boxes.push(around({ x: midX(foe), y: feet.y - 12 }, 54));
    // Stuck fast after a charge: stars wheeling over it.
    if (foe.stuck !== undefined && foe.stuck > clock)
      boxes.push(around({ x: midX(foe), y: feet.y - standsOf(foe.monster) - 6 }, 14));
  }
  for (const t of battle.volleys) boxes.push(markBox(t));
  // Clouds of spores hanging in the room, and the Burrow's lanterns being lit or put out.
  const clouds = (battle.clouds ?? []).filter((c) => c.room === run.room);
  for (const c of clouds) {
    const r = Math.round(c.radius);
    boxes.push(
      around(c.at, c.radius + 12),
      pieceBox(`cloud ${r} 0`, () => sporeCloud2(r, 0), c.at),
    );
  }
  const lamps = room.ground.lamps;
  /** A lantern with a ring on it: being lit (gold, filling), or a moth at it (violet, emptying). */
  const rings: { at: Point; k: number; how: 'lighting' | 'snuff' }[] = [];
  const tend = battle.tend;
  if (tend && tend.until !== null && lamps[tend.lamp])
    rings.push({
      at: flameOf(lamps[tend.lamp]!.cell),
      k: 1 - Math.max(0, tend.until - clock) / LIGHT_MS,
      how: 'lighting',
    });
  // The lanterns on posts as lane B draws them doing what they do (B20): catching while he lights
  // one, the flame wavering while it burns, a wisp of smoke once it is put out. Drawn over the
  // painted room where each stands, lit and darkened as the room paints its props.
  const lampLit = battle.lamps?.[run.room] ?? [];
  lamps.forEach((l, i) => {
    const foot = lampFoot(l.cell);
    let state: PostLanternState | null = null;
    let frame = 0;
    if (tend && tend.lamp === i && tend.until !== null) {
      state = 'lighting';
      frame = Math.floor(
        (1 - Math.max(0, tend.until - clock) / LIGHT_MS) * POST_LANTERN2_FRAMES.lighting,
      );
    } else if (lampLit[i]) {
      state = 'lit';
      frame = Math.floor(clock / POST_LANTERN2_FRAME_MS.lit);
    } else {
      const out = battle.effects.find(
        (e) =>
          e.kind === 'snuffed' &&
          Math.abs(e.at.x - foot.x) < 1 &&
          Math.abs(e.at.y - foot.y) < 1 &&
          clock - e.from < POST_LANTERN2_FRAMES.snuffed * POST_LANTERN2_FRAME_MS.snuffed,
      );
      if (out) {
        state = 'snuffed';
        frame = Math.floor((clock - out.from) / POST_LANTERN2_FRAME_MS.snuffed);
      }
    }
    if (!state) return;
    const art = postLanternFrame2(state, frame);
    const { w, h } = art.picture.grid;
    const box = { x: foot.x - art.foot, y: foot.y - art.base, w, h };
    const image = litPicture(
      seenRoom,
      `lamp ${i} ${state} ${frame % POST_LANTERN2_FRAMES[state]}`,
      art.picture,
      box,
      look.glows,
      dark && !postLanternShines(state, frame) ? pools : null,
      look.theme.palette,
    );
    if (!image) return;
    actors.push({ image, x: box.x, y: box.y, base: foot.y });
    boxes.push({ x: box.x - 1, y: box.y - 1, w: w + 2, h: h + 2 });
  });
  // The king dazzled: the lantern he came up under flares (it goes out as he comes up).
  const flares: { at: Point; from: number }[] = [];
  for (const e of battle.effects) {
    if (e.kind !== 'dazzled' || clock - e.from >= FLARE_MS || lamps.length === 0) continue;
    const near = lamps
      .map((l) => flameOf(l.cell))
      .sort(
        (a, b) => Math.hypot(a.x - e.at.x, a.y - e.at.y) - Math.hypot(b.x - e.at.x, b.y - e.at.y),
      )[0]!;
    flares.push({ at: near, from: e.from });
    boxes.push(around(near, 36));
  }
  for (const foe of here) {
    const s = foe.snuff;
    const moth = foeKind(foe.monster).seeksLight;
    if (!s || !moth || !alive(foe) || !lamps[s.lamp]) continue;
    rings.push({
      at: flameOf(lamps[s.lamp]!.cell),
      k: Math.max(0, s.until - clock) / moth.snuffMs,
      how: 'snuff',
    });
  }
  for (const e of battle.effects) {
    if (e.kind === 'landed')
      boxes.push(
        e.doused
          ? { x: Math.floor(e.at.x) - 18, y: Math.floor(e.at.y) - 40, w: 37, h: 46 }
          : markBox(e.mark),
      );
    else if (e.kind === 'swing') boxes.push(around(e.at, e.radius + 3));
    else if (e.kind === 'lit' || e.kind === 'snuffed')
      boxes.push(around({ x: e.at.x, y: e.at.y - 44 }, 36));
    else if (e.kind === 'erupt')
      boxes.push(
        around(e.at, 40),
        pieceBox('erupt 0', () => burrowEruption2(0), e.at),
      );
    else if (e.kind === 'charge') {
      const x = Math.floor(Math.min(e.at.x, e.to.x)) - 6;
      const y = Math.floor(Math.min(e.at.y, e.to.y)) - 16;
      boxes.push({
        x,
        y,
        w: Math.ceil(Math.abs(e.at.x - e.to.x)) + 13,
        h: Math.ceil(Math.abs(e.at.y - e.to.y)) + 22,
      });
    } else if (e.kind === 'splash') boxes.push(around(e.at, 30));
    else if (e.kind === 'released') boxes.push(around(e.at, 30));
    else if (e.kind === 'shot') {
      const x = Math.floor(Math.min(e.at.x, e.to.x)) - 14;
      const y = Math.floor(Math.min(e.at.y - 34, e.to.y - 14)) - 14;
      boxes.push({
        x,
        y,
        w: Math.ceil(Math.abs(e.at.x - e.to.x)) + 29,
        h: Math.ceil(Math.abs(e.at.y - 34 - e.to.y + 14)) + 29,
      });
    } else if (e.kind === 'loot')
      boxes.push({ x: Math.floor(e.at.x) - 9, y: Math.floor(e.at.y) - 52, w: 19, h: 54 });
  }
  // A brace over his head.
  if (battle.braceUntil > clock)
    boxes.push({ x: Math.floor(hero.x) - 40, y: Math.floor(hero.y) - 90, w: 81, h: 96 });
  for (const p of battle.piles)
    if (p.room === run.room) {
      // Its picture where it lies, and the pixel it bobs.
      const w = art.loot?.image.width ?? 18;
      const h = art.loot?.image.height ?? 18;
      const fx = art.loot?.feet.x ?? 9;
      const fy = art.loot?.feet.y ?? 16;
      boxes.push({
        x: Math.floor(p.at.x) - fx - 1,
        y: Math.floor(p.at.y) - fy - 2,
        w: w + 2,
        h: h + 3,
      });
    }

  // A cell's bars stand in the room until the cell opens, in front of whoever waits behind them.
  const barsArt = dungeonProp2('brig_bars');
  const barsImage = dungeonPropSprite2('brig_bars', CAVE_DUSK);
  const released = battle.released[run.room] ?? 0;
  room.ground.bars.forEach((list, wave) => {
    if (wave < released || !barsImage || !barsArt) return;
    for (const c of list) {
      const x = c.col * T + T / 2 - barsArt.foot;
      const foot = c.row * T + T - 1;
      actors.push({ image: barsImage, x, y: foot - barsArt.base, base: foot });
      if (released > 0 || clock < 200)
        boxes.push({ x, y: foot - barsArt.base, w: barsImage.width, h: barsImage.height });
    }
  });
  // The doors are drawn again only while they fade open.
  if (opening !== art.doorsDrawn.opening || doors !== art.doorsDrawn.shown) {
    for (const d of doors) boxes.push(d.box);
    art.doorsDrawn.opening = opening;
    art.doorsDrawn.shown = doors;
  }
  const tide: TideNow = tideOf(battle, place);
  const ripples = rising(tide, clock) ? aboutToFlood(room, tide.level) : [];
  for (const c of ripples) boxes.push({ x: c.col * T, y: c.row * T, w: T, h: T });
  const viewWidth = room.map.cols * T;

  // Where the overlay draws: every health bar and what is over it, every number and word, the
  // captain's words. Generous; the overlay canvas covers this and nothing more.
  const over: Box[] = [];
  const barBox = (foe: Foe): Box => {
    const top = foe.at.y - liftOf(room, foe) - standsOf(foe.monster);
    return { x: midX(foe) - 44, y: top - 44, w: 92, h: 52 };
  };
  for (const foe of here) {
    if (!alive(foe) || held(battle, place, foe)) continue;
    over.push(barBox(foe));
  }
  for (const e of battle.effects) {
    if (e.kind === 'hit' || e.kind === 'miss' || e.kind === 'heal' || e.kind === 'empty') {
      const onHero = !('on' in e) || e.on === 'hero';
      const x = onHero ? hero.x : e.at.x;
      const y = onHero ? hero.y - HERO_TALL - 6 : e.at.y - 12;
      over.push({ x: x - 70, y: y - 48, w: 140, h: 58 });
    } else if (e.kind === 'splash') {
      over.push({ x: e.at.x - 50, y: e.at.y - HERO_TALL - 60, w: 100, h: 56 });
    } else if (e.kind === 'reel' || e.kind === 'blocked' || e.kind === 'dazzled') {
      over.push({ x: e.at.x - 60, y: e.at.y - 70, w: 120, h: 60 });
    } else if (e.kind === 'interrupted') {
      over.push({ x: hero.x - 60, y: hero.y - HERO_TALL - 60, w: 120, h: 56 });
    } else if (e.kind === 'lit' || e.kind === 'snuffed') {
      over.push({ x: e.at.x - 50, y: e.at.y - 110, w: 100, h: 56 });
    } else if (e.kind === 'landed' && e.doused) {
      over.push({ x: e.at.x - 40, y: e.at.y - 70, w: 80, h: 56 });
    } else if (e.kind === 'say' && clock - e.from < SAY_MS) {
      const who = battle.foes.find((f) => f.key === e.who);
      if (who && who.room === run.room) {
        const top = who.at.y - standsOf(who.monster) - 14;
        // Over its head, or under its feet where the panels along the top would cover it.
        over.push({ x: 0, y: top - 50, w: viewWidth, h: who.at.y - top + 110 });
      }
    }
  }
  for (const r of rings) over.push({ x: r.at.x - 30, y: r.at.y - 30, w: 60, h: 60 });
  // The way onward, once the doors open; and a barred door that was tapped, saying so.
  const way = wayMarks(dungeon, run, options.view);
  over.push(...way.boxes);
  const tapped = options.barredTap;
  const barredSay =
    tapped && opening === 0 && clock - tapped.at >= 0 && clock - tapped.at < BARRED_SAY_MS
      ? room.doors.find((d) => d.letter === tapped.letter)
      : undefined;
  if (barredSay) {
    const x = barredSay.cell.col * T + T / 2;
    const y = barredSay.cell.row * T;
    over.push({ x: x - 60, y: y - 50, w: 120, h: 60 });
  }
  // A word kept below the top panels (`wordsTop`) is drawn lower than it would be: its box reaches it.
  const view = options.view;
  if (view)
    for (let i = 0; i < over.length; i++) {
      const b = over[i]!;
      if (b.y < view.y + 2) over[i] = { ...b, h: Math.max(b.h, view.y + 40 - b.y) };
    }
  let overlayBox: Box | null = null;
  for (const b of over) {
    if (!overlayBox) overlayBox = b;
    else {
      const x = Math.min(overlayBox.x, b.x);
      const y = Math.min(overlayBox.y, b.y);
      overlayBox = {
        x,
        y,
        w: Math.max(overlayBox.x + overlayBox.w, b.x + b.w) - x,
        h: Math.max(overlayBox.y + overlayBox.h, b.y + b.h) - y,
      };
    }
  }

  return {
    actors,
    boxes,
    overlayBox,
    overlayBoxes: over,
    walkerOffset: apart.get('hero') ?? 0,
    walker: (image) => {
      if (flashing(battle.struckAt, clock)) return flashOf(image, C.white);
      // Down: he blinks red until the tide takes him.
      if (battle.over?.why === 'fell' && Math.floor(clock / 150) % 2 === 1)
        return flashOf(image, C.red);
      return image;
    },
    ground(ctx) {
      // Each door's piece with the ground it lights, past the room's edge too: barred, or open fading in.
      for (const d of doors) {
        if (opening < 1 && d.barred) ctx.drawImage(d.barred, d.box.x, d.box.y);
        if (opening > 0 && d.open) {
          ctx.globalAlpha = opening;
          ctx.drawImage(d.open, d.box.x, d.box.y);
          ctx.globalAlpha = 1;
        }
      }
      for (const s of shadows) ctx.drawImage(s.image, s.x, s.y);
      fuses.forEach((at, i) => {
        const glow = fuseGlow(flicker2({ ...FUSE_LIGHT2, x: 0, y: 0 }, clock, i).strength);
        if (glow) ctx.drawImage(glow, Math.round(at.x) - FUSE_R, Math.round(at.y) - FUSE_R);
      });
      if (ripples.length > 0) drawRipples(ctx, ripples, clock);
      for (const p of battle.piles) {
        if (p.room !== run.room || !art.loot) continue;
        const bobbed = Math.floor(clock / 400) % 2;
        ctx.drawImage(
          art.loot.image,
          Math.round(p.at.x) - art.loot.feet.x,
          Math.round(p.at.y) - art.loot.feet.y - bobbed,
        );
      }
      for (const foe of here) {
        if (!alive(foe) || held(battle, place, foe)) continue;
        const kind = foeKind(foe.monster);
        const rx = Math.round(kind.box.w / 2) + 2;
        const feet = foe.at.y - liftOf(room, foe);
        if (foe.rallied) {
          // The parrot's work, at his feet too: a green ring, pulsing.
          ctx.fillStyle = Math.floor(clock / 200) % 2 === 0 ? C.green : C.greenDark;
          oval(ctx, midX(foe), feet, rx + 4, 6);
        }
        if (foe.key === battle.target) {
          ctx.fillStyle = C.gold;
          oval(ctx, midX(foe), feet, rx + 2, 5);
        }
      }
      for (const at of mounds) {
        // Lane B's mound (B20), heaving a frame at a time; this lane's own where none is drawn.
        const frame = Math.floor(clock / 140) % BURROW_MOUND2_FRAMES;
        const art = pieceCanvas(`mound ${frame}`, () => burrowMound2(frame), look.theme.palette);
        if (art)
          ctx.drawImage(
            art.image,
            Math.round(at.x - art.anchor.x),
            Math.round(at.y - art.anchor.y),
          );
        else drawMound(ctx, at, clock);
      }
      for (const foe of here)
        if (foe.heavy && foe.heavy.shape !== 'circle') drawMark(ctx, foe.heavy, clock);
      for (const t of battle.volleys) drawMark(ctx, t, clock);
      for (const foe of here) if (foe.heavy?.shape === 'circle') drawMark(ctx, foe.heavy, clock);
      for (const e of battle.effects) {
        if (e.kind === 'landed') drawLanded(ctx, e, clock);
        const age = clock - e.from;
        if (e.kind === 'swing' && age < 300) {
          // The blade's sweep, out to its full reach, fading.
          ctx.globalAlpha = 1 - age / 300;
          ctx.fillStyle = C.ink;
          ring(ctx, e.at.x, e.at.y, e.radius + 1, 5);
          ctx.fillStyle = C.white;
          ring(ctx, e.at.x, e.at.y, e.radius, 3);
          ctx.globalAlpha = 1;
        }
      }
      // The parrot, egging the crew on: a squawk spreading from it.
      for (const foe of here) {
        if (!alive(foe) || !foe.aware || !foeKind(foe.monster).rally) continue;
        if (!here.some((f) => alive(f) && f.rallied)) continue;
        const k = (clock % 500) / 500;
        ctx.globalAlpha = 0.9 * (1 - k);
        ctx.fillStyle = C.green;
        ring(ctx, midX(foe), foe.at.y - liftOf(room, foe) - 12, 9 + k * 36, 2);
        ctx.globalAlpha = 1;
      }
    },
    over(ctx) {
      // Things thrown, in their arc from the thrower to the mark; a keg lies burning once it lands.
      const keg = dungeonPropSprite2('powder_keg', CAVE_DUSK);
      const kegArt = dungeonProp2('powder_keg');
      for (const foe of here) {
        const t = foe.heavy;
        if (!t?.origin) continue;
        const p = telegraphProgress(t, clock);
        const isKeg = !!t.douse;
        const f = isKeg ? Math.min(1, p / KEG_FLIGHT) : p;
        const x = Math.round(t.origin.x + (t.at.x - t.origin.x) * f);
        const y = Math.round(
          t.origin.y - 30 + (t.at.y - t.origin.y + 30) * f - Math.sin(Math.PI * f) * 54,
        );
        if (isKeg && keg && kegArt) {
          ctx.drawImage(keg, x - kegArt.foot, y - kegArt.base);
          // The fuse, burning down: a spark that flickers faster as it goes.
          const spark = Math.floor(clock / (p > 0.75 ? 50 : 110)) % 2 === 0;
          ctx.fillStyle = spark ? C.fire1 : C.fire2;
          ctx.fillRect(x + 1, y - kegArt.base - 3, 2, 2);
        } else {
          ctx.fillStyle = C.ink;
          ctx.fillRect(x - 3, y - 4, 7, 10);
          ctx.fillStyle = C.greenDark;
          ctx.fillRect(x - 2, y - 2, 5, 6);
          ctx.fillStyle = C.sand;
          ctx.fillRect(x, y - 3, 1, 1);
        }
      }
      for (const c of clouds) drawCloudArt(ctx, c, clock, look.theme.palette);
      for (const foe of here) {
        if (foe.stuck === undefined || foe.stuck <= clock || !alive(foe)) continue;
        // Stuck fast: three stars wheeling over its head.
        const cx = midX(foe);
        const cy = foe.at.y - standsOf(foe.monster) - 6;
        ctx.fillStyle = C.gold;
        for (let i = 0; i < 3; i++) {
          const a = clock / 180 + (i * Math.PI * 2) / 3;
          ctx.fillRect(Math.round(cx + Math.cos(a) * 10), Math.round(cy + Math.sin(a) * 4), 2, 2);
        }
      }
      for (const e of battle.effects) {
        if (e.kind === 'erupt') {
          // Up out of the ground (lane B's eruption, B20): its last frame the hole he leaves.
          const frame = Math.min(
            BURROW_ERUPTION2_FRAMES - 1,
            Math.floor((clock - e.from) / BURROW_ERUPTION2_FRAME_MS),
          );
          const art = pieceCanvas(
            `erupt ${frame}`,
            () => burrowEruption2(frame),
            look.theme.palette,
          );
          if (art) {
            ctx.globalAlpha = Math.max(0, Math.min(1, (EFFECT_MS - (clock - e.from)) / 200));
            ctx.drawImage(
              art.image,
              Math.round(e.at.x - art.anchor.x),
              Math.round(e.at.y - art.anchor.y),
            );
            ctx.globalAlpha = 1;
            continue;
          }
        }
        drawEffectArt(ctx, e, clock);
      }
      for (const f of flares) drawFlare(ctx, f.at, clock - f.from);
      if (battle.braceUntil > clock) {
        // Braced: a small shield over his head.
        const x = Math.round(hero.x);
        const y = Math.round(hero.y) - HERO_TALL - 18;
        ctx.fillStyle = C.ink;
        ctx.fillRect(x - 6, y - 1, 13, 12);
        ctx.fillStyle = C.metal2;
        ctx.fillRect(x - 5, y, 11, 7);
        ctx.fillRect(x - 3, y + 7, 7, 2);
        ctx.fillStyle = C.gold;
        ctx.fillRect(x, y, 1, 9);
      }
    },
    overlay(ctx, k, area) {
      way.draw(ctx, k);
      // Words kept below what the controls cover along the top (the boss's panel among them).
      const wordsTop = options.view ? options.view.y + 2 : -Infinity;
      if (barredSay) {
        const x = barredSay.cell.col * T + T / 2 - outward(barredSay) * 6;
        const shake = Math.round(Math.sin(((clock - tapped!.at) / 60) * Math.PI) * 2 * k * 0.5);
        label(ctx, 'Barred', x + shake, barredSay.cell.row * T - 14, 15, C.white, k, WORDS);
      }
      for (const foe of here)
        if (alive(foe) && !held(battle, place, foe) && !foe.under) {
          // On a canvas of its own patch, only what lies on that patch.
          if (area && !overlaps(area, barBox(foe))) continue;
          drawFoeOver(ctx, battle, foe, midX(foe), liftOf(room, foe), foe.key === battle.target, k);
        }
      // A lantern being lit (gold, filling round) or put out by a moth (violet, running down).
      for (const r of rings) {
        ctx.save();
        ctx.lineWidth = 5 * k;
        ctx.strokeStyle = C.ink;
        ctx.beginPath();
        ctx.arc(r.at.x, r.at.y, 13, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * r.k);
        ctx.stroke();
        ctx.lineWidth = 3 * k;
        ctx.strokeStyle = r.how === 'lighting' ? C.flame : C.moth;
        ctx.stroke();
        ctx.restore();
      }
      // Numbers landing together on one spot (a double shot) stand side by side.
      const together = new Map<string, number>();
      for (const e of battle.effects) {
        let nudge = 0;
        if (e.kind === 'hit' || e.kind === 'miss') {
          const key = `${e.from} ${e.on} ${Math.round(e.at.x)}`;
          nudge = together.get(key) ?? 0;
          together.set(key, nudge + 1);
        }
        drawEffectOver(ctx, e, clock, hero, HERO_TALL, k, nudge * 14, wordsTop);
      }
      // What a boss shouts, over its head: the dungeon's own words for it.
      for (const e of battle.effects) {
        if (e.kind !== 'say' || clock - e.from >= SAY_MS) continue;
        const who = battle.foes.find((f) => f.key === e.who);
        if (!who || who.room !== run.room) continue;
        const words = sayingOf(run.dungeon, who.monster, e.line);
        if (!words) continue;
        speech(
          ctx,
          words,
          who.at.x,
          who.at.y - standsOf(who.monster) - 14,
          viewWidth,
          k,
          wordsTop,
          who.at.y,
        );
      }
    },
  };
}

/** Where a fight's foes are drawn above their feet, for a tap on one: a bird on its perch is up on the post. */
export function tapLift(room: Room): (foe: Foe) => number {
  return (foe) => liftOf(room, foe);
}
