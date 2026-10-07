# Lane B: art

**Next session:** Cody's review of B12 (the back view, the layer order, the hero's blow, the marks'
faces, the wide foes), and whatever it asks for.

## Faces, icons, wide foes, the first scale retired, for lanes A and C (B12, second PR)

- **Faces for the five thieving marks**, by the game's action ids, through `portrait2(id)` and
  `portraitPicture2(id)` (72 x 72, the same element and three canvases as every face):
  `steal_fisherman`, `steal_fish_stall`, `steal_sailor`, `steal_pedlar`, `steal_strongbox`. Each
  has a `PORTRAIT2_SAFE` box. Lane A's cards show them as they are.
- **Icons**: `shell_necklace` and `shell_bracelet` redrawn to fill their 22 x 22 like the other
  icons (same ids, same size, same door).
- **The captain** (`FOE2_SIZES`, drawing-only numbers; no reach the fight uses changed) stands
  with his cutlass held up before his shoulder; levelled forward, it reached over a hero at
  strike reach. `front` 51 to 38, `box` 56 to 54 wide, `shadow` 27 to 26 (canvas, feet, tall and
  his strike unchanged). His coat still meets the hero at the melee stand, and lane C's wave 12
  now draws the hero apart from it (`apart.ts`, from these sizes). **The giant crab is unchanged**:
  B12 drew it narrower (legs in under the shell, 1.7 times the sand crab), but lane C's "figures
  drawn apart", merged meanwhile, already clears the hero from it by half a tile and its tests
  hold the crab's sizes, so the crab went back to its B11 drawing.
- **The first scale is retired** (next section): `dungeonTile`, `dungeonProp`, `foePicture`,
  `GROTTO_SHADOW`, `portrait`, `portraitPicture`, `PORTRAIT_SIZE`, `townPiece`, `townLayout`,
  `characterPicture`, `characterCanvas` and the modules behind them are gone. `character.ts` keeps
  `Look`, `LookChoice`, `LOOK_CHOICES` and `DEFAULT_LOOK`.

## The blow, the back view, the loot pile, for lanes C and A (B12, first PR)

**No door renamed or re-signed, no constant changed.** Added:

```ts
characterStrike2(look, wornItemIds, time, facing, frame, extra = []): HTMLCanvasElement
characterStrikePicture2(look, wornItemIds, facing, frame, extra = []): Picture2
STRIKE2_FRAMES = 4        // wind-up, swing, the blow landing, recovery
STRIKE2_HIT_FRAME = 2     // count the hit, flash the foe, on this frame
characterStrikeTagged2(look, worn, facing, frame, extra = [])  // tests and review sheets only
```

- Same canvas (56 x 72), anchor (28, 70) and caching as `characterWalk2`/`characterWalkPicture2`;
  `frame` is any whole number (it wraps); `forgetWalks2()` lets the strike pictures go with the
  walk's (`forgetSprites()` the canvases). Every facing (`'down' | 'right' | 'left' | 'up'`); use
  the `'left'` frames as they come (the weapon stays in the right hand), never a mirrored right.
- **Reach**: kept on the same canvas and anchor; a weapon longer than the room in front of the fist
  is foreshortened (and if need be leant less), so nothing touches the canvas edge. The blow lands
  about 13 to 26 art pixels ahead of the anchor across (the fist at about 41 to 44), so a foe at
  `MELEE_STAND` (36) is within the drawn reach of the longer weapons and just beyond a punch.
- Timing is lane C's: about 90 to 110 ms a frame reads well (the gallery shows 110 with a rest);
  hold frame 3 (the recovery) as long as wanted, then go back to standing or walking. Feet are
  planted (both soles on row 70 across; toward and away the stance widens two columns each side).
- Kinds by the weapon worn: swung (every blade, axe, the cudgel, the anchor), drawn and loosed (the
  three shortbows and the longbow), a punch (no weapon). A bow takes both hands: a shield worn with
  a bow is not drawn during the blow.
- **New prop, for lane C**: `dungeonProp2('loot_pile')` (and `dungeonPropSprite2`): a tied canvas
  sack with coins spilled before it, 26 x 20 with its outline, about 0.45 m; stand it at
  (x - foot, y - base) like every prop. It replaces your sack.
- **The walk** changed behind the same doors (no size, anchor or constant): walking away, held
  things and shields are behind the body (only what reaches past it shows), the quiver under the
  cloak, the hands over its edge; across, the cloak takes a leg striding back into it, and a coat's,
  mail's or jerkin's skirt and sleeves show over the tunic (they had been replaced by it). Townsfolk
  from behind hide what they hold in front; the captain's cutlass now swings with his hand (it had
  walked with his leg) in every facing. Rules in the style guide, "What covers what (B12)".

## Portraits redrawn, the carry, the weak spots, for lanes A and C (B11)

**No door renamed or re-signed, no constant changed** (`WALK2_FRAMES` 8, `WALK2_FRAME_MS` 80,
`WALK2_STRIDE` 7, `TOWNSFOLK2_STRIDE` 4, `TOWNSFOLK2_FRAME_MS` 100; `PORTRAIT2_SIZE` 72, the three
display sizes, `portrait2(id)`, `heroPortrait2(look, worn)` all as they were). What changed behind
them, and what a caller may notice:

- **Faces** (`portrait2`, `heroPortrait2`): every person redrawn by hand as their own head, the
  hero's rebuilt, nine creatures reviewed and five restored. Same 72 × 72, same element, same
  three canvases. `PORTRAIT2_SAFE` re-measured from the new drawings: they fill the square now, so
  every box is wider (most 56 to 72 across, still above row 56); `HERO_PORTRAIT2_SAFE` is
  `{ x: 3, y: 0, w: 66, h: 56 }` (the hats' brims kept 3 pixels in from each side, where the
  header's 48-pixel frame crops a face; `tests/ui/faces.test.ts` holds it). `HeroBust` gained an optional
  `shirt` (the hero's portrait shows the linen or the everyday teal tunic under a jerkin).
- **New tile ids, for lane C**: `door_side_open` and `door_side_barred` (`dungeonTile2`, 24 × 24,
  one wear each): a door in a **side** wall, seen from above as side walls are. Use them for every
  grotto door in a left or right wall (all of them today); `door_open`/`door_barred` stay for a
  door in the wall the viewer faces. Pass `around` and it turns to the room (the side with open
  ground; east if neither or both); the rock above and below it is `wall_top`, not a face
  (`roomKinds2` does this for the sample key, letters `S` and `Z`).
- **Foe sizes, for lane C**: two numbers in `FOE2_SIZES` changed with their drawings (the test
  holds them): `deckhand.strike` 26 → 27 and `goblin_poacher.strike` 24 → 26, because a person now
  steps into the blow. Nothing else in the table changed (canvases, feet, boxes, shadows). The
  troll's fall frame 1 is a new drawing on its own 98 × 50 canvas, `feet` (46, 48); as before, a
  fallen frame's size differs from the standing canvas and its feet are always right.
- **The walk**: walking across, long weapons are carried low and forward (no frame of any facing
  puts a held pixel on the head); walking left is re-lit from the left; walking down or up the
  planted foot climbs (or falls) two rows a frame, so the lowest sole may be up to **4 rows above
  the anchor row** mid-stride toward or away from the camera (the anchor and the 22 × 4 contact
  shadow are unchanged; across and standing the soles are still on row 70).

## Walking in four facings, for lane C; tab icons, for lane A (B10b)

The same doors as B9 (below), nothing renamed or re-signed, every constant the same value
(`WALK2_FRAMES` 8, `WALK2_FRAME_MS` 80, `WALK2_STRIDE` 7, `TOWNSFOLK2_STRIDE` 4,
`TOWNSFOLK2_FRAME_MS` 100); better art behind them, and one addition:

- **`Facing2` is now `'down' | 'right' | 'left' | 'up'`.** `'up'` is walking away, from behind,
  for the hero (`characterWalk2`, `characterWalkPicture2`) and all seven townsfolk
  (`townsfolkWalk2`, `townsfolkWalkPicture2`). The first three values mean what they did.
- **Across is a true profile** for every look and every wearable, the knight included (none falls
  back to B9's sheared walk; a test holds it), and the seven townsfolk.
- **`'left'` is no longer the mirror of `'right'` for the hero**: the sword stays in his right hand
  (walking left it is in the far hand, behind him, and a shield's face is on the near arm). Use the
  `'left'` frames as they come; never mirror a `'right'` frame for left. Townsfolk carry no weapon,
  so their left is still their right mirrored. Standing still facing left, mirror the standing
  sprite as before (it is the three-quarter front, not a profile).
- Frame from distance, as before: `Math.floor(walked / WALK2_STRIDE) % WALK2_FRAMES` (townsfolk
  `TOWNSFOLK2_STRIDE`); frame 0 is the near foot's heel strike in every facing. Across, a planted
  foot moves back exactly the stride each frame (tested), so there is no sliding at the shipped
  speed. Toward and away, the feet step with the body as B9's did (see the weak list).
- Anchor (28, 70), canvas 56 x 72 and the contact shadow (about 22 x 4, fixed) are unchanged.
- Memory, as before a frame is 56 x 72 x 4 = 16 KB: one outfit in every facing and the breath is
  33 canvases, 532 KB by day (1.06 MB with dusk too), plus 8 KB of cells a picture (266 KB) kept
  until `forgetWalks2()`; each townsperson the same, all seven in every facing by day 3.7 MB.
  Only frames asked for are made. `forgetWalks2()` still lets every walk picture go (tested).
- **Tab icons**: `tabIcon(id)` (`src/art/icons.ts`) answers for `skills`, `bank`, `character`,
  `town`, `menu` with a `<span class="tab-icon" aria-hidden="true">` holding the icon twice (24 x 24
  art pixels at the item icons' scale, 32 CSS px on a 3x phone): `canvas.tab-icon-on` lit and
  `canvas.tab-icon-off` muted. `art.css` shows the lit one inside `.tab[aria-current='page']` and
  the muted one elsewhere, so the bar needs no change. Null for any other id. Also exported:
  `tabIconPicture(id)`, `TAB_ICON_IDS`; `TAB_MUTED` in `tabArt.ts`.
- **`velvet_cap`** has its item icon (`itemIcon('velvet_cap')`).

## The dungeon at the C scale, for lanes C and A (`src/art/dungeonArt2.ts`, `src/art/portraits2.ts`, B10a)

Built **beside** the first scale's doors: `dungeonTile`, `dungeonProp`, `foePicture`, `portrait` and
their tests are unchanged. Everything new is in `src/art/dungeon2/` behind two door files. Pictures
are `Picture2`s (town2 cells, material and step), so a room can be stamped into one grid, darkened
for contact shadows and lit by steps as the town is.

**Palette.** Dungeon pictures hold the cave's own materials (cave rock, cave sand, shoal, the deep,
weed, fur, crab shell, feather, troll and goblin hide, ember), numbered from `CAVE_FIRST` (400),
clear of the town's. Rasterize them with `CAVE_DUSK` (a run) or `CAVE_DAY` (menus), never `DUSK2`/
`DAY2`: the cave palettes are the town's with the cave's ramps added, every town colour identical,
so the hero drawn with `characterSprite2(look, worn, 'dusk')` matches. `cavePalette2(time)`.

**Tiles** (`DUNGEON2_TILE` = 24):

```ts
dungeonTile2(kind: string, variant = 0, around?: Around, at?: TileAt): Picture2 | null
roomKinds2(rows: readonly string[]): Tile2Kind[][]          // the face rule, in one place
aroundOf(kinds, col, row): Around                            // a cell's eight neighbours' kinds
GROUND2_SHADOW: Partial<Record<Tile2Kind, number>>           // contact shadow steps per ground
forgetTiles2(): void
```

- Kinds (`TILE2_KINDS`): the first scale's ten (`sand`, `wet_sand`, `rock_floor`, `wall_top`,
  `wall_face`, `shallows`, `deep_water`, `planks`, `door_barred`, `door_open`) and
  `wall_face_high`. Wears (`TILE2_WEARS`) as before (20, 16, 20, 4, ...); any number is a variant.
- **Walls stand two tiles tall**: rock with open ground below is `wall_face`, rock above a face (or
  above a door) is `wall_face_high`, all other rock `wall_top` (`roomKinds2` does it for the
  sample key; the same rule on lane C's own rows).
- Pass `at` (the cell's column and row) for every cell: textures are worked out from the place in
  the room, so a floor shows no grid and no seam. Pass `around` (from `aroundOf`) and a tile joins
  its neighbours in curves: land spills over water with foam where they meet, sand over wet sand,
  shallows over the deep, shade under a wall and beside a deck. Without `around` a tile is drawn as
  if surrounded by its own kind. Each distinct ask is kept (about 1.2 KB of cells); a 32 × 12 room
  is about 450 KB of cells per state of the tide; `forgetTiles2()` lets them go once the room's
  ground is on a canvas.
- The tide's warning: draw sand about to be covered as `wet_sand`, as now; shallows about to deepen
  keep lane C's own checker overlay.

**Light** (a cave is dark, and is lit, not drawn dark):

```ts
lightGround2(ground: TGrid, lights: readonly Light2[]): TGrid   // pure; returns a lit copy
lightAt(light: Light2, dx: number, dy: number): Light2          // a prop's light into the room
flicker2(light: Light2, ms: number, k = 0): Glow                // its glow at a moment, wavering
DUNGEON2_LIGHT, LANTERN_LIGHT2, FUSE_LIGHT2                     // the numbers
interface Light2 extends Glow { drop: number; pool: number; flicker: number }
```

Compose the room's ground (tiles, then contact shadows), then `lightGround2(ground, lights)` with
every lantern's `dungeonProp2('lantern').light` moved to where it hangs (`lightAt(light, at.x,
at.y)`): ground in a pool below each flame (`drop` 46 below it, `pool` 70 wide, lying flat) is lifted
a step at its heart and drawn as-is in its ring; everything beyond every pool is a step darker,
past 2.2 pools two; edges break in clumps. Then rasterize with `CAVE_DUSK` and add the glows as
today (`litBy`). `flicker2` is optional: a lantern's glow strength at a time, smooth and
deterministic (no `Math.random`), for redrawing the glow layer, never the ground.

**Props**:

```ts
dungeonProp2(id: string): PropPicture2 | null
// { picture: Picture2; base: number; foot: number; seat?: {x, y}; light?: Light2 }
dungeonPropSprite2(id: string, palette = CAVE_DUSK): HTMLCanvasElement | null
```

`PROP2_IDS`: `powder_keg`, `crate`, `treasure_chest`, `brig_bars`, `lantern`, `anchor`,
`rope_coil`, `cannon`, `perch`. Stand a prop at (x - foot, y - base); `seat` is where the parrot's
feet go on the perch; the lantern carries its glow in its picture and its `light`. Drawn to metres
(the keg 0.6 m, the bars a tile wide and 2 m tall).

**Foes**:

```ts
foePicture2(id: string, pose: Foe2Pose = 'idle', facing: Foe2Facing = 'right', frame = 0, phase = 1): FoePicture2 | null
// { picture: Picture2; feet: { x, y } }
foeSprite2(id, pose = 'idle', facing = 'right', frame = 0, phase = 1, palette = CAVE_DUSK): HTMLCanvasElement | null
foeFrames2(id: string): Record<Foe2Pose, number> | null
foeSize2(id: string): Foe2Size | null      // FOE2_SIZES[id]
forgetFoes2(): void
type Foe2Pose = 'idle' | 'walk' | 'windup' | 'strike' | 'hurt' | 'flash' | 'fall'
type Foe2Facing = 'left' | 'right'
```

- Ids (`FOE2_IDS`): the grotto's eight (`GROTTO2_IDS`: `dock_rat`, `sand_crab`, `smuggler`,
  `deckhand`, `powder_monkey`, `giant_crab`, `ships_parrot`, `brinebeard`) and every monster in the
  tables (`MONSTER2_IDS`), `thieving_gull`, `bramble_boar`, `footpad`, `grey_wolf`, `marsh_troll`,
  `goblin_poacher` and `bramble_wyrm` included: fifteen.
- Frames: idle 2 (the breath), walk 8 for people and 4 for creatures, windup 1 (the telegraph:
  weapon cocked back, claws or fists up), strike 1 (the blow, the weapon out along the line of it),
  hurt 1 (the recoil), flash 1 (the recoil in the flash of a blow: every step lifted three, outline
  kept; it replaces the scene's `flashOf` white tint), fall 2 (buckling, then down). The captain
  has the same in each of his three `phase`s. Frame numbers wrap.
- Draw at (x - feet.x, y - feet.y). People stand on the hero's canvas, 56 × 72, feet (28, 70); a
  fallen person lies on a 72 × 56 canvas with its own feet: **a frame's size can differ from the
  standing canvas, its feet are always right.** Left is the exact mirror (feet and glows mirrored).
- Sizes as data, `FOE2_SIZES[id]`: `w`, `h`, `anchor` (standing canvas), `tall` (rows from the
  ground to the top of the drawing), `front`/`back` (columns drawn ahead of and behind the anchor,
  facing right), `strike` (columns ahead in the blow: the weapon's or jaws' reach as drawn), `box`
  (a tap box: as wide as the body, not a weapon held clear of it, as tall as the drawing), `shadow` (contact shadow half-width), `hover` (air
  under a flier's picture). Tests hold the table to the drawings.

| Id              | Canvas    | Feet      | Tall | Box      | Notes                                          |
| --------------- | --------- | --------- | ---- | -------- | ---------------------------------------------- |
| `dock_rat`      | 48 × 24   | (24, 23)  | 20   | 40 × 20  |                                                |
| `sand_crab`     | 40 × 26   | (20, 24)  | 24   | 40 × 24  | on its back when down                          |
| `smuggler`      | 56 × 72   | (28, 70)  | 64   | 28 × 64  | cutlass; a bottle in the other hand            |
| `deckhand`      | 56 × 72   | (28, 70)  | 70   | 24 × 70  | the boathook reaches row 0                     |
| `powder_monkey` | 56 × 72   | (28, 70)  | 70   | 26 × 70  | a head shorter; the keg over him reaches row 0 |
| `giant_crab`    | 84 × 52   | (42, 50)  | 50   | 69 × 50  |                                                |
| `ships_parrot`  | 46 × 40   | (22, 39)  | 33   | 17 × 33  | perched, feet on the perch's `seat`            |
| `brinebeard`    | 104 × 112 | (48, 110) | 104  | 56 × 104 | three phases                                   |

(the idle game's monsters: see `FOE2_SIZES`; the boar 68 × 44, the wolf 70 × 46, the troll 82 ×
92, the wyrm 96 × 60, the gull 40 × 32, the footpad and goblin on the person's canvas.)

- Glows: the powder monkey's lit fuse (`FUSE_LIGHT2`, `always`) in every frame he holds the keg (and
  the keg dropped as he falls); none once it is thrown.
- Memory: a person's frame is 56 × 72 × 4 = 16 KB a facing; all sixteen frames both ways 512 KB,
  but only frames asked for are made (a deckhand who idles, walks and strikes facing both ways is
  about 380 KB). The captain's frames are 104 × 112 × 4 = 47 KB; everything of his, all three
  phases, both ways, 4.5 MB if every frame is shown. Kept through `spriteCanvas`, so
  `forgetSprites()` frees them with the town's; `forgetFoes2()` the cell grids (a few KB each).

**Portraits** (`src/art/portraits2.ts`): 72 × 72 (`PORTRAIT2_SIZE`), the head about three times the
H2 head, drawn at that size.

```ts
portrait2(id: string): Element | null                  // div.portrait2-art, three canvases
heroPortrait2(look: Partial<Look>, wornItemIds: readonly string[]): Element
portraitPicture2(id): Picture2 | null; heroPortraitPicture2(look, worn): Picture2
portraitScales2(dpr): { large, small, mini }          // 6, 4, 2 device px on a 3x phone
PORTRAIT2_IDS, PORTRAIT2_SAFE: Record<id, Box2>, HERO_PORTRAIT2_SAFE: Box2
```

- Ids: every id `portrait` serves, `goblin_poacher` and `bramble_wyrm` (new), and the villagers
  `alewife`, `market`, `docker`, `elder`: 22. The hero's in the look (skin, hair and its colour,
  brows by the look rule) and the head gear and body garment worn.
- The element carries the face at 2, 4/3 and 2/3 CSS pixels per art pixel (144, 96 and 48 CSS
  pixels), and `src/art/dungeon2/portraits2.css` (imported by the door) shows the largest that fits
  the frame **whole**: the fight screen's 148 frame the 144, the lists' 100 the 96, and the
  dungeon's 48-pixel panel the 48. **No face is ever cropped**; the first scale's showed its
  96-pixel canvas in the 48 panel and lost hats and chins.
- `PORTRAIT2_SAFE[id]`: the box (art pixels from the top-left) holding everything that names the
  face (head, hat, ears, horns, whiskers, the gesture beside it); below row 56 only shoulders and
  beard ends. A frame that must crop (round, or short) can crop to it. The hero's is
  `HERO_PORTRAIT2_SAFE`, the union over every hairstyle and head gear.
- Memory: at 3x, a portrait's three canvases are 432² + 288² + 144² device pixels, about 1.2 MB, as
  the first scale's two were about 1.1 MB.

## Walking and breathing at the C scale, for lane C (`src/art/character2.ts`, B9)

(Superseded in part by B10b, above: the left walk, the missing back view, the facing type.)

Added beside the standing doors; nothing that was there changed its name or signature.

- `characterWalk2(look, wornItemIds, time, facing, frame, extra = [])` → an offscreen canvas, one
  pixel per art pixel, 56 × 72, the same anchor (28, 70) as `characterSprite2`. `facing` is
  `'down'` (toward the camera), `'right'` or `'left'` (`Facing2`); `frame` any whole number (it
  wraps at `WALK2_FRAMES`). Made the first time it is asked for (per look, outfit, time of day,
  facing and frame) and kept, through `spriteCanvas`, so `forgetSprites()` frees them with the
  town's. Draw it exactly as the standing sprite.
- `characterIdle2(look, wornItemIds, time, frame)`: the breath, two frames; frame 0 is
  `characterSprite2`'s own canvas.
- `townsfolkWalk2(id, time, facing, frame)`, `townsfolkIdle2(id, time, frame)`: the same for the
  seven townsfolk; null for an unknown id.
- The pictures behind them, for a scene that keeps its own canvases or stamps into a grid:
  `characterWalkPicture2`, `characterIdlePicture2`, `townsfolkWalkPicture2`,
  `townsfolkIdlePicture2` (`Picture2`s). `forgetWalks2()` lets the kept pictures go.
- Constants: `WALK2_FRAMES` 8, `WALK2_FRAME_MS` 80, `WALK2_STRIDE` 7 (art pixels the planted foot
  moves back each frame: the hero crosses the ground at 7 / 80 ms = 87.5 art px/s, today's 88
  within half a pixel a second, so he does not slide; at another speed show each frame for
  `WALK2_STRIDE / speed` seconds). Townsfolk stroll: `TOWNSFOLK2_STRIDE` 4, `TOWNSFOLK2_FRAME_MS`
  100 (40 art px/s). `IDLE2_FRAMES` 2, `IDLE2_FRAME_MS` 900.
- Which frames when: walking left or right, the side frames; walking down, the down frames;
  **walking up (away), use the side frames of the last left or right heading** (there is no back
  view; see "Deferred"). Standing, alternate the two breathing frames. A diagonal: the side frames.
  Restart the cycle at frame 0 (contact) when a walk starts, and reset to standing when it stops.
- Handedness: left is the exact mirror of right (tests hold it pixel for pixel), so walking left
  the hero holds his weapon in the hand nearer the viewer. Deliberate: the ladder reads by the
  weapon, and a right-handed hero facing left would hide it behind his body. Standing still, mirror
  the standing sprite as today.
- The contact shadow is still the scene's: an ellipse about 22 × 4 under the anchor, fixed (it does
  not move with the feet).
- Memory: a frame is 56 × 72 × 4 = 16 KB. One outfit, every facing and the breath, by day: 25
  frames, 400 KB (800 KB with dusk too). Each townsperson the same; all seven by day 2.8 MB if every
  frame of every facing is shown. Only frames asked for are made, so a hero who only walks across
  by day costs 256 KB. The pictures behind them are 8 KB of cells each, kept in a map until
  `forgetWalks2()`.

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
- **Added in B9** (lane C's needs; nothing existing renamed or re-signed, every piece id the same):
  - `town2Facts(id)` and `TOWN2_FACTS` (`pieces.ts`): every piece's facts (`w`, `h`, `base`,
    `layer`, `foot`, `spots`, `shadow`, `ground`, `attached`) without drawing it. `town2Layout()`
    and `town2Walk()` now read these, so neither draws anything: the scene's data can be had before
    the first picture. The table lives in `facts.ts`, generated from the drawn pieces;
    `tests/art/town2.test.ts` draws every piece and fails if the two ever disagree.
  - `forgetTown2Grids()` (`town.ts`): lets go of the composed grounds and towns
    (`town2Ground`/`town2Picture`, 6.2 MB of cells a time of day); asked again, they are composed
    again, the same. `forgetTown2Grids({ pieces: true })` also lets the drawn pieces go
    (`forgetTown2Pieces()` in `pieces.ts`).
  - `buoy-far` moved from (1330, 2100) to foot (840, base 2084): past the pier's end and inside its
    view (top-left 824, 2039; 32 × 48), so a camera on the pier's end tile shows it whole; your
    lookout for it, (col 30, row 77), still works. A test holds that some walkable tile's view (360 ×
    600, risen 30) contains it.
  - Ground dressing on the square and the upper street, the redrawn ship, rock, oak, pines and
    eyebrow window: same ids, same sizes and bases, so nothing in the layout moved but the buoy.

## The first scale, retired (B12)

Deleted in B12, nothing outside `src/art` importing them on `main` (checked by a script that walks
every import from `src/ui`, `src/scene`, `src/main.ts` and every non-art test): the first scale's
dungeon art (`dungeonArt.ts`: `dungeonTile`, `dungeonProp`, `foePicture`, `GROTTO_SHADOW`; and
`grottoTiles.ts`, `grottoCast.ts`, `grottoProps.ts`, `grottoRoom.ts`), portraits (`portraits.ts`:
`portrait`, `portraitPicture`, `PORTRAIT_SIZE`; and `faces.ts`), figures (`figure.ts`,
`wardrobe.ts`, `armoury.ts`, `hair.ts`, `townsfolk.ts`, `plates.ts`), town (`town.ts`: `townPiece`,
`townLayout`; and `scenery.ts`, `harbour.ts`, `ground.ts`, `rng.ts`), `pixelSvg.ts`,
`tabIcons.ts`, and the old character door's drawing (`characterPicture`, `characterCanvas`,
`characterGear`, `ITEM_LAYERS`). Still here because other lanes import them: `character.ts` (now
only `Look`, `LookChoice`, `LOOK_CHOICES`, `DEFAULT_LOOK`), `icons.ts` and the icon tables,
`canvas.ts`, `raster.ts`, `palette.ts`, `grid.ts` (lane C's `foes.ts` draws the ability buttons
with it), `tabArt.ts`, `depth.ts` (the C-scale figures' layer order), `gallery.ts`, `art.css`.

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

## Done

- **B12, second PR: the faces, the icons, the wide foes, the first scale retired.** Review sheets in
  `/home/claude/lane-shots/w12-b/`: `new-faces-icons.png`, `wide-foes.png`, and `strike-frames.png`
  and `strike-4way.gif` redone after the blow's landing was changed (below), with
  `gallery-blow-*.png` and `gallery-walking-away.png` from the gallery at 390 x 844, 3x.
  - **The marks' faces** (`dungeon2/markFaces.ts`): three critique rounds (stubble as a scatter on a
    darkened jaw, not a pattern that read as stitches or stripes; the stallholder's cupped hand,
    which read as a second ear, replaced by a herring held up beside her).
  - **Icons** (`gearIcons.ts`): the necklace a cord dropping to a scallop between smaller shells; the
    bracelet a ring of cord seen from above with shells along its front.
  - **Wide foes** (`dungeon2/boss.ts`, `sizes.ts`): the captain's cutlass, above. The crab was
    narrowed, then put back when lane C's wave 12 (drawing figures apart) landed first.
  - **The blow** lands chopping down and forward at full stretch (across): laid level, a long blade
    had room for a hand's breadth of itself on the canvas and read as a stub.
  - **Retired**: 20 modules and 12 test files, 9,591 lines, the gallery's first-scale parts and the
    old portrait CSS. The built app's main chunk went from 747.2 kB to 650.8 kB (gzip 255.7 to
    230.0 kB) and the town's worker from 227.8 to 210.2 kB, with the new faces in. The style guide's
    first-scale sizes, "what the swap supersedes" and references to deleted files went, with a
    short historical note under "Sizes".
  - **Tests**: the marks' faces (each drawn and its own); the captain drawn no further ahead of his
    feet than the strike reach and two; the gallery's new shape. **Expectations changed on
    purpose**: `FOE2_SIZES` for the captain; `tests/art/figure2.test.ts` checks the look choices
    rather than the old 40 x 50 picture; the first scale's door checks and their tests are gone.

- **B12, first PR: Cody's two faults, the layer audit, the blow, the loot pile.** Review sheets
  outside the repo in `/home/claude/lane-shots/w12-b/`: `back-view-before-after.png` (every frame
  walking away, before and after, x5 and true size: the knight with cloak, sword and kite; iron
  with its heater; linen with a bow and quiver; the captain's coat; the trader's and the alewife's
  dresses; the townsfolk captain), `walk-knight-4way.gif`, `walk-ladder-up.gif`, `layer-audit.png`,
  `strike-frames.png`, `strike-4way.gif`.
  - **Walking away** (`figure2/views.ts`, `BACK_DEPTH`): every held thing and shield behind the
    person, showing only past the silhouette; the shield's forearm behind the body below row 35;
    the quiver under the cloak; the hands over the cloak's edge. Townsfolk (`folkBack.ts`,
    `IN_FRONT`): the cutlass, hammer, tankard and forearms, basket and forearm, stick behind them.
  - **Layer faults found and fixed** (by the frames' provenance, then by eye): (1) the sword, its
    guard and fist, and the shield drawn over the back and cloak walking away (Cody's); (2) the
    bow over the arm from behind; (3) the quiver over the cloak from behind; (4) the shield arm's
    forearm and hand drawn across the back from behind; (5) across, the trailing leg and boot drawn
    over the cloak (Cody's "shoes through the cape"); (6) across, the everyday tunic's skirt and
    sleeves replacing the captain's coat's, the mail's and the jerkins' (the coat was a short
    jacket in profile, the mail had teal sleeves, the jerkin lost its tabs); (7) the townsfolk
    captain's cutlass blade walked with his far leg, apart from its guard and hand, in every
    facing; (8) the smith's thighs from behind hung as a skirt and a lifted boot showed over them;
    (9) the alewife's tankard and hands, the trader's basket and forearm, drawn over their backs.
    Looked at and left (correct as drawn): toward the camera the cloak behind the legs and the held
    things in front; hair over the collar and hats over hair in every facing; the pauldrons'
    outer edges showing beside the cloak from behind (it is narrower than them); the docker's sack
    and the market woman's basket from behind (carried up, in front).
  - **The blow** (`figure2/strike.ts`; `SidePose` in `side.ts`): doors above. Three critique rounds
    on each facing (the hand moved clear of the face over the top; the hit laid out at full stretch;
    the overhead chop toward the camera; the guard hand behind the body from behind; the bow in the
    left hand; weapons fitted to the canvas by foreshortening, then lean, then the far end).
  - **Loot pile** (`dungeon2/props.ts`, `loot_pile`).
  - **Gallery**: walking away for every rung under a cloak (and the knight without his), the blow
    in four facings for eleven outfits and every weapon class.
  - **Tests**: `tests/art/layers2.test.ts` (walking away, no weapon, bow or shield pixel inside the
    person's silhouette in any frame for every wearable, the held things under the cloak, iron,
    linen and the coat, and the townsfolk; each held thing still shows past the body; no leg or boot
    pixel shows inside a cloak or skirt toward, away or breathing, hero and townsfolk; across, none
    inside the cloak behind the back line; coat, mail and jerkin skirts and sleeves over the tunic).
    The held-thing, townsfolk, side-cloak and under-over tests fail on B11's art. The hero's legs
    under a cloak or skirt toward and away already passed: the fault Cody saw was across.
    `tests/art/strike2.test.ts` (frames, hit frame, kinds, caching and forgetting; every outfit,
    facing and frame on the canvas and anchor, nothing at its edge, each frame its own; the hand rule;
    the bow's draw and loose; the blow from behind landing behind the body; the punch's reach).
    `tests/art/dungeonArt2.test.ts`: the loot pile.

- **B11: Cody's review of wave 10 — the portraits, the sword through the head, the weak spots.**
  Review sheets outside the repo in `/home/claude/lane-shots/w11-b/`: `portraits.png` (each face:
  the first scale at its list size, last wave and now in the lists' 100 px frame, last wave and now
  in the 48 px panel), `hero-portraits.png` (sixteen looks and head gear, last wave against now,
  the 48 px panel and the figure), `portraits-true-size.png` (every face as it sits in a mock list
  row and the dungeon's panel on a 390-wide 3x phone), `walk-weapons.png` (every weapon in each
  facing's worst frame, before and after), `walk-knight-4way.gif`, `walk-hero-4way.gif`,
  `foes-fixes.png`, `tiles-fixes.png`, and the gallery's faces at 390 × 844 and 844 × 390
  (`gallery-portrait-faces*.png`, `gallery-landscape-faces*.png`). (Sheets an earlier attempt left
  in that folder are moved to `earlier-attempt/`.)
  - **Portraits** (`dungeon2/folkFaces.ts`, `heads.ts`, `heroFace.ts`, `beastFaces.ts`): the
    thirteen people drawn again by hand, each its own head shape (hand-placed rings of points),
    eyes, brows, nose and mouth (rows of characters per person), hair and beards as solid masses
    with a few locks; B10a's built head (`bust.ts`) is gone but for the square and the disc. Each
    has one expression (style guide, "Portraits at the C scale"). The hero's rebuilt on the H2
    head: round, open eyes with a catch-light, soft brows by hair colour, a broken fringe, five
    hairstyles with volume, every head gear above the brows. Creatures: the crabs' furious stalk
    eyes and raised claws, the troll's tusks, ears and weed hair, the parrot's ringed eye
    restored; the rat given brows and a crooked grin, the boar bigger angry eyes; the gull, wolf
    and wyrm kept. Four critique rounds, each asking of every face whether it would unsettle and
    what its personality is, against the old one at true size.
  - **The carry** (`figure2/carry.ts`): the sword through the knight's head fixed for every held
    thing (see "the weapon-carry rule" in the style guide); tall shields slung below the chin.
  - **The walk**: thighs a pixel longer and a gentler bob; the planted foot climbs toward and away;
    the left walk re-lit (`figure2/relight.ts`); the buckler's edge shows its boss; the toe-up boot
    redrawn; long hair's sheen and strands in profile and from behind; a bald back of the head with
    crown light, ears and neck; the market woman's shawl drawn from behind, the smith's apron bow.
  - **The dungeon**: people's wind-up and strike keys move the whole body; the troll down drawn
    lying on his back; the wolf lifted and on sturdier legs; detail on the giant crab, boar, wolf and
    wyrm; the side-wall door tiles; water curving into a bottom wall with a wash of foam; planks
    not lifted at a lantern's heart.
  - **Gallery**: the faces section shows the hero in a dozen looks; the tiles plate shows the side
    doors; the foes plate the new poses.
  - **Tests**: `tests/art/dungeonArt2.test.ts` — faces that do not unsettle (every person its own
    head, no two alike; faces at least 30 px across; catch-lights on open eyes; no stipple below
    the eyes; the hero's two eyes open with white, iris and catch-light in every look and head
    gear), the mended weak spots (strikes widen the stance and bring the head forward; the troll
    lies long and low with shut eyes; crab eyes white with pupils; the wolf lighter, no leg under
    three pixels; the shore curving into a bottom wall; planks unlifted), the side door (turned to
    the room, the rock either side a top, the grille only when barred). `tests/art/walk2.test.ts` —
    nothing held crosses the head (across: no weapon pixel on any head, hair or hat pixel and no
    shield pixel on the face, by the frames' tags, every held thing and shield, every frame, both
    ways, bare and under four hats, short and long hair; toward, away and standing: the head drawn
    the same with and without the held thing), walking left is lit from the left, the planted foot
    keeps its ground toward and away. **Expectations changed on purpose**: `TILE2_KINDS` gains the
    two side doors; `PORTRAIT2_SAFE`/`HERO_PORTRAIT2_SAFE` values; `FOE2_SIZES` deckhand and goblin
    `strike`; the anchor rule toward and away allows the lowest sole up to 4 rows above row 70; the
    townsfolk's left walk is their right mirrored **and re-lit** (it was the plain mirror).

- **B10a: the dungeon at the C scale** (doors above). Review sheets outside the repo in
  `/home/claude/lane-shots/w10-b-dungeon/`: `room-landscape.png` and `room-landscape-pools.png`
  (2532 × 1170, a 3x phone held sideways, the store and the pools re-cut with the hero and the
  cast), `room-old-vs-new.png`, `tiles.png` (every wear, laid floors, every join, the light, the
  tide), `props.png`, `foes.png` (every foe, every pose and frame, both facings, true size and
  enlarged, the hero beside each), `boss.png`, `portraits.png` (first scale against the C scale in
  the 96 and 48 frames, with each safe box), `hero-portraits.png`. (An earlier, unmerged B10b
  attempt at the same work, PR #40, had its sheets there; they are moved to `b10b-pr40/`.)
  - Built on that unmerged attempt's drawings (PR #40), moved into lane B's own files: its cave
    ramps, which it had added to `town2/ramps.ts`, now live in `src/art/dungeon2/cave.ts` with
    their own palettes (`CAVE_DUSK`, `CAVE_DAY`), so nothing under `town2/`, `figure2/`,
    `character2.ts` or `icons.ts` changed; its tab icons and town touch-ups are not in this PR.
  - **Doors** shaped as the brief asked: `dungeonTile2(kind, variant, around, at)`,
    `dungeonProp2(id)`, `foePicture2(id, pose, facing, frame, phase)` and sprite versions, sizes as
    data (`FOE2_SIZES`, held to the drawings by a test), light as data, and `portraits2.ts`.
  - **Light**: a scheme, not a darkening: pools of light below each lantern laid on the ground in
    its own steps, the dark beyond them a step down, glows as the town's (`lightGround2`).
  - **Every foe**: the fifteen ids (the grotto's eight and every monster in the tables, the
    bounty-only goblin and wyrm included), each in idle, walk, wind-up, strike, hurt, flash and
    fall, facing both ways. Redrawn here: the powder monkey whole by hand (a small, wiry, bald,
    stubbled grown man, open indigo vest, red kerchief, bare feet, the keg over his head with a
    painted skull and a lit fuse; winds back, throws, takes the keg on the head when struck, drops
    it as he falls); the boar, wolf and troll as silhouettes shaded as solids with their own
    features (the boar's wedge, crest, snout and tusks; the wolf's ears, muzzle, ruff and brush;
    the troll's hunch, fists, brow and underbite); the gull in a cool white. People's wind-up and
    blow redrawn: the near arm and weapon cocked back over the shoulder, then driven out along the
    blow (boathook, cutlass, cudgel), the goblin drawing and loosing his longbow. Creatures that
    fall lie on their backs (crabs, birds), on their bellies (rat, boar, wolf, wyrm) or on their
    side (the troll).
  - **Portraits**: 22 faces at 72 × 72 and the hero's; redrawn here the wolf, boar, gull, parrot,
    troll and rat, and the powder monkey to match his new figure; brows on the hero's by the look
    rule; each with a safe box as data.
  - **Sample rooms**: the pools and the store re-cut on 24-pixel tiles (32 × 12) in the grotto's
    own key, at any state of the tide, dressed and lit (`src/art/dungeon2/sample.ts`).
  - **Gallery**: "See the new dungeon at the finer scale" (Menu, Art gallery), drawn on a tap: the
    rooms, every tile, every prop, every foe in every pose facing both ways, the captain's phases,
    every face in the three frames.

- **B10b: the walk redone, the weak spots, the tab icons** (alongside B10a's dungeon). Review sheets
  outside the repo in `/home/claude/lane-shots/w10-b-walk/`: `walk-frames.png` (every frame of every
  facing, linen hero, iron, knight, smith, trader, old man; x4 and true size), `walk-hero-4way.gif`,
  `walk-knight-4way.gif`, `walk-ladder-4way.gif`, `walk-townsfolk.gif`, `side-walk-before-after.gif`
  (B9 above B10b, right and left), `in-town-walk.gif` and `in-town-still.png` (the iron hero and the
  trader walking on the real town2 square at 3 device px per art px), `fixes.png` (Part 2 before and
  after), `tab-icons.png` (a mock tab bar at true size, each tab open in turn, old glyphs and new)
  and `tab-icons-big.png`.
  - **The walk across** (`figure2/rig2.ts`, `side.ts`, `sideHeads.ts`, `sideDress.ts`,
    `sideFolk.ts`): a skeleton posed per frame (two-bone legs with the knee found from the foot,
    two-bone arms), limbs drawn along their bones and lit across their round, garments as stretches
    of a limb, profile heads for every hairstyle, hat and helm, a profile torso for every body
    garment, five boot poses, skirts and aprons laid between the legs each frame, the cloak trailing;
    heel strike, roll and toe-off with no sliding; arms swinging against the legs, busy arms still.
    All 38 wearables and the knight have true side art (the gear ladder in order: linen, leather,
    bronze, iron, knight, then the grotto's and the bounty things and the velvet cap); nothing falls
    back. The seven townsfolk each in profile with their business kept (the smith's hammer, the
    trader's apple held out and her basket in the crook of her arm, the captain's hook and peg leg
    swung stiff from the hip, the alewife's tankard, the market woman's basket steadied on her head,
    the docker's sack on his shoulder, the old man's stick planted with his far foot).
  - **Handedness**: the sword in the right hand in every facing; walking left is drawn as the right
    walk with the arms' jobs swapped, then mirrored (style guide, "Walking in four facings").
  - **Walking away** (`views.ts`, `folkBack.ts`): the back of the head (darker, featureless), the
    back of every hairstyle and head gear and the hair below a hat's rim, shirts re-lit, belts
    without buckles, a jerkin without its disc and laces, the coat closed, the quiver across the
    back, a shield's planks and straps, the cloak over all; both arms hanging with no shield; the
    townsfolk likewise (the scarf's knot at the nape, the captain's queue, the bun, the braid, the
    docker's sack on the far shoulder from behind).
  - **Toward the camera**: the free foot lifted seven rows with the knee toward the viewer, the foot
    behind two rows up at contact, the body over the foot that bears the weight, hems pushed up over
    the forward knee, the far arm hanging and swinging with no shield (the near arm's own drawing
    moved across, light kept on the left).
  - **Part 2, figures** (`folk.ts`): the docker's fist now over the top of the sack against the
    street, the sack's neck gathered dark and tied with cord below it; the market woman's two loaves
    stand three rows proud of the basket in a darker crust, an apple between; the trader's apple 4 x
    4 instead of 5 x 5. **Town** (`town2/ground.ts`, `trees.ts`, `harbour.ts`; no layout, id,
    footprint, size or door changed): mended patches of mixed granite and reused cobble a step
    either side of the cobbles' tone, joints in the cobbles' joint tone, ragged and frayed; cart
    ruts as grooves a wheel wide with smooth floors and dark walls; flower heads two pixels square on
    wider clumps; the oak's domes lumpy heaps lit as slopes with scattered sprigs instead of
    scalloped discs and rings; the rock's planes with wandering borders, worn edges, closer tones,
    lichen and pocks, its face untouched.
  - **Part 3**: the five tab icons, lit and muted, through `tabIcon`; the `velvet_cap` item icon
    (new icon ramp `velvet`).
  - **Gallery**: the walking section shows every ladder rung and every townsperson walking down,
    right, left and up, and breathing.
  - **Tests**: `tests/art/walk2.test.ts` rewritten: every frame of every facing (now four) for every
    wearable alone, the knight and the iron rung inside the canvas with a sole on the anchor's row;
    every look across and away; every wearable has a profile (no fallback); each frame its own;
    walking away shows no eye, across fewer than the front; left never the mirror of right when
    something is held; the weapon in the same anatomical hand in every facing (down: its fist left
    of the anchor; up: right of it; right: the near arm, its fist whole, in front of the torso;
    left: the far arm, behind the torso, and a shield's face showing) with the hand rule in every
    frame (grip hidden, weapon directly above and below the fist), read from frames whose pixels
    are tagged by what drew them; no sliding (a ground pixel of the planted foot moves back exactly
    the stride, hero and townsfolk); `forgetWalks2`; townsfolk in four facings. `tests/art/icons.test.ts`:
    the tab icons (five, distinct, mostly drawn, both states, null otherwise) and `velvet_cap` in
    the item list. Changed on purpose: B9's "walks left as the exact mirror of right" became its
    opposite for anything held, and the townsfolk's mirror check moved into the new townsfolk test.

- **B9: The fixes Cody asked for after reviewing B7 and B8, and the walk cycle.** Review sheets
  outside the repo in `/home/claude/lane-shots/w9-b/`: `fixes-figures.png` and `fixes-town.png`
  (before and after, each fix), `gear-ladder.png`, `walk-frames.png` (every frame of every facing:
  the hero in linen, the knight, the smith, the trader, enlarged and at true size),
  `walk-hero.gif`, `walk-knight.gif`, `walk-townsfolk.gif`, `town-full-day.png`, and three phone
  screens (`phone-square.png`, `phone-harbour.png` at dusk, `phone-street.png`, 1170 × 2532).
  - **Figures.** The empty hand hangs open where the fist would close (`OPEN_HAND2`), so the
    at-ease hero has one hand on the hip and one at his side; the `ease` variants of the near
    sleeve, bracers, cuff, vambrace and bracelet are gone (both bodies share the arm). Bronze
    redrawn as an old metal (cream glint, brass-brown, olive-brown shadows; day and dusk), measured
    apart from every hair colour, gold and tan. The captain's peg is a turned dark wooden peg with
    a ferrule and no boot. New gestures: the docker shoulders a sack, the trader offers an apple
    out on her palm, the market woman carries a basket of loaves on her head. Folds redrawn per
    garment (fitted tunic, bloused linen, the smith's stiff apron creased at the knee, the
    alewife's skirt and apron, the trader's skirt pushed by her basket, the market woman's slim
    dress, both coats). Mail lit by the chest and skirt under it, with crooked rings. A slight
    three-quarter turn: the hero's face a column toward the facing inside the skull (far ear
    hidden; the helm's nasal and the hood's opening moved with it), his near shoulder a pixel
    broader in the body and every near sleeve; townsfolk faces turned row by row (`turnRow`).
  - **Town.** Grass and water lose their ordered dither for clumps (`clumps`, `clumpRound`), the
    shadows on them too. The square gets worn ways, cart ruts, a drain across, mended patches,
    moss at its edges, puddles, leaves and a grate; the upper street stones along the road and the
    lane, a trodden path and stumps in the grove, flower drifts, long grass, stones in the turf and
    a garden bed by your door. The ship gets a stern castle (three gilded windows, gallery,
    taffrail, lantern), shrouds with deadeyes and ratlines, a gathered furled sail and a jib, worn
    planking and rust. The rock is planes and cracks with its face unchanged, a weeded, barnacled
    tide line; the wreck's ribs are as tall as the rock, with planking. The oak is masses on wide
    limbs with sky through it; the pines' tiers each their own spacing, reach and droop. The pier's
    water shadow ripples and breaks; the house's eyebrow window is a wave in the thatch. `buoy-far`
    moved where the pier's end can see it. Lane C's two other needs: `town2Facts`/`TOWN2_FACTS`
    and `forgetTown2Grids` (above).
  - **Walking** (`src/art/figure2/walk.ts`, doors above): a rig of bones over the existing parts,
    so every look, all 38 wearables, the knight and the seven townsfolk walk without a second
    drawing; 8 frames down and across (left mirrored), a 2-frame breath; style guide, "Walking".
  - **Gallery**: the figures' section opens with every ladder rung and every townsperson walking
    down, right and left and breathing, animated from the kept sprites (dusk button included); the
    town's section opens with the redrawn pieces and two more phone screens (the square's west
    side, the grove).
  - **Tests**: `tests/art/walk2.test.ts` (the door's numbers and caching; every frame of every
    facing, in every wearable alone, inside the canvas with a sole on the anchor's row; each frame
    its own; left the exact mirror of right; the hand rule in every frame of every held thing with
    and without each shield; the breath; the townsfolk likewise), and in `figure2.test.ts` bronze's
    distance from every hair ramp and gold by day and dusk and the open hand; in `town2.test.ts`
    the facts table against the drawn pieces, the far buoy inside a walkable tile's view, and
    forgetting the grids. Changed on purpose: the two eye tests in `figure2.test.ts` now mirror
    about the face's centre line (column 29, irises 26 and 32) instead of the canvas's (28).

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

- **Not done in B12**, and why:
  - **A face for the 48-pixel frame at 1x** (lane C's ask): a face drawn for 72 art pixels shown
    honestly in 48 device pixels would be a second drawing of every face at two thirds the size;
    the phone ratios (2x, 2.625x, 3x) all show a whole face. On a 1x desktop the 72-pixel face is
    still cut to the frame's middle.
  - **Lights in `town2Facts`** (lane C's town ask) and the captain drawn narrower: not reached.
- **B12, weaker than it should be** (for Cody's review), weakest first:
  - The captain still meets the hero at the melee stand (his coat is 60 columns wide; the stand is
    36 from his feet): lane C's drawing-apart shifts the hero by up to half a tile, which leaves the
    coat and the hero's chest touching.
  - The blow toward the camera and away reads less strongly than across: a swing toward the camera
    lands pointing at the viewer, which at this size is a short blade over the legs; from behind
    the blow lands out of sight, only the blade's end showing past the head; a bow end-on is a
    stick. Honest, but the across frames are the ones that sell it.
  - Long weapons at the blow are foreshortened to about half their length across (the canvas has
    12 to 14 columns in front of the fist); the knight's sword at full stretch reads as a shorter
    sword.
  - The punch is small: a fist out at the shoulder, the other up by the chin; toward the camera it
    is a fist in front of the chest.
  - From behind, the knight's kite shield is a sliver of planks and rim at his elbow, and the
    pauldrons show beside the cloak at both shoulders; the shield arm's elbow leaves a gap where the
    shield shows between arm and body.
  - Across, a long cloak now swallows the trailing leg to the boot: correct, but the knight reads a
    little one-legged at the contact frames.
  - A bow and a shield together: the shield is not drawn during the blow.
  - The alewife from behind has stumps for forearms (her hands are round the tankard in front).

- **Not done in B11**, and why:
  - **The standing hero's three-quarter turn** (still B9's one column): it needs every face, hair
    and hat drawn again at that angle; the brief left it.
  - **Feet toward and away still slide**, less: the planted foot now climbs two rows a frame, a
    quarter of the seven the walker moves. Matching it would need the feet 28 rows apart on the
    56 × 72 canvas, or lane C moving the contact shadow with the planted foot.
  - **The stride itself** (28 art px against the legs): the hips now dip one row, not two, but the
    contact frames are still wide; a shorter step needs a slower walker or more frames (a constant
    change, not made).
- **B11, weaker than it should be** (for Cody's review), weakest first:
  - The lying troll reads as a troll on his back but his near arm along the ground merges with his
    side, and his loincloth is a brown strip.
  - The weapons carried low point at the ground in front of the feet; the boarding axe's head and the
    knight's sword tip come close to the near boot in the forward-swing frames, and the turned
    drawings keep their front-view light (lit from below on the blade once turned point-down).
  - The side door is small in the rock's top and reads best by its posts and the dark beyond; at
    true size it is a doorway, not much of a door.
  - Faces: the market woman's mouth pulled aside can read as sour rather than wry; the captain's
    face is dark between his hat, patch and beard; the hero's portraits all share one expression
    (a small smile), as the figure does; the powder monkey's eyes, glancing at his fuse, can look a
    little wild.
  - The wolf is lighter but still a grey on a grey floor; the pale throat is a few pixels.
  - Walking left re-lit run by run: where a run of one material spans two things (a hand against a
    face) their light is shared; it has not shown in any frame looked at.

- **Not done in B10a**, and why:
  - **No side-wall door tile.** Doors are drawn for a wall's face; set in a side wall (as every
    grotto door is) the frame reads as a small dark box. A side door is another tile kind.
  - **No edge tiles for corners of the deep against rock**: the deep meets a wall's foot in a
    straight 24-pixel step where it runs into the bottom wall.
  - **The idle game's monsters have no combat-screen door at this scale** (the menus show
    portraits; `foePicture2` serves every monster for a scene that wants one).
  - **The walk of creatures** is four frames of moved parts, not a gait.
- **B10a, weaker than it should be** (for Cody's review), weakest first:
  - Brinebeard's portrait: his face is small under the hat and beard; the first scale's filled the
    frame. His strike is stiff (inherited).
  - People's faces in the portraits share one built head; the deckhand, smuggler and footpad differ
    by what they wear more than by their features.
  - The troll lying down is a quarter turn of his buckle, and reads as a heap; the wolf at dusk is
    dark and thin-legged at true size.
  - The people's strikes are drawn over the rig's standing body: the arm crosses the chest for the
    blow and the body does not turn into it.
  - Creatures are silhouettes shaded as solids with hand-placed features, not drawn pixel by
    pixel: the giant crab's stalk eyes are a pixel wide; the parrot's bare face is a pale smudge.
  - The light's pools are ellipses with ragged edges; a lantern's pool on planks reads strongly
    orange.

- **Not done in B10b**, and why:
  - **The three-quarter idle turn** is still B9's one column. The profile head did not give a
    construction that carries into a three-quarter view without a new drawing of every face, hair
    and hat at that angle; the eye tests' intent (mirrored eyes about the face's line) was kept
    rather than spent on a half measure.
  - **Feet toward the camera and away still step in place relative to the screen**: the body moves
    down or up the screen at the scene's speed while the planted foot rises only two rows over a
    step. Matching it would need the feet 28 rows apart on the screen. Across there is no sliding.
- **B10b, weaker than it should be** (for Cody's review), weakest first:
  - The step across is long for these legs (28 art px against a 22-pixel leg, set by stride 7 and
    8 frames): the hips drop two rows at contact and the contact frames are wide. A shorter step
    would need a slower walker or more frames (a constant change, not made).
  - The far-arm shield walking right is a narrow edge ahead of the chest (the face squeezed to its
    rim, field and device): it reads as "a shield" on the kite and heater, less on the buckler.
  - Light comes from the upper right walking left (the whole frame is mirrored after the arms swap),
    as with the mirrored standing sprite; a re-lit left would need every profile drawn twice.
  - Held things in profile are the front drawings turned: a blade carried upright ahead of the
    face, which for the long knight's sword and the boarding axe passes in front of the brow in the
    forward-swing frames.
  - The boots: the toe-up strike and the hanging swing poses are a little blobby enlarged; at true
    size they read as boots.
  - Long black hair from behind and in profile is a dark mass with faint strands.
  - The back of a bald head is necessarily skin; it is a step darker and featureless, but a bald
    hero walking away still shows an orange dome.
  - Townsfolk from behind are their front drawings turned with the front things removed, not new
    backs: the market woman's shawl still shows its knot, the smith's apron strings are the front's.
  - The tab icons' muted state relies on lightness only; the pick and axe (Skills) are the busiest at
    true size.
  - Mended patches still read as a blob of squarer stones if you look for them; ruts are now
    clearer but straight-edged.
- **Not done in B9**, and why (B10b did the back view, the left-handed set, the turned body
  across and the free far hand):
  - **No walk up (away from the camera).** A back view needs the back of every hairstyle (five)
    and every head gear (seven), the back of every shirt, jerkin, mail, coat and plate, the cloak in
    front, the quiver turned: a second wardrobe, not something the rig can bend out of the front
    one at quality. Lane C uses the side frames of the last left or right heading when walking up.
    The rig takes a back view as another set of parts on the same bones when one is drawn.
  - **No true left-handed set.** Left mirrors right; see the walk doors for why.
  - **The body does not turn for the side walk.** The torso stays three-quarter front while the
    legs walk across (hips drawn together, feet lengthened, head leading): turning the torso to a
    profile would mean redrawing every body garment.
  - **The far hand stays on the hip** when the hero walks (and the shield on that arm only sways):
    letting it swing needs a hanging far arm and every far sleeve, vambrace and shield redrawn on
    it.
- **B9, weaker than it should be** (for Cody's review), weakest first:
  - The side walk's legs are sheared, not redrawn: at contact they are long straight diagonals,
    and with the hero's 14-pixel half step (needed to keep up with 88 art px/s at 80 ms a frame) the
    stride is wide for a 64-pixel person; a slower walker or more frames would allow a shorter
    step. The feet are lengthened front-view boots rather than boots drawn in profile.
  - The walk toward the camera is subtle at true size: a lifted foot rises three to five rows, the
    body bobs a row; it reads as stepping, not striding.
  - Long dresses (trader, market woman, alewife) walk on their feet and a swaying hem only; the
    hem does not kick out with the stride.
  - The three-quarter turn is one column: enough to stop the faces looking dead-front, not a true
    three-quarter head; the body under it is square.
  - The docker's raised hand on the sack is brown on tan and only reads by its sleeve; the market
    woman's loaves barely show above the basket's rim; the trader's apple is large for an apple.
  - The square's mended patches are grey rectangles of setts at a distance; the wheel ruts are
    faint at true size; the flower drifts are small.
  - The oak's leaf domes are scalloped like rosettes enlarged; the rock's facets are crisp, a
    little gem-like.
- **Not in B8, by its brief**, and what each will need:
  - Walk cycle: done in B9.
  - Foes and the dungeon cast at the C scale: drawn as people the hero's size on this canvas (the
    deckhand, smuggler, powder monkey and Brinebeard can reuse the head and the hand rule), the
    creatures on canvases of their own; `foePicture` keeps its shape, so a `foePicture2` beside it.
  - Portraits from the C-scale faces: the H2 head is 15 × 18; a 48 × 48 bust needs it drawn at
    about three times that, by hand, rather than scaled.
- **B8, weaker than it should be** (for Cody's review; every one addressed in B9, see Done),
  weakest first:
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

- **B7, weaker than it should be** (for Cody's review; addressed in B9 but for smoke, gulls and
  foam, which are lane C's to animate), weakest first:
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

- **Lane C, for B12's second PR** (nothing breaks if you do nothing): the captain's `front` is
  38 and his `box` 54 wide (were 51 and 56); your `apart.ts` takes them as they are. The crab is
  as it was. The first scale's doors are gone; nothing of yours imported them on `main`.
- **Lane A, for B12's second PR**: nothing; the marks' faces arrive through `portrait2`, and
  `character.ts` keeps the look's names. `src/art/tabIcons.ts` (the glyph fallback) is gone, as
  wave 12 no longer imports it.

- **Lane C, for B12** (nothing breaks if you do nothing):
  1. The blow: replace the lunge and glint with `characterStrike2(look, worn, 'dusk', facing,
frame)` (or the picture) for `STRIKE2_FRAMES` frames while `heroSwinging`, in the hero's
     facing; land the hit (the flash, the number) on `STRIKE2_HIT_FRAME`. Same anchor and contact
     shadow as walking. The glint can go or stay on the hit frame.
  2. Loot: `dungeonProp2('loot_pile')` for a pile on the floor instead of `LOOT` in
     `fightArt.ts`, stood at (x - foot, y - base).
  3. Nothing for the walk: the back view and layer fixes are behind the same doors.
- **Lane A, for B12**: nothing.

- **Lane C, for B11** (nothing breaks if you do nothing): use `door_side_open` /
  `door_side_barred` for the grotto's doors in side walls, with `around`, and keep the rock above
  and below them `wall_top`; take `FOE2_SIZES` as data as before (deckhand and goblin `strike`
  changed); expect a walker's lowest sole up to 4 rows above the anchor mid-stride walking down or
  up. Optional, for the last of the slide toward and away: move the contact shadow with the
  planted foot (it climbs two rows a frame from the anchor over frames 0 to 3 and 4 to 7).
- **Lane A, for B11**: nothing; `portrait2`, `heroPortrait2` and their sizes are unchanged.

- **Lane C, to switch the dungeon to the C scale (B10a)** — the doors and signatures are under
  "The dungeon at the C scale" above. In order:
  1. Tiles: `TileMap` at 24 (`DUNGEON2_TILE`); re-cut the rooms as your plan says (the sample
     rooms in `src/art/dungeon2/sample.ts`, `POOLS2` and `STORE2`, are one way of doing two of
     them, in your key). Ground per state of the tide: for every cell
     `dungeonTile2(kind, cellIndex, aroundOf(kinds, col, row), { col, row })`, with rock resolved
     by the two-tall face rule (`roomKinds2` does it for the sample key). Draw `wet_sand` for sand
     about to flood, as now; your own foam line can go, as the tiles draw foam where land meets
     water.
  2. Contact shadows in cells (`shadow2.ts`): darken the ground's own steps by
     `GROUND2_SHADOW[kind]` in an ellipse under each foot (`FOE2_SIZES[id].shadow` wide for foes,
     22 × 4 for the hero), none on the deep.
  3. Light: `lightGround2(ground, lights)` with each lantern's `dungeonProp2('lantern').light`
     moved to where it hangs (`lightAt`), the powder monkey's fuse optional (`FUSE_LIGHT2`); then
     rasterize the ground with `CAVE_DUSK` (once per state of the tide, as now), and keep adding
     the glows (lanterns' and the fuse's) to walkers with `litBy`.
  4. Props: `dungeonPropSprite2(id)` (or the picture), stood at (x - foot, y - base); the parrot on
     the perch's `seat` (replaces `PERCH_RISE`).
  5. Foes: `foeSprite2(id, pose, facing, frame, phase)`, drawn at (x - feet.x, y - feet.y) with
     `foePicture2`'s feet for the same ask; poses from the foe's state: `walk` while it moves (frame
     from distance walked), `idle` standing (breath every 900 ms), `windup` while a heavy is marked
     (replaces the fire-tinted blink, or keep both), `strike` for the moment a blow lands, `flash`
     for `FLASH_MS` after it is struck (replaces `flashOf` white), `fall` frame 0 then 1 through
     `FALL_MS`, and the captain's `phase`. Sizes for taps, health bars and spacing from
     `FOE2_SIZES` (`box`, `tall`, `shadow`); distances × 1.5 as your plan says.
  6. Palette: everything in a run rasterized with `CAVE_DUSK`; the hero from `characterSprite2(look,
worn, 'dusk')` is identical under it.
  7. Faces: `portrait(id)` becomes `portrait2(id)` in `dungeonView.ts` and `panel.ts`; the 48-pixel
     `.fight-face` needs nothing else (the element shows its 48-pixel canvas whole).
- **Lane A, to switch the menus' faces (B10a)**: in `src/ui/face.ts`, `portrait(monster.id)`
  becomes `portrait2(monster.id)` from `src/art/portraits2.ts`; the 148 and 100 frames take the 144
  and 96 canvases as they are. `goblin_poacher` and `bramble_wyrm` now have faces, so
  `tests/ui/combat.test.ts`'s blank "G" expectation for the goblin becomes `.portrait2-art`. The
  character sheet can show `heroPortrait2(look, worn)`.

- **Lane C, for B10b's walk** (`src/scene/figures2.ts` and the hero's heading):
  1. When the walker goes up the screen, ask for `'up'` (it exists now for the hero and every
     townsperson) instead of the last left or right heading.
  2. Walking left, take the `'left'` frames as they are: they are no longer the mirror of
     `'right'`, and mirroring a right frame would put the sword in the left hand. Do not flip
     walk frames at all (standing, mirror the standing sprite as before).
  3. Nothing else changes: anchor, size, frame from distance (`walked / WALK2_STRIDE`, townsfolk
     `TOWNSFOLK2_STRIDE`), contact shadow, breath. For a diagonal, the across frames still read
     best; a mostly vertical walk can use `'down'`/`'up'`.
- **Lane A, for the tab icons**: nothing required; the bar already shows `tabIcon(id)`. Optional:
  once Cody has seen them, `TAB_ICONS` in `src/art/tabIcons.ts` (lane B's) and the `pixelSvg`
  fallback in `app.ts` can go; and the `.tab` gap (4px) leaves the 32px icon and 13px label inside
  the 60px bar.

- **Lane C, to wire the walk (B9)**, at the plug in `src/scene/figures2.ts` ("THE WALK CYCLE
  PLUGS IN HERE"): `figureOf` paints pictures itself with the scene's lights, so take the
  pictures: `characterWalkPicture2(look, worn, facing, frame)` (and `townsfolkWalkPicture2`) for a
  walker, `characterIdlePicture2(look, worn, frame)` standing (frame 0 is today's picture). Pick
  the frame from the distance walked, which can never slide whatever the speed:
  `frame = Math.floor(walked / WALK2_STRIDE) % WALK2_FRAMES` (7 art pixels a frame for the hero,
  `TOWNSFOLK2_STRIDE` 4 for townsfolk; a half step is 14, not the 8 your note assumed). `'left'` is
  already mirrored: use it rather than `facingLeft2` of a walk frame. Moving down, `'down'`; up,
  the last across heading. Drop the stage's one-pixel bob for walkers (the frames bob). The breath
  alternates every `IDLE2_FRAME_MS`. Anchor, size and contact shadow are unchanged. Optionally lay
  the layout out from `town2Facts` and call `forgetTown2Grids()` once the ground is on your canvas.
  `buoy-far` moved to (840, 2084), inside the pier's end view: it can leave `LOOKED_AT_ONLY` in
  `town2.ts`, and your lookout for it, (col 30, row 77), still stands.
- Lane A: nothing for B9. The at-ease figure the character screen shows is the same size and
  anchor, its hand now hanging at its side.
- Lane A, `src/data/items.ts`, `captains_coat`'s description begins "Long, red and heavy with
  braid": Brinebeard and his coat are drawn purple with brass braid, so that he is never taken
  for the town's red-coated captain. One word: "Long, purple and heavy with braid". (Or, if Cody
  prefers red, say so and art recolours the coat; it is a dye change in `dungeon2/boss.ts`,
  `figure2/armour.ts` and `grottoIcons.ts`.)
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

- **Faces** are drawn in `src/art/dungeon2/folkFaces.ts` with the tools in `heads.ts`: a head is
  `blob([...points])` shaded by `form`, features are `marks(rows, pinsFor(...))`. Iterate on PNG
  dumps from a `.shots/` vitest (no browser) at 4 and 2 device pixels per art pixel beside the
  first scale's, and judge at true size in a mock list row; a 10x enlargement with a grid finds
  the pixels. `pinsFor` gives digits for the skin, `b`/`B` for brows, `K W w C I i` for eyes.
- **A new held thing** needs a row in `CARRY` (`figure2/carry.ts`) if it is taller than the
  shoulder, or the carry test fails.

- **B10, the dungeon at the C scale: what it needs.** Lane C's plan (its status, "The dungeons at
  the C scale") re-cuts the rooms on 24-pixel tiles in the same metres (a person 2.7 tiles tall;
  corridors a person and a half wide). So:
  - **Tiles**, `dungeonTile('grotto', kind, variant)` keeps its shape; a C-scale door beside it
    (e.g. `dungeonTile2`) returning 24 × 24 cells in `town2/ramps.ts` materials, the same ten kinds
    and wear counts, drawn with the town's light (bevelled rock, the sea's clumps not a dither,
    sand as the beach's). The wall's face should be about two tiles tall at this scale (a wall a
    third of a person was B6's weak spot), so plan `wall_face` as an upper and lower tile, and edge
    tiles for the shore's curve if lane C will place them.
  - **Props** (`powder_keg`, `treasure_chest`, `brig_bars`, `lantern`, `anchor`, `rope_coil`,
    `cannon`, and lane C's `crate` and `perch`) drawn to metres (`m()`): a keg about 0.6 m, the
    chest 0.9 m wide, the bars a tile wide and 2 m tall.
  - **The cast** as figures on the 56 × 72 canvas where they are people (`deckhand`, `smuggler`,
    `powder_monkey` a head shorter, `brinebeard` on a taller canvas of his own), built on
    `figure2`'s engine and the H2 head (each a `Folk`-like part list, so they walk and breathe on
    the same rig through `folkBoned`-style bones); the creatures (`dock_rat`, `sand_crab`,
    `giant_crab`, `ships_parrot`) on canvases of their own with feet points as data. Their walk
    can be the rig's side cycle; give each a hit pose (a lunge: the near arm's swing pushed
    forward, the weapon's rigid shift) and a fall, which the rig can do as keys.
  - **Portraits**: a 48 × 48 bust per foe and townsperson, drawn by hand at about three times the
    H2 head, never scaled; the three-quarter turn and the gestures of B9 carried over.
  - Iterate on an assembled room at game scale with lane C's overlays redrawn on it, as B6 did.
- **The side walk** (B10b, `src/art/figure2/side.ts` on `rig2.ts`): a new wearable needs a row in
  `SIDE_GEAR` (`sideDress.ts`; a test fails if one is missing): a profile torso part, arm and leg
  covers (pixels along the limb from its root), a skirt spec, caps for the joints. A new held thing
  needs nothing (its front drawing is turned about the fist). A townsperson is a `SideDress` in
  `sideFolk.ts` with arm jobs for busy hands, and a back in `folkBack.ts` (their front drawing turned
  with the front-only parts dropped, by index, and a back head). The dungeon cast can walk on it the
  same way. Iterate on `.shots/` dumps of every frame (a vitest writing 1x PNGs) composed with
  Pillow into grids and GIFs; the tagged frames (`sideWalkGrid`'s `tags`) say which pixel is fist,
  grip, held, shield, prop.
- **The walk rig** (`src/art/figure2/walk.ts`): a part's bone is set with `on(bone, part)` or
  worked out from its slot and side (`boneOf` in `dress.ts`, `folkBone` in `folk.ts`); a new
  wearable needs nothing more unless it covers a leg and the body at once (then split it, or give
  it `trunk` or `skirt`). A new pose is a `Key2`; a figure whose joints differ gets a `Rig2`
  (`FOLK_RIGS`). Iterate on strips of eight frames from a `.shots/` vitest (no browser), then
  check the animation in the gallery's walking section.
- `.shots/` held this session's scratch renders: `before/` is `main`'s `src/art` extracted with
  `git archive` for before-and-after sheets, composed with Pillow from a scratch Python script.

- C-scale work (B7) is judged at game scale on a phone-sized crop, not piece by piece: a scratch
  page under `.shots/` served by `npm run dev` can `cut()` a crop of `town2Picture(time)`
  (`gallery2.ts`), rasterize it at 3 and draw a 64-pixel stand-in on it, which is how the
  square's emptiness, the camouflage grass and the striped sea were caught. Composing the whole
  town takes a few seconds; the tests that compose it carry a long timeout.
- A C-scale piece is a painter in `src/art/town2/` returning a grid of material-and-step cells, a
  row in `MAKE` and `TOWN2_IDS` (`pieces.ts`), and, if placed, a line in `SPECS` (`town.ts`).
  Lay sizes out in metres (`m()`); shade by material steps; let `outlined` draw the line.
- At a fractional device pixel ratio (2.625 on many Androids) pictures are close to exact but not
  always pixel-perfect; at whole ratios they are exact.
- Gear ids are art ids; `ITEM_LAYERS2` in `character2.ts` maps the game's item ids onto them. A
  new wearable needs a gear entry in `figure2/` (front), a row in `SIDE_GEAR` (`sideDress.ts`,
  across), and, if something about it is only on the front, a rule in `BACK_RULES` (`views.ts`).
  A new held thing is drawn to the hand rule (a `GRIP` part under the fist, the rest
  `HELD_FRONT`), needs a `CARRY` row if taller than the shoulder, and is swung, loosed or punched
  by `strikeKind` in `strike.ts` (by its id). `tests/art/layers2.test.ts` and `strike2.test.ts`
  take every wearable from `ITEM_LAYERS2`.
- A new portrait is a `FaceDef` (`dungeon2/folkFaces.ts`, `markFaces.ts`, `beastFaces.ts`), a row
  in `FACES2` (`faces2.ts`) and its box in `PORTRAIT2_SAFE` (`safe.ts`, from `measureSafe2`).
- A new dungeon theme at the C scale is tiles in `dungeon2/tiles.ts`, foes in `beasts.ts` or
  `people.ts` with a `FOE2_SIZES` row, and props in `props.ts`. Iterate on an assembled room
  (`dungeon2/sample.ts`), not single tiles, with lane C's overlays redrawn on it.
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
