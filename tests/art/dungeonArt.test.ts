import { describe, expect, it } from 'vitest';
import { dungeonProp, dungeonTile, foePicture } from '../../src/art/dungeonArt';

describe('the dungeon art doors', () => {
  it('answer null, and never throw, for what art has not drawn', () => {
    expect(foePicture('no_such_creature')).toBeNull();
    expect(dungeonTile('nowhere', 'floor')).toBeNull();
    expect(dungeonTile('nowhere', 'floor', 7)).toBeNull();
    expect(dungeonProp('nowhere', 'thing')).toBeNull();
  });
});
