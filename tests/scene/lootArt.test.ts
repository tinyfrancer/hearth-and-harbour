import { describe, expect, it, vi } from 'vitest';
import { dungeonProp2 } from '../../src/art/dungeonArt2';

// Loot on the floor is the art lane's `loot_pile`, stood on its foot (`lootArt`).

const sprite = { canvas: null as HTMLCanvasElement | null };

vi.mock('../../src/art/dungeonArt2', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/art/dungeonArt2')>();
  return {
    ...real,
    // jsdom paints nothing: the pile's canvas stands in for the one a browser makes.
    dungeonPropSprite2: (id: string, palette?: Parameters<typeof real.dungeonPropSprite2>[1]) =>
      id === 'loot_pile' ? sprite.canvas : real.dungeonPropSprite2(id, palette),
  };
});

const { lootArt } = await import('../../src/scene/fightArt');

describe('loot on the floor', () => {
  it('is the art lane’s loot pile, stood on its foot', () => {
    const pile = dungeonProp2('loot_pile')!;
    expect(pile).not.toBeNull();
    const canvas = document.createElement('canvas');
    canvas.width = pile.picture.grid.w;
    canvas.height = pile.picture.grid.h;
    sprite.canvas = canvas;
    expect(lootArt()).toEqual({ image: canvas, feet: { x: pile.foot, y: pile.base } });
  });

  it('is nothing where nothing can be painted', () => {
    sprite.canvas = null;
    expect(lootArt()).toBeNull();
  });
});
