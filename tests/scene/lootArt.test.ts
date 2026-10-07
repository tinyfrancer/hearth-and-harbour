import { describe, expect, it, vi } from 'vitest';

// Loot on the floor is the art lane's `loot_pile` the moment it has one, stood on
// its foot; until then the scene's own sack. One place chooses (`lootArt`).

const pile = { canvas: null as HTMLCanvasElement | null };

vi.mock('../../src/art/dungeonArt2', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/art/dungeonArt2')>();
  return {
    ...real,
    dungeonProp2: (id: string) =>
      id === 'loot_pile' && pile.canvas
        ? {
            picture: { grid: { w: 20, h: 12, d: new Int16Array(240) }, glows: [] },
            base: 11,
            foot: 10,
          }
        : real.dungeonProp2(id),
    dungeonPropSprite2: (id: string, palette?: Parameters<typeof real.dungeonPropSprite2>[1]) =>
      id === 'loot_pile' ? pile.canvas : real.dungeonPropSprite2(id, palette),
  };
});

const { lootArt } = await import('../../src/scene/fightArt');

describe('loot on the floor', () => {
  it('is the art lane’s loot pile, stood on its foot, once it has one', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 12;
    pile.canvas = canvas;
    expect(lootArt()).toEqual({ image: canvas, feet: { x: 10, y: 11 } });
  });

  it('is the scene’s own sack while it has none (nothing painted where nothing can be)', () => {
    pile.canvas = null;
    // jsdom paints nothing: the sack's canvas is null here, and so is the choice.
    expect(lootArt()).toBeNull();
  });
});
