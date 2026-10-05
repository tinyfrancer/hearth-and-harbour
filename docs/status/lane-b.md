# Lane B: art

**Next session: B3: Icons for every item and skill, and gear layers for S7b's items** (brief to
come in `docs/lanes.md`, wave 3).

## The town index, for lane C (`src/art/town.ts`)

Every building, prop, boat and person in the approved mock-up is one piece, looked up by a plain
id. Each piece is the exact picture the mock-up drew (same pixels, same wear), so a town built from
them looks like the approved picture.

```ts
import { townPiece } from '../art/town';
import { rasterize } from '../art/raster';
import { DUSK } from '../art/palette';

const smithy = townPiece('smithy'); // 98 x 90, base 86, spots.door = (38, 88)
const image = rasterize(smithy.picture, DUSK, 1); // RGBA, one pixel per art pixel, forge lit
sprite.getContext('2d')!.putImageData(new ImageData(image.data, image.width), 0, 0); // then drawImage(sprite, x, y)
```

(`sprite` is a canvas `image.width` × `image.height`. Draw it onto the world with `drawImage`, not
`putImageData`, so its empty pixels stay see-through. There is no `src/art/index.ts`: import each
name from its file.) Ground shadows and attached smoke are drawn separately; see below.

A `TownPiece` gives:

- `picture`: a `Picture` (`grid` plus `glows`), outline included. Glows are lit by `rasterize` when
  the palette is `DUSK`; the smithy's forge also glows (more weakly) by `DAY`.
- `w`, `h`: its size in art pixels.
- `base`: the row, counted from its top, where it meets the ground (bottom of feet, posts or step;
  the waterline for things afloat). Sort standing things by `y + base`.
- `layer`: `ground` (lies flat, draw with the ground, people walk over it: the pier, the net),
  `stand` (sort by base line), `above` (draw over everything: smoke, gulls).
- `spots`: where a person's feet stand to use a door or counter, from the piece's top-left.
- `shadow`: the mock-up's ground shadow, `{ cx, cy, rx, ry }` from the piece's top-left. Draw it
  on the ground first with `groundShadow(grid, x + cx, y + cy, groundDark, rx, ry)` (`src/art/grid`),
  where `groundDark` is the ground's dark step: `cobble3`, `grass3`, or `wood3` on the pier.
- `attached`: pieces that go with it, at (x, y) from its top-left (chimney smoke, layer `above`).

| id                         | size      | base | layer  | spots            | shadow (cx, cy) rx × ry | attached                    | glows |
| -------------------------- | --------- | ---- | ------ | ---------------- | ----------------------- | --------------------------- | ----- |
| `tavern`                   | 150 × 118 | 112  | stand  | door (65, 114)   | (66, 117) 66 × 4        | `tavern_smoke` at (93, -20) | 7     |
| `smithy`                   | 98 × 90   | 86   | stand  | door (38, 88)    | (48, 89) 48 × 4         | `smithy_smoke` at (73, -26) | 3     |
| `stall`                    | 62 × 44   | 39   | stand  | counter (31, 41) | (30, 43) 29 × 3.5       |                             |       |
| `pier`                     | 44 × 128  | 126  | ground |                  |                         |                             |       |
| `ship`                     | 90 × 104  | 100  | stand  |                  |                         |                             | 1     |
| `well`                     | 29 × 32   | 29   | stand  |                  | (14, 30) 15 × 3.5       |                             |       |
| `notice_board`             | 26 × 29   | 27   | stand  |                  |                         |                             |       |
| `signpost`                 | 22 × 24   | 22   | stand  |                  |                         |                             |       |
| `anvil`                    | 19 × 14   | 12   | stand  |                  |                         |                             |       |
| `lamp`                     | 9 × 29    | 27   | stand  |                  |                         |                             | 1     |
| `barrel`                   | 13 × 17   | 15   | stand  |                  |                         |                             |       |
| `crate`                    | 15 × 15   | 13   | stand  |                  |                         |                             |       |
| `net`                      | 31 × 14   | 13   | ground |                  |                         |                             |       |
| `bucket`                   | 11 × 8    | 7    | stand  |                  |                         |                             |       |
| `pine`, `pine_2`, `pine_3` | 29 × 41   | 39   | stand  |                  |                         |                             |       |
| `rowboat`                  | 35 × 23   | 21   | stand  |                  |                         |                             |       |
| `buoy`                     | 11 × 13   | 11   | stand  |                  |                         |                             |       |
| `wreck_rock`               | 68 × 47   | 45   | stand  |                  |                         |                             |       |
| `crab`                     | 13 × 9    | 7    | stand  |                  |                         |                             |       |
| `gull`                     | 8 × 4     | 3    | above  |                  |                         |                             |       |
| `tavern_smoke`             | 18 × 18   | 17   | above  |                  |                         |                             |       |
| `smithy_smoke`             | 22 × 24   | 23   | above  |                  |                         |                             |       |
| `hero`                     | 40 × 50   | 47   | stand  |                  | (20, 47) 10 × 2.6       |                             |       |
| `pirate`                   | 40 × 50   | 47   | stand  |                  | (19, 47) 10 × 2.6       |                             |       |
| `smith`                    | 40 × 50   | 47   | stand  |                  | (20, 47) 10 × 2.6       |                             |       |
| `trader`                   | 40 × 50   | 46   | stand  |                  | (20, 46) 10 × 2.6       |                             |       |

Notes on particular pieces:

- `pier`: the deck is 38 wide starting 3 pixels in (x 3 to 40); the 3-pixel margins hold the foam
  round its piles. `pier(rand, length)` in `src/art/harbour.ts` draws one of any length.
- `rowboat`: its mooring line runs up from the boat to row 0 at column 27, where it ties to a quay
  ring; in the mock-up the boat's top-left is (60, 236), with the quay's ring at x 87.
- `ship`, `wreck_rock`, `buoy` carry their own waterline foam.
- `bucket`: in the mock-up it stands at the head of the pier, which hides all but its rim.
- People: the hero is `figure('standard', HERO_OUTFIT)`; the others are `figure('pirate',
PIRATE_OUTFIT)`, `figure('smith', SMITH_OUTFIT)`, `figure('trader', TRADER_OUTFIT)`
  (`src/art/figure.ts`). Mirror the picture to face left.

**The mock-up's own layout.** `townLayout()` lists every placement `{ id, x, y }` (top-left, in
the mock-up's 270 × 360 town) in drawing order; `townPicture()` is the whole assembled town.
`TOWN_GROUND` gives the boxes its grounds were painted in. Use them as the starting map for S12b.

**Grounds** are painters, not pieces: each takes `(grid, rand, ...)` and paints into a grid you
own. Patterns that must line up (cobble joints, the road's bend, the sea's swell, shore foam) come
from world position, so painting in pieces still lines up; only flecks and wear are random.

- `grass(g, rand, box)`, `cobbles(g, rand, box)` (`scenery.ts`, unchanged).
- `cobbledSquare(g, rand, box)`: cobbles whose top edge tapers into the grass over 6 rows and whose
  sides wander by a pixel (the grass-to-square edge).
- `road(g, rand, x, y, h)`: the sandy road north–south around column `x`, rows `y` to `y + h`,
  20 wide, with ruts; `roadCentre(x, row)` gives its bend.
- `sand(g, rand, box)`: open sand with the road's grit. The mock-up has no beach; this is its road's
  surface, for any sandy ground.
- `wildflowers(g, rand, box, n)`.
- `quayWall(g, rand, x, y, w, rings)`: `QUAY_H` (11) rows from a pale kerb to an ink line, with iron
  rings at the given columns. The water starts at `y + QUAY_H`.
- `sea(g, rand, box, shore = true)`: water deepening away from `box.y`, crests and foam, and broken
  foam along the shore row.

## Done

- **B2: The rest of the town's art.**
  - `harbour.ts`: the smithy (forge lit by day and brighter at dusk, lit window), market stall,
    pier, ship (lit cabin window, black flag), rowing boat, buoy, rock with its wreck, signpost,
    anvil, net, bucket, crab, gull and both chimneys' smoke.
  - `ground.ts`: road, sand, cobbled square with its ragged edge, quay wall, sea and foam, flowers.
  - `townsfolk.ts`: the pirate captain, the smith and the trader, each a posed body of their own
    on the figure canvas (their poses differ from the standard body's), harvested from the
    mock-up. What they hold is gear (`pirate_cutlass`, `trader_basket`). Eyes mirrored; the
    pirate's open eye is centred, the other under its patch, as approved.
  - `town.ts`: the index above, the layout and the assembled town.
  - `raster.ts`: a glow can be `byDay` (shines only when the lights are off), for the forge, whose
    day glow and dusk glow differ in the mock-up. Nothing existing changed.
  - Gallery: the assembled town in day and dusk at the top, then the four townspeople in day and
    dusk.
  - Tests run the mock-up's own drawing code (`tests/art/mockup.ts` loads its script with our step
    names as its palette): the whole town is the mock-up's town pixel for pixel with the same
    glows by day and dusk; each new piece equals the mock-up's statements for it, for several
    seeds; each townsperson equals the mock-up's figure, and without their gear equals the
    mock-up's figure with that gear's code cut out.
  - Checked side by side in Chromium at 390 × 844, 3x: the gallery's town and the mock-up's canvas
    agree in every art pixel's drawing; colours differ by at most 1/255 by day and 3/255 at dusk,
    only inside glows (a canvas gradient's rounding against ours). Every art pixel is a clean
    square of device pixels.
- **S7a: Art pipeline.** The mock-up's pixel engine in `src/art/` as tested TypeScript: palette
  (`palette.ts`), grid primitives and outline (`grid.ts`), rasterising (`raster.ts`), the canvas
  part (`canvas.ts`), seeded random (`rng.ts`), the posed body and the hero's gear (`figure.ts`,
  `wardrobe.ts`), the tavern and first props (`scenery.ts`), gallery plates (`plates.ts`).

## Deferred

- Portraits (48 × 48): not started (B4).
- The tab icons and home-screen icon are still the S1 placeholders.
- No walk cycle; figures face one way (mirror for the other).
- The townsfolk bodies are drawn only where they show, so they cannot be dressed in other gear.

## Needs from another lane

- Nothing.

## Notes for this lane's next session

- Game scale is a world 270 art pixels wide across the app (4 device pixels per art pixel on a
  390-wide 3x phone). The gallery's town is 270 wide, so on that phone it is shrunk to 3 to fit
  inside the menu's padding, as the mock-up itself is on the same phone.
- `scenery.ts`'s pieces (tavern, pine) take a random source; the index's are the ones drawn in the
  mock-up's town with seed 21. Calling `tavern(seeded(n))` yourself gives the same building with
  wear in other places.
- At a fractional device pixel ratio (2.625 on many Androids) pictures are close to exact but not
  always pixel-perfect; at whole ratios they are exact.
- Gear ids are art ids. B3 maps lane A's item ids onto them.
