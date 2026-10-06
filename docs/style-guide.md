# Art Style Guide: Hearth & Harbour

Status: approved by Cody 2026-10-04 (session S0). The reference picture is the town mock-up, whose
full drawing code is `docs/art-reference/town-mockup.html`: the source to harvest the pixel engine,
palettes and figures from. ("Gullwick" is the town's placeholder name.)

## The look in one line

Bright, confident pixel art for grown-ups: heroic rather than cute, colourful rather than grim, with
a dusk mood for evenings and dungeons.

## What was chosen, and what was ruled out

- **Pixel art**, not cartoon/vector. Chosen direction was "X1 Heroic" for day and "X2 Dusk" for
  evening.
- **Not cute.** Ruled out: big heads, blush, dot eyes, chunky 8×12 sprites, rounded toy-like
  buildings. Cody: "fun vibe but not looking like a kids game."
- **1.5× detail** for everything in the world. The first, smaller size (20×34 figures) did not carry
  enough expression.
- **2× portraits** for close-ups, where expression matters most.

## Sizes

| Thing                                                   | Size (art pixels)                                 |
| ------------------------------------------------------- | ------------------------------------------------- |
| One phone screen, portrait                              | 270 wide × about 360 tall                         |
| Person                                                  | about 30 × 47, on a 38 × 48 canvas so weapons fit |
| Head                                                    | 10–12 wide; eyes are 2 px each                    |
| Item icon                                               | 24 × 24                                           |
| Portrait (dialogue, character sheet, idle-combat enemy) | 48 × 48, shown at 3×                              |
| Small prop (crate, barrel)                              | 11–13 wide                                        |
| Building                                                | 96–150 wide                                       |

Scaling: art pixels are always drawn at a whole number of device pixels (on a typical phone, 4
device pixels each). Never scale by a fraction. A canvas is also padded, by under one CSS pixel on
most phones, so its CSS size is a whole number: browsers stretch a canvas whose CSS size is
fractional by a hair, and that blurs it.

## The C scale (chosen 2026-10-05; drawn in B7, not yet swapped in)

After the scale study (four options on the same corner of town), Cody chose **option C** as the
base for the whole game: "the details are great. For the town especially." The new town is built
alongside the current art in `src/art/town2/`; the live game still uses everything above and below
this section until lane C switches the scene. What made the difference, in Cody's order: buildings
to scale; every element shaded as a solid; cast and contact shadows; six-step ramps with cool
shadows and warm lights; outlines in each material's own darkest tone.

### Sizes at the C scale

| Thing                      | Size (art pixels)                                                       |
| -------------------------- | ----------------------------------------------------------------------- |
| One phone screen, portrait | 360 wide at least (3 device pixels each; a 390-wide 3x phone shows 390) |
| A metre                    | 38 (`METRE`, `m()` in `src/art/town2/scale.ts`)                         |
| Person                     | about 64 tall (1.7 m)                                                   |
| Door                       | about 76 tall, 40 wide (2 m × 1.05 m)                                   |
| Storey                     | 110 to 130 with its floor and beams                                     |
| Tavern; smithy; your house | 593 × 412 (five bays, sign and chimney); 485 × 301; 358 × 286           |
| Barrel, crate              | 24–27 wide                                                              |
| Street lamp                | about 120 tall                                                          |
| Pine; oak                  | 200–276 tall (5.2–7.2 m), three kinds; 238 × 260                        |
| Walking tile               | 24 (a person is 2.7 tiles tall)                                         |

Everything is laid out in metres and drawn natively at the size it is seen: nothing is scaled up
from a smaller drawing. A thing's size comes from its real size (`m(2.0)` for a door), not from a
pixel count picked to look right.

### Light, ramps, shadows and lines at the C scale

- **Light** comes from the upper left and a little in front. Every element is shaded as a solid:
  domed cobbles, scalloped roof tiles with each course shading the next, slates with a hard line
  under each course, timbers with a lit edge, a shadow edge and grain, stone blocks lit on their top
  and left, barrels, posts and trunks as cylinders, foliage and rocks as lumps lit by a bevel worked
  out from their shape (`bevel` and `solid` in `cells.ts`).
- **Ramps** (`src/art/town2/ramps.ts`, the only file that names a C-scale colour) have six steps and
  a line: step 0 a glint or sunlit edge, 1–2 the lit side, 3–4 the shadow side, 5 the deepest
  shadow, 6 the line. Lights lean warm (toward yellow), shadows lean cool (toward blue-violet).
  The base colours go through the game's own day and dusk shifts, so the new town keeps the
  approved palette's character. A cell is a material and a step, so a shadow is cast by darkening
  whatever is underneath by a step or two, never by painting a grey over it.
- **Cast shadows** go down and to the right: under eaves, jetties, sills, shutters, porch hoods and
  signs; timbers onto plaster; a chimney onto the roof; each pine tier onto the one below; a
  building's wedge on the ground to its right. **Contact shadows** sit right under every foot,
  post and step (two steps darker in the row they touch). Shadows on the ground are the ground's own
  steps darkened, so they work on grass, cobbles, sand and water alike.
- **Outline rule**: each separate object gets a one-pixel line in the darkest tone (step 6) of the
  material it goes round (`outlined`), never one ink. Smoke and the flat net have no line.
- **Large flat areas are broken up without noise**: render in broad soft patches a step either way,
  stains running from window sills, hairline cracks lit on their lower lip, a patch where the
  plaster has fallen and the stones show, damp rising at the plinth. No per-pixel speckle.
- **Moss is cushions**: small domes lit top left with a dark underside where they meet the roof,
  gathered low on the slope and along hips. Never single dashes.
- **Pines are tiers of drooping boughs**: each bough's upper face lit (most on the sun's side), its
  underside in shadow, its tips drooping to points, each tier casting a band of shadow on the next.
  No two tiers alike (B9, after B7's read as chevrons): each has its own gap from the one above, and
  each side of it its own reach, droop and number of needle clumps; now and then a bough is broken
  short. The three pines differ in kind, not only size: a full even young tree, a short wind-bent
  gappy one, a tall old one with heavy drooping boughs.
- **The oak is masses on limbs** (B9; B7's crown was one round mass): wide, nearly level limbs from a
  fork, leaf masses at their ends at different heights, light through between them and through
  holes in them, the limbs showing in the gaps. Each mass is a heap of small leaf domes lit from the
  upper left, darker below and to the right and where it tucks behind a nearer one.
- **No ordered dither on grass or water** (B9): at game scale a Bayer dither shows as an even fine
  texture, like cloth. Where two steps meet on a large ground, the edge breaks into clumps a few
  pixels across (`clumps`, `clumpRound` in `texture.ts`), stretched sideways on water so it reads as
  ripples. Shadows on grass and water break the same way.
- **Grounds have structure people made** (B9): the square has ways worn pale by feet from each door
  to the well and down to the pier, cart ruts from the road's mouth to the cargo, a drain across it
  into the gutter (so it reads as fields of cobbles, not a sea), patches mended in granite setts,
  moss in the joints along its edges, puddles in its hollows showing the sky, leaves blown against
  its kerbs. The street has stones along its paths, a trodden way to the grove and stumps in it,
  drifts of wild flowers (a plant is a dark clump with two or three heads), long grass in clumps
  against posts and rocks, stones lying in twos and threes, a garden bed by your door. Each is
  placed by hand in `town.ts`, never scattered by noise.
- **The ship and the rock** (B9): the ship has a stern castle (three gilded windows, a gallery, a
  taffrail with balusters, the stern lantern), shrouds with deadeyes and ratlines, a furled sail
  gathered in bunches, worn and salted planking with rust under the ports. The rock is planes
  (each facet lit by which way it faces, its edges a lit lip or a dark crack), its face on one broad
  plane and unchanged, dark and weeded below the tide line with barnacles above; the wreck's ribs
  are as tall as the rock, with planking still on them.
- **Each building has its own materials**: the tavern timber, plaster and red tile; the smithy
  rubble with cut quoins, slate and an oak lintel; your house limewash, thatch and blue paint.
- **Signs read at game scale**: pictures on painted boards (a gull over an anchor, a horseshoe)
  and the signpost's words in a three-by-five letter set cut into the wood.

### Dusk at the C scale

The same drawing in the dusk shift, as before. Windows drawn in `glass` light up (warm, brightest at
the reflection band); windows drawn in `pane` stay dark, so not every room is lit; lamps (`lamp`)
light and glow; the forge glows by day and more at dusk; `fire` never shifts. Ground shadows are
**longer at dusk** (the town is composed per time of day: a building's wedge reaches about three
times as far, trees' shadows stretch to the right), and the dusk shift leans them plum-cool.

### Figures at the C scale (B8; not yet swapped in)

The hero and the townsfolk redrawn for the C-scale town, beside the current figures
(`src/art/figure2/`, door `src/art/character2.ts`). Cody chose the study's H2 head ("Let's go h2,
with whatever enhancements you see fit"); what follows is what it was drawn to.

- **Canvas and anchor.** A figure is 56 × 72 art pixels, outline included. Its skull is centred on
  column 28 (its face a column right of that since B9); the soles' outline is row 70, the lowest row
  drawn; row 71 and the outer columns stay empty. The anchor, where a figure stands, is (28, 70): the middle of the soles. Every
  part is drawn a pixel inside the canvas so the outline always fits. Figures face right as drawn;
  mirror for left.
- **Proportions.** About 64 pixels tall, 4.6 heads: hair top at row 6, jaw at row 19, shoulders 22 to
  25, belt 36 to 38, crotch about 44, soles 69. The head is 13 wide and 14 tall, round, with ears;
  the jaw (7 wide) is wider than the neck (5).
- **The face, by hand.** Brows one skin row above the eyes; eyes three wide with a skin column
  between them and the nose: a lid line over the outer and inner corners, the iris in the middle,
  two rows tall (its top cutting the lid line), whites either side. The study's H2 had two-pixel
  eyes with the iris on the inner side, which read as cross-eyed enlarged; centring the iris and
  opening it to two rows is what fixed it (the eye tests hold it: mirror-symmetric about the face's
  centre line, column 29 since B9, irises at columns 26 and 32). A nose lit on its left, a three-pixel mouth, no blush. Only a
  deliberate patch (the captain's) breaks the mirror.
- **Hair** is drawn in `hair`, a pixel proud of the skull, and split as before into a crown (what
  head gear covers) and what hangs (locks, a braid, the nape), so under any helmet or hood only the
  hang is worn. Long hair hangs as a curtain beside the face, in vertical strands, onto the
  shoulders. Hair never covers an eye or a brow.
- **Brows on every look.** Brows are drawn in `brow` and take the look's hair colour at the step that
  stands clear of its skin (a contrast of 1.6 at least): the hair's own dark steps on fair skin,
  darker ones where hair and skin are close in value (blonde on fair, dark brown on deep), lighter
  ones where the hair is lighter than the skin (blonde or grey on brown and deep skin).
- **Light, ramps and lines** are the C scale's (seven-step ramps in `town2/ramps.ts`, figures' ones
  appended there; lit from the upper left; each thing outlined in its own darkest step). A part
  lying over another casts one step of shadow just below and right of its edge; a fist never takes
  one, so it always shows whole.
- **Hand-placed, with one assist.** Faces, hands, hair and every piece of armour and metal are rows of
  characters, each pinned to a material and a step. Cloth alone may be roughed in by `cloth()` (a lit
  edge, a field, a shadow third, folds laid as unbroken lines with a lit lip) and is then corrected
  pixel by pixel. Folds go only where cloth is pulled or gathered (below a belt, at the knee, down a
  skirt from the hips), widening as they fall. Plate is never bevelled automatically: each plate has
  a white specular where the light strikes it, a ridge between its lit and shaded facets, and a dark
  lower edge where one lame overlaps the next.
- **The stance.** The weight on the near leg (the viewer's left), that hip a row higher (the belt
  tilts, the hem hangs a row lower on the other side), that shoulder a row lower, the far leg eased
  with its knee in and its foot turned out. The far hand rests on the hip, the elbow out; the near
  arm hangs a little out from the hip, its hand closed on what it holds or, with nothing held, open
  and easy where the fist would be (B9: B8 rested it on the belt, which with the other hand on the
  hip read as both hands at the waist). Both poses share the whole arm, so every sleeve, bracer and
  vambrace is drawn once (`hold` marks them).
- **The three-quarter rule** (B9). Figures face right as drawn, a little turned toward it: the
  face's centre line is a column right of the skull's (`FACE_AXIS`, 29), so the near cheek shows
  more, the far ear is hidden behind the far cheek, and nose, mouth and chin sit a column over; the
  near shoulder is a pixel broader. The eyes still mirror each other, about the face's own centre
  line, irises at columns 26 and 32, so the gaze stays straight out. Anything worn that is drawn to
  the face, not the skull (a helm's nasal, a hood's opening), moves with it; hair and the rest of
  head gear follow the skull. The body stays square, because every wearable is fitted to it;
  townsfolk faces are turned row by row (`turnRow` in `folk.ts`).
- **Bronze** (B9) is an old metal's colour: a warm cream glint over a dull brass-brown, its shadows
  going olive-brown, darker than blonde hair at every step and apart from every hair colour, from
  gold and from the hunter's tan (measured in `tests/art/figure2.test.ts`). B8's pale yellow read as
  gold and sat on blonde hair.
- **Folds belong to the garment** (B9). No two garments share a set of folds: a fitted tunic is
  pulled taut over the raised hip and hangs slack on the far side; loose linen blouses over its
  belt in short sags; stiff leather creases across at the knee rather than folding; a full skirt
  fans out from whatever pushes it (a basket on the hip), a slim one hangs in one long fold and one
  that starts at the knee; an apron gathers under its tie; a heavy coat parts its skirts and drags
  toward a weighted pocket.
- **Mail catches light by the body under it** (B9), not row by row: a bright patch high on the
  chest, a few rings at a glint, darker under the chest and the arm, the skirt hanging in two folds,
  and here and there a ring set crooked a step darker, so no row is a perfect repeat.
- **The hand rule at this size.** The fist is 5 × 5 (thumb over the top, knuckles, two rows of
  fingers) at columns 14 to 18, rows 39 to 43; every grip is two columns (15 and 16) under it. A held
  thing shows directly above the fist (a guard, a haft, a binding) and directly below it (a pommel, a
  butt), lies on one straight line through the grip leaning out one column every six to nine rows,
  and passes left of the forearm, which comes into the fist from above and to the right, so the
  forearm is never hidden. A shield is strapped to the far forearm and hides the hand on the hip; a
  spyglass is held in that hand with the fingers drawn over it.
- **The ladder still reads at a glance at true size**: linen (no metal, nothing held), leather (tan,
  laced, a bow, a quiver), bronze (a domed cap, a hide jerkin with one disc, a plank buckler, a short
  leaf blade), iron (a conical nasal helm, mail in offset rows of rings, a heater, a sword above the
  head), the knight (polished plate, pauldrons of three lames, the red cloak, the kite shield, the
  long sword to the top of the canvas). Shields grow buckler → heater → kite; blades reach higher.
- **Townsfolk** are each a person of their own, drawn whole, told apart by silhouette first, then
  dyes, then something in their hands: the smith (bald, bearded, leather apron, a hammer hanging head
  down), the trader (a green headscarf, a violet dress, a basket on her hip and an apple offered on
  her open palm, out from her side), the captain (tricorn, patch, red coat, a hook, a turned wooden
  peg, his cutlass point down), the alewife (a broad bun low at the back, a madder dress, a dulled
  cream apron, a tankard), the market woman (a braid, a knotted ochre shawl, a flat basket of loaves
  and apples on her head, steadied by her raised arm), the docker (a flat cap, a waistcoat, a sack
  of grain on his far shoulder, its neck in his raised hand), the old man (stooped a head lower, a
  long grey beard, a stick). Auburn is deeper and redder than the study's, so it no longer sits on
  golden skin at the same value.
- **A gesture must read at true size** (B9): a gesture is a shape against the street, not a few
  pixels on the figure's own clothes. B8's apple at the trader's chest, the market woman's hand at
  her knot and the docker's folded arms were each lost on the body at 3 device pixels; an arm held
  out, raised, or carrying something bigger than a hand reads from across the square.
- **A peg leg is not a leg**: two pixels wide, dark wood turned in a cup, a neck and a bead, an
  iron ferrule, no boot, the trouser leg tied off above it.

#### Walking (B9)

Every figure walks without a second drawing of anything (`src/art/figure2/walk.ts`). Each part
moves with a bone: the head, the body, the near or far leg (split at the crotch), the near or far
arm, what each hand holds, a skirt, a cloak. A frame is a key (how far each foot is from where it
stands and how high it is lifted, where each knee is, how far each hand swings, how far the body
bobs, how far a hem and a cloak sway), and each bone is bent by its joints a whole row at a time:
a row moves sideways by its share of the joint's move, rows are dropped or repeated where a leg is
shortened or stretched, nothing is rotated, so lit edges stay unbroken. The rules:

- **Eight frames a cycle**, the same clock for every facing: contact (heels apart, body down), the
  weight taken, passing (the free foot lifted past the planted one, body level), pushing off (body
  highest, the back heel up), then the same with the legs swapped.
- **Across** (right; left is the exact mirror): the hips close toward each other so the legs
  scissor about one line, the feet lengthen toward the walk (toe first), the head leads by a
  column, the near hand swings against the near leg. **Toward the camera**: the feet stay under the
  hips and step by lifting, a lifted knee shortening its leg; the body bobs; the hands swing a
  little. There is no back view (see the status file).
- **No sliding**: the planted foot moves back exactly the ground's stride each frame, 7 art pixels
  for the hero (a half step of 14), 4 for townsfolk (they stroll, and a long skirt still covers the
  step). Show frames for stride ÷ speed.
- **Half the foot is always on the ground**: a heel lifts while its toe stays down, or a toe while
  its heel stays down; every frame has a sole on the anchor's row.
- **The hand rule holds in every frame**: what a hand holds moves rigidly with its wrist, so the
  grip stays under the fingers and the fist shows whole; the forearm is bent to meet it.
- **Busy arms do not swing**: a basket on the hip, a full tankard, a sack on the shoulder stay put;
  a hammer hanging from a fist swings. The far hand on the hero's hip stays on the hip, its shield
  swaying a little.
- **The far leg is behind** everything but the cloak, so a near leg stepping across covers it and
  throws its step of shadow on it. A skirt sways from the hips; a cloak trails, most at its hem.
- **Breathing**: two frames; the second lifts the chest, shoulders, arms and head one row, the legs
  still.
- **Handedness**: left is the mirror of right, so walking left the hero carries his weapon in the
  hand nearer the viewer (he looks left-handed). Kept on purpose: the weapon is how the ladder reads,
  and a right-handed hero facing left would carry it behind his body.

### The dungeon at the C scale (B10a; not yet swapped in)

Brinebeard's Grotto redrawn for a 64-pixel person (`src/art/dungeon2/`, doors
`src/art/dungeonArt2.ts` and `src/art/portraits2.ts`), beside the first scale's dungeon, which the
section "Dungeons" below still describes until lane C switches the rooms over. The first dungeon
sets the look of the ones after it.

- **Palette.** The cave's ramps live in `src/art/dungeon2/cave.ts`, six steps and a line like the
  town's, through the same day and dusk shifts: `caverock` (cooler and more violet than the town's
  rock, so a cave reads as underground), `cavesand` (greyer than the beach, calm under a lantern),
  `shoal` (shallow water over sand, green-teal, set by hand at dusk or it glows), `deep` (the cave's
  sea, much darker than the shoal), `weed`, and the hides of things that live there (`fur`, `crab`,
  `feather`, `troll`, `goblin`) and `ember` (a lit fuse, never shifted). They are numbered apart
  from the town's materials, and the cave palettes (`CAVE_DUSK`, `CAVE_DAY`) are the town's with
  these added, so a figure looks the same in the cave as at dusk in town. Floors never use red or
  orange: warnings and loot must stand out on them.
- **Tiles are 24 × 24, textured from their place in the room**, not in the tile, so a room shows no
  grid. A tile told its neighbours joins them in curves: higher ground spills over lower (sand over
  wet sand, land over water with a broken line of foam, shallows over the deep), floors darken
  under a wall's foot and beside a deck. A wear's occasional detail (a shell, a pool, weed) keeps
  off the tile's edges, so every wear meets its neighbours as the plain tile does.
- **Walls stand two tiles tall** (B6's one-tile wall was a third of a person): the upper face
  rounds over from the rock's top at a ragged lip that catches a little light, the face is lumps
  of rock lit by the floor below, then the tide's mark (barnacles, weed in clumps) and a wet dark
  foot that whatever stands in front reads against. The rock's top, seen from above, is quiet:
  tumbled lumps each with a lit rim on its upper left, cracks between some; the eye should slide
  off it.
- **Light, not darkness.** Tiles are drawn as lit ground; a room is lit afterwards. Below each
  lantern (its pool lies about a metre and a half below the flame, flattened as the floor is seen)
  the ground is lifted a step at the heart and left as drawn in a ring; beyond every pool it is a
  step darker, and two past the far corners. Edges break in clumps. The lantern's warm glow is
  added as the town's lamps' are. So a cave is pools of its own colours in the dark, never a grey
  wash, and the same tiles serve a lit room and an unlit one.
- **Foes stand as the hero's peers.** People are on the hero's 56 × 72 canvas and anchor, built on
  the figure engine and the H2 head, and walk and breathe on its rig; the powder monkey a head
  shorter, the goblin shorter still. Creatures and the captain have canvases of their own with
  their feet as data. Size carries threat: the rat and the sand crab below the knee, the gull and
  the parrot small, the boar and the wolf at the hip, the giant crab as wide as a rowing boat,
  the troll a head over the hero and three times as broad, the captain a head and more taller.
- **Creatures are silhouettes shaded as solids** (a shape given by its corners, lit by its bevel
  from the upper left), with fur in short strokes, a seam of shadow where a part lies over one of
  the same stuff (a troll's head on his shoulders, a boar's cheek on his neck), and features
  placed by hand: the boar's wedge, crest of bristles with brambles in it, snout disc and tusks;
  the wolf's pricked ears, long muzzle, ruff and low brush; the troll's hunch, knuckle-dragging
  fists, brow like a ledge and underbite.
- **Every foe has the poses a fight shows**: standing (two breaths), walking, the wind-up a blow is
  telegraphed by (a weapon cocked back over the shoulder, claws or fists raised, the keg drawn back),
  the blow (the weapon driven out along the line of it, so it reaches toward whoever is struck),
  the recoil, the recoil in the flash of a blow (every step lifted three toward its glint, the
  outline kept: the figure blazes in its own colours rather than going white), and the fall:
  buckling, then down, on its back (crabs, birds), its belly (four-footed things, the wyrm) or its
  side (people, the troll). Left is the mirror of right.
- **The powder monkey** is a small, wiry grown man, never a child: bald and stubbled, a gap-toothed
  grin with the brows up, an open vest over a bare chest, a red kerchief, ragged breeches, bare
  feet, the keg over his head in both hands with a painted skull and a lit fuse. **Brinebeard's
  coat is purple**, as the item says.

#### Portraits at the C scale (B10a)

- **72 × 72**, the head about three times the figures' H2 head (eyes seven wide with the iris
  centred and whites either side, brows a row above), drawn at that size, never scaled from a
  sprite; a bust on a dark disc, each face in the colours of its figure.
- **Never cropped**: shown at 2, 4/3 and 2/3 CSS pixels per art pixel, a face fills the fight
  screen's frame and the lists' and fits the dungeon's 48-pixel panel whole. Everything that names a
  face (head, hat, ears, horns, whiskers, the gesture beside it) lies above row 56, inside its
  declared safe box; below it only shoulders and beard ends, which the frame's bottom cuts.
- **Animals keep the silhouette that names them** (the boar's snout and tusks under a bristle
  crest, the wolf's ears and muzzle, the rat's round ears and whiskers, the gull side-on with its
  stolen chip, the parrot's hooked beak in a squawk) and an expression in the brows and mouth.
- **The hero's** is drawn in the look worn: skin, hair and its colour under any head gear, brows in
  the hair's colour at the step that stands clear of the skin (as the figures' are), the head gear
  and the body garment worn.

### What the swap supersedes

When lane C switches the scene to the C-scale town, these parts of the guide above stop applying to
the town (they stay for anything still drawn at the old scale until it is redrawn): the sizes table
(screen 270 wide, person 30 × 47, buildings 96–150 wide, props 11–13 wide), "four device pixels per
art pixel" for the town, the 3–4 step ramps and the single outline ink for town art, and the soft
elliptical ground shadow as the only shadow. Portraits, icons and dungeons are not changed by this
section. When the scene and the menus switch to the C-scale figures, the figure sizes above (38 × 48
canvas, base 47) and the "Figures" section's code notes give way to "Figures at the C scale"; the
Figures rules themselves (posed, arms doing something, mirrored eyes, gear readable, the hand rule,
the ladder) all still hold.

## Colour

- Every colour is a step on a named ramp of 3–4 steps (light, mid, dark). No one-off colours.
- **Day palette** = the base ramps with saturation ×1.05, lightness ×0.88, and a 7% mix toward deep
  violet (#2a1a4a) so shadows lean purple. Outline ink #1a1224.
- **Dusk palette** = the same ramps with saturation ×0.85, lightness ×0.62, and a 20% mix toward
  plum (#6a2a6a). Outline ink #150d20. Fire, lamp and window colours are exempt and stay bright.
- Dusk is the same drawing as day. Nothing is redrawn for evening; only the palette changes and
  lights switch on.
- Base ramps (before the day/dusk shift): grass #93d667 #74c256 #58a548 · sand #f6e2a8 #e7c781
  #c9a062 · sea #6fd6ee #3fb2e2 #2a86c9 · wood #d59a5a #b0703e #7a4a2c #52301e · red #d85a50 #b8323c
  #8a2432 · plaster #f3e6c8 #d9c49c · stone #b9c0cc #8b93a6 #626a80 · slate #8494b8 #5f6f94 #414d6e ·
  cobble #c2b9a6 #9d9484 #7a7268 · pine #4a9a62 #2f744e #1e523c · skin #f8cda4 #e0a27c · metal
  #eef3f8 #b9c6d6 #7f8ca3 · gold #ffd34d #d99a2b · navy #232a45 #38426a · fire #ffe27a #ff8a30
  #d8442a.
- In code (`src/art/palette.ts`, the only file that names a colour), steps are named ramp plus
  number, lightest first: `wood1` to `wood4`. Navy is stored lightest first (`navy1` #38426a,
  `navy2` #232a45). The mock-up's other colours (hair, tunic teal, cloak crimson, glass, lamp,
  foam, sail and so on) are ramps there too, some of only one or two steps.
- Dusk keeps the mock-up's hand-set values for lights and highlights: windows and lamps are lit
  (glass #fff2b0 #ffd34d, lamp #ffe08a), and foam, the sea's light step, gold, polished metal,
  white and sail light are set by hand so they still catch the light.

## Line and light

- One-pixel dark outline around every separate object, added automatically. Nobody draws outlines
  by hand.
- Light comes from the upper left: the left side of anything is its light step, the right side its
  dark step.
- Soft elliptical ground shadow under every standing thing.
- Evening lights (windows, lamps, forge, lanterns) are warm glows added on top of the dusk picture.

## Figures

These rules exist because the first drafts broke them.

1. **Posed, not assembled.** Every figure starts from a hand-placed body. Never build a person from
   rectangles.
2. **Arms always do something:** bend, cross, hold, rest on a hip. They overlap the torso rather
   than hanging beside it. Shoulders slope.
3. **Faces are symmetric by default.** The two eyes mirror each other (pupils toward the nose), so a
   figure looks straight out. A sideways glance is only ever a deliberate expression.
4. About five heads tall. Jaws, brows and mouths, no blush.
5. Gear shows: armour, cloak, weapon and shield are each readable at a glance, and each is a layer
   drawn to fit the posed body.
6. Villains get attitude from silhouette (hat, coat, hook), not from gore.

In code (`src/art/figure.ts`, `src/art/wardrobe.ts`): a figure is a posed body plus gear layers
chosen by id, drawn as rows of characters on a 38 × 48 canvas. Each layer has a depth (cloak behind
the body, clothes and armour on it, what is held and the shield in front), and the outline goes round
the dressed figure. The standard body stands in linen smallclothes, left fist at the hip where a
weapon goes and right hand on the hip where a shield goes; every new piece of gear is drawn to fit
that pose. Its hero outfit is the mock-up's hero, pixel for pixel. Townsfolk whose pose differs
(the pirate captain, the smith, the trader) each have a posed body of their own
(`src/art/townsfolk.ts`), drawn only where it shows, with what they hold as gear.

### The player's character (`src/art/character.ts`)

Drawn in B3 and given a second pass in B3b after Cody's first look; the rules here are what it was
drawn to.

- **Looks are ramps, not repaints.** The body is drawn once in the `skin` and `hair` steps; a
  skin tone or hair colour swaps those steps for its own ramp (`skinpale`, `skindeep`,
  `hairblonde`, ...). A skin ramp is light, shadow and mouth; its shadow step leans warmer and more
  saturated than its light step so it never goes muddy. Brows are drawn in the hair's dark step
  and follow the hair colour.
- **Hair is a crown and what hangs.** The crown (top of the head, fringe) is what a helmet or hood
  covers; what hangs (locks beside the face, the mass behind the neck, a braid) still shows below
  one. Under head gear only what hangs is worn, so hair never pokes through, and the helmet is
  drawn over the top of the hanging hair so it seems to come out from under the rim. A braid falls
  over the hood's cape. Hair never covers an eye or a brow; faces stay symmetric.
- **Bronze is yellow-olive, iron is blue-grey.** Every skin tone is an orange; bronze sits away
  from all five of them (`bronze1`–`bronze4`, a pale cream highlight over an olive mid), duller
  and greener than gold. Its whole ramp is set by hand at dusk, or it drifts into the plum-brown
  that skin goes at dusk. Bronze is never laid bare against skin: it sits on dark `hide` leather
  with a visible edge, so a bronze piece always reads as something worn. (B3's copper bronze read
  as a bare head and a bare chest; this is why.) In the armour's steps alone a blade reads as
  yellow plastic, so bronze has a fifth step, `bronze5`, a polished glint brighter and cooler than
  `bronze1`, numbered out of order so the first four keep their meaning. It is only for what
  catches the light hardest: a blade's midrib, an axe's edge, the cap's ridge. A weapon is mostly
  the olive mid with that glint and a dark edge on the shadow side, never flat yellow.
- **Headgear changes the head's outline.** A helmet adds something a head does not have: a pixel
  proud of the skull with a rim, a point above the crown, a cape. A cap that only follows the
  skull in a skin-like colour reads as a scalp; one in a hair-like colour reads as a haircut. A
  close cap reads as metal by its shine: a bright ridge over the crown and a riveted rim on a dark
  liner. A wide flat brim reads as a sun hat (B3b's bronze cap leaned to a pith helmet).
- **Held things sit in the left fist**, by the hand rule below. A bow is held at the middle of its
  stave, string outward, so the whole stave shows beside the body; the three bows are one drawing
  in three woods.
- **A weapon reads by its shape before its colour.** A sword is straight along its centre line,
  even in its steps (a one-pixel step between longer ones reads as a bend), symmetric about a
  midrib, with a point, a guard wider than the blade and a grip in the fist. An axe's head sits at
  the very top of the haft with a little haft above it, much heavier than the haft is wide, with a
  curved bit, a bright edge and a dark socket where the wood goes in; a pale rectangle off the side
  of a stick reads as a flag. An axe head is a solid wedge, never an outline: narrow where the
  haft passes through it, filling out to a cutting edge about as tall as the head is long; a
  thin bar hooking off the haft reads as a hook or a pick (B4 redrew the hatchet for this).
  `tests/art/pieces.test.ts` holds these.
- **An empty hand rests.** With nothing held, the character stands in `standard_at_ease`: the
  standard body with the weapon forearm bent up so the hand rests at the belt, instead of a closed
  fist hanging by the hip. Sleeves and the bracelet on that forearm have an at-ease version that
  follows it. The other hand rests on the hip in both poses (a shield covers it). The standard
  body itself, and so the approved hero, is unchanged.
- **Small things must be findable.** A necklace or bracelet sits over clothes, armour and a hood's
  cape, pale against a dark cord so it shows on any skin or sleeve. Shells are cream and rose,
  never peach (peach is skin), and set by hand at dusk like the other whites, or they go the
  orange of skin. They are few, larger than one pixel and of uneven sizes, hanging from the cord:
  a string of found things. Many regular ones read as a beaded cuff.

### How things are held

Written in B5, after Cody played wave 4: "weapons seem to be appearing behind the character's
hand". They were: the sleeve ran down to the wrist, the blade was one layer behind the arm, and
the guard and a grip as wide as a fist filled the rows where the hand should have been, so no hand
showed at all, and the weapon seemed to hang from the cuff with its blade tucked behind the arm.

A held thing reads as held when the grip passes **through** a fist, the fingers wrap **over** the
grip, and the rest of the weapon is clear of the fist and in front of the arm. So every held thing,
on every body and in every outfit, is layered round the hand in this order, back to front:

1. **Behind the body** (`HELD_BEHIND`): only what really passes behind it, a bowstring. Never a
   blade, a haft or a limb of the bow.
2. The body, clothes, armour, belt and a bracelet (`WRIST`).
3. **The grip** (`GRIP`): the part of the weapon the hand closes on. It runs down through the
   fist's columns and the fingers cover all of it.
4. **The fist** (`FIST`): four pixels wide and three deep, lit from the upper left, below the cuff
   and the wrist (`FIST_PART` in `wardrobe.ts`). It is part of the standard body, so every weapon
   and the hero share one hand; the hand at rest (`standard_at_ease`) has none. It covers the grip
   and nothing else of the weapon.
5. **Everything else of the weapon** (`HELD_FRONT`), in front of forearm and body: the blade,
   guard or head above the fist, and the pommel or butt below it. A guard sits on the wrist row,
   directly above the fist; a haft or the bow's binding shows there instead. Something of the
   weapon always shows directly above the fist and directly below it.

The weapon keeps one line through the hand: blade or haft, grip and pommel lie on one straight
line that passes through the middle of the fist and leans out towards the top, as the approved
sword does. The fist is never wider than the line by more than the fingers' wrap, and a grip is
two pixels wide, never the width of a hand (a fist-wide grip reads as a wooden hand).

A shield is strapped to the forearm: the hand it is strapped to is wholly hidden behind it, with
or without something in the other hand.

Small things on the weapon arm keep clear of the line: the bracelet's shells hang on the side of
the cuff towards the body, where a blade passing in front of the forearm does not cover them.

`tests/art/hands.test.ts` holds all of this for every held thing, in every outfit, with and
without each shield, and holds that the hand shows in every look. The approved hero's sword hand
changed for it, by 20 pixels (the blade's dark edge in front of the sleeve, a fist where the
grip block was), at Cody's request; `tests/art/mockup.ts` lists them.

The townsfolk keep their own approved poses: the pirate's hand rests on top of his cutlass's
guard with the blade point down in front of his coat, and the trader's hand is over her basket.
Both read as held at game scale, so they were left as approved.

### Gear ladder

Gear starts simple and climbs with the player's power, so how strong someone is reads at a glance
from across the town. One rung per stage of the game:

| Rung                                   | Who                     | What it is                                                                                                                                                                                |
| -------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linen (start of tier 1)                | A villager              | Undyed linen tunic, trousers and hood. No metal. Nothing held: the hand rests at the belt.                                                                                                |
| Leather (tier 1, a side rung)          | A hunter or woodsman    | A snug tan cap with ear flaps and a stitched seam; a tan jerkin laced with linen cord, its skirt in tabs; laced cuffs on both forearms; a bow. No metal.                                  |
| Bronze (tier 1, early)                 | A militia volunteer     | A close bronze skullcap with a ridge and a riveted rim; a hide jerkin over the tunic with one bronze disc; a small round wooden shield with a bronze boss; a short leaf blade; a hatchet. |
| Iron (tier 1, late)                    | A town guard            | A conical helm with a nasal; a mail shirt to the thigh, sleeves to the elbow, no pauldrons; a plain iron heater; a straight arming sword; a bearded axe. One metal, no gold.              |
| Tier 2 (opened by Brinebeard's Grotto) | The knight              | The approved hero: plate with pauldrons and knee cops, the kite shield with its cross, the long raised sword with a gilt guard, the red cloak. Drawn; waiting for tier 2's items.         |
| Tier 3 (opened by Thistlewood Burrow)  | A warden (words only)   | Plate with gilded edges, a crest or plume on a taller helm, a surcoat or cloak in a forest colour with a device, a larger heraldic shield, layered pauldrons.                             |
| Tier 4 (opened by the Wobbling Spire)  | A champion (words only) | Enamelled or tinted plate with trim that glows at dusk like the forge, a tall plume, a full cape, the largest blades and shields, a light of its own.                                     |

What grows from rung to rung, and the rules that hold it:

- **Metal on the body.** None, then a few cast pieces (cap, disc, boss) on leather, then mail over
  the torso and upper arms, then plate from head to knee. In tier 1 it is counted in pixels: each
  rung covers more than the one below (`tests/art/ladder.test.ts`). From the knight on, metal
  shares the body with paint and cloth (his shield is blue, his cloak red), so a higher rung
  shows heavier metal (plate over mail), not necessarily more of it.
- **The silhouette.** Shields grow (a 10-pixel buckler, an 11 x 15 heater, the 11 x 19 kite);
  blades reach higher (to the shoulder, above the head, to the top of the canvas); helms rise (a
  cap on the scalp, a point above the crown, a crest or plume); shoulders widen (nothing, mail,
  pauldrons, layered pauldrons); a cloak widens the base from tier 2.
- **Colours and trim.** Tier 1 is one metal with leather and the everyday tunic: no gold but the
  belt's buckle, no cloak, no painted device. Colour arrives with the knight (red cloak, blue
  shield, gold guard and cross), gilding and devices with tier 3, enamel and lights with tier 4.
- **Highlights.** Linen has none; bronze shines only at its edges (its polished step on a blade's
  midrib, an axe's edge and the cap's ridge); iron catches the light in rows
  (mail) and a few white points (the helm's crown); the knight's plate is polished, white
  specular on every plate; tier 4 adds glows at dusk.
- **A rung never borrows the next one's signature.** Pauldrons, a cloak and gold trim belong to
  tier 2 and above; plumes and devices to tier 3 and above; glows to tier 4.
- **Leather** (B5) sits beside linen and below bronze: the archer's rung, no metal at all, so it
  is not on the metal count; it covers more of the body than bronze covers in metal. It is the
  `tan` ramp, a yellow-leaning tan kept more than 12 (CIE76) from every skin step by day and
  dusk, with its dusk steps set by hand like bronze (shifted, it goes the plum-brown of brown and
  deep skin). It is laced with linen cord, which is how it reads as leather and not cloth.
- **Drops a shade finer than their tier** (B5): the smuggler's cutlass is iron's rung by its
  steel, finer by its polish (a white edge) and a knuckle bow, never by gold. The footpad's
  cudgel is a knotted length of oak in the `oakbark` ramp, its icon and worn layer alike.

- **The grotto's loot** (B6) sits between iron and the knight: a pirate's finery, salt-stained
  and a little showy. It may have colour (the captain's coat is purple, the tricorn black, a red
  feather) but its metal trim is brass (the `bronze` ramp), never gold, which stays the knight's.
  The cutlass is iron's steel, duller than the smuggler's and nicked along its edge, with a brass
  cup guard and knuckle bow; the boarding axe a long haft rising above the head with a broad bit
  and a spike; the anchor hangs from the fist by its shank, ring and stock up by the shoulder,
  crown and arms at the knee, read as an anchor at a glance (held crown up, it read as a
  grapnel); the spyglass is held closed in the off hand, the fingers round its middle.
- **Bounty hunting's things** (B6) are a hunter's, beside the ladder: a dark oak longbow a head
  taller than the shortbows, nearly straight, green-bound at the grip; a single great green
  scale rimmed in iron for a shield; a wolf's tooth at the collar; a broad felt hat with a red
  band and a cream plume; barbed arrows in the same quiver with dark red fletchings.

## Icons

Drawn in B4; not yet reviewed by Cody. The icons are the most-seen art in the game (every bank row,
every action card), so they follow the same hand as the town and the figures.

- **24 × 24 with the outline**: the object is drawn in the 22 × 22 inside and set in the middle;
  the automatic outline goes round it. It fills most of the square (at least 16 pixels in one
  direction, most 18 or more).
- **Shown at 32 CSS pixels**: 4 device pixels per art pixel on a 3x phone, the same pixel size as
  the town, and never a fraction (`iconScale` in `src/art/icons.ts`). At 24 CSS pixels they were
  crisp but too small to tell a herring from a cod at a glance.
- **Their own drawings**, never shrunken gear or scenery: an object alone, turned to show its best
  side (blades and arrows on the diagonal, point up and right; fish facing left; tools and
  vessels upright), lit from the upper left, three or four steps per ramp, no stray single pixels.
  Written as rows of characters with a legend, like every other sprite (`itemIcons.ts`,
  `gearIcons.ts`, `skillIcons.ts`).
- **Families are drawn together** so members read as kin and differ by design:
  - logs: one drawing; the three woods differ by bark (pine warm red-brown, oak grey-brown,
    willow grey-green) and by the cut end (yellow, tan, cream);
  - fish: raw is cool and silver with a dark eye; cooked is the same fish browned, two grill marks
    and the eye gone white (herring dark and crisp, cod pale and golden). Raw and cooked share no
    ramp;
  - ore is a faceted lump with what makes it ore set in it: copper's green crust and red-gold
    glints on warm grey, tin's pale crystals on cool grey, iron's rust nuggets on brown-grey;
  - bronze and iron follow the gear ladder: bronze is plain, leathery and olive (a hatchet, a
    leaf blade, a cap, a wooden buckler, a hide jerkin with one disc); iron is solid and grey (a
    bearded axe, a long sword, a nasal helm, a heater, mail). Neither uses the other's metal;
  - the three bows are one drawing in three woods; arrows are two, head up and right;
  - potions are the shell vial with the liquid showing through the thin shell, one hue each
    (green, amber, pale cyan, midnight), and each its own stopper: cork, red wax, a little
    glowcap, a lit wick.
- **An icon and its worn layer are the same object**: the hatchet's icon is the worn head's
  wedge, larger, with the same flat top, bright bit and socket round the haft.
- **Skills** are one clear object each: an axe in a stump, a fish on a line, a pick, a basket of
  greens, a pot over a fire, an anvil and hammer, a needle and spool, a feather, a mortar and
  pestle, crossed swords, a drawn bow, a shield, a heart. The defence shield is plain red with a
  boss: no cross or device, which belong to tier 2 and above.
- New ramps for icons only: `oakbark`, `willowbark`, `scales`, `herring`, `cod`, `shrimpraw`,
  `shrimp`, `cooked`, `verdigris`, `copper`, `rust`, `sage`, `glowcap`, `shelldark`, and the four
  potion liquids. No existing colour changed.
- **What monsters drop, and leather** (B5, `lootIcons.ts`): a raw pelt with four legs and a
  tail in the cool `hide` ramp, fur in strokes (raw, so not tan); two feathers, white over grey,
  each with a shaft; a pearl in an open oyster (a pearl alone reads as an egg or a ball); a tea
  tin with a red label and a leaf; a grey pebble on a thong; the cudgel; the cutlass. Leather is
  a tan roll tied with a thong; the cap, jerkin and laced cuffs are the worn ones as objects.
  Bracers were the hardest: a flat guard read as a pine cone and plain cuffs as barrels; a pair
  of cuffs laced up the front with the lace ends hanging is what read.

- **Bounty hunting and the grotto** (B6, `grottoIcons.ts`): each the worn thing as an object,
  or for what is not worn, the thing itself: a doubloon (gold, it is money) with another lying
  by it, the figurehead as a carved lady's bust in profile with her paint worn, a purse with its
  string cut for thieving. Brass is the `bronze` ramp, as on the worn layers.

## Portraits

- 48 × 48 bust on a dark tinted disc, in a gold-edged frame.
- Iris centred in the eye; whites on both sides.
- One clear expression per portrait (a smirk, a glare, a raised eyebrow).
- Portraits were a first pass at approval time and are expected to improve; the hero's and
  Brinebeard's faces need another round.

In code (B5, `src/art/faces.ts` and `portraits.ts`): each face is rows of characters with a
legend of its own on the 48 × 48 square, the bust outlined automatically and cut by the bottom
edge, in front of a disc of radius 21.5 in a dark step of a ramp chosen per face, its upper-left
rim one step lighter. Discs are darker than the face on them and never a step that lights at
dusk (`glass` and `lamp` switch on). Faces are drawn for daylight; the menus have no dusk.

- **Monsters** keep to the silhouette that names them at true size (round ears and a snout, eyes
  on stalks and a raised claw, a hooked beak, tusks and a snout disc, pricked ears and a long
  muzzle, a hood, a knitted cap, a vast jaw with tusks). Expression is in the brows and the
  mouth: brows slanting in for menace, one raised for cheek. Animal eyes may be small and beady;
  people's mirror each other with the iris centred.
- **Funny, not cute**: the gull's stolen chip, the crab's furious stalks. Cute came from big
  round eyes and round heads; they were made smaller and harder.
- **People** are the town's own figures, recognisable from their sprites: the smith bald and
  bearded in his apron, the trader's auburn hair and purple dress, the pirate's tricorn and patch
  on the same eye as in town.
- **The grotto's cast** (B6) match their sprites: the deckhand's red bandana and striped
  jersey, the powder monkey bald and grinning with his lit keg (a grown man, stubbled), the giant
  crab's barnacled shell and stalk eyes, the parrot side-on with one eye and its beak open,
  Brinebeard's tricorn and skull, brows and beard, filling the frame.
- **How they are shown.** The fight screen frames a portrait at 3 CSS pixels per art pixel and
  its lists at 2, and never resizes it. `portrait(id)` is told only the id, so it returns both
  canvases, each a whole number of device pixels per art pixel (rounded down, so a face never
  outgrows its frame at a fractional ratio), and a container query in `art.css` shows the one
  that fits the frame.

## Scenery

- Buildings are timber, plaster, stone and slate with visible wear: patched roof tiles, uneven
  stones, shutters, signs.
- Roofs are shingled in staggered rows; walls show their beams or their blocks.
- Ground is textured (grass flecks, cobbles in offset rows, wheel ruts on roads), never flat fill.
- A little menace in the background is welcome: a black flag, a wreck, a rock with a face.

In code: buildings and props are in `src/art/scenery.ts` and `src/art/harbour.ts`, grounds (road,
sand, cobbled square, quay wall, sea) are painters in `src/art/ground.ts`, and `src/art/town.ts`
indexes every piece by id with its size, base line and walk-up spots, and assembles the mock-up's
town from them, pixel for pixel.

## Dungeons

Drawn in B6 for Brinebeard's Grotto; not yet reviewed by Cody. The first dungeon sets the look
of the ones after it.

- **The same world, underground.** A dungeon is the town's stone, wood and sea in the dusk
  palette, lit by lanterns. Its own ramps are few: `cavesand` (greyer and cooler than the road's
  sand, so a cave floor stays calm under warm lantern light) and `shoal` (shallow water over
  sand, green-teal). Everything else is the town's: `stone` and `slate` for rock, `wood` for
  planks and frames, `sea` and `navy` for deep water, `metal` for iron.
- **Tiles are 16 x 16 and join in any arrangement** (`src/art/grottoTiles.ts`). Nothing but a
  single grain touches a floor's edge, and every edge is mostly the kind's base step, so tiles
  show no seam or grid. A kind with a pattern that runs across tiles (the wall's ledges, the
  planks' boards) keeps that pattern at the same rows on every wear's left and right edges.
  Wears are chosen by a mixed number, so a run of neighbouring cells does not step through them
  in order; most wears are plain, and a shell, a pebble, a pool or a strand of weed turns up on
  one floor tile in six or so.
- **Floors are quieter than anything standing on them.** A floor is its base step, a few grains
  a step lighter and darker, and now and then one small thing. No floor uses red or orange: a
  warning circle is red and fire-edged, loot is a dark sack with gold, and both must stand out.
  Shadows on a floor are its own next step down.
- **Rooms read as hollowed out of rock.** The rock's top, seen from above, is dark slate with a
  crack and here and there a paler boss; its front face is a lit lip where the top rounds over,
  two ledges that wander a pixel, upright cracks lit on their right, the tide's mark with weed
  and barnacles, and a dark foot two rows deep that anything standing in front of it reads
  against. A face is one tile tall, under a top.
- **Water says whether you can stand in it.** Shallows are light green-teal with the sand's
  ripples showing through and glints on top; deep water is dark blue in a slow swell, much darker
  than the shallows (a test holds the gap). Wet sand is the dry sand a step darker with water
  shining on it, which is how the tide's coming shows.
- **Doors** are timber frames in the rock: open, the dark of the next cave with the floor going
  on into it; barred, iron bars and a band across.
- **The cast** (`src/art/grottoCast.ts`), facing right, outlined, feet marked. Size carries
  threat: the rat is small, a deckhand and the smuggler the hero's height, the powder monkey a
  head shorter, the giant crab wider than the hero and low, Brinebeard a head taller and half as
  wide again. People are front-facing posed bodies like the townsfolk, eyes mirrored, with the
  action on the right (the side they face): what they hold is held by the hand rule. Each is told
  apart by silhouette before colour: the deckhand by his boathook taller than he is, the
  smuggler by his long coat and raised cutlass, the powder monkey by the keg held over his head
  with its fuse lit (a glow), Brinebeard by his great hat, beard and the anchor beside him. The
  powder monkey is a small grown man, stubbled and wiry, never a child.
- **Brinebeard is not the town's captain.** No patch, no peg leg, no red coat: a purple coat,
  a grey-green beard full of brine and shells, an anchor. Menace from his size, brows and anchor;
  the ridiculous from the beard and the hat.
- **Props** (`src/art/grottoProps.ts`) are the town's barrels and crates' kin: a powder keg with
  a painted skull and a fuse, a sea chest, the brig's bars, a ship's lantern on a post (lit at
  dusk), a spare anchor, a coil of rope, a cannon on its carriage.

## Menus

- Dark panel (#1e1a2a), cream text (#f0e6d0), gold border (#c9a24a), square corners.
- Pixel typeface (Pixelify Sans for body, a blockier face for headings is fine). Digits come from
  VT323 instead: Pixelify's 2, 5, 7 and 9 are too stylised to read at a glance (25 reads as "2S").
- Progress bars are flat with a dark track; gold for XP, green for the current action.

In code: the menu colours are the custom properties at the top of `src/ui/styles.css`, and nothing
else in the stylesheet names a colour.

## Keeping the art changeable

The art must be replaceable later without touching game rules:

- Game code refers to things by id ("iron_sword"), never by picture.
- Collision, hit areas and tap targets are data of their own, never measured from a sprite.
- Colours are named ramp steps, so a palette change is one file.
- All drawing lives in its own folder (`src/art/`) that nothing in the game rules imports. The
  linter enforces this: see `eslint.config.js`.
