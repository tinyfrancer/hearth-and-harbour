/*
 * The hero in a scene is the player's own character: their look and what they
 * are wearing, drawn by the art lane's `characterPicture`. A new character
 * wears nothing and walks about in everyday clothes; gear shows as it is put on.
 * The picture is the same 40 x 50 figure as the approved hero, feet in the same
 * place (`HERO_FEET`), whatever is worn.
 */
import { characterPicture, type Look } from '../art/character';
import type { Glow, Picture } from '../art/raster';
import { wornItemIds } from '../core/equipment';
import type { GameState } from '../core/state';
import { fullLook } from '../ui/look';
import type { Facing } from './play';
import type { Point } from './tileMap';
import { HERO_FEET, litWalker } from './walkerArt';

/** What the hero looks like, as the art draws it: a whole look and the ids of what is worn. */
export interface Dress {
  readonly look: Look;
  readonly worn: readonly string[];
}

export function dressOf(state: GameState): Dress {
  return { look: fullLook(state.look), worn: wornItemIds(state) };
}

/** One string per way the hero can look, so a change is found by comparing two strings. */
export function dressKey(dress: Dress): string {
  const { skin, hair, hairColour } = dress.look;
  return `${skin} ${hair} ${hairColour} | ${dress.worn.join(' ')}`;
}

/** The hero at `feet` facing either way, lit by the lights near him when they are on. */
export type WalkerAt = (feet: Point, facing: Facing, lightsOn: boolean) => Picture;

/**
 * The hero's pictures, kept until he changes. The state arrives every frame,
 * but a new look or a new sword is rare: the look and equipment are compared
 * by identity first (the state is never edited in place), then by key, and
 * only a real change draws him again. The lit pictures for dusk are made as
 * he walks and kept with him, so they go when he changes.
 */
export class Hero {
  private look: GameState['look'] | null = null;
  private equipment: GameState['equipment'] | null = null;
  private key = '';
  private walker: WalkerAt;
  /** How many times he has been drawn afresh, for tests. */
  drawn = 0;

  private readonly lights: readonly Glow[];

  constructor(dress: Dress, lights: readonly Glow[] = []) {
    this.lights = lights;
    this.walker = this.dressIn(dress);
  }

  private dressIn(dress: Dress): WalkerAt {
    this.key = dressKey(dress);
    this.drawn += 1;
    this.base = characterPicture(dress.look, dress.worn);
    this.elsewhere = new WeakMap();
    return litWalker(this.base, HERO_FEET, this.lights);
  }

  private base: Picture | null = null;
  /** The same hero lit by another place's lights (a dungeon room's lanterns), kept per set of lights. */
  private elsewhere = new WeakMap<readonly Glow[], WalkerAt>();

  /** The hero as `at` draws him, but lit by `lights` instead of the town's. */
  atIn(lights: readonly Glow[]): WalkerAt {
    return (feet, facing, lightsOn) => {
      let walker = this.elsewhere.get(lights);
      if (!walker) {
        walker = litWalker(this.base!, HERO_FEET, lights);
        this.elsewhere.set(lights, walker);
      }
      return walker(feet, facing, lightsOn);
    };
  }

  /** Takes the state's look and gear; true if the hero now looks different. */
  wear(state: GameState): boolean {
    if (state.look === this.look && state.equipment === this.equipment) return false;
    this.look = state.look;
    this.equipment = state.equipment;
    const dress = dressOf(state);
    if (dressKey(dress) === this.key) return false;
    this.walker = this.dressIn(dress);
    return true;
  }

  /** The key of what he is wearing now. */
  get dressedAs(): string {
    return this.key;
  }

  readonly at: WalkerAt = (feet, facing, lightsOn) => this.walker(feet, facing, lightsOn);
}
