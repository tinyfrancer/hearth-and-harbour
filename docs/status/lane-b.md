# Lane B: art

**Next session:** Cody's review of the C-scale town (B7) and the C-scale figures (B8, below); then
whatever that review asks for, then the C-scale walk cycle, foes and portraits ("Deferred"). Still
open from B6: faces for `goblin_poacher` and `bramble_wyrm`, and the five tab icons.

## The figures at the C scale, for lanes C and A (`src/art/character2.ts`)

The hero and the townsfolk redrawn for the C-scale town (style guide, "Figures at the C scale"),
**built beside the current figures, not swapped in**: `characterPicture`, `characterCanvas`,
`LOOK_CHOICES`, `portrait`, `foePicture` and every other existing door are unchanged. Import from
`src/art/character2.ts` (and `town2/ramps.ts` for `TimeOfDay`):

- `FIGURE2_W = 56`, `FIGURE2_H = 72`, `FIGURE2_ANCHOR_X = 28`, `FIGURE2_SOLE_Y = 70`. A figure's
  picture is 56 × 72 with its outline; the middle of its soles is (28, 70), the lowest row drawn.
  Draw it at `(x - 28, y - 70)` for a walker standing at (x, y), and sort by y. Mirror to face left
  (`facingLeft2(pic)`, or `scale(-1, 1)` on the sprite with the anchor at 56 - 28 = 28: it is
  symmetric about the anchor, so a mirrored sprite stands on the same spot).
- `characterPicture2(look, wornItemIds, extra = [])` → `Picture2` (`{ grid, glows }`, town2 cells).
  Same arguments as `characterPicture`: the game's `Look` and item ids. Unknown looks fall back to
  the default, unknown items are ignored, never throws. Kept once drawn (keyed by look and items).
  `extra` takes art gear ids directly (only `KNIGHT_GEAR2` needs it today).
- `characterCanvas2(look, wornItemIds, size = 'sheet' | 'thumb')` → `<canvas class="pixel-art">`:
  `thumb` at the C scale's game scale (3 on a 390-wide 3x phone), `sheet` twice that, at whole
  device pixels, aria-label "Your character". Same shape as `characterCanvas`.
- `characterSprite2(look, wornItemIds, time = 'day' | 'dusk')` → an offscreen canvas at one pixel per
  art pixel, made once per look, items and time of day and kept (`town2/raster.ts`'s `spriteCanvas`,
  so `forgetSprites()` frees them with the town's). Draw it with `drawImage` at the scene's scale,
  smoothing off; never rasterize in a frame.
- Townsfolk: `townsfolkPicture2(id)`, `townsfolkSprite2(id, time)`, `townsfolkCanvas2(id)` and
  `townsfolkName2(id)`, null for an unknown id. `TOWNSFOLK2_IDS`: `smith`, `trader`, `pirate` (the
  ids `townPiece` and `src/scene/town.ts` use today) and the villagers `alewife`, `market`,
  `docker`, `elder`. Same canvas and anchor as the hero.
- `ITEM_LAYERS2` (item id → gear id; every one of the 38 wearables in `src/data/items.ts`, the new
  `velvet_cap` included), `characterGear2(look, items)`, `characterBody2(gear)`, `LOOK_CHOICES2`
  (the same object as `LOOK_CHOICES`, so the creator needs no change), `KNIGHT_GEAR2`
  (`knight_plate`, `knight_knees`, `red_cloak`, `kite_shield`, `knight_sword`: tier 2, drawn, no items
  yet), `c2Scale(cssWidth, dpr)`.
- Memory: a sprite is 56 × 72 × 4 = 16 KB per figure per time of day. The hero in one outfit by day
  and dusk is 32 KB; all seven townsfolk both ways 226 KB; a hundred cached outfits 3.2 MB. A
  picture's cell grid (Int16, 8 KB) is kept per look and outfit in a Map; a cache of a few dozen is
  under half a megabyte.
- What a scene still draws itself: the contact shadow under the feet (the gallery darkens the
  ground's own steps by two in an ellipse 22 × 4 centred on the anchor, as the town does under
  props), lights at dusk on figures (none of them glow), and any animation.

## The C-scale town, for lane C (`src/art/town2/`)

The whole town redrawn at the C scale Cody chose after the scale study (style guide, "The C
scale"), **built beside the current town, not swapped in**: nothing the live game reads changed.
Import each name from its file (there is no index file).

- `town2Piece(id)` (`pieces.ts`): every piece by plain id, drawn once on first ask and kept. Same
  ids as `townPiece` for everything but the figures (`hero`, `pirate`, `smith`, `trader`, being
  reworked separately); new: `house`, `oak`, `fence`, `bench`, `planter`, `bush`, `boulder`. A
  `Town2Piece` gives `picture` (a `Picture2`: a `TGrid` of material-and-step cells, outline
  included, and its glows), `w`, `h`, `base` (the row it stands on; sort by `y + base`), `layer`
  (`ground`, `stand`, `above`, as today), `foot` (the middle of its foot on the base line), `spots`
  (`door` on the tavern, smithy and house, `forge` on the smithy, `counter` on the stall),
  `shadow` (laid by the town, not drawn in the piece), `ground` (the size of what it stands on, for
  its footprint) and `attached` (chimney smoke).
- `town2Layout()` (`town.ts`): every placement in drawing order (flat, then standing by base line,
  then above): `name` (the current scene's names where it has them: `tavern`, `crate-yours`,
  `board`, `lamp-west`, `crate-cargo-3`, `pine-grove-2`, ...), `id`, `x`, `y` (top-left), `base`,
  `layer`, `footprint` (whole 24-pixel tiles, or null for flat and afloat things), `spots` and
  `tap` (in town pixels). Data, declared, not measured from a picture.
- `town2Ground(time)`: the ground (grass, road, lane, cobbles, flagstones, the well's paving,
  beach, quay, sea), every shadow for that time of day (longer at dusk) and the flat pieces (pier,
  net), with every light in town as its glows. Lay it under the sprites. `town2Picture(time)` is the
  whole town composed (for the gallery, a map, or a scene that need not walk behind things).
- `town2Walk()`: `{ cols, rows, solid, kinds }` on 24-pixel tiles, ground and footprints together;
  `groundAt(x, y)` gives the ground kind under any point (so a 16-pixel map can be sampled from
  it); `TOWN2_SOLID` says which kinds block; `TOWN2_START` is where the hero first stands.
- `TOWN2_W` × `TOWN2_H` = 1440 × 2136 art pixels (four screens across, about three tall);
  `TOWN2_TILE` = 24; `TOWN2_GROUND` says where each ground lies and `shoreAt(x)` gives the water's
  edge (for animated foam).
- Drawing: `rasterize2(pic, palette, scale)` and `pixelCanvas2` (`raster.ts`) turn a picture into
  pixels; `DAY2` and `DUSK2` (`ramps.ts`) are the palettes. **Draw once, reuse:**
  `spriteCanvas(key, picture, palette)` keeps a picture on an offscreen canvas at one pixel per art
  pixel; a scene draws it with `drawImage` at its scale (smoothing off) and never rasterizes in a
  frame. `forgetSprites()` lets them go.
- Memory, one palette at a time: the ground canvas 1440 × 2136 × 4 = 12.3 MB; all 33 pieces at one
  pixel per art pixel 4.3 MB; together about 17 MB (about 33 MB with day and dusk both kept). The
  cell grids behind them (Int16, 6.2 MB per composed town) are only needed while rasterizing.
- Lights at dusk: `town2Ground('dusk').glows` is every lamp, window and the forge in town
  coordinates, for lighting walkers as `litBy` does today.

## Dungeon art, for lane C (`src/art/dungeonArt.ts`)

The three doors answer for the grotto now; nothing about their names, parameters or return types
changed. Anything else (another theme, an unknown id, `toString`) is still null.

**Tiles: `dungeonTile('grotto', kind, variant)`**, a 16 x 16 `Picture`, no transparent pixels,
no glows. Any number works as `variant` (negative, large, fractional: it is floored); it is mixed
before choosing, so pass something per cell such as `row * 97 + col * 31` or `row * cols + col`
and neighbouring cells will not step through the wears in order. The same number always gives
the same tile (the same object, cached).

| Kind          | Wears | What it is                                                                        |
| ------------- | ----- | --------------------------------------------------------------------------------- |
| `sand`        | 20    | dry cave sand; 3 wears in 20 carry a shell, pebbles or a crab's hole              |
| `wet_sand`    | 16    | the same sand a step darker with water shining on it; 3 carry a pool, weed, shell |
| `rock_floor`  | 20    | worn grey-purple rock with cracks; 3 carry pebbles, a rock pool, weed             |
| `wall_top`    | 4     | the rock seen from above: dark slate, a crack, sometimes a paler boss             |
| `wall_face`   | 4     | the rock's front face, one tile tall (see joining rules)                          |
| `shallows`    | 4     | light green-teal water over sand: plainly wadeable                                |
| `deep_water`  | 4     | dark blue swell: plainly not                                                      |
| `planks`      | 4     | boards across, as the town's pier; one wear has a split showing water             |
| `door_barred` | 1     | timber frame, iron bars and a band across                                         |
| `door_open`   | 1     | the same frame, dark beyond, the floor going on into it                           |

How they join (tests hold all of it, `tests/art/dungeonArt.test.ts`):

- Every kind tiles with itself in any arrangement, and every wear of a kind with every other:
  floors, water and the wall's top have nothing but single grains at their edges, and their base
  step is most of every edge. The face's and the planks' patterns sit at the same rows on every
  wear's left and right edges, so a row of faces or a deck runs on without a seam.
- **Put `wall_face` in a rock cell whose cell below is open ground (floor, water, a door), and
  `wall_top` in every other rock cell**, as the grey-box's `paintRoom` did with its five rows of
  face. Its top two rows are a lit lip that meets the `wall_top` above it; its bottom two rows are
  a dark foot (`shade1`) that anything standing in front of it reads against. Do not stack two
  faces (the lip would show twice); a face with open ground above it, a rock one cell tall, reads
  as a low ledge. Side and bottom walls are all `wall_top`.
- A door tile is a whole timber frame. It works in a top wall's face row and in a side wall. If
  you swap `door_barred` for `door_open` when a room is cleared, you can drop the drawn bars; if
  you keep `drawDoorBars`, draw it over `door_open`.
- Between kinds the join is the tile edge, straight. Where water meets anything above it, a
  broken row of `foam1` (as `paintRoom` and the town's `sea` do) softens the shore; it is yours to
  keep or not.
- Shadows: draw a standing thing's shadow in its ground's next step down, which
  `GROTTO_SHADOW` in `src/art/grottoRoom.ts` gives by kind: `sand` `cavesand3`, `wet_sand`
  `cavesand4`, `rock_floor` `stone3`, `shallows` `shoal3`, `planks` `wood3`, none on deep water.
  (`sand3` on cave sand reads too orange.)

**The cast: `foePicture(id)`**, facing right (mirror it to face left), outlined, cached. `feet`
is on the outlined picture, from its top-left: the row the feet stand on and the middle between
them. Sizes and tap boxes are yours as data; these are the pictures' own:

| Id              | Picture | Feet     | Notes                                                                                                         |
| --------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `dock_rat`      | 32 x 15 | (17, 12) | tail sweeps behind to row 13; box about 24 x 13                                                               |
| `sand_crab`     | 28 x 18 | (13, 16) | leg tips either side of the feet point                                                                        |
| `smuggler`      | 39 x 47 | (23, 45) | the hero's height; cutlass raised on the right, a corked bottle in the other hand                             |
| `deckhand`      | 39 x 49 | (22, 47) | the hero's height; boathook rises to the top row                                                              |
| `powder_monkey` | 34 x 44 | (14, 42) | rows 0 to 4 are empty, so his fuse's glow fits inside the picture                                             |
| `giant_crab`    | 52 x 29 | (25, 27) | wide and low                                                                                                  |
| `ships_parrot`  | 29 x 39 | (14, 37) | flies: drawn in rows 0 to 24, its feet point is the ground below it; tap box about 28 x 25 above a 12-row gap |
| `brinebeard`    | 60 x 62 | (29, 60) | a head taller than the hero; his anchor stands at his right, cols 38 to 59                                    |

`powder_monkey` carries one glow (his lit fuse, radius 7, inside the picture), lit by
`rasterize` at dusk like any other; nothing else of the cast glows.

**Props: `dungeonProp('grotto', id)`**, outlined, cached; `base` is the row the prop stands on.

| Id               | Picture | Base | Glows                                        |
| ---------------- | ------- | ---- | -------------------------------------------- |
| `powder_keg`     | 13 x 16 | 14   |                                              |
| `treasure_chest` | 24 x 13 | 11   | (a dropped coin beside it is part of it)     |
| `brig_bars`      | 18 x 29 | 27   | a section of bars in timber, one tile wide   |
| `lantern`        | 12 x 25 | 23   | one, at (8.5, 7.5), radius 44, strength 0.55 |
| `anchor`         | 19 x 22 | 20   |                                              |
| `rope_coil`      | 18 x 10 | 8    | lies flat: fine to draw with the ground      |
| `cannon`         | 27 x 16 | 14   | faces right                                  |

The lantern's light is far bigger than its picture: rasterized on its own it is clipped to the
prop's 12 x 25. Move its glow into the room's own coordinates and light the room with it, as
`src/scene/town.ts` does with the town's lamps (`glow.x + at.x`, `glow.y + at.y`).

`src/art/grottoRoom.ts` has the art lane's own test room (`roomPicture(rows, placed)`, rock
resolved to face or top by `roomKinds`), which the gallery shows: a reference for how the pieces
are meant to sit together, not a layout for the game.

## Icons, for lanes A and C (`src/art/icons.ts`)

`itemIcon(id)` and `skillIcon(id)` return a `<canvas class="pixel-art icon">` (aria-hidden: the name
always sits beside it) showing the thing's 24 × 24 icon at 32 CSS pixels, a whole number of device
pixels per art pixel (`iconScale(dpr)`: 4 at 3x, 3 at 2x, 1 at 1x). Every item in
`src/data/items.ts` and every skill in `src/data/skills.ts` has one, and so do the combat skills
`melee`, `ranged`, `defence` and `vitality`. S8's drops and leather set have theirs as of B5.
As of B6 so do S9's bounty items, the grotto's eight loot items and the `thieving` skill. Any
other id is null, never an error. Also exported: `itemIconPicture(id)` and
`skillIconPicture(id)` (the `Picture`, for drawing onto a canvas of your own, as the town does),
`ITEM_ICON_IDS`, `SKILL_ICON_IDS` and `ICON_FAMILIES`.

## The character, for lanes A and C (`src/art/character.ts`)

`characterPicture(look, wornItemIds)` draws the player in any look wearing any items, by the
game's own item ids; `characterCanvas` gives it as an element. Unknown ids are ignored and an
unknown look part falls back to its default, so it never throws. Nothing it exported before
changed its name or shape. New exports: `ITEM_LAYERS` (item id to gear layer) and
`characterGear(look, items)` (the gear ids a picture is dressed in). For S12c, draw the town's
hero with `characterPicture(look, equippedIds)` instead of `figure('standard', HERO_OUTFIT)`; it is
the same 40 × 50 outlined figure, base 47, so the hero's index entry (shadow, base) still applies.

- `LOOK_CHOICES`: skin `fair`, `pale`, `golden`, `brown`, `deep`; hair `short`, `long`, `braid`,
  `shaggy`, `bald`; hair colour `brown`, `black`, `chestnut`, `auburn`, `blonde`, `grey`. The
  first of each is the default, and the default character with nothing worn is pixel for pixel
  what it was before.
- Every wearable in the tables draws: both metals' sword, axe, helmet, shield and breastplate,
  the linen hood, tunic and trousers, the shell necklace and bracelet, the three shortbows, and
  either kind of arrow (a quiver). Items sit on the gear ladder (style guide, "Gear ladder"); no
  tier 1 item is drawn with the approved hero's gear, which waits for tier 2.
- With nothing in the main hand the character stands at ease (`characterBody` says which body):
  the same 40 × 50 figure, base 47, with that hand resting at the belt.
- One item per slot: if two items share a slot (a sword and an axe), the first listed is drawn.
  A bow and a shield together both draw; emptying the off hand is lane A's rule.
- As of B5 the leather cap, jerkin and bracers, the cudgel, the smuggler's cutlass and the
  trollstone draw too, and a held thing is held in a visible fist (style guide, "How things are
  held"). The figure's size, base line and every export are unchanged; lane C's cached hero
  picks this up by itself.
- As of B6 S9's bounty items and the grotto's loot draw too: `poachers_longbow`,
  `wyrmscale_shield`, `barbed_arrows` (a quiver with red fletchings), `hunters_charm`,
  `feathered_hat`, `pirate_cutlass`, `boarding_axe`, `tricorn`, `captains_coat`, `spyglass` (held
  in the off hand, so it takes the shield's place) and `brinebeards_anchor`. `doubloon` and
  `ships_figurehead` are not worn and have icons only.

## Portraits, for lanes A and C (`src/art/portraits.ts`)

`portrait(id)` gives a face for the eight monsters (`dock_rat`, `sand_crab`, `thieving_gull`,
`bramble_boar`, `footpad`, `grey_wolf`, `smuggler`, `marsh_troll`) and the three townsfolk
(`smith`, `trader`, `pirate`), and, as of B6, the grotto's `deckhand`, `powder_monkey`, `giant_crab`,
`ships_parrot` and `brinebeard` (for the dungeon's target panel); null for anything else, S9's
bounty-only monsters included (see "Deferred"). The element is a `div.portrait-art` holding two canvases, the face at 3 and at 2 CSS
pixels per art pixel (144 and 96 CSS pixels at whole device ratios); it fills whatever frame it is
put in, and a container query in `art.css` shows the canvas that fits that frame, so the fight
screen's 148px frame shows the 3x face and its lists' 100px frames the 2x one, never resized.
Also exported: `portraitPicture(id)` (the 48 × 48 `Picture`), `PORTRAIT_IDS`, `PORTRAIT_SIZE`
and `portraitScales(dpr)`.

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

- **B8: The figures at the C scale.** New art, not yet reviewed by Cody. Review sheets outside the
  repo in `/home/claude/lane-shots/w8-b/`: `in-town.png` (a 1170 × 2532 phone view: the hero in iron
  and three townsfolk at the new tavern's door), `head-closeup.png` (H2 before and after),
  `hero-looks.png` (every hairstyle in every colour enlarged, then all 150 looks at true size),
  `gear-ladder.png` (true size and ×8, day and dusk), `gear-all.png` (every wearable worn alone),
  `townsfolk.png` (×6, true size, dusk).
  - **Engine** (`src/art/figure2/engine.ts`): parts of rows whose every character is pinned to a
    material and a step (digits a part's own material, letters the shared legend for skin, eyes
    and brows); stacked by depth with one step of cast shadow below and right of a nearer part's
    edge; outlined inside the canvas in each material's darkest step. `cloth()` roughs in cloth
    only (lit edge, field, shadow, folds as unbroken lines with a lit lip), then `fix` corrects it
    pixel by pixel. Taken from the study's hand-placed figures; its automatic bevel left behind.
    Figure ramps (skins, hair colours, brow, eye, plate, leather, cloth, bronze, hide, tan, the
    townsfolk's dyes, violet, plum, midnight, felt, shell, pinewood, willow) appended to
    `town2/ramps.ts` so a figure stamps into the town's own grid; nothing existing moved. Bronze,
    tan, shells, eye whites and the plate's glint are set by hand at dusk.
  - **Body** (`body.ts`): the H2 head with its eyes reworked (below), ears, a neck narrower than
    the jaw; weight on the near leg with the hip up and that shoulder down, the far leg eased with
    its foot out; the far hand on the hip with the elbow out; the near hand closed out from the hip
    (`standard`) or resting on the belt (`standard_at_ease`). Legs, arms and forearms are separate
    parts.
  - **What changed about H2**: eyes three wide instead of two, the iris centred and two rows tall
    under the lid line (the study's irises sat on the inner side and read cross-eyed enlarged;
    the full-width lid read sleepy); ears; hair a pixel proud of the skull; brows that take the
    step of the hair colour that shows on the skin; long hair in vertical strands, symmetric;
    a closed shaggy fringe; auburn deeper and redder.
  - **Looks** (`look.ts`, `hair.ts`): all five skins, five hairstyles (each a crown and a hang) and
    six hair colours, 150 combinations, each its own picture.
  - **Gear** (`clothes.ts`, `headgear.ts`, `armour.ts`, `held.ts`, `knight.ts`, `trinkets.ts`):
    every one of the 38 wearables in the item tables, through `ITEM_LAYERS2`: the everyday teal
    tunic, grey trousers, boots and belt; linen tunic (sleeves rolled), trousers and hood; leather
    cap, jerkin, bracers; bronze cap, jerkin with its disc, plank buckler, leaf blade, hatchet; iron
    nasal helm, mail, heater, arming sword, bearded axe; cudgel; both cutlasses; boarding axe;
    Brinebeard's anchor; three shortbows (one drawing, three woods) and the longbow; wyrmscale
    shield; spyglass; feathered hat, tricorn, velvet cap; captain's coat; shell necklace and
    bracelet, trollstone, hunter's charm; the two quivers (strap across the chest). Plus tier 2's
    knight: plate, knee cops, red cloak, kite shield, long sword. No tools are drawn today (the
    hatchet is the bronze axe), so none are here.
  - **Townsfolk** (`folk.ts`): `smith`, `trader`, `pirate`, `alewife`, `market`, `docker`, `elder`.
  - **Gallery**: Menu → Art gallery → "See the new figures at the finer scale" (second button at the
    top) draws `figure2/gallery.ts`'s section under "The town": the row at the tavern door, the
    ladder at game scale and twice it, the townsfolk, every look (a plate per hairstyle), every
    gear piece worn, the knight piece by piece, and a button for dusk. About 39 MB of canvases
    once drawn on a 390 × 844 3x phone.
  - **Tests** (`tests/art/figure2.test.ts`): the door's names and numbers; every look draws inside
    the canvas, each its own picture, in its own ramps; every part a pixel inside the canvas; the
    eyes mirrored about column 28 with the irises centred in every look and under every head gear;
    brows clear of every skin; long hair beside the face, kept under a helmet; every wearable
    mapped, drawn and changing the picture; the hand rule (grip under the fist, something above and
    below, nothing over the fist, the whole fist and the forearm showing in seven outfits with and
    without each shield, a shield hiding its hand, fingers round the spyglass); the ladder (each
    rung differs, metal climbs, the knight's polish and colour, shields grow, blades reach higher,
    no gold or cloak in tier 1, bronze and iron apart); the townsfolk ids, individuality, canvas and
    eyes; the old doors unchanged.

- **B7: The town at the C scale.** New art, not yet reviewed by Cody. Review sheets outside the
  repo in `/home/claude/lane-shots/w7-b/` (`phone-1.png` to `phone-4.png` with a 64-pixel
  stand-in and their `-dusk` versions, `building-*.png`, `pieces-*.png`, `town-full-day.png`,
  `town-full-dusk.png`, the gallery in `gallery/`).
  - **Engine** (`src/art/town2/`, taken from the approved study `study/scale-detail`, trimmed and
    typed, each file saying what it took): cells that are a material and a step, so shadows darken
    what is under them and outlines take each material's darkest tone (`cells.ts`); the bevel that
    lights a flat shape as a solid; texture from world position (`texture.ts`); 31 seven-step
    ramps with day and dusk (`ramps.ts`); a raster with the current art's glows (`raster.ts`;
    `addGlow` exported from `../raster.ts` and `shines` widened to any palette with `lightsOn`,
    neither changing behaviour); the scale (`scale.ts`: `WORLD2_WIDTH` 360, `METRE` 38, `m()`,
    `town2Scale`). `SCREEN_ART_WIDTH` and everything the game reads are unchanged.
  - **Buildings**: the tavern (the study's five bays, now with moss as cushions, render broken by
    soft patches, sill stains, cracks and a spalled patch, lit windows, a painted gull-and-anchor
    sign); the smithy (rubble with cut quoins, slate, an oak-lintelled forge bay with hearth, hood,
    bellows, tools and quench tub, a log store under a slate lean-to, a horseshoe sign); your house
    (new: limewash on rubble, thatch with an eyebrow window, a blue door under a slate hood with a
    fanlight, blue shutters, a climbing rose, the hearth's chimney). `walls.ts` holds the painters
    they share.
  - **Props and nature**: stall, well, notice board, signpost (words cut in a 3 × 5 letter set),
    lamp, barrel, crate, anvil on its stump, bucket, net, crab, buoy, gull, smoke (dithered, no
    outline), fence, bench, planter, boulder; three pines of tiered drooping boughs, an oak of leaf
    clumps, a bush; the pier, rowing boat, ship and the rock with its wreck.
  - **Grounds**: grass with soft swathes, tufts, clover, flowers and pebbles; domed cobbles;
    flagstones along the building fronts; the well's round paving; a gutter; the rutted road and
    the lane; a beach behind a low wall with steps; the quay wall; the sea, deeper away from the
    shore, with wavelets and shore foam. Shadows laid per time of day: buildings' contact band and
    wedge, round shadows and contact lines for props and trees, shadows on the water under things
    afloat and down the pier's side.
  - **Layout** (`town.ts`): forest along the top with the road north; the upper street with your
    house, its garden fence, the oak and a woodcutting grove; the tavern and smithy facing the
    square; the well, benches, stall and notice board; the quay with cargo, the beach, the pier,
    rowing boat, ship, rock and buoys. Every door and counter reachable on foot from the start.
  - **Gallery**: a "See the new town at the finer scale" button at the top of Menu, Art gallery
    draws the new part (under "The town") and goes to it: each group of pieces at game scale (the
    wide ones scroll), four phone screens, the whole town at one device pixel per art pixel, and a
    button that turns it all to dusk and back on the same canvases (about 83 MB of canvases once
    drawn, measured on a 390 × 844 3x screen).
  - **Tests**: `tests/art/town2.test.ts` (the scale; every ramp has seven steps and a dusk;
    windows and lamps lit at dusk; shadows cool and lights warm; every piece draws at its size on
    its base line, outlined in its own tones; doors 76 tall above their spots; glows; the layout
    places every piece, in order, footprints never overlapping or on water; every spot walkable
    and reachable; the composed town; dusk's longer shadows; the current town untouched).
  - Style guide: a new section, "The C scale", with sizes, light, ramps, shadows, outlines, dusk
    and what the swap supersedes. The current sizes stay until the swap.
- **B6: The grotto's look.** New art, not yet reviewed by Cody. Review sheets are outside the
  repo in `/home/claude/lane-shots/wave6-b/` (`grotto-room.png` first).
  - Studied first: the approved town at dusk (stone, the pier's planks, the sea and its foam,
    lamplight), and lane C's grey-box room, foes, health bars, warning circles and loot sacks
    (`src/scene`, read only), whose overlays the review sheets redraw over the tiles to judge
    them.
  - **Tiles** (`grottoTiles.ts`): the ten kinds, iterated as a set on an assembled test room at
    dusk with lanterns lit rather than one at a time. First pass faults fixed on the room: sand
    too speckled (paired light and dark grains and frequent ripples), a shell or pool on one tile
    in three, the wall's top a field of identical mounds, the face a brick wall. Two new ramps:
    `cavesand` and `shoal` (palette.ts); nothing existing changed. See "Dungeon art, for lane C"
    above for wears and joining rules.
  - **The cast** (`grottoCast.ts`): all eight, by silhouette first (flat, beside the hero) and
    then shaded. Creatures sketched shape by shape and finished pixel by pixel; the four people
    posed bodies of their own with hand-drawn heads, hands and what they hold, then kept as
    rows. The giant crab's first draft read as a beetle with a scorpion's tail and was redrawn
    front-on with claws; the parrot was enlarged after it read as a speck; Brinebeard's anchor
    was first a pickaxe-like diagonal and then stands beside him on its crown.
  - **Props** (`grottoProps.ts`): all seven; the lantern lit.
  - **Menu art**: icons (`grottoIcons.ts`) for S9's five bounty items and the grotto's eight
    loot items, and the `thieving` skill icon (a purse with its string cut); worn layers
    (`armoury.ts`, mapped in `ITEM_LAYERS`) for the eleven wearables, held things by the hand
    rule; a longbow shape for `bow()`; twelve new `FIGURE_LEGEND` characters for the new ramps.
  - **Faces** (`faces.ts`) for the grotto's five, which the dungeon's target panel shows:
    the deckhand, the powder monkey, the giant crab, the ship's parrot and Brinebeard, each on a
    disc of its own, sketched with the grid's shapes and hand stamps, then kept as rows like the
    others. The bounty-only monsters' faces were not reached (below).
  - **Gallery**: a "Brinebeard's Grotto" section first: the test room at dusk with the cast, the
    hero and two lanterns lit, the same room by day, every tile kind, the cast beside the hero,
    the props. The new icons are in two new families.
  - **Tests**: `tests/art/dungeonArt.test.ts` (every kind, prop and foe from the brief's lists;
    sizes; same variant same tile; wears mixed; edges; the face's lip and foot; the planks'
    rows; shallows lighter than deep, wet darker than dry; doors; feet inside every picture and
    on its lowest row; threat by size; the lantern's and fuse's glows; unknown ids null). The
    hand rule now covers the cutlass, the boarding axe, the anchor and the longbow, in two more
    outfits (the coat and tricorn; the feathered hat); a spyglass test; the hats in the head
    outline test; the icon and wearable lists.
- **B5: Hands, then the new items, then faces.** New art, not yet reviewed by Cody. Review
  sheets are outside the repo in `/home/claude/lane-shots/wave5-b/`.
  - **What was wrong with the hands** (written from the layer-by-layer renders at 8x and the real
    game's town and sheet, before any pixel changed; review sheets outside the repo in
    `/home/claude/lane-shots/wave5-b/`, `hands-diagnosis.png` first):
    - Swords and axes (the hero's long sword, `bronze_sword`, `iron_sword`, `bronze_axe`,
      `iron_axe`): **there was no hand.** The standard body's weapon hand is skin in rows 22 to 26,
      but every tunic's sleeve covers it down to row 25, and each weapon's front part (guard and
      grip, `HELD_FRONT`) started at row 26 and covered the one row of skin left. Not one skin
      pixel of the weapon hand showed (one shadow pixel beside the bronze guard).
    - In the hand's place stood the grip, drawn **four pixels wide** (`oooO`, or `FXX#` for bronze)
      and three or four rows deep: exactly a fist's size and place, in brown or grey-brown. It
      read as a wooden hand or a glove, with the guard on top of it at the cuff.
    - The blade or haft was **one layer at `HELD_BEHIND`**, behind the body. From the elbow down
      (rows 17 to 25) the sleeve covered its dark edge, so only a one-pixel sliver showed beside
      the arm: the weapon went **behind the arm** and reappeared below the cuff as the guard.
    - The line kinked: the blade reached columns 10 and 11 at row 25, but the grip below the guard
      was columns 11 to 14, two pixels to the right, so no straight weapon passed through any hand.
    - Bows: a hand did show (two rows of skin), with the stave behind it and a pixel of binding
      above and below, so they were closest to right; but the hand was only two rows deep and the
      grip sat at the top of the stave's curve rather than its middle.
    - Shields: correct already. The hand they are strapped to is wholly hidden behind them, on
      both bodies.
    - The pirate's cutlass: his hand rests on top of the guard with the blade point down in front
      of his coat; nothing covers the hand and it reads as held. The trader's hand is over her
      basket. Both left as approved.
    - At game scale in the town, by day and dusk, facing either way, all of this showed as a
      brown block under the sleeve and a blade beside the arm: what Cody saw.
  - **The rule** (style guide, "How things are held"; `src/art/depth.ts`): back to front, only a
    bowstring behind the body (`HELD_BEHIND`); body, clothes, armour, belt, bracelet (`WRIST`,
    new, 51); the grip (`GRIP`, new, 52), two pixels wide, running through the fist's columns;
    the fist (`FIST`, new, 55), wrapped over the grip and nothing else; everything else of the
    weapon in front of the arm and body (`HELD_FRONT`), with a guard, haft or binding directly
    above the fist and a pommel or butt directly below it, all on one line through the middle of
    the fist.
  - **What changed in the structure:** the standard body has a fist (`FIST_PART` in
    `wardrobe.ts`: four wide, three deep, rows 27 to 29, below the cuff and the wrist), shared by
    every held thing and absent on the hand at rest. Every weapon was re-cut into the three
    layers: the blades and hafts that were `HELD_BEHIND` are `HELD_FRONT`; each fist-wide grip
    block became a two-pixel grip under the fingers with a pommel or butt below; the axes' hafts
    run one row further to the wrist; the bows moved down a row so the fist holds the middle of
    the stave, with the string the only part behind. Shields already hid the hand they are
    strapped to, on both bodies, and are unchanged. The shell bracelet moved to the new `WRIST`
    depth, a row up the cuff, its shells on the side towards the body, so a blade in front of the
    forearm does not hide them.
  - **The approved hero changed, by 20 pixels** (owner's request): the six pixels of his blade's
    dark edge that the sleeve hid now show in front of it down to the guard, and the 4 × 3 wooden
    grip block below the guard (with a pixel of cloak and of tunic beside it) is now the fist.
    Guard, pommel and everything else are untouched. `tests/art/mockup.ts` lists the 20 pixels
    (`B5_HAND`); the figure, townsfolk and town tests hold the hero, and the assembled town, to the
    mock-up with exactly those changes. `hero-before-after.png`.
  - **Tests** (`tests/art/hands.test.ts`): every held thing (the knight's sword, both swords, both
    axes, the cudgel, the cutlass, the three bows) is drawn in only the three layers, behind
    only for a bowstring; the fingers cover all of the grip; something shows directly above and
    directly below the fist; nothing of the weapon is under or over the fist; in five outfits
    (linen, bronze, iron, leather, the hero's) with and without each shield, the whole fist and all
    of the weapon but its grip show (nothing of it behind arm, torso, armour or a hood's cape);
    blades and hafts keep one straight line, leaning out, through the middle of the fist; bows are
    held at the middle of the stave with the string clear of the hand; no fist on the resting
    hand; the hand shows in every look; a shield hides its hand with or without anything held.
  - **Judged at game scale** in the real town (day and dusk, facing both ways) and on the
    character sheet: `hands-in-town.png`, `hands-on-sheet.png`, `hands-before-after.png` (every
    held thing on both bodies at 8x, 2x and game scale) and `hands-diagnosis.png` (the hand at 8x
    with the layer of every pixel, before and after). In town a pale fist now sits under every
    guard and round every haft, where a brown block was. Weakest: the bows, whose hand was
    nearly right before; the change there is small (a fist a row lower on the stave's middle).
  - **The eleven new items** (`lootIcons.ts`, family "What monsters drop" and "Leather"): icons
    for `hide`, `feathers`, `pearl`, `smuggled_tea`, `trollstone`, `cudgel`, `smugglers_cutlass`,
    `leather`, `leather_cap`, `leather_jerkin`, `leather_bracers`. Worn layers (`ITEM_LAYERS`) for
    the six wearables: `leather_jerkin`, `leather_cap`, `leather_bracers` (both forearms; an at-ease
    version), `cudgel` and `smugglers_cutlass` (by the hand rule from the start) and `trollstone`
    (a pebble on a thong at the collar). A new ramp, `tan`, for leather, dusk set by hand; tests
    hold it more than 12 from every skin step by day and dusk, and leather as a rung with no metal
    that covers more than bronze's metal. The gallery's ladder now shows Linen, Leather, Bronze,
    Iron and the hero. `new-items.png`.
  - **Portraits** (`faces.ts`, `portraits.ts`): all eight monsters and the three townsfolk.
    Sketched shape by shape (head, ears, snout, hat placed by hand), finished pixel by pixel, kept
    as rows of characters; each on a dark disc of its own tint, outlined, one expression each.
    Checked in the real fight screen (3x in its frame) and the monster list (2x):
    `portraits.png`, `fight-screen.png`. The gallery opens with them, framed as the fight screen
    frames them. Tests (`tests/art/portraits.test.ts`): every monster and townsperson has a face
    and unknown ids are null; 48 × 48, clear corners, a dark disc darker than the face, the bust
    outlined and filling the square; no step that lights at dusk; both canvases at whole device
    pixels, sized 144 and 96 CSS pixels.

- **B4: Icons, and the hatchet.** New art, not yet reviewed by Cody. Review sheets are outside
  the repo in `/home/claude/lane-shots/wave4-b/`.
  - The hatchet (`bronze_axe` worn, layer `bronze_hatchet`): five candidates in two rounds,
    compared on the character beside the iron axe at game scale and close, day and dusk. Chosen:
    a solid wedge (flat top, filled down to a curved bit edged in the polished step, a socket
    wrapped round the haft, a pixel of haft above), replacing B3c's thin bar that hooked off the
    haft. The B3c tests for it pass unchanged.
  - Icons: 48 items and 13 skills, every one hand-drawn as rows of characters
    (`itemIcons.ts` for what is gathered, cooked and smelted; `gearIcons.ts` for gear, arrows,
    bows, cloth, the vial and potions; `skillIcons.ts`; `iconKit.ts` centres and outlines them).
    Families and how they differ are in the style guide's new "Icons" section. New ramps for
    icons only; no existing colour changed.
  - Gallery: an "Icons" section first, every icon labelled in its family at menu size.
  - Tests (`tests/art/icons.test.ts`): every id in the test's own copy of the item and skill ids
    gives an icon and a canvas; unknown ids (and `toString`, `__proto__`) give null; no two
    icons are the same picture; each is 24 × 24, outlined, filling at least 16 pixels; every icon
    is in exactly one family; the scale is whole and about 32 CSS pixels; logs differ by bark and
    end; raw and cooked share no ramp; bronze gear uses no iron and iron no bronze; each potion
    has its own liquid and stopper; the hatchet's icon is a solid wedge with a bright curved bit
    and haft above, like the worn one.
  - Not done: portraits (all still null); the tab icons stay the S1 placeholders, because the
    tab bar draws them as one-colour SVG glyphs (`pixelSvg` in `src/ui/app.ts`), so real icons
    would need a change in `src/ui`.

- **B3c: The wardrobe's third pass.** Cody looked at B3b and asked for work on what was still
  weak. Four pieces redrawn, each chosen from three or more candidates compared side by side at
  game scale and twice that, day and dusk (sheets kept outside the repo for his review:
  `/home/claude/lane-shots/wardrobe-pass-3/`). Ids, layers and exports are unchanged.

  | Item             | Layer               | What it is now                                                                                                |
  | ---------------- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
  | `bronze_axe`     | `bronze_hatchet`    | head at the very top of a short haft (haft shows above), straight top flaring to a curved bit, dark socket    |
  | `bronze_helmet`  | `bronze_cap`        | close skullcap a pixel proud of the skull, bright ridge over the crown, riveted rim on a hide liner; no brim  |
  | `bronze_sword`   | `bronze_shortsword` | straight leaf blade, bright midrib between olive faces, dark shadow edge, evenly stepped; small guard, pommel |
  | `shell_bracelet` | `shell_bracelet`    | dark cord round the wrist with two shells of different sizes hanging from it (and its at-ease version)        |
  | `shell_necklace` | `shell_necklace`    | redrawn to match: a cord along the collar with two uneven shells                                              |
  - Palette: bronze gains a fifth step, `bronze5`, a polished glint for a blade's midrib, an axe's
    edge and the cap's ridge (the armour's four steps alone made a blade read as yellow plastic);
    the first four are unchanged. Shells were peach (7.9 CIE76 from pale skin by day, 6.2 at dusk,
    where they went the orange of skin): now cream and rose, set by hand at dusk like the other
    whites. Nothing else in the palette changed.
  - Tests (`tests/art/pieces.test.ts`): the sword's midrib and middle run along one line, step
    evenly, and the blade is symmetric about the midrib within a pixel with a dark shadow edge, a
    point and a wider guard; the hatchet's head is at least 12 times the haft's width in pixels,
    sits at the top with haft above it, has a curved bit edged in the polished step and a dark
    socket against the wood, and is smaller than the iron axe's head; the cap stays within a pixel
    of the skull and above the brows, with a ridge and a riveted rim; shells are more than 12 from
    every skin step by day and dusk, hang from a cord in two or three groups of uneven size in both
    arm poses, and show on every skin holding something or not. The bronze-versus-skin test now
    covers `bronze5` too. The old "brim wider than the head" test became "no wider than the head".
  - Style guide: the polished step, how a close cap reads as metal, what makes a sword and an axe
    read, and how shells are drawn.

- **B3b: The wardrobe's second pass.** After Cody's first look: gear on a ladder that starts
  simple and climbs, and the weak pieces redrawn. New art, not yet reviewed.
  - The ladder (style guide, "Gear ladder"): linen is a villager, bronze a militia volunteer,
    iron a town guard; the approved hero's plate, kite shield, cloak and long sword are tier 2's
    knight and are no longer what any tier 1 item is drawn with. Tiers 3 and 4 are described in
    words only. What grows from rung to rung (metal on the body, silhouette, colour and trim,
    highlights) is written there as rules.
  - Item to layer (`ITEM_LAYERS` in `character.ts`):

    | Item                 | Layer                | What it is now                                                       |
    | -------------------- | -------------------- | -------------------------------------------------------------------- |
    | `bronze_sword`       | `bronze_shortsword`  | short leaf blade to the shoulder, cast guard                         |
    | `bronze_axe`         | `bronze_hatchet`     | hatchet, short haft, head through the haft                           |
    | `bronze_helmet`      | `bronze_cap`         | domed skullcap, riveted brim wider than the head, band               |
    | `bronze_shield`      | `bronze_buckler`     | small round wooden shield, hide rim, bronze boss                     |
    | `bronze_breastplate` | `bronze_jerkin`      | hide jerkin over the tunic, one bronze disc, tabs                    |
    | `iron_sword`         | `iron_arming_sword`  | straight sword, plain iron cross (was the hero's)                    |
    | `iron_axe`           | `iron_bearded_axe`   | unchanged                                                            |
    | `iron_helmet`        | `iron_nasal_helm`    | unchanged                                                            |
    | `iron_shield`        | `iron_heater_shield` | unchanged                                                            |
    | `iron_breastplate`   | `iron_mail`          | mail shirt to the thigh, sleeves to the elbow (was the hero's plate) |
    | linen, shells, bows  | as before            | bracelet redrawn bigger; quiver redrawn bigger                       |

    B3's `bronze_leaf_sword`, `bronze_crescent_axe`, `bronze_cheek_helm`, `bronze_round_shield`
    and `bronze_cuirass` are gone (nothing drew them any more). The hero's layers are untouched.

  - Bronze recoloured yellow-olive, away from every skin tone, with every step hand-set at dusk;
    a new `hide` ramp (cool leather) frames it. A test holds every bronze step more than 12 (CIE76)
    from every skin step, by day and at dusk, and no bronze pixel touches skin.
  - Empty hands: a second body, `standard_at_ease`, is the standard body with the weapon forearm
    redrawn bent so the hand rests at the belt (the standard body and the hero are untouched).
    `characterPicture` uses it when nothing is in the weapon slot, with at-ease versions of the
    clothes on that forearm (`teal_tunic_at_ease`, `linen_tunic_at_ease`,
    `shell_bracelet_at_ease`; `AT_EASE_GEAR` in `armoury.ts`). The shield hand already rests on
    the hip and was kept. A new depth, `HAND` (45), puts the resting hand over shirt and armour.
  - Gallery: the Wardrobe section now opens with the ladder (linen, bronze, iron and the hero as
    tier 2, day and dusk, close up and at game scale), then every item alone by day and dusk, each
    rung in other looks, the bows, then the looks.
  - Tests (`tests/art/ladder.test.ts`): metal coverage linen < bronze < iron; shields grow and
    blades reach higher bronze to iron to knight; no tier 1 item uses the knight's layers; iron has
    no gold beyond the buckle and is narrower at the shoulder than the knight; bronze against skin
    as above; every helmet and the hood change the head's outline in every hairstyle and colour;
    the bronze cap's brim is wider than the head over a hide band; the at-ease body differs from
    the standard only in the weapon arm, and the hand rests whenever nothing is held.
- **B3: The character's wardrobe.** New art in the approved style, not yet reviewed by Cody.
  - Looks (`character.ts`, `hair.ts`): five skin tones and six hair colours as palette ramps (the
    body's skin and hair steps are swapped for the chosen ramp, brows included); five hairstyles
    drawn to the standard head, each split into a crown and what hangs below it.
  - Gear (`armoury.ts`): every wearable item as a layer on the standard body, rows of characters
    fitted to its pose. Bronze is a new ramp (copper-orange, hand-set at dusk like gold and
    polished iron); linen, shell, pine and willow are new ramps too. Depths moved to `depth.ts`
    (same values; the hero is unchanged, its test untouched).
  - Helmets and hair: under a helmet or hood only the hanging part of a hairstyle is worn (long
    locks, the braid, a shaggy cut's ends), so nothing pokes through; the braid lies over a hood's
    cape. Short and bald show nothing under one.
  - Under the gear: the everyday teal tunic unless a body item replaces it (armour goes over it,
    the linen tunic replaces it), grey trousers unless the linen ones replace them, boots and belt
    always.
  - Gallery: a "Wardrobe" section first: every skin, hairstyle and hair colour side by side at game
    scale; the bronze, iron and linen sets close up by day and at dusk and at game scale; each bow
    with a quiver; iron close up day and dusk; every item worn alone.
  - Tests: every wearable id maps to a drawn layer and changes the picture; bronze uses no iron
    steps and iron no bronze; the bows differ; every look choice draws differently; skin tones
    come from their own ramps; brows follow the hair; in every look under every helmet and the
    hood both eyes stay open and mirrored and no hair shows above the eyes; the default character
    is unchanged.
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

- **Not in B8, by its brief**, and what each will need:
  - Walk cycle: the legs (`LEGS_SHAPE`, boots), the near forearm and the far arm are separate
    parts already; a cycle needs four to six leg poses and an arm swing per pose, with every
    clothes, armour and coat part that covers a leg or the far arm given a version per pose (as
    `hold` and `ease` do for the near forearm). Townsfolk do not walk today.
  - Foes and the dungeon cast at the C scale: drawn as people the hero's size on this canvas (the
    deckhand, smuggler, powder monkey and Brinebeard can reuse the head and the hand rule), the
    creatures on canvases of their own; `foePicture` keeps its shape, so a `foePicture2` beside it.
  - Portraits from the C-scale faces: the H2 head is 15 × 18; a 48 × 48 bust needs it drawn at
    about three times that, by hand, rather than scaled.
- **B8, weaker than it should be** (for Cody's review), weakest first:
  - The near hand at rest on the belt reads as a hand on the hip too, so the at-ease hero has both
    hands at his waist; a hand hanging easy or a thumb in the belt might read as more relaxed.
  - The bronze cap is a bowl a pixel proud of the skull with a riveted rim: it reads as a helmet,
    but on blonde hair bronze and hair are close.
  - The leaf blade still reads more yellow than olive at true size; the day shift lifts bronze.
  - The trader's apple and the market woman's hand at her knot are a few pixels each: legible
    enlarged, small at true size.
  - The docker's crossed forearms now slant and the top hand grips the other arm, but at true
    size they are a bundle across his chest rather than two clear arms.
  - Cloth below the belt is still regular: three folds on every tunic, skirt and apron.
  - The pirate's peg leg reads as a tan leg at true size; his cutlass point sits by his boot.
  - Mail's rings are a regular weave rather than catching the light.
  - The stance is still nearly front-on: the life is in the hip and shoulder tilt, the eased leg
    and the arms, not in any turn of the body.

- **B7, weaker than it should be** (for Cody's review), weakest first:
  - The ship: a solid cutter with a furled sail, gun ports and a lit stern window, but its stern
    cabin is a plain box and its rigging is a handful of straight lines.
  - The rock with its wreck: the face reads, but the rock is a lumpy grey solid without the
    strata or weathering the buildings have, and the wreck's ribs are small beside it.
  - The oak reads as a broadleaf, but its crown is rounder and more regular than an oak's and its
    limbs barely show.
  - Pines: tiers of drooping boughs with a lit side and dark undersides, but the tiers repeat a
    little regularly, like chevrons.
  - The square is large: flagstones, the well's paving, benches and planters break it up, but from
    far off it is still a lot of cobbles.
  - The upper street is mostly grass with bushes and boulders; a hedge, a wall or a garden would
    give it more to look at.
  - Smoke, gulls and shore foam are still pictures: animating them is lane C's.
  - Grass and water are soft dithered patches; at game scale the dither shows as a fine texture.
- Figures at the C scale were drawn in B8 (above).

- **Not reached in B6**: faces for S9's bounty-only monsters, `goblin_poacher` and
  `bramble_wyrm` (part 5 of its brief), which stay null; and the five tab icons (part 6;
  `tabIcon(id)` stays null). Drawing the goblin's face will need lane A's
  `tests/ui/combat.test.ts` (line 79), which expects `goblin_poacher`'s portrait to be the blank
  "G", changed to expect `.portrait-art` as the dock rat's line above it does.
- Weak spots for Cody's review (B6), weakest first:
  - The joins between kinds are straight tile edges (sand to wet sand, shallows to deep water):
    clean, but the shore is a staircase, not a curve. Softening it needs edge tiles the doors do
    not ask for yet.
  - `sand_crab`: small and thin beside the rest; it reads as a crab but its stalk eyes are a
    pixel each.
  - `ships_parrot`: a bright bird in flight that reads at game scale, but its wings are flat
    bands of colour.
  - `powder_monkey`: bare orange skin is most of him at dusk; his grin carries him.
  - The tricorn icon (a black hat with brass points, better than its first bowl-like draft) and
    the boarding axe's small head, worn.
  - The wall's face is one tile tall, so a wall is a third of the hero's height.
  - Faces: the giant crab's is the weakest (stalk eyes over its shell's edge, the disc showing
    between the stalks so it can look like a mask); the powder monkey's round bald head is
    close to cheerful rather than gleeful.
- Brinebeard's coat is purple (to keep him apart from the town's red-coated captain); lane A's
  item text for `captains_coat` says red. See "Needs from another lane".
- The hero's own portrait (for the character sheet) is not drawn.
- Weak spots for Cody's review (B5), weakest first:
  - `leather_bracers`' icon: two laced cuffs with their lace ends hanging. It reads as laced
    leather, but at true size could be taken for a pair of boots. Three designs were tried.
  - The trollstone worn: a grey pebble at the collar, findable on the tunic, lost against iron
    mail (grey on grey). Like the shell bracelet, as far as four pixels go.
  - The bracers worn on the weapon arm are mostly hidden by a blade passing in front of the
    forearm, as the hand rule says it should; the other arm's show unless a shield is carried.
  - Portraits: the trader's hair is lit in a hard diagonal; the footpad's cudgel reads as a mace;
    the boar's bristle ridge with brambles in it can read as a crown. The rest read in a word at
    true size (rat, crab, gull with a chip, wolf, smuggler, troll, smith, pirate).
  - The leather cap is close in shape to the bronze cap; its ear flaps and tan tell them apart.
- Icon weak spots for Cody's review (B4): `linen` (a folded stack with a hanging corner; reads
  as cloth more than as a bolt), `shell_bracelet` (small: a cord ring with three shells),
  `arrow_shafts` (three sticks bound with hide), the bronze sword's guard (busy where it crosses
  the blade), `bronze_breastplate` (a hide jerkin with one disc, true to the ladder, but more
  leather than bronze), the raw shrimp (the curl reads; the head is small) and `crafting` (the
  spool can read as a red book).
- The tab icons and home-screen icon are still the S1 placeholders.
- Wardrobe weak spots for Cody's review (after B3c): the shell bracelet is still the weakest
  piece. At game scale it is a pale speck on a dark cord at the wrist: findable, and no longer a
  checked cuff, but "bracelet" rather than "shells" is as far as two or three pixels go. The
  bronze cap over blonde hair is the next: bronze and blonde are close in colour, and the ridge's
  shine is what separates them. The linen tunic and trousers are still plain.
- Tier 2, 3 and 4 gear: tier 2 is the approved hero's layers, waiting for tier 2's items; tiers 3
  and 4 are words in the style guide only.
- No walk cycle; figures face one way (mirror for the other).
- The townsfolk bodies are drawn only where they show, so they cannot be dressed in other gear.

## Needs from another lane

- Lane A, `src/data/items.ts`, `captains_coat`'s description begins "Long, red and heavy with
  braid": Brinebeard and his coat are drawn purple with brass braid, so that he is never taken
  for the town's red-coated captain. One word: "Long, purple and heavy with braid". (Or, if Cody
  prefers red, say so and art recolours the coat; it is a legend change in `grottoCast.ts`,
  `armoury.ts` and `grottoIcons.ts`.)
- Lane C: nothing required for B6; the doors are filled behind their names. The notes above say
  how to lay walls, which shadow step to use, and that the lantern's light must be moved into the
  room's coordinates to light more than the lantern.
- **Lane C, to switch the town to the C scale and its people to the C-scale figures** (the
  figures have landed in B8; switch both together, or the hero will be a third too small):
  - The hero: in `src/scene/hero.ts`, `characterPicture(dress.look, dress.worn)` becomes
    `characterSprite2(dress.look, dress.worn, time)` (or `characterPicture2` if you keep your own
    canvases); the feet are `{ x: FIGURE2_ANCHOR_X, y: FIGURE2_SOLE_Y }` (28, 70) on a 56 × 72
    picture instead of `HERO_FEET` (20, 47) on 40 × 50. Re-make the sprite when the outfit or the
    time of day changes; never per frame.
  - The townsfolk: in `src/scene/town.ts` and `townArt.ts`, the `smith`, `trader` and `pirate`
    pieces come from `townsfolkSprite2(id, time)` with the same anchor; the villagers `alewife`,
    `market`, `docker`, `elder` are new and yours to place and give words (or leave out).
  - Shadows: a contact shadow two of the ground's own steps darker in an ellipse about 22 × 4 under
    the anchor; tap boxes for a person about 24 × 64 above the anchor.
  - Dungeons: the grotto still draws the current figures (`foePicture` and the hero at 40 × 50) at
    the old scale; it can keep them until its own C-scale pass, or take the hero from
    `characterSprite2` if the dungeon moves to 3 device pixels per art pixel.
  - The town's own switch, as B7 left it:
  - World width: `SCENE_WIDTH` 360 (`WORLD2_WIDTH` in `src/art/town2/scale.ts`), so `sceneScale`
    gives 3 on a 390-wide 3x phone (which then shows 390 art pixels across, at least 360).
    `MIN_SCENE_HEIGHT` scales with it (160 × 360 / 270 = 213).
  - Tiles: the town's walking map is 24 pixels a tile (`TOWN2_TILE`, `town2Walk()` ready made).
    `TILE` in `tileMap.ts` is 16 and shared with the grotto, so either give `TileMap` its own tile
    size or sample `groundAt(x, y)` and the footprints on 16-pixel tiles.
  - Camera bounds: the world is `TOWN2_W` × `TOWN2_H` = 1440 × 2136; `cameraFor` already clamps
    to any world size.
  - Walker speed: 88 art pixels a second (64 today is 1.36 person-heights a second; with 64-pixel
    people that is 87, and 85 keeps today's speed on screen at 3 device pixels).
  - Layout door: `town2Layout()` (placements with footprints, spots and tap boxes),
    `town2Ground(time)` under the sprites, `town2Piece(id)` for each sprite, `TOWN2_START` for the
    hero, `town2Ground('dusk').glows` for lights. Keep pictures on offscreen canvases
    (`spriteCanvas`, or your own) so nothing is rasterized per frame. The smoke and gull
    placements are there for `ambient.ts` to animate; `shoreAt(x)` gives the shore for foam.
  - The words for the new placements (`house`, `oak`, `fence-*`, `bench-*`, `planter-*`,
    `bush-*`, `boulder-*`) are lane C's to write.
- **Lane A, to switch the menus to the C-scale figures**:
  - `src/ui/characterScreen.ts` and `src/ui/createScreen.ts`: `characterCanvas(look, worn, size)`
    becomes `characterCanvas2(look, worn, size)` from `src/art/character2.ts`; same arguments. The
    canvas is 56 × 72 art pixels at 3 (thumb) or 6 (sheet) device pixels each on a 390-wide 3x
    phone, so 56 or 112 CSS pixels wide (today's is 40 × 50 at 4 or 8: 40 or 80 wide); the
    `.figure` box may want room for it. `LOOK_CHOICES` stays as it is (`LOOK_CHOICES2` is the same
    object).
  - Tier 2's items, when they exist: one row each in `ITEM_LAYERS2` (art's, in
    `src/art/character2.ts`) pointing at `knight_plate`, `knight_knees`, `red_cloak`, `kite_shield`
    or `knight_sword`; tell lane B the ids. Nothing for the save.
  - `tests/ui` that look for the character canvas by its size will need the new size.

## Notes for this lane's next session

- C-scale work (B7) is judged at game scale on a phone-sized crop, not piece by piece: a scratch
  page under `.shots/` served by `npm run dev` can `cut()` a crop of `town2Picture(time)`
  (`gallery2.ts`), rasterize it at 3 and draw a 64-pixel stand-in on it, which is how the
  square's emptiness, the camouflage grass and the striped sea were caught. Composing the whole
  town takes a few seconds; the tests that compose it carry a long timeout.
- A C-scale piece is a painter in `src/art/town2/` returning a grid of material-and-step cells, a
  row in `MAKE` and `TOWN2_IDS` (`pieces.ts`), and, if placed, a line in `SPECS` (`town.ts`).
  Lay sizes out in metres (`m()`); shade by material steps; let `outlined` draw the line.
- Game scale is a world 270 art pixels wide across the app (4 device pixels per art pixel on a
  390-wide 3x phone). The gallery's town is 270 wide, so on that phone it is shrunk to 3 to fit
  inside the menu's padding, as the mock-up itself is on the same phone.
- `scenery.ts`'s pieces (tavern, pine) take a random source; the index's are the ones drawn in the
  mock-up's town with seed 21. Calling `tavern(seeded(n))` yourself gives the same building with
  wear in other places.
- At a fractional device pixel ratio (2.625 on many Androids) pictures are close to exact but not
  always pixel-perfect; at whole ratios they are exact.
- Gear ids are art ids; `ITEM_LAYERS` in `character.ts` maps the game's item ids onto them. A new
  wearable item needs a layer in `armoury.ts`, a row there, and its id in the list in
  `tests/art/character.test.ts`. A new held thing is drawn to the hand rule: a `GRIP` part in the
  fist's columns (`FIST_PART`), the rest `HELD_FRONT`, and its gear id in the list at the top of
  `tests/art/hands.test.ts`.
- A new portrait is a row in `FACES` (`faces.ts`) and its id in `tests/art/portraits.test.ts`.
- A new dungeon theme is a tile table like `GROTTO_TILES`, a cast entry per monster in `FOES`
  (`grottoCast.ts`, or a file of its own) and props in a table like `grottoProps.ts`'s, wired in
  `dungeonArt.ts`. Iterate on an assembled room (`roomPicture`), not single tiles, and redraw lane
  C's overlays on it (warning circle, loot sack) to judge whether floors are quiet enough.
- Sketching a creature with `grid.ts`'s primitives and dumping it as rows, then finishing it by
  hand, was much quicker than writing rows blind; the dump needs a reverse legend.
- Moving `.shots` aside for a check: move it to a name that does not exist yet. `mv` into an
  existing folder nests it.
- Real-game screenshots: seed `localStorage['hearth-and-harbour:save']` with a version 6 save
  before load (`equipment` by slot, `{ item, qty }`), then drive the tabs. The town's hero starts
  in the square; taps about 55 CSS pixels either side of the canvas's centre and 45 above it
  land on open cobbles and turn him each way. Combat is Skills, then a combat skill's row.
- Scratch renders: a vitest file under `.shots/` with its own config (environment `node`) can
  rasterize pictures and write PNGs without a browser, which is much faster for iterating on a
  sprite than the gallery. `eslint .` lints `.shots/` too (it does not read `.gitignore`), so
  move the folder aside before a local `npm run check`. For "before" pictures, extract `main`'s
  `src/art` (`git archive origin/main src/art`) into `.shots/` and render from that copy.
