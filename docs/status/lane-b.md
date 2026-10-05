# Lane B: art

**Next session: B6: Dungeon tiles and monster sprites; what B5 did not reach** (brief to come in
`docs/lanes.md`, wave 6).

## Icons, for lanes A and C (`src/art/icons.ts`)

`itemIcon(id)` and `skillIcon(id)` return a `<canvas class="pixel-art icon">` (aria-hidden: the name
always sits beside it) showing the thing's 24 × 24 icon at 32 CSS pixels, a whole number of device
pixels per art pixel (`iconScale(dpr)`: 4 at 3x, 3 at 2x, 1 at 1x). Every item in
`src/data/items.ts` and every skill in `src/data/skills.ts` has one, and so do the combat skills
`melee`, `ranged`, `defence` and `vitality`. S8's drops and leather set have theirs as of B5.
Any other id (S9's bounty-shop items, which art has not seen yet) is null, never an error. Also exported: `itemIconPicture(id)` and
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

## Portraits, for lanes A and C (`src/art/portraits.ts`)

`portrait(id)` gives a face for the eight monsters (`dock_rat`, `sand_crab`, `thieving_gull`,
`bramble_boar`, `footpad`, `grey_wolf`, `smuggler`, `marsh_troll`) and the three townsfolk
(`smith`, `trader`, `pirate`), and null for anything else (S9's bounty-only monsters are next
session's). The element is a `div.portrait-art` holding two canvases, the face at 3 and at 2 CSS
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

- Icons, worn layers and portraits for S9's ids (bounty-shop items, the two bounty-only
  monsters): B6, once they are on `main`. Until then `itemIcon` and `portrait` answer null.
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

- Nothing. (`.card-head` is centred as of PR #24.)

## Notes for this lane's next session

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
- Real-game screenshots: seed `localStorage['hearth-and-harbour:save']` with a version 6 save
  before load (`equipment` by slot, `{ item, qty }`), then drive the tabs. The town's hero starts
  in the square; taps about 55 CSS pixels either side of the canvas's centre and 45 above it
  land on open cobbles and turn him each way. Combat is Skills, then a combat skill's row.
- Scratch renders: a vitest file under `.shots/` with its own config (environment `node`) can
  rasterize pictures and write PNGs without a browser, which is much faster for iterating on a
  sprite than the gallery. `eslint .` lints `.shots/` too (it does not read `.gitignore`), so
  move the folder aside before a local `npm run check`. For "before" pictures, extract `main`'s
  `src/art` (`git archive origin/main src/art`) into `.shots/` and render from that copy.
