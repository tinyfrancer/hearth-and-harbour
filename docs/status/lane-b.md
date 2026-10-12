# Lane B: art

**Next session:** B19 continues (tier 2 art, in batches; see below for what is on `main`).

## Tier 2, batch 3: every other wearable's figure layer, for lane A (B19, third PR)

**Layers on `main` once this PR merges** (an `ITEM_LAYERS2` row each, by the item's own id as the
layer id): `ranger_hood`, `ranger_coat`, `ranger_bracers`, `driftwood_shortbow`, `elm_longbow`,
`yew_longbow`, `thornwood_bow`, `silver_bangle`, `gold_amulet`, `briar_charm`, `ogre_maul`,
`mossback_shield`, `capguard_helm`. With batches 1 and 2, **every wearable in the manifest now
has its icon and its layer**; lane A may merge any of its rows.

- Each is drawn front-on, in profile and from behind, walks, breathes, strikes (bows draw and
  loose, the maul swings) and turns, and shows in the portrait where a portrait shows it (head,
  body, neck). New module `src/art/figure2/tier2Gear.ts` (`TIER2_GEAR2`, `dyePart`), spread into
  `WARDROBE2`. The ranger's hood is the villager's cut in dark leather (`ranger`), worn as a hood
  (hair falls out of it as out of the linen one); his coat the captain's cut in leather, edged in
  leather (`coat()` in `sideDress.ts` and `heroFace.ts` now draw both); his bracers laced to the
  elbow with a stitched guard. The bows are `bowParts` in new woods (`drift`, `elm`, `yew` with
  horn tips, `thorn` with thorns along its back). The maul hangs from the fist like the anchor.
  The cap-guard helm is a brimmed hat in the portrait (`BRIMMED`).
- New C-scale ramps appended to `town2/ramps.ts`: `ranger`, `drift`, `elm`, `yew`, `thorn`,
  `silver`. New `CARRY` rows for the four bows and the maul.
- Tests: the wearables list (`figure2.test.ts`), the held list, `tier2.test.ts` (every facing
  and blow inside the canvas, the hood a hood, the coat without brass, the longbows' height,
  the thorns); one slow walk test given the suite's slow timeout.

## Tier 2, batch 2: every other icon in the manifest, for lane A (B19, second PR, merged #84)

**Icons on `main` once this PR merges**, for every id below (`itemIcon` answers each):
`driftwood`, `elm_logs`, `yew_logs`, `raw_mackerel`, `raw_halibut`, `raw_swordfish`,
`cooked_mackerel`, `cooked_halibut`, `cooked_swordfish`, `silver_ore`, `gold_ore`, `silver_bar`,
`gold_bar`, `sea_holly`, `nettles`, `sea_glass`, `duskbloom`, `nettle_cloth`, `thick_hide`,
`thick_leather`, `holly_tonic`, `forgehand_draught`, `duskbloom_tincture`, `twilight_elixir`,
`ranger_hood`, `ranger_coat`, `ranger_bracers`, `driftwood_shortbow`, `elm_longbow`,
`yew_longbow`, `silver_bangle`, `gold_amulet`, `ogre_maul`, `briar_charm`, `mossback_shield`,
`amber`, `thornwood_bow`, `capguard_helm`, `badger_crown`.

**Not yet**: the figure layers (`ITEM_LAYERS2` rows) for the wearables among them (`ranger_*`,
the four new bows, `silver_bangle`, `gold_amulet`, `ogre_maul`, `briar_charm`,
`mossback_shield`, `capguard_helm`, `thornwood_bow`): batch 3. Foes, faces and marks: batch 4.
Until a wearable's layer lands, the art tests in lane A's own suite that look for a layer will
fail for it; its icon is already there.

- Families drawn beside their tier 1 kin: elm and yew are the logs' drawing in their own barks
  and cut ends, silver, gold and salt-iron bars the ingot, the four potions the shell vial with
  their own liquids and stoppers, the driftwood shortbow the shortbows' drawing, the longbows the
  poacher's, thick hide and thick leather the hide and the leather sheet. New icon ramps appended
  to `palette.ts` (no colour changed). New module `src/art/tier2Items.ts` (`TIER2_ITEM_DEFS`),
  spread into `TIER2_ICON_DEFS`; eight new `ICON_FAMILIES`.

## Tier 2, batch 1: salt-iron and the knight, for lane A (B19, first PR, merged #83)

Drawn from `docs/tier2-manifest.md` (read from lane A's `lane-a/s22-tier2` branch, PR 1). **On
`main` once this PR merges** (lane A may merge rows for these ids):

| Manifest id            | Icon | Layer (`ITEM_LAYERS2`)        |
| ---------------------- | ---- | ----------------------------- |
| `salt_iron_ore`        | yes  | n/a                           |
| `salt_iron_bar`        | yes  | n/a                           |
| `salt_iron_arrowheads` | yes  | n/a                           |
| `salt_iron_sword`      | yes  | `knight_sword`                |
| `salt_iron_axe`        | yes  | `saltiron_axe` (new)          |
| `salt_iron_helm`       | yes  | `knight_helm` (new)           |
| `salt_iron_plate`      | yes  | `knight_plate`                |
| `salt_iron_greaves`    | yes  | `knight_knees`                |
| `salt_iron_shield`     | yes  | `kite_shield`                 |
| `red_cloak`            | yes  | `red_cloak`                   |
| `salt_iron_arrows`     | yes  | `arrow_quiver` (as iron's)    |
| `broadhead_arrows`     | yes  | `barbed_quiver` (as barbed's) |

Merged as #83 and deployed.

- **Salt-iron**: a new ramp, `saltiron`, appended to `src/art/town2/ramps.ts` (cells above keep
  their numbers) and to `src/art/palette.ts` for icons, set by hand by day and at dusk (a new
  `DAY_SET` in `ramps.ts`, used only by it). Tested against iron, bronze, gold and every hair.
- **The knight, audited and recoloured**: every knight layer (front, profile, back, strike, carry,
  activities, the portrait's plate) is salt-iron, not the old `plate` ramp (kept, still used by a
  replay icon). New: the helm `knight_helm` (front, profile, back, portrait; gilt brow band;
  aventail), a mail skirt under the fauld (the tunic no longer shows), `knight_knees` redrawn as
  full greaves with a cuisse (front, back, profile; it had been knee cops only), the war axe
  `saltiron_axe` (edge rule, carry, swing). `KNIGHT_GEAR2` gains `knight_helm` at its end; the
  five old ids, their slots and anchors are unchanged.
- **Doors**: no export renamed or re-signed. `ITEM_LAYERS2` gains the nine rows above. New module
  `src/art/tier2Icons.ts` (`TIER2_DRAWINGS`, `TIER2_ICON_IDS`, `TIER2_ICON_DEFS`), spread into
  `itemIcon`'s table; `ICON_FAMILIES` gains "Salt-iron (tier 2)".
- **Memory**: no new caches; the knight's sprites are the figure caches' (16 KB a frame a time of
  day). Twelve icons, about 2 KB of pictures each once drawn.

## The cave's creatures and walls, the town's markers and boat, the title, six icons, for lanes C and A (B17, third PR)

Items 5 to 8 of the brief (the dungeon, the town, the title, the icons). No export renamed or
re-signed; `FOE2_SIZES` (every box and reach) equals `measureFoe2` as before; every piece's size,
base, foot and facts are unchanged. Added:

```ts
// src/art/town2/markers.ts
TOWN_MARKER2_SIZES                      // ['small', 'large', 'medium']: 'medium' appended, small still the default
townMarker2(kind, frame, 'medium')      // 22 x 23 with its keyline, one canvas and anchor for every kind and frame,
                                        //   anchor { x: 10, y: 22 } (the keyline under the tip)
townHighlight2(w, frame)                // now carries glows round its line (dusk only: not `always`)
// src/art/town2/pieces.ts
TOWN2_PIECE_FRAMES: Partial<Record<Town2Id, { frames: number; frameMs: number }>>
                                        // { boat_lantern: { frames: 2, frameMs: 420 } }
town2PieceFrame(id: Town2Id, frame: number): Town2Piece
                                        // frame 0 is town2Piece(id); any other frame the same piece
                                        //   (size, base, foot, facts) with its picture stirred
```

- **The cave's creatures** (item 5). The troll down: each part (head, ear, legs, the flung arm)
  is drawn on its own and laid on with a dark seam where its edge meets the body, and the arm is
  lit from above, so he reads as a troll on his back, not a heap. The wolf a step paler all over
  (his top may now reach the light step) and his legs a pixel thicker. The giant crab's eye
  stalks a pixel wider (the outline took one off each side). Every portrait was rendered and
  compared: the people's heads are distinct (the closest pair shares a third of its cells), the
  five thieving marks and the ferryman each their own.
- **Creature strikes**: the rat, the boar and the wolf crouch at the wind-up, then spring: the
  hind feet stay where they stood, the body stretches, the forefeet leave the ground and the
  head drives in low, no further forward than before (the reach is unchanged). The gull draws its
  head back and stabs down. The crabs, the parrot, the troll and the wyrm are as they were.
- **The tide-pool cave**: the beds of its walls bend over a long stretch, a few long upright
  joints wander down across several beds, and weed strands lean a pixel a row and darken to the
  tip (they read as drips). The light shaft is streaks along the beam, thick in its heart and
  thin at its edges, in place of B16's checker. The open side door's rock surround past the
  room's edge is taller and lumpy (4 to 11 rows off the passage, to the piece's fourth row); the
  grotto's is as it was (`cheeks` takes an optional `tall`).
- **The town** (item 6). `medium` markers, half as big again as the small: the large one's
  rounded plaque with a one-pixel gold rim, the same pictograms hand-drawn at 14 x 9 (travel is
  the little boat, as the large). Judged over the real town by day and dusk with the small and the
  large (`markers-three-sizes.png`); small stays the default. The ring round the nearest thing
  carries its own soft light at dusk. The boat's painter ends in an iron ring at the top of the
  boat's picture, which in town lies on the quay wall's wet foot (the ring's middle is about
  (124, 5) in the piece). The boat lantern's pennant has two frames (`town2PieceFrame`). The
  ferryman walking across leans his oar, its head forward of his face and its blade back by his
  feet, so it no longer runs up across his chin. On the chart the chimneys are two pixels wide and
  set into their roofs.
- **The title** (item 7). The ship moved left (its mast in the gap between the hill's path and
  the smithy, its waterline where it was), so its rigging and flag no longer cross the smithy's
  face and roof at 360 wide, nor at any other width; a pier light the hull stands in front of is
  not drawn over it. On the hill's face: a dry-stone wall with a gap for a gate, four sheep and a
  few dots of gorse. A light's reflected columns now break together (staggered, they read as
  hooks when enlarged). The gulls half as big again, with a body, a beak and dark wingtips.
- **Icons** (item 8). The greaves, bronze and iron: the pair stands apart, the far one higher and
  darker, each a leg's silhouette (knee cop, straight shin, swelling calf, ankle, instep lip) with
  a strap at the calf and the ankle; at 24 pixels B14's overlapping pair ran into one tangle. Five
  more redrawn, chosen as the most out of their families on a contact sheet of every icon: the
  hide (a pelt laid out, head and ears, legs at the corners; it read as a squashed beetle), the
  smuggled tea (a wooden chest with a stencilled leaf and a wax seal; it read as a tin of soup),
  leather (a laced sheet with a corner turned; the roll read as a log), the hunter's charm (a
  large curved fang under red beads; the cord's loop was most of it) and the velvet cap (crown,
  folds and band apart; it was one plum blob).
- **The dev server**: `tidepool.ts` read the tile size at load, which `tiles.ts` (they import
  each other) had not yet set when it was loaded first, and the page stopped there under
  `npm run dev` ("Cannot access 'TILE2' before initialization"); it now reads it when drawing.
  The production build was not affected.
- **Gallery**: the markers plate shows the medium markers; the rest shows in the plates as before.
- **Review sheets** in `/home/claude/lane-shots/w17-b/`: `foes-fixes.png`,
  `markers-three-sizes.png`, `town-fixes.png`, `title-before-after.png`, `icons-redrawn.png`,
  and `s16-icons.png` (redone with the slow and dodge kinds).

## The blow toward and away, the back view, the walk, standing turned, for lanes C and A (B17, second PR)

The figure weak spots on the B12 to B16 lists, worst first. No export renamed or re-signed;
`STRIKE2_FRAMES` 4, `STRIKE2_HIT_FRAME` 2, the canvas, the anchor, every stride and frame constant
unchanged. Added:

```ts
// character2.ts: the standing hero turned toward his facing (a new door; the standing picture is unchanged)
characterThreeQuarterPicture2(look, worn, frame = 0, extra = [], facing: 'right' | 'left' = 'right'): Picture2
characterThreeQuarter2(look, worn, time, frame = 0, extra = [], facing = 'right'): HTMLCanvasElement
```

- **The blow toward the camera** is a diagonal cut across his front: cocked over the right
  shoulder, swept across at the chest, landing low on his left with the blade laid out beside him
  at its full length (a long blade gives up its lean before its length at the landing, in every
  facing; across, the landing is steeper for the same reason), eased on through. **From behind**
  the same cut seen from the back: raised on the right, carried over the head, landing low on the
  left with the blade past his side. **A swung weapon trails an arc** on the swing and the landing
  (pale steel, only on empty pixels, never over the figure). **A bow toward and away** is drawn
  three-quarter at full draw, the string to the jaw in a V and the arrow past the grip. **A shield
  with a bow** is strapped to the bow arm across (its edge by the grip) and slung on the back
  toward the camera and away. **The punch** lands beside the shoulder, a larger fist (nearer the
  viewer), the body turned into it, a flash about it in every facing (the fist and the arm kept
  clear of it). Lane C's fight draws the frames as before; the arc and the flash are in them.
- **From behind**: the shield held out from the body and cut at its side (`SHIELD_OUT` 3,
  `SHIELD_CUT` 19 in `views.ts`), so it is a solid band past the arm and never shows through the
  gap at the body; a cloak's top laid over the shoulders as a mantle (the knight's pauldrons no
  longer poke out); twin braids are full plaits over both shoulders; curls under a helm are
  pressed in to the head (a style may now say how it is worn under head gear, `under` in
  `HairDrawing`); long hair has a sheen across it and lit strands (black is no longer a mass); a
  bald head has creases at the ears and a shadow under the skull. Townsfolk backs: the alewife's
  elbows rounded and turning in, her bun rimmed, her apron's bow at her back; the smith's apron
  straps crossed on his back; the old man's coat seamed with a half-belt and a vent.
- **The walk**: across, a cloak covers a leg striding back only to the knee, so the knight's
  trailing shin and boot show (he read one-legged); greaves stop short of the boot, so a band of
  leather shows between plate and foot (they read as boots); toward the camera and away the
  planted foot's welt is pressed out a pixel either side, so it reads flat and heavy against the
  free foot.
- **Standing turned**: the front figure, before its outline, turned row by row about the body's
  middle (the near side widened, the far side drawn in, the head furthest, the chest less, the
  legs least, eased through the neck and the hips), then outlined. It holds for every look and
  wearable at once (a shield turns with its arm, a hat with the head), and is never a turned head
  on a square body. It is not a redrawn three-quarter: see the weak list. Facing right; `'left'`
  is it mirrored and re-lit, so what he holds changes hands, as `facingLeft2` does for the
  standing picture.
- **Gallery**: "Standing turned (B17)" in the figures' section; the blow, the back and the walk
  plates show the new frames.
- **Review sheets** in `/home/claude/lane-shots/w17-b/`: `strike-down-up-before-after` (two
  parts), `strike-4way.gif`, `back-view-before-after.png`, `walk-before-after.png`,
  `three-quarter.png`.

## Dungeon replay: icons, medals, seals, the pennant, rowing, corner pointers, for lanes A and C (B17, first PR)

S16 adds daily modifiers, challenges and idle dungeon runs. Lane A's ids were not on `main` when
this was drawn, so icons are chosen **by kind**: the words in an id, or a modifier's effects. No
existing export renamed or re-signed; the four straight pointers are byte for byte B16's (tested).

```ts
// src/art/dungeonIcons.ts (new door)
modifierIcon(id: string): HTMLCanvasElement          // 24 x 24 art px at iconScale, class 'icon',
challengeIcon(id: string): HTMLCanvasElement         //   aria-hidden (its name goes beside it); never null
modifierIconFor(effects: unknown): HTMLCanvasElement // from the effects, for ids never seen here
modifierIconPicture(id) / challengeIconPicture(id) / modifierIconForPicture(effects): Picture2
modifierKind(id) / challengeKind(id) / modifierKindFor(effects): DungeonIconKind
DUNGEON_ICON_KINDS   // tough fierce swift slow might frail loot coins xp tide hungry dark modifier |
                     // time untouched nobrace nopotion unarmed dodge boss slayer challenge
dungeonIconPicture(kind): Picture2;  DUNGEON_ICON_SIZE = 24
challengeMedal(state: 'todo' | 'done' | 'new', frame = 0): HTMLCanvasElement
challengeMedalPicture(state, frame = 0): Picture2
CHALLENGE_MEDAL_STATES, CHALLENGE_MEDAL_FRAMES = 6, CHALLENGE_MEDAL_FRAME_MS = 90
dungeonSeal(id: string, tier: 'cleared' | 'all-challenges' = 'cleared'): ChartPiece2  // anchor: the disc's middle
DUNGEON_SEAL_TIERS
// src/art/chart.ts
chartPennant2(frame = 0): ChartPiece2;  CHART_PENNANT2_FRAMES = 4, CHART_PENNANT2_FRAME_MS = 200
// src/art/character2.ts: a new activity through the existing doors
ACTIVITY2_IDS  // gains 'dungeon' (after 'thieving'); activityFrames2('dungeon') = 4,
               // activityFrameMs2 230, activityHitFrame2 1 (the drive), activityProp2: the boat
// src/art/town2/markers.ts
TOWN_POINTER2_DIRECTIONS  // gains 'up-left', 'up-right', 'down-left', 'down-right'
townPointer2(direction, frame)   // a diagonal is 22 x 22 with its keyline, one anchor every frame
```

- **Matching**: a modifier id is read for words (`tough|health|hardy` tough, `fierce|damage|hit|
strong` fierce, `swift|speed|fast|frenzy` swift, `slack|slow|sleep` slow (before the tide's words: a slack tide is its sea at rest),
  `hero|might|keen` might, `frail|fragile` frail,
  `loot|bounty|treasure|rich` loot, `coin|gold|purse` coins, `xp|learn|wisdom` xp, `tide|flood|wave`
  tide, `hung|no_food|famine` hungry, `dark|gloom|night` dark; else a die, `modifier`). A
  challenge is read by its slug after the last dot (`untouched|no_damage|flawless`, `brace`,
  `no_food`, `potion`, `unarmed|fist|bare`, `dodge|step` a blow stepped out of, `time|under|swift|minute` an hourglass, `boss|captain`,
  `kill|every|all` crossed swords, `tide`, `loot`; else a target, `challenge`). The dungeon's own
  id is never read (the tide-pool cave's "tide"). `modifierKindFor` reads effects as an object
  (`{ foeHealth: 1.5 }`) or a list (`[{ kind: 'foeDamage', by: 1.3 }]`): who it touches (hero or
  foe) and what (health, damage, speed or interval, loot, coins, xp, tide, food, dark), the
  biggest change winning; `heroHealth` below 1 is `frail`. `tests/art/dungeonIcons2.test.ts`
  asserts every modifier and challenge id in `src/data/dungeons.ts` gets a non-generic icon
  (skipped until those ids land).
- **Lane A's ids (wave 17), checked**: `slack_tide` slow (its effect is `foeSpeed` 0.8, so the
  effects give slow too: a speed below 1, or an interval above 1), `rich_pickings` loot,
  `thick_skulls` tough, `angry_crew` fierce, `quick_tempers` swift, `spring_tide` tide,
  `no_rations` hungry, `unlit_lamps` dark; `tidepool_cave.quick` and `brinebeards_grotto.swift`
  the hourglass, `.unhurt` and `.nearly_unhurt` the bright heart, `.no_food` the forbidden meat,
  `tidepool_cave.snapper_dodge` the dodge (an arrow arching over a blow; the data's note
  expected the boss, but the challenge is stepping out of his blows), `brinebeards_grotto.spring_tide`
  the tide. The data test now runs on them.
- **Medals**: `todo` a dull iron disc with a hollow face on a grey ribbon; `done` gold with a
  star on a red ribbon; `new` the gold medal with a glint sweeping across it and a sparkle
  blooming: play frames 0 to 5 once at `CHALLENGE_MEDAL_FRAME_MS`; frame 5 on is exactly `done`.
- **Seals**: the dungeon's chart emblem on chart paper in a round frame, 33 x 33 with its keyline (`cleared`, a
  bronze rim) or 33 x 40 (`all-challenges`, a gold rim with a laurel, a star over it and red
  ribbon tails under). Any id without an emblem gets a compass star. Day only (paper): `DAY2`.
- **The pennant**: a midnight-blue swallowtail with a gold star on a tall pole, 19 x 22 with
  its keyline, anchor the pole's foot (as a marker's): stand it 6 to 10 pixels left of a landing's
  marker on a day the landing has a modifier. It is taller than the marker and never red.
- **Rowing** (`dungeon`): seated in the little boat facing the stern, both fists on the near
  oar: the catch, the drive (the blade deep, a splash: the hit frame), the finish, the
  recovery (the blade carried clear). The boat (`activityProp2('dungeon')`) is behind the hero
  (`front: false`), its top-left the hero canvas's top-left (`at` (0, 0), `foot` (28, 70)), 79 x
  71, so the "now doing" stage keeps its size (the fishing prop already reaches column 79);
  the frame lays the near hull and the water over his legs, pixel for pixel the prop's, and the
  oar over that. Any look and outfit; weapon and shield put down as for every activity. The
  boat's lantern glow is in the prop's `glows` (dusk only).
- **Corner pointers**: the chevron turned to the diagonal with a shallower notch (turned, a deep
  notch reads as a corner bracket). Its anchor is the pixel diagonally past the tip at its
  furthest frame: put it where the arrow points to, a few pixels in from the corner.
- **Gallery**: the Icons part has "Dungeon replay" (each kind, the medals with the new one's
  sparkle looping, the seals and the pennant fluttering); rowing is in the figures' activity
  plate and the corner pointers in the markers plate.

## Markers, the ring, the boat, B15's weak spots, for lane C (B16, second PR)

No export renamed or re-signed; no id, footprint, base or layout position moved. Drawing changes,
two added data fields, one moved chart coordinate:

```ts
// raster.ts: a glow may carry its own colour (left out: the lamp's GLOW_RGB, as before)
interface Glow { …; readonly rgb?: readonly [number, number, number] }
// dungeon2/light.ts
DAYLIGHT2_RGB = [222, 242, 255]   // the tide-pool cave's daylight; on SHAFT_LIGHT2 and every
                                  // tide-pool glow and light; flicker2 passes `rgb` through
// dungeon2/sizes.ts
interface Foe2Size { …; readonly mid?: number }   // the body's middle, ahead of the anchor
FOE2_SIZES.old_snapper: box { w: 84, h: 43 } (was 67), mid: -14 (new); reach unchanged
// chart.ts
CHART2_LANDINGS.unknown_2 = { x: 42, y: 154 }   // was (52, 133); keys unchanged
// town2/facts.ts
boat_lantern: 26 x 64, base 62 (was 14 x 50, base 48), foot 6; ROWBOAT_LANTERN_AT unchanged
```

- **Markers**: the small `gather` is a green leaf with a gold glint, drawn by hand at 10 x 8 (the
  hand axe read worst at true size); the other small markers are byte for byte B15's (tested). Each
  marker was checked at true size over cobbles, grass, sand, planks and water, by day and at dusk
  (`markers-before-after.png`).
- **The ring** (`townHighlight2`, same signature, same anchor rule): a thin unbroken gold ellipse
  held between two dark keylines, a brighter glint creeping round it by frame, so it reads on
  every ground and is never taken for foam on the sea. The grid is now `w + 4` across (was `w + 2`)
  and its anchor is still its middle.
- **The boat** (`rowboat`, same id, size 135 x 58, base 54, foot 68): the top strake white over a
  red line (the blue was lost against the sea), the mooring line two pixels thick from the coil in
  the bows up over the far gunwale. **Its lantern** (`boat_lantern`): the pole a staff's length
  taller (14 pixels) with a long red pennant at its head, so something of the boat stands up past
  the quay's edge. Its foot, and where it stands in the boat, are unchanged; `BOAT_LANTERN` in
  lane C's `fromLaneB.ts` reads the new size and base from `town2Facts`, so nothing to change.
- **The sign** (`boat_sign`, same size): its picture bold: a dark hull filling the board, the boat's
  white and red strake, thick raised oars, two rows of sea.
- **Old Snapper**: his body's middle is 14 behind his feet, so `FOE2_SIZES.old_snapper.mid` is `-14`
  and his box is his whole drawn body, 84 wide, which reaches from his tail to his head when
  centred there. Every other foe stands over its middle and has no `mid` (`measureFoe2` adds it
  only when the middle is 8 or more off the feet). Front, back and strike are unchanged.
- **The tide-pool cave**: the walls' beds dip gently and wander, no upright joints, weed lodged in
  the deeper joins with strands, barnacles freckling the beds (`tidepool.ts`); `light_shaft` has a
  dithered body of its own as well as its glows (same size, foot and base); every daylight glow and
  light in the theme carries `DAYLIGHT2_RGB`, a cool near-white, so the shafts, the mouth and the
  open doors no longer look like late-afternoon lamplight. The grotto is untouched (its hash test
  holds).
- **The ferryman from behind**: the sou'wester is a rounded crown with its brim's long back flap
  over his nape (it read as a cone, and his bare head showed under it).
- **The chart**: home drawn half as big again (34 x 18 before its outline), outlined as a town
  piece, with the tavern, the smithy and its chimney, and the thatched house; `unknown_2` moved to
  open water south of the western islets, clear of the first islet.
- **Gallery**: the markers plate shows both sizes and the pointers (first PR); the ferry plate shows
  the new boat, lantern and sign.
- **Review sheets** in `/home/claude/lane-shots/w16-b/`: `markers-before-after.png`,
  `boat-before-after.png` (the real quay at true phone size, day and dusk, portrait and sideways,
  with the large marker pasted where lane C would float it), `pointer.png` (with mock-ups at the
  screen's edge), `snapper-box.png`, `tidepool-before-after.png`, `chart-before-after.png`,
  `ferryman-back.png`.

## The large travel marker and the edge pointer, for lane C (B16, first PR)

The boat should read as the thing to use from across the square. No existing door renamed or
re-signed; every existing call draws what it drew (held byte for byte to B15 by
`tests/art/markers2.test.ts`). Added:

```ts
// town2/markers.ts
townMarker2(kind: TownMarker2Kind, frame = 0, size: TownMarker2Size = 'small'): TownMarker2
TOWN_MARKER2_SIZES = ['small', 'large'] as const;  type TownMarker2Size
townPointer2(direction: TownPointer2Direction, frame = 0): TownMarker2   // { picture, anchor }
TOWN_POINTER2_DIRECTIONS = ['left', 'right', 'up', 'down'] as const;  type TownPointer2Direction
```

- **`townMarker2(kind, frame, 'large')`**: every kind, 29 x 30 with its keyline, all large kinds and
  frames one canvas with one anchor, `{ x: 14, y: 29 }` (the keyline under the pointer's tip, as the
  small's): float it with its anchor 2 to 6 pixels over the boat's gunwale, as the small. `travel`
  is a little sailing boat in a gold-rimmed plaque; `new` a larger sparkle (no plaque); `talk`,
  `enter` as the small, bolder; `gather` a leaf with a glint. Step its frame every
  `TOWN_MARKER2_FRAME_MS` with the others; the plaque bobs 2 pixels inside its canvas. Suggested
  use: the boat's `travel` large while the hero is more than about four tiles from it, small when
  near (or keep it large always: it is the one thing Cody asked to stand out).
- **`townPointer2(direction, frame)`**: a gold chevron with a dark keyline, 16 x 17 (left, right)
  or 17 x 16 (up, down) with its keyline, every frame one size with one anchor. The anchor is the
  point just past the arrow's tip at its furthest reach (it nudges 0, 1, 2, 1 pixels toward it), so
  put the anchor where it should point to: a few pixels inside the screen's edge on the line from
  the screen's middle to the boat, while the boat is off the screen. Same frames and timing as the
  markers. Rasterize both with `DAY2` / `DUSK2` as the town.

## The ferryman, the boat's sign and lantern, the town's markers, for lane C (B15, second PR)

Cody: "make it more apparent we need to click the boat". No existing door renamed or re-signed; no
town placement moved or added (lane C places the new pieces). Added:

```ts
// character2.ts: a new townsperson, through every existing door
TOWNSFOLK2_IDS                    // now ends 'ferryman'; townsfolkName2('ferryman') = 'The ferryman'
townsfolkPicture2 / townsfolkSprite2 / townsfolkWalk2 / townsfolkIdle2 / ...Picture2('ferryman', …)
portrait2('ferryman'), PORTRAIT2_SAFE.ferryman   // { x: 3, y: 0, w: 64, h: 56 }

// town2/pieces.ts: two new piece ids (town2Piece, town2Facts, TOWN2_IDS)
'boat_sign'     // 44 x 72, base 70, foot 16, ground 15 x 15 (one tile), its lamp lights at dusk
'boat_lantern'  // 26 x 64, base 62 (B16; was 14 x 50, base 48), foot 6, no ground: rides in the boat
ROWBOAT_LANTERN_AT = { x: 114, y: 23 }  // where the lantern's foot goes, from the boat's top-left

// town2/markers.ts (new)
townMarker2(kind: 'talk' | 'enter' | 'gather' | 'travel' | 'new', frame = 0): { picture, anchor }
TOWN_MARKER2_KINDS, TOWN_MARKER2_FRAMES = 4, TOWN_MARKER2_FRAME_MS = 180
townHighlight2(w: number, frame = 0): { picture, anchor }   // the ring round the nearest thing
```

- **The ferryman** stands with his oar upright in his near fist (blade on the ground) and his far
  hand in his pocket, a pipe in his mouth, in a yellow oilskin and sou'wester: same canvas, anchor,
  breath, walk in four facings (he can stroll, but is meant to stand) and contact shadow as every
  townsperson. Suggested place: on the quay just west of the boat's landing, feet at (420, 1436)
  (tile (17, 59), beside `BOAT_LANDING2` (18, 59)), facing down or toward the hero; talked to from
  the landing. His words are yours.
- **`rowboat`** is redrawn behind the same id, size, base and foot (135 x 58, base 54, foot 68):
  its oars shipped and plain to see (pale ash, red-tipped blades), the top strake painted blue, a coil
  of rope in the bows. Its placement is unchanged.
- **`boat_lantern`**: draw it with its foot at the boat's top-left plus `ROWBOAT_LANTERN_AT` and its
  base row there, right after the boat (it is in the boat), bobbing with the boat; add its glow (dusk
  only). With the rowboat at its placement (top-left (452, 1468)) that is foot (566, 1491).
- **`boat_sign`**: a painted board on a post by the mooring with its own small lantern (dusk).
  Suggested place: foot (444, 1413), on the square's edge above the landing (tile (18, 58), solid,
  one tile): it reads over the boat from the square. Its words, if any, are yours.
- **Markers**: 14 x 16 each (outline included), every frame of a kind the same size and anchor
  (the pointer's tip, at the bottom middle): float one with its anchor 2 to 6 pixels above what it
  marks (the boat's gunwale, a person's head, a door's lintel) and step its frame every
  `TOWN_MARKER2_FRAME_MS`; the badge bobs inside the picture. `talk` for a person, `enter` a door,
  `gather` a thing to work at, `travel` the rowing boat, `new` (a gold sparkle, no badge) for
  something unseen. Few and quiet: the boat's `travel` always (it is Cody's point), the others only
  near the hero, never all at once.
- **The ring** (`townHighlight2(w, frame)`): a thin dashed ellipse of pale light `w` across, a third
  as deep, no outline; lay it on the ground (or the water) centred on the nearest usable thing's
  foot, under everything standing, the frame stepping with the markers'. For the boat about 150
  across, centred 50 below its top-left's row and 68 across.
- Rasterize everything with `DAY2` / `DUSK2` as the town; the badge (`sail`) and the sparkle (gold)
  keep their brightness at dusk.
- **Also in this PR**: the tide-pool cave's floor rock with worn, wandering slab edges (it read as
  paving), calmer sand, `kelp_clump` redrawn as a heap of kelp the tide left (same id), the chart's
  map kept inside its frame and its `unknown` marker darker, and the gallery's B15 sections (button
  "See the new dungeon at the finer scale").

## The tide-pool cave, Old Snapper and the harbour chart, for lanes C and A (B15, first PR)

No existing door renamed or re-signed; every existing call draws what it drew (the grotto's tiles,
props, light and palette are held byte for byte to `main` by `tests/art/tidepool2.test.ts`), with
three deliberate drawing changes noted below. Added:

```ts
// dungeonArt2.ts: the theme
DUNGEON2_THEMES = ['grotto', 'tidepool'] as const;  type Dungeon2Theme
dungeonTile2(kind, variant = 0, around?, at?, theme: Dungeon2Theme = 'grotto'): Picture2 | null
dungeonDoor2(kind, around?, at?, theme: Dungeon2Theme = 'grotto'): DoorPiece2Picture | null
lightGround2(ground, lights, theme: Dungeon2Theme = 'grotto'): TGrid
dungeonTheme2(theme = 'grotto'): DungeonTheme2   // the same, bound (see below)
CAVE_TIDEPOOL: CavePalette                        // the tide-pool cave's palette (day)
TIDEPOOL2_IDS = ['dock_rat', 'sand_crab', 'old_snapper']
TIDEPOOL2_PROP_IDS = ['rock_pool', 'kelp_clump', 'starfish_cluster', 'anemone_rock',
                      'driftwood', 'boat_ribs', 'cave_mouth', 'light_shaft']  // also in PROP2_IDS
TIDEPOOL2_LIGHT, SHAFT_LIGHT2                     // the day scheme's numbers, a shaft's light

// the boss, through the existing doors
foePicture2('old_snapper', pose, facing, frame)   // every pose: idle 2, walk 4, windup, strike,
foeSprite2('old_snapper', …, CAVE_TIDEPOOL)       //   hurt, flash, fall 2; both facings
FOE2_SIZES.old_snapper, foeSize2('old_snapper')
portrait2('old_snapper'), PORTRAIT2_SAFE.old_snapper   // { x: 0, y: 0, w: 72, h: 56 }

// chart.ts (new door)
harbourChart2(): { picture: Picture2; width: 340; height: 300;
                   landings: Record<string, { x, y }>; home: { x, y } }
chartMarker2(state: 'open' | 'cleared' | 'locked' | 'unknown' | 'selected'): ChartPiece2
chartEmblem2(id: string, silhouette = false): ChartPiece2 | null  // brinebeards_grotto, tidepool_cave
chartBoat2(facing: 'left' | 'right' = 'right'): ChartPiece2
chartDot2(): ChartPiece2
chartRoute2(from, to, { step = 7, bend = 0.18 } = {}): { x, y }[]
// ChartPiece2 = { picture: Picture2; anchor: { x, y } }: draw at (x - anchor.x, y - anchor.y)
CHART2_W, CHART2_H, CHART2_LANDINGS, CHART2_HOME, CHART_MARKER2_STATES, CHART_EMBLEM2_IDS

// character2.ts
activityHitFrame2(activity: string): number | null   // where each loop's work lands
```

- **The theme** is a trailing optional argument on each door (left out, the grotto, exactly as
  before), or `dungeonTheme2(theme)`, an object with `tile(kind, variant, around, at)`,
  `door(kind, around, at)`, `prop(id)`, `propSprite(id)`, `lightGround(ground, lights)`,
  `foeSprite(id, pose, facing, frame, phase)` bound to the theme and its palette, plus `palette`
  (`CAVE_DUSK` or `CAVE_TIDEPOOL`), `figureTime` (`'dusk'` or `'day'`), `propIds`, `castIds`.
  Same tile kinds, wears and footprints as the grotto, so a room's rows are laid out the same; only
  the drawing differs. In the tide-pool cave, rasterize everything with `CAVE_TIDEPOOL` and draw the
  hero with `characterSprite2(look, worn, 'day')` (its town colours are `DAY2`'s, tested). Its
  glows are all `always` (the palette has no evening lights).
- **Light by day**: `lightGround2(…, 'tidepool')` darkens nothing out to 3.2 pools from a light
  (one step past that), and lifts a light's heart a step. Lights in a tide-pool room: each open
  door's `light`, each `light_shaft`'s and the `cave_mouth`'s (move them with `lightAt` as a
  lantern's). No lanterns.
- **Props**: stand at (x - foot, y - base) as every prop. `light_shaft` is an overlay (a crack's
  slit at its top, motes, and a chain of glows down and to the right): stand it at the floor spot it
  lights (its foot and base are that spot; it is 58 x 112, reaching up over the wall); add its glows
  and its `light`. `cave_mouth` is 70 x 72, three tiles tall like a door: stand it with its base on
  the first floor row below a wall face, in the back wall; it carries daylight glows and a `light`.
  The rest are floor props (rock pool 46 x 26, kelp on a rock, starfish on a rock, anemones and
  mussels, a driftwood log 62 x 20, an old boat's ribs 76 x 40).
- **Old Snapper** (`FOE2_SIZES.old_snapper`): canvas 108 x 66, feet (60, 64), tall 43, front 27,
  back 56, strike 47, box 67 x 43, shadow 33. He stands a little behind his front feet, his shell and
  tail behind, so a hero at the 36-pixel stand is not drawn over him (front 27 + 13 − 36 ≤ 4), and
  his snap reaches 47: plainly onto the hero. Windup is the telegraph (he rears, front feet up, head
  high, jaws gaping pink); strike the neck out low; hurt his head pulled into his shell; fall frame 1
  on his back (108 x 48, feet given). His contact shadow centred on his feet sits a little ahead of
  his shell's middle (see the weak list).
- **The chart** is 340 x 300 art pixels, one art pixel a CSS pixel on a 390-wide phone (3 device
  pixels), day only: rasterize with `DAY2`. Landings: `tidepool_cave` (239, 116) off the headland
  just east of the bay, `brinebeards_grotto` (106, 170) by the island to the south-west,
  `unknown_1` (250, 178) a south-eastern islet, `unknown_2` (42, 154) south of the western islets (B16; was (52, 133)),
  `unknown_3` (196, 262) the far shore; `home` (128, 100), the quay. A marker's anchor is the pole's
  foot (on the landing); `selected` is a ring whose anchor is its middle (lay it round the chosen
  marker, centred about 6 above the landing); an emblem's anchor is its middle (beside the marker).
  The route: lay `chartDot2()` at each of `chartRoute2(home, landing)`; show the first n for a boat
  on its way and put `chartBoat2` at the next point. The picture holds no words.
- **Changed drawing** (no size the fight uses): (1) the open side door's passage past the room's
  edge has rock round it in the open piece only (its jambs lit from beyond, rock out to a ragged
  edge), so a scene showing only where the open and barred pieces differ shows it cut through rock;
  (2) any foe's pixel on its canvas's edge is now its outline step (the giant crab's claws and legs
  ran off its canvas cut flat), so nothing is drawn past a declared size; the giant crab keeps its
  canvas and sizes (your drawn-apart test relies on them); (3) the sand crab's canvas is 48 x 32,
  feet (24, 30) (it ran off its 40 x 26): `FOE2_SIZES.sand_crab` tall 26, front 22, back 22, strike
  22, box 41 x 26, shadow 20.

## The title screen, for lane A (B14)

```ts
// src/art/title.ts
titleScene(widthCss: number, heightCss: number, dpr: number): {
  canvas: HTMLCanvasElement;          // one pixel per art pixel, CSS-sized to cover the screen
  draw(ms: number): void;             // paints the frame for time ms; pure in ms
  safe: { x: number; y: number; w: number; h: number }; // CSS px from the canvas's top-left
  dispose(): void;
}
TITLE_FRAME_MS = 125                  // redraw interval while the title shows
```

- **Size**: pass the title's box in CSS pixels (the viewport, or the app's area) and
  `devicePixelRatio`. The canvas's CSS size is the box or a hair larger (under one art pixel, so
  each art pixel lands on whole device pixels at 2.625x too): put it at the box's top-left in a
  container with `overflow: hidden`. On a 3x phone one art pixel is one CSS pixel (3 device
  pixels); a phone on its side or a tablet gets a smaller whole scale and more scenery round the
  same composition. Build a new scene on a resize or rotation (`dispose()` the old one).
- **The menu**: put the button and version line inside `safe` (calm water at the foot, below the
  town's reflection, a little narrower than the screen; it reaches the canvas's bottom, so add
  the safe-area inset yourself). On a 390 x 844 phone it is 340 x 150 CSS pixels from y 694; on
  360 x 640, 336 x 150 from y 490; on 430 x 932, 340 x 150 from y 782. The logotype is part of
  the picture, above `safe` at every size (tested). On a screen much wider than tall (a phone on
  its side, a tablet held sideways) `safe` is the calm water to the right of the town instead
  (844 x 390: 287 x 135 CSS pixels at x 549, y 255): lay the menu out inside whatever box comes
  back rather than assuming it is centred.
- **Animating**: call `draw(ms)` with the time since the title appeared, every `TITLE_FRAME_MS`
  (a `requestAnimationFrame` loop that skips frames until 125 ms have passed). The first `draw`
  builds the still layers (about 150 to 250 ms on the sandbox's busy VM unthrottled, 370 to 490
  ms at 4x CPU throttle; give the screen the panel colour `#15111f` behind the canvas so nothing
  flashes); later frames cost 2 to 4 ms (about 12 at 4x).
  `draw(a)` then `draw(b)` paints exactly what a fresh scene's `draw(b)` does.
- **Reduced motion**: `draw(0)` once and never again; frame 0 is a composed still.
- **Stop** the loop and `dispose()` when the title is left; nothing else holds memory.
- Without canvas pixels (jsdom), `draw` works the frame out and shows nothing; it never throws.
- The art knows nothing about saves or players: "Continue", the hero's name and "away 3 hours"
  are lane A's, drawn by the menu over `safe`.

## Hair, beards, the cutlass, doors, the hero at work, for lanes A and C (B13, second PR)

No existing door renamed or re-signed; no constant changed. Added:

```ts
// character.ts / character2.ts
LOOK_CHOICES.hair            // six appended: ponytail, topknot, curly, mohawk, bob, twin_braids
BEARD_CHOICES / BEARD_CHOICES2 // none, stubble, moustache, short_beard, full_beard, braided_beard, mutton_chops
LOOK_CHOICES / LOOK_CHOICES2 // now typed Record<keyof Look, ...>: `.beard` is typed (lane A's look.ts compiles)

// character2.ts: the hero at work
ACTIVITY2_IDS: readonly string[]  // woodcutting, fishing, mining, foraging, cooking, smithing, crafting,
                                  // fletching, alchemy, thieving, melee, ranged, defence, vitality
activityFrames2(activity): number           // 4 or 5 (the blow's 4, the breath's 2); 0 if unknown
activityFrameMs2(activity): number          // suggested ms a frame (130 to 220; the breath 900)
characterActivityPicture2(look, worn, activity, frame, extra = []): Picture2
characterActivity2(look, worn, time, activity, frame, extra = []): HTMLCanvasElement
activityProp2(activity): { picture, foot, at, front } | null
  // draw the prop at (heroX + at.x - foot.x, heroY + at.y - foot.y), heroX/Y the hero's anchor;
  // behind the hero, or over it when `front`; town cells (rasterize with DAY2/DUSK2)

// dungeonArt2.ts: doors as pieces
dungeonDoor2(kind, around?, at?): { picture, dx, dy, covers, light? } | null
  // kind: door_open | door_barred | door_side_open | door_side_barred (the tile ids)
DOOR2_FOOTPRINTS, doorFootprint2(kind, roomWest)
```

- **Activities**: the same 56 x 72 canvas and anchor (28, 70) as every figure, facing right (mirror
  for left if the menu wants it); `frame` wraps; kept like the walk's frames (`forgetWalks2()`,
  `forgetSprites()`). The weapon and shield are put down for the tool; combat's are the blow
  (`characterStrikePicture2`, facing right) and the breath. Memory: the ten posed loops are 41
  frames, 8 KB of cells each (328 KB a look and outfit, kept until `forgetWalks2()`), and 16 KB a
  canvas per time of day (656 KB); props are ten small pictures (about 10 KB in all). Only frames
  asked for are made.
- **Doors**: draw the piece after the room's tiles (it covers the cells in `covers`, offsets from
  the door's cell) and before anything standing, at the door cell's top-left plus (`dx`, `dy`). An
  open door carries glows (its lanterns, the light beyond) in `picture.glows` and `light`, a
  `Light2` in the piece's coordinates: move it with `lightAt(light, x, y)` and light the floor with
  it as a lantern's. A side door is 2 x 3 tiles (its door cell is column 1, or column 0 when the
  room is to the west: pass `around` so it turns), a face's door 3 x 3 (its door cell the bottom
  middle). The tile ids still answer, as the piece's slice over the door's own cell. Memory: a
  piece is 7 KB (side) or 10 KB (face) of cells, kept per door cell.
- **Hair and beards**: drawn in every facing and pose through the existing doors; the cache keys
  include the beard. **The cutlasses** curve the right way in profile behind the same doors.

## Greaves and the beard's key, for lanes A and C (B13, first PR)

- **Greaves**: `bronze_greaves` and `iron_greaves` have item icons (`itemIcon`) and are in
  `ITEM_LAYERS2` (gear ids the same), drawn in every facing and pose (standing, breathing, the
  walk, the blow) and layered over trousers and boots, under skirts, coats and the cloak. Lane A
  can merge the items. The art draws them in its `knees` slot, so the trousers worn (or the
  everyday ones) stay on under them, whatever the game's slot is.
- **The beard's key**: the art's `Look` has `beard?: string`; missing (or an id the art does not
  know) is drawn as `none`. The choices are `BEARD_CHOICES` (`character.ts`) and
  `BEARD_CHOICES2` (`character2.ts`), the same array that is in the table as
  `LOOK_CHOICES.beard` / `LOOK_CHOICES2.beard` at run time, `none` first. The first PR kept
  `beard` out of `LOOK_CHOICES`'s declared type (the menus of the day mapped over its keys); lane
  A's wave 13 reads the parts as data, so the second PR typed it `Record<keyof Look, …>`. `DEFAULT_LOOK` now has `beard: 'none'`.
  Every picture door's cache key includes the beard.
- **For lane C**: `dressKey` in `src/scene/hero.ts` should include `look.beard` (once the look has
  one) so a change of beard redraws the hero in the scene.

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

- **B14: the title screen** (PR #57, merged; this PR). Review sheets in
  `/home/claude/lane-shots/w14-b/`: `title-390.png` (1170 x 2532), `title-360.png`,
  `title-430.png`, `title-2625.png`, `title-land.png`, `title-tablet.png` (each with a mock menu
  in `safe`), `title-before-after.png` (study A beside this, the fixes called out), `title.gif`
  and `title-town-2x.gif` (6 s at the redraw interval), `crop-town-400.png`, `crop-ship-400.png`,
  `crop-logotype-400.png`, `crop-reflections-400.png`, `activities-fixes.png` (each fixed loop
  before and after, and the greaves icons).
  - **The door**: `src/art/title.ts` (`titleScene`, `TITLE_FRAME_MS`), the scene in
    `src/art/title/` (layout, sky, land, buildings, harbour, light, logo, scene, gallery).
  - **What changed from study A**: the hill recomposed round the house (Cody's fault: a broad
    shoulder three times the house's width, a fenced garden, a dry-stone wall, slopes eased off
    the shoulder behind the tavern and smithy, a path in turns to the pier); the three buildings
    each drawn by its own painter at one scale (the study had one generic painter); layers with
    anchors instead of one 390 x 844 bitmap; the sky as flat bands with a deliberate interlock and
    the afterglow behind the town; placed stars; banded halos; the water a column-by-column mirror
    with lit windows as streaks and a calm band for the menu; the logotype trued (7-pixel stems,
    3-pixel hairlines on whole pixels, spaced by shape) and baked.
  - **Five critique rounds** (each listed before fixing): (1) mosaic water, glyph-like window
    reflections, a flat bright hill, many stripy sky bands, thin clouds, too few stars, tiny
    gulls, soft green halos; (2) zigzag reflections from one-row ripple bands, blotchy thatch, a
    stray hedge line, contrail clouds, a bare quay; (3) a pyramid-straight hill slope, thin dark
    smoke, stems sampling 6 or 7 pixels; (4) brick-like ripple faces in the bottom water,
    corrugated zenith bands behind the name; (5) beside the study, the afterglow hidden behind the
    hills and the water too cold; the menu cramped on a phone held sideways.
  - **Performance** (production build, 390 x 844 at 3x, Chromium on this sandbox, whose two cores
    were shared with other sessions all along, so absolute numbers are pessimistic; minimum and
    median of fresh pages): first paint (creating the scene and its first `draw`) 170 / 268 ms
    unthrottled, 368 / 490 ms at 4x CPU throttle (PR #57's code under the same conditions: 523 /
    568 ms at 4x); a frame 2.3 / 3.9 ms unthrottled, about 12 ms median at 4x, so 125 ms frames
    are about a tenth of a slow phone's time. The logotype is baked (sampling its letters took
    longer than the rest of the build); the build's long loops are small functions of their own
    (a long loop in a big function compiles slowly), tables replace per-pixel calls, the mirror's
    fade is a table per row, and the passes that look for lights stop below the last light.
    Memory: the still layer and the frame are w x h x 4 bytes each (1.3 MB at 390 x 844), the
    mirror w x (h - wl) x 4 (0.57 MB), the ripple pattern (h - wl) x 512 bytes.
  - **Size**: the door alone is 64.8 KB minified, 24.4 KB gzipped (the town's palette and cell
    code, about 10 KB gzipped of that, are already in the app); the app's bundle grows from
    703.2 KB to 759.1 KB minified, 246.6 to 266.7 KB gzipped, with the gallery's section.
  - **Tests** (`tests/art/title.test.ts`): seven sizes compose (whole device pixels, the
    logotype inside the canvas, above the town's smoke and above `safe`; `safe` below the
    reflection or beside the town; the water calm under it); the logotype on the dark sky; the
    water mirrors the town within the ripple tolerance (3 pixels) row by row and overall; lit
    windows mirror as light; `draw(a)` then `draw(b)` equals a fresh `draw(b)`; every building's
    foot on ground and the house's shoulder past its walls; the bake equals the drawing; the door
    in jsdom; the gallery section.
  - **Activity poses** (B13's weak list): props moved clear of the front foot (at least 2 pixels in
    every frame, tested), tools landing on their props (the hammer on the glowing bar, the
    needle's thread down to the cloth, the hand into a bramble now tall enough to reach, the hand
    onto the counter; tested at each contact frame), the off hand's basket and shaft held out in
    front, the fishing rod drawn as a rod. Same doors, frame counts and timings.
  - **The greaves icons** redrawn (bronze, and iron with it as their family): a pair in profile
    with a leg's silhouette, straps behind the calf. Same ids and size.
  - **Gallery**: "See the title screen" (first among the drawn-on-a-tap sections) shows it
    animated at 360 x 640, 390 x 844 and 430 x 932, `safe` outlined.

- **B13: Cody's feedback, the art items.** Review sheets in `/home/claude/lane-shots/w13-b/`:
  `hair-4way.png` (every style in four facings and under the helm, before/after for the five old
  ones), `hair-under-gear.png`, `beards.png` (`beards-figure.png`, `beards-portrait.png`),
  `looks-sampler.png` and `looks-sampler-4way.png` (twelve heroes, true size), `cutlass-before-after.png`,
  `weapons-edge-audit.png`, `doors-before-after.png` (the store and a door sample room, landscape,
  the hero for scale), `greaves.png`, `activities.png` and `activity-<skill>.gif` for each skill.
  - **Hair in every facing**: what was wrong: the profile and back views existed, but short, braid
    and shaggy were one cap of hair from the side at true size, under head gear the profile showed
    only the long styles' hang (short hair was bald under a cap; the back view had its own cut),
    long hair vanished under the hood in every facing, and the side view flattened hair laid over
    head gear under it. What changed: one rule for hair under gear (the whole style cut at the
    rim, every facing), hood variants (`long_hair_hood`, `braid_hair_hood`, curls tucked), the
    braid's plait bolder and longer in profile, shaggy's tufts and ragged nape, the back view
    keyed by the hair worn (a style with nothing at the front under a helm still shows at the nape).
  - **Six new hairstyles** and **six beards** (ids above), in the figure's four facings, every pose,
    under helms and hoods, and the portrait. Three critique rounds each: the mohawk's profile (a
    crown of upright spikes read as shaggy; now a swept-back fin, the stubble band that read as a
    headband gone), twin braids in profile (the near braid lay on the cheek like a hand), the backs
    of the curls and the bob (a dark mass; now lit), the stubble (too heavy on the figure, then a
    chinstrap in the portrait, now a darker jaw with a band of the hair's tone), beards over a
    hood's sides (now under the hood above the jaw, over the cape below it), a full beard on an
    eye's white (moved; tested).
  - **The cutlass**: the carry and the blow mirrored it, so carried point down its belly was on top
    and its point drooped; now it turns rigidly (`figure2/edges.ts`), carried with the belly under
    and the point curling up, the belly leading in every blow in every facing. The townsfolk
    captain's blade, which was straight, is curved. Axes keep their bits forward (audited); bows,
    the anchor and straight things unchanged.
  - **Doors**: three-tile pieces (`dungeon2/doors.ts`), lit from beyond or barred behind iron,
    lanterns beside; the sample rooms (`room.ts`) draw them as lane C will.
  - **Greaves** (first PR, #54): icons and layers; on the gallery's ladder.
  - **Activity poses**: all fourteen skills (ten posed, combat's four by the blow and the breath).
  - **Gallery**: hair (every style, four facings, under a helm and a hood), beards (four facings,
    three hair colours, under a helm and a hood), greaves four ways, both cutlasses walking and
    striking, each activity animated with its prop (figure section); the doors in a sample room
    (dungeon section).
  - **Tests**: `hair2.test.ts` (hair in every facing and pose, styles apart in profile and from
    behind, hair below every rim, out of a hood, the portrait; beards in every facing but behind,
    under a helm and a hood, never on an eye, in the portrait in the hair's colour), `edges2.test.ts`
    (each weapon's declared edge in every profile frame), `doors2.test.ts`, `activity2.test.ts`,
    `looks2.test.ts`, `greaves2.test.ts`. **Expectations changed on purpose**: the look choices
    (six hairstyles appended, the beards); the B11 side-door tile test (`dungeonArt2.test.ts`) now
    looks for the light beyond and the dark behind the grille instead of the B11 beam; the walk's
    profile test excepts the beard slot (beards have their own profile drawings, tested); the
    portrait tests run the new styles too (on one skin for the long face test, which now has 240 s).

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

- **Not done in B13**, and why:
  - **Activity poses facing left or toward the camera**: side-on right only, as asked; a menu can
    mirror the frame and the prop (the hands swap, which a menu will not notice).
  - **Hair and beards from behind under a hood**: inside the hood (as it would be); long hair
    shows from the front and in profile only.
  - **A topknot and a mohawk under a closed helm** show only what is below the rim (the nape), as
    they would; under a brim the topknot is hidden too.
  - **The foes' cutlasses** (the smuggler's, Brinebeard's): their own drawings, not turned by the
    hero's rules; they read as cutlasses and were left.

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

- **Lane C, for B17** (third PR; nothing breaks if you wait):
  - The boat lantern's pennant stirs: draw `town2PieceFrame('boat_lantern', Math.floor(now /
TOWN2_PIECE_FRAMES.boat_lantern.frameMs))` where `BOAT_LANTERN` draws `town2Piece`; size,
    foot and base are the same every frame.
  - If the boat ever bobs: its painter now ends in an iron ring in the top rows of the rowboat's
    picture (rows 0 to 8, about column 124), standing for a ring in the quay wall. Bobbed with
    the boat it would bob with it: keep those rows still, or tell lane B and it moves to a piece
    of its own.
  - `townHighlight2` carries glows round its line at dusk. `cellPixels` clears every empty pixel,
    so in the scene only the line itself brightens; to show the soft light on the ground round it,
    add the ring's glows the way the scene adds the lamps' (or paint it without clearing the
    pixels a glow falls on).
  - `townMarker2(kind, frame, 'medium')` is there if the small marker is too quiet near the hero
    (22 x 23, anchor `{ x: 10, y: 22 }`); `MarkerSize` in `fromLaneB.ts` would gain `'medium'`.
- **Lane A, for B17** (third PR): nothing. The redrawn icons keep their ids and size; the
  title's composition changed (the ship, the hill, the gulls), its doors and safe box did not.
- **Lane A, for B17** (all optional; nothing breaks without them):
  - Show `modifierIconFor(modifier.effects)` (or `modifierIcon(id)`) beside each daily modifier,
    `challengeIcon(id)` beside each challenge with `challengeMedal(state)` for its state, and play
    `challengeMedal('new', f)` for f 0 to 5 at `CHALLENGE_MEDAL_FRAME_MS` when one is first met.
    On the results card, `dungeonSeal(id, tier)` (rasterize with `DAY2` through `pixelCanvas2`).
  - The "now doing" strip for an idle dungeon run: activity id `'dungeon'` (`ACTIVITY2_IDS` has
    it); `atWork.ts` needs nothing new, as the boat is a prop like any other.
  - When `DUNGEON_MODIFIERS` and the challenges land, `tests/art/dungeonIcons2.test.ts` checks
    every id gets a fitting icon; a new id whose words fit no kind fails it until lane B adds a
    word or a picture (or name the modifier by what it does).
- **Lane C, for B17** (second PR): `characterThreeQuarterPicture2(look, worn, frame)` is a turned
  standing hero for the town's idle (frame 0 standing, 1 breathing, as `characterIdlePicture2`),
  on the same canvas and anchor; use it when he stands still facing right (mirror for left). The
  blow's frames now carry their own arc and flash: your glint can stay or go.
- **Lane C, for B17**:
  - On the chart: `dungeonSeal(id, 'cleared' | 'all-challenges')` beside a cleared landing's
    marker (anchor the disc's middle), and `chartPennant2(frame)` 6 to 10 pixels left of the marker
    of a landing with a modifier today, stepping every `CHART_PENNANT2_FRAME_MS`.
  - `townPointer2` takes the four diagonals: when the boat is off a corner of the screen, point
    `'up-left'` etc. rather than snapping to an edge (anchor diagonally past the tip).

- **Lane C, for B16** (nothing breaks if you wait; all drawing):
  - Float the boat's marker large: `townMarker2('travel', frame, 'large')` (29 x 30, anchor
    `{ x: 14, y: 29 }`, the keyline under its tip) with its anchor 2 to 6 pixels over the boat's far
    gunwale (about y 1474 at x 520 with the boat at its placement; `BOAT_MARK` (520, 1486) puts it
    down inside the boat), at least while the hero is more than about four tiles off; your
    `MARK_BOX` (14 x 16) is the small's, so the hero-overlap test wants the large's box for it.
    The sparkle beside it (`new`) can go large too, about 18 to the right.
  - While the boat is off the screen, `townPointer2(direction, frame)` at the screen's edge on the
    line toward it: `'left' | 'right' | 'up' | 'down'`, 16 x 17 (17 x 16 up and down), anchor the
    point just past its tip at its furthest frame, so put the anchor a few pixels inside the edge.
    Frames and timing as the markers'.
  - **Old Snapper's box and shadow**: centre his tap box and contact shadow on
    `feet.x + mid * (facing === 'right' ? 1 : -1)` when `size.mid` is set (only he has it). His box
    is now 84 wide (was 67): centred on his feet, as now, it would reach 42 ahead of them, over a
    hero at the stand, so please wire `mid` with it. In `fightFigures` (`fightArt.ts`) `half` comes
    from `box.w`; with 84 his `back` there is `min(56, 50)` = 50 (was 41.5): drawing-only spacing,
    but you may prefer `half = box.w / 2 - |mid|` to keep it as it was.
  - The ring's picture is two pixels wider and taller than before (keylines); its anchor is still
    its middle, so `ringOf` and the drawing need no change.
  - Nothing to do for the boat, lantern, sign, ferryman, tide-pool glows (they carry their colour
    as `glow.rgb`, which lane B's `addGlow` honours) or the chart (`unknown_2` moved; keys kept).
- **Lane C, for B15's second PR** (Cody's point about the boat; nothing breaks if you wait):
  - Place the ferryman (`'ferryman'`, a standing townsperson; suggested tile (17, 59), facing down),
    `boat_sign` (suggested foot (444, 1413), one tile solid) and `boat_lantern` (in the boat, at
    `ROWBOAT_LANTERN_AT`, bobbing with it, glow at dusk); give the ferryman and the sign words.
  - Float `townMarker2('travel', frame)` over the boat always, and the other kinds over what is
    usable near the hero; lay `townHighlight2(w, frame)` under the nearest usable thing.
  - The rowboat's redraw needs nothing: same id, size and base.
- **Lane A, for B15's second PR**: nothing (the ferryman's face is in `portrait2` if a menu wants it).

- **Lane C, for B15's first PR** (the tide-pool cave and the chart):
  - Build the tide-pool cave's rooms on the same tile kinds (rows in your key as the grotto's) and
    draw them through `dungeonTheme2('tidepool')` (or each door with a trailing `'tidepool'`):
    tiles, door pieces, `lightGround`, and rasterize ground, props and foes with `CAVE_TIDEPOOL`;
    the hero from `characterSprite2(look, worn, 'day')`. The light: each open door's `light`, each
    `light_shaft`'s and the `cave_mouth`'s, moved with `lightAt`; no lanterns. Every glow there is
    `always`, so `litBy` lights walkers by day too.
  - Old Snapper: `foeSprite2('old_snapper', pose, facing, frame, 1, CAVE_TIDEPOOL)` at (x −
    feet.x, y − feet.y), sizes from `FOE2_SIZES.old_snapper`; `windup` while his snap is marked
    (it is drawn as the plainest telegraph in the game), `strike` as it lands; `portrait2` as every
    face. The sand crab's canvas grew (above): take its feet from `foePicture2` as before.
  - The chart: `harbourChart2()` in the boat's panel, markers by state at `landings[id]`, emblems
    beside them (silhouettes while locked), the dotted route and the boat token. Words are yours.
- **Lane A, for B15's first PR**: `activityHitFrame2(activity)` replaces `LANDS` in
  `src/ui/atWork.ts` (null for `vitality`). If `old_snapper` joins the tables, its portrait is
  already there.

- **Lane A, for B14**: wire the title screen (top of this file): `titleScene(innerWidth,
innerHeight, devicePixelRatio)` in a full-screen container with `overflow: hidden` and the panel
  colour behind it, the menu laid out inside `safe` (it may be beside the town on a wide screen),
  a 125 ms `draw` loop from `requestAnimationFrame`, `draw(0)` once under
  `prefers-reduced-motion`, a new scene on resize or rotation, `dispose()` on leaving. Nothing
  else is needed from lane A; the activity doors and the greaves' ids are unchanged.

- **Lane C, for B13** (nothing breaks if you do nothing):
  - **Doors**: draw `dungeonDoor2(kind, aroundOf(kinds, col, row), { col, row })` for every door
    cell after the tiles and before anything standing, at `(col * 24 + dx, row * 24 + dy)`, and
    add its `light` (moved by `lightAt(light, col * 24 + dx, row * 24 + dy)`) to the room's lights
    and its `picture.glows` to the glows, as the sample rooms do (`dungeon2/room.ts`). Walkability
    is unchanged: the door is still its one cell; the piece's other cells are rock (a side door's
    cell beyond the room may be off your map; draw it anyway or clip it).
  - **The hero's key**: `dressKey` (`src/scene/hero.ts`) should include `look.beard`, so a change of
    beard redraws the hero in a scene.
- **Lane A, for B13**: `LOOK_CHOICES2.beard` is now typed; your `look.ts` already reads it. For the
  idle menu's animation next wave: `characterActivity2` / `characterActivityPicture2`,
  `activityFrames2`, `activityFrameMs2`, `activityProp2` (above); the activity ids are the skill ids.

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

- **Weak list (B17), honestly**, weakest first:
  - Standing turned is the front figure warped row by row, not a drawn three-quarter: the face is
    narrowed on the far side and widened on the near, but the nose and mouth do not come round,
    so close up it reads as a front face squeezed; at true size it reads as turned.
  - The ship on the title still crosses the smithy's left corner with its backstay and shrouds,
    and its hull now stands in front of the pier's end at every width; its black flag sits on
    the dark hill and reads by its shape more than its tone.
  - The lying troll's flung arm reads as three pale blocks (upper arm, forearm, hand) more than
    one limb; the head and the body are still one green at dusk.
  - The light shaft without its glows is streaky and a little clumpy where streaks meet; with its
    glows it reads as a beam.
  - The creature strikes: the forefoot "off the ground" is the leg drawn shorter (no paw lifted
    and bent); the crabs', the parrot's and the wyrm's strikes are as they were.
  - The ferryman's leant oar steps a pixel every five rows and its blade crosses his front shin.
  - The tide-pool weed strands all lean the same way; in a thick patch they read as hatching.
  - Toward and away, the feet still slide a little (the stride and the frames cannot change).
  - The greaves icons read as greaves beside their family; alone, two small segmented plates. The
    bowstring's coil still reads a little like a basket (not redrawn: the five chosen read worse).
  - The wolf at dusk is lighter but still a mid grey on a grey floor; the gulls are bigger but
    still small against the sky.
  - The medium marker was judged on stills pasted over the town, not in motion in the scene.
- **How B17 was iterated**: `.shots`-style vitests under the scratchpad (node environment,
  `before/` a copy of `main`'s `src`) rendering every frame and every piece to PNGs, composed into
  sheets with Pillow; the title as `TitleScene(w, h, 3).frame(ms)`; Playwright on a production
  build at 360 x 760, 390 x 844 and 844 x 390 for the title as the phone shows it.
- **Weak list (B16), honestly**, weakest first:
  - The large marker and the edge pointer are not in the game until lane C wires them; they were
    judged on mock-ups pasted into real-game screenshots at true size, not in motion in the scene.
  - Old Snapper's box is 84 wide from this PR, but lane C still centres it on his feet until it
    reads `mid`: until then it reaches 42 ahead of his feet, over a hero at the stand (a tap there
    targets him). The shadow likewise stays forward until wired.
  - The boat's mooring line ends at the top of the boat's canvas: the quay's ring is above the
    piece, so the line reads as going up to the quay, not tied to a ring you can see. The pennant
    does not stir (no wind frames); the boat still does not bob (lane C's).
  - The tide-pool walls are better than coursed stone close up but still mostly horizontal; the
    worn lumps within a bed are slab-like at 5x; weed strands can read as drips.
  - The light shaft's dither reads as a screen door when enlarged; at true size it reads as a beam.
  - The small markers are still 14 x 16: the leaf's glint is three pixels at true size.
  - From behind, the ferryman's sou'wester now reads as a rounded rain hat rather than a cone, but
    plainly; walking across, his oar still passes in front of his chin (he is meant to stand).
  - On the chart, the thatched house's chimney is a blob of outline; the sea serpent is still small.
- **How B16 was iterated**: `.shots/` vitests (node config) rendering composites over the town
  picture and the tide-pool room, `before/` from `git archive origin/main src/art`; real-game
  screenshots from a production build of a hooks page under `.shots/` (`import '../src/main'` first,
  then the scene hooks: imported the other way round, the dev server hits a module cycle) served
  statically, the boat's screen position read from `hh.toScreen` to paste mock-ups; Pillow sheets.
- **Weak list (B15), honestly**, weakest first:
  - Old Snapper's contact shadow is centred on his feet point, which is ahead of his shell's middle
    (placed so a hero at the stand is not drawn over him), so a scene's shadow sits a little forward
    under him; and his tap box (measured, 67 wide, centred there) leaves his tail out. A shadow
    offset in the sizes would mend both; not added, as the table's shape is shared with lane C.
  - The tide-pool walls' beds still read a little like coursed masonry from close up (regular
    horizontal joins); at true size they read as layered rock. The rock's top seen from above is
    plain.
  - `light_shaft` is light only (glows and motes): on a scene that does not add glows it shows as a
    slit and a few dots. Its floor pool needs `lightGround2(…, 'tidepool')`.
  - The ferryman's sou'wester from behind reads as a cone; walking across, his oar passes in front
    of his chin (he is meant to stand).
  - Markers are small (14 x 16 art pixels, 42 device pixels on a 3x phone): legible over cobbles and
    sea, but `gather`'s axe is the least clear; the ring's dashes on the sea can be taken for foam.
  - The chart's town at home is a few pixels of roof; the `unknown` marker at the western islets
    sits over the islet's edge; the sea serpent is small. The kelp heap has a hole in it.
  - The open side door's rock surround past the room's edge is limited to rows 9 to 62 of the piece
    (what lane C's scene shows), so its ragged edge is short above and below.
  - Glows from `always` lights (the shafts, the cave's mouth, open doors) are the town lamp's warm
    colour, not a cooler daylight: the shafts read as late-afternoon sun.
- **How B15 was iterated**: `.shots/` vitests in a node config (`.shots/vitest.config.ts`,
  `environment: 'node'`) wrote PNGs with a small zlib PNG writer, composed into sheets with Pillow;
  the grotto was held to `main` by hashing grids from a copy of `main`'s `src` in `.shots/before`.
  Move `.shots` to a name that does not exist before `npm run check` (a scratch folder of the same
  name nests it).
- **A new dungeon theme** is a `TileLook` (`dungeon2/tiles.ts`: textures by floor kind, the faces,
  the materials joins use, its details), door painters (`tideDoors.ts`) chosen in `placeDoor2`, a
  light scheme in `light.ts`, props under new ids, and a palette in `cave.ts` (new ramps appended to
  `CAVE_BASE`, never inserted: ids must not move).
- **A new townsperson** is a `Folk` (front, `figure2/folk.ts`, and `FOLK_RIGS`), a `SideDress`
  (`sideFolk.ts`), a back (`folkBack.ts`: `HEADS`, `BEHIND`, `IN_FRONT`), a face (`FACES2`) and its
  safe box; `tests/art/figure2.test.ts` lists the ids.

- **Weak list (B14), honestly**, weakest first:
  - First paint is the slowest thing on the title: 170 to 270 ms unthrottled on this busy
    sandbox, about 370 to 490 at 4x. The rest of the cost is the size-dependent land and the
    water's mirror; baking the three buildings, the ship and the pier like the logotype would save
    roughly another 40 to 50 ms (they do not depend on the screen), at about 6 to 8 KB gzipped of
    data and a re-bake whenever one is redrawn.
  - The ship's rigging and black flag cross the smithy (at 360 pixels across there is no room to
    put the ship clear of it); the flag reads poorly against the slate.
  - The hill's face between the tavern and the smithy is still a large, quiet area of grass:
    terraces, shrubs, a hedge and stones, but no second feature.
  - Lamp reflections near the quay wobble into small hooked shapes at 4x; at true size they read
    as light.
  - The house is smaller than the tavern by distance, but the three buildings are not at one
    perspective: each is a front elevation (the town's convention), so the hill's house shows no
    more roof than the quay's.
  - Gulls are 9 pixels across: right for the distance, easy to miss.
  - On a phone held sideways the scenery beyond the town is woods, ridges and a rocky shore made
    from functions of distance; it is plain next to the town.
  - Activity poses: the off hand's basket is in front now but small; the fletching knife reads at
    true size only in motion.
  - The greaves icons read as leg armour now, but at true size the pair can read as a pair of
    boots.
- **The title scene's pieces** are in `src/art/title/`: layout (anchors and `safe`), sky, land,
  buildings (each building's own painter), harbour (ship, pier, buoy, gulls, flag, lamps), light
  (banded halos), logo and logoDraw (the bake and its drawing), scene (build once, frames as a
  function of time). A new building is a painter returning a `Building` (outlined grid, halos,
  flickering pixels, chimneys); place it in `PLACE` (`scene.ts`) on painted ground. To change the
  logotype, edit `logoDraw.ts` and run `UPDATE_LOGO=1 npx vitest run tests/art/title.test.ts`.
- **How it was iterated**: a `.shots/` vitest (node environment, its own config) renders frames of
  `TitleScene` to RGBA files that a Python script turns into PNGs, crops and GIFs, far quicker
  than the browser; a scratch page under `.shots/` served by `npm run dev` (and a production
  build of it, for timing) is screenshot with Playwright at the phone sizes with a mock menu in
  `safe`. Timings on this sandbox swing with other sessions' load: compare against the previous
  code interleaved, and report minimum and median of fresh pages.

- **Weak list (B13), honestly**: the activity props sit close to the hero's front foot and the
  tools land a little short of some of them (the smith's hammer, the needle above the bench); the
  off hand is mostly behind the body, so the basket and the shaft show little; the fishing rod is a
  plain line. The side door's opening is wider on screen than its walkable cell. The bronze greaves'
  icon reads a little like a pair of vases. Stubble on the figure is a few dark pixels on black
  hair. The twin braids from behind are short stubs over the shoulders. Curly hair under a helm
  bulges wide. The mohawk's front view relies on the shaved temples' stubble tone.
- **Hair**: a new style is a `HairDrawing` in `figure2/hairStyles.ts` (front, side, back, and
  optionally what falls out of a hood, or `tucked`); its under-gear versions are made by the rim
  rule. Add the portrait's crown in `dungeon2/heroHair.ts` and the id to `LOOK_CHOICES.hair`.
- **A new asymmetric held thing** declares its edge in `figure2/edges.ts`; `edges2.test.ts` holds it.

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
