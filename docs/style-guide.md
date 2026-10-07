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
  upper left, darker below and to the right and where it tucks behind a nearer one. B10b: a dome
  is a lumpy heap (two or three slow lobes and leaf-sized nicks in its rim, no two alike), lit as a
  slope in ragged bands, with scattered sprigs of two or three leaves; never a scalloped disc with a
  lit centre and a ring, which enlarged reads as a rosette.
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
  are as tall as the rock, with planking still on them. B10b: the planes' borders wander and their
  edges are worn away in places, the planes a little closer in tone, lichen in crusts on the
  sky-facing planes and pocks in clumps, so it reads as weathered stone rather than a cut gem.
- **Ground marks read at true size** (B10b): a cart rut is a groove a wheel wide, its floor one
  smooth polished band with no joints, its walls a dark line; a mended patch is squarer setts of
  granite and reused cobble a step either side of the cobbles' own tone, joints in the cobbles'
  joint tone, the outline ragged and frayed with old cobbles left in, never a bright grid; a wild
  flower's head is two pixels square on a wider dark clump.
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
  and a right-handed hero facing left would carry it behind his body. _Superseded in B10b (below):
  the sword now stays in the right hand._

#### Walking in four facings (B10b)

Cody's review of B9: the side walk read as a shuffle (a body facing the camera on legs striding
sideways, legs bent by shifting rows, front boots stretched), there was no back view, walking left
swapped the sword hand, the walk toward the camera was subtle at true size, dresses did not kick and
the far hand stayed on the hip. What replaced it:

- **Across is a true profile** (`src/art/figure2/rig2.ts`, `side.ts`). The figure is a skeleton
  posed per frame: each leg two bones (thigh 11, shin 11) from the hip at (28, 44), the knee found
  from where the foot must be, bending forward; each arm two bones (8 and 6) from the shoulder at
  (27, 26). A limb is drawn along its bones at its own width (thigh 8 to 6, shin 6 to 5, arm 5 to
  4), lit across its round from the upper left, so a bent knee is a real bend and the lit edge runs
  unbroken from hip to ankle. What covers a limb is a stretch of it measured from its root (a
  trouser from the hip to the ankle, a boot's shaft from 15, a sleeve to 14 or rolled at 6, mail to
  the elbow, a vambrace from 8, laced bracers 9 to 14), so a garment drawn once fits every pose.
- **What does not bend is drawn by hand in profile** (`sideHeads.ts`, `sideDress.ts`,
  `sideFolk.ts`): the head from the H2 rules (round skull, one eye with its lid line and the iris
  at its front, the brow a skin row above it, a nose lit on top, a jaw shadow from under the ear to
  the chin, the ear a rim round a darker hollow, never the mouth's red, which reads as a blush),
  every hairstyle (crown and hang, as at the front), every hat and helm, the torso of every
  garment (the collar's V, the jerkin's laces at its front edge and the disc's rim at the chest,
  mail's rings, the coat's braid, the breastplate's lit back and shadowed front), and five boot
  poses (heel striking toe up, flat, heel rising, high on the toe, hanging in the swing).
- **Skirts are laid per frame** between the legs that push them: a tunic's, a jerkin's tabs, the
  mail's skirt, the fauld's lames, a coat's skirts, every long dress. Its front follows the leading
  knee and shin, its back the trailing one, so a hem kicks with the stride. An apron is a panel in
  front of the belly, kicked a little by the knee. A cloak hangs from the shoulders behind and
  trails, more at its hem, with each step.
- **The gait**: a foot strikes with its heel (frame 0 the near foot, 4 the far), rolls flat and
  leaves from its toe, down for five frames (the double supports shared), through the air for
  three: lifted behind, brought past the planted foot with the knee forward, reached out toe up.
  While a foot is down it moves back exactly the stride each frame (7 for the hero, 4 for
  townsfolk), and the pixel bearing its weight (the heel, then the sole, then the toe) is the one
  the flat foot would have there, so it never slides; the heel rises by itself when the hip has
  gone too far ahead for a flat foot to reach. The hips are lowest as a foot lands (two rows) and
  highest passing; the head leads by a column.
- **Arms swing against the legs**, the forearm bending forward on the forward swing. A busy arm
  does not swing: the shield arm stays bent with the shield on its forearm, the off hand closes on
  a spyglass, the townsfolk's baskets, tankard, sack and raised arm stay put, the old man's stick
  is planted where his far foot bears his weight.
- **Handedness** (the rule): the hero is right-handed in every facing. Walking right his right
  side is toward the viewer, so the sword is in the near hand, in front of the body, and the
  shield is on the far forearm, shown as its edge (the face squeezed to its rim, field and device)
  held out beyond the chest. Walking left his left side is toward the viewer: the shield's face is
  on the near forearm over the body and the sword is in the far hand behind it, its blade showing
  above and ahead. The left walk is drawn as the right with the arms' jobs swapped and then
  mirrored, and then **re-lit from the left** (B11, `figure2/relight.ts`): along each row, every
  run of one material has its steps put back in their order before the mirror, so a sleeve, a
  face or a skirt is lit on its left again while its shape stays mirrored; nothing held changes
  hands. Townsfolk walking left are their right walk mirrored and re-lit the same way. Toward the camera the sword is on the viewer's left;
  from behind, on the viewer's right. Townsfolk carry no weapon, so their left walk is their right
  mirrored.
- **Held things in profile** are the front drawing turned about the fist's own middle column, so
  the guard, knuckle bow and haft keep their places round the fingers.
- **The weapon-carry rule** (B11; Cody: "Sword goes through head on knight right image"): walking
  across, **nothing held ever overlaps the head, hair or hat in any frame of any facing**, and no
  shield covers the face. A blade, an axe or a cudgel is carried low (`figure2/carry.ts`): turned
  point-down about the fist (exactly, row for row) and leant forward by sliding each row sideways
  (the way the rig bends a limb, so a blade's edge and midrib stay unbroken), foreshortened by
  dropping rows where it is longer than the hip-to-ground (a knight's long sword points partly
  toward the viewer). A bow is tilted forward from the top. The grip shows only under the fingers
  and nothing is drawn over them, so the fist is whole and the line still runs through it; the
  weapon arm swings a third as far as a free one (a weapon has weight) and the hand never goes so
  far that the weapon leaves the canvas. A tall shield is slung low on the forearm, its top below
  the chin and the neck. Toward the camera, away and standing, weapons stand beside the body as
  drawn and already clear the head. A test holds every held thing in every frame of every facing,
  bare-headed and under the widest hats and long hair.
- **From behind** (`views.ts`, `folkBack.ts`): the front figure mirrored (the figure's right is
  now the viewer's right) and re-lit so each row is still lit on its left (`flipLit`), with the
  back of everything in place of its front: the back of the head (a step darker than a face and
  featureless, so it never reads as one), the back of every hairstyle and head gear (and the hair
  that shows below a hat's rim), a shirt lit afresh with a fold down the spine, a belt without its
  buckle, a jerkin without its disc or laces, a coat closed, the quiver across the back, a shield's
  planks and straps, the cloak over all. With no shield both arms hang. _What covers what from
  behind was changed in B12 (below): the B10b back showed the sword and the shield in front._
- **Toward the camera** the free foot comes up past the planted one with the knee toward the
  viewer (the thigh foreshortened, the foot lifted seven rows), the planted foot climbs the screen
  two rows a frame as the walker passes over it (B11: it stepped on the spot and slid; the whole
  stride would need the feet 28 rows apart, more than the canvas has, so this is a quarter of it)
  and the free foot leaves from where it ends and lands where it began, so the lowest sole may sit
  up to four rows above the anchor's row mid-stride, the body rides a column over the foot that bears the weight, a skirt's hem
  is pushed up over the knee that comes forward, and with no shield the far arm hangs and swings
  like the near one (the near arm's own drawing moved across). Walking away is the same keys with
  the lifted sole showing.
- **Timing**: eight frames, 80 ms each for the hero (stride 7, so 87.5 art px/s against the scene's
  88), 100 ms for townsfolk (stride 4); unchanged from B9. The step (28 art pixels) is long for the
  figures' legs; B11 gave the thigh a pixel more (12) and the hips a gentler bob (down one row at
  contact, up one passing, instead of down two), which is as far as the stride allows.
- **Backs are drawn, not turned** (B11): from behind, the market woman's shawl is a point down her
  back (its knot is in front), the smith's apron strings are tied in a bow at the small of his
  back, a bald head shows its crown's light, the backs of both ears and the cords of the neck,
  and long hair has a sheen across it and lit strands so black hair is not a dark mass.
- **Boots**: the heel striking with the toe turned up has its sole as a dark line rising to the toe.

#### What covers what (B12)

Cody, on B11's walk: "sword and shield are visible when character is facing away. Shoes through
the cape/body." The rule, in every facing, is the plain anatomy of who is nearer the viewer; the
frames' provenance (`posedTagged` in `walk.ts`, the side view's tags) holds it in
`tests/art/layers2.test.ts`, for every wearable and weapon, every frame.

- **From behind, the body hides what it holds in front of it.** A weapon, a bow, a spyglass and a
  shield are drawn behind everything of the person (`BACK_DEPTH.HELD` in `views.ts`) and show only
  where they reach past the silhouette of the body, head, limbs and cloak: a blade above the
  shoulder and beside the hip, a pommel below the fist, a shield's rim (its planks and straps)
  past the elbow. Chosen over slinging the shield on the back: it is what the eye expects of
  someone walking away, it needs no second drawing, and the shield still shows as a shield's edge.
- **The shield arm from behind**: the upper arm hangs and the elbow comes out, but the forearm goes
  forward to the straps, so from row 35 down it is behind the body and in front of the shield
  (`BACK_FOREARM_ROW`). Where the front drawing never drew the torso under that forearm, the shield
  shows through the gap between arm and body, as it would.
- **What is worn on the back is in front**: the quiver over the shirt, the cloak over the quiver
  (its fletchings above the shoulder), long hair over the cloak, head gear over the hair, and the
  hands over the cloak's edge where they come out from under it (`BACK_DEPTH`).
- **Townsfolk from behind**: what each holds in front (the captain's cutlass, the smith's hammer,
  the alewife's tankard and the forearms round it, the trader's basket and the arm round it, the
  old man's stick) is behind their body the same way (`IN_FRONT` in `folkBack.ts`); what is carried
  on the head or a shoulder (the market woman's basket, the docker's sack) stays in front. A held
  thing moves with the hand that holds it, never with a leg (the captain's blade reached below the
  hip and walked with his leg until B12), and thighs move with the legs (the smith's hung as a
  skirt from behind, and a lifted boot showed over them).
- **A cloak, a coat's tails, a dress or a skirt hides the legs down to its hem** wherever it hangs
  in front of them from the viewer's side: from behind, cloak and skirt; toward the camera, the
  skirt (a cloak hangs behind there); across, the cloak behind the body's back line (the back of
  the hips) is the outermost thing, so a leg striding back goes in under it and only its foot shows
  below the hem (`SIDE.CLOAK_OVER`); under the body the cloak stays behind the legs.
- **Under before over**: across, the everyday tunic is dressed first, so a coat's, mail's or
  jerkin's skirt and sleeves are laid over it (until B12 the tunic came last and its skirt and
  sleeves replaced theirs in profile: the captain's coat was a short jacket, mail had teal sleeves).

#### The blow (B12)

Lane C struck with a lunge and a glint. The hero's blow is four frames, the same in every facing
and for every outfit (`figure2/strike.ts`, door `characterStrike2` in `character2.ts`): the wind-up,
the swing, the blow landing (frame 2, `STRIKE2_HIT_FRAME`), the recovery.

- **By weapon class**: a blade, an axe, the cudgel or the anchor is swung (`swing`); a bow is
  raised, drawn to the cheek and loosed (`bow`); empty hands punch (`unarmed`). No weapon in the
  game is a thrusting one, so there is no thrust.
- **Across**: the walk's skeleton in a pose (`SidePose` in `side.ts`): the feet planted a stride
  apart, the hips dropping a row and moving two columns into the blow as it lands, each wrist placed
  and its elbow found. A swing is cocked high behind the head with the blade down the back (behind
  the body), brought over the top, laid out at the full stretch of the arm as it lands, and let fall
  to the carry. A bow is held out in the left hand and drawn with the right (a right-handed archer:
  the walk carries the bow in the right hand, the blow changes hands); its string makes a V to the
  hand on the draw and is straight once loosed; the arrow is drawn nocked until the loose. A punch
  is cocked at the chest and driven out at the shoulder's height, the other fist up by the chin.
  Walking left the arms swap jobs and the frame is mirrored and re-lit, as the walk does.
- **Toward the camera**: the weapon raised beside the head, brought down past the shoulder and
  landing pointing at the viewer below the fist; **away**: cocked out to the right, up past the
  shoulder, the blow landing ahead (up the screen) with arm and blade behind the body and only the
  blade's end showing past the head (the back-view rule holds in a blow). The arms are drawn again
  along their bones in the outfit's own sleeves (`drawLimb`, the side view's covers; plate down the
  whole arm where a pauldron hides the upper arm across). A bow toward or away is end-on: a stave a
  few columns wide.
- **The weapon is its own drawing turned about the fist**: by quarter turns, exactly, then leant by
  sliding rows (or columns), as the carry does, so a blade's edge and midrib stay unbroken.
- **Reach**: the canvas stays 56 x 72 with the anchor at (28, 70). A weapon longer than the room
  in front of the fist is foreshortened (rows dropped along its length, as pointing partly toward
  the viewer), then leant less, and as a last resort its far end left off; nothing touches the
  canvas's edge (tested). A knight's long sword at full stretch is drawn about half its length.
- **The shield arm is braced**: raised a little toward the blow and held there. With a bow the
  shield is not drawn (both hands are on the bow); see the status file's weak list.

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
- **Doors in side walls** (B11, `door_side_open`, `door_side_barred`): every grotto door is in a
  side wall, which is seen from above, so a door there is the passage cut through the rock's top,
  the floor running out of the room into the dark beyond, the jamb above showing a sliver of dark
  face and the one below a lit lip, the frame's posts and lintel at the room's edge; barred, an iron
  grille along the lintel. It turns to face the room by its neighbours. A face's door
  (`door_open`, `door_barred`) is for a door in the wall the viewer faces.
- **Water against a wall**: where water runs into a bottom wall the shore beside it widens toward
  the rock so it curves round into the wall's foot, and a broken wash of foam lies along the foot
  (B11; it met the rock in a square 24-pixel step).
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
  wash, and the same tiles serve a lit room and an unlit one. Planks are not lifted at a pool's
  heart (B11): warm wood under the warm glow read orange.
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
  fists, brow like a ledge and underbite. B11 added the detail a pixel artist would place on top:
  the crabs' eyes as white balls with pupils on thick stalks under hard lids (a pixel-wide stalk
  read as a hair), the M of grooves across a carapace, its lit front rim, teeth inside a pincer;
  the boar's glinting red-rimmed eye, the light along his hump, cloven hooves; the wolf lighter
  than the cave floor at dusk, on legs four pixels wide at the top, a pale throat; the wyrm's belly
  plates in segments, a brow over its slit eye, a nostril.
- **People turn into a blow** (B11; B10a's was an arm drawn over a standing body): winding up, the
  weight goes onto the back foot, the shoulders lean away and the free arm comes forward;
  striking, the lead foot steps out toward the one struck, its knee bent, the back heel up, the
  hips down and the body and head forward over the lead foot, the free arm flung back.
- **Every foe has the poses a fight shows**: standing (two breaths), walking, the wind-up a blow is
  telegraphed by (a weapon cocked back over the shoulder, claws or fists raised, the keg drawn back),
  the blow (the weapon driven out along the line of it, so it reaches toward whoever is struck),
  the recoil, the recoil in the flash of a blow (every step lifted three toward its glint, the
  outline kept: the figure blazes in its own colours rather than going white), and the fall:
  buckling, then down, on its back (crabs, birds), its belly (four-footed things, the wyrm) or its
  side (people). The troll is drawn lying on his back (B11; a turned standing troll read as a
  heap): head to the left, jaw and tusks to the sky, eyes shut, the belly a mound, a knee up, an
  arm flung out along the ground. Left is the mirror of right.
- **The powder monkey** is a small, wiry grown man, never a child: bald and stubbled, a gap-toothed
  grin with the brows up, an open vest over a bare chest, a red kerchief, ragged breeches, bare
  feet, the keg over his head in both hands with a painted skull and a lit fuse. **Brinebeard's
  coat is purple**, as the item says.

#### Portraits at the C scale (B10a, redrawn in B11)

Cody, on B10a's faces: "Honestly the character portraits freak me out." They were one built head
for everyone (a tall, narrow egg), small evenly spaced features in it, a blank straight stare, a
neck like a column and beards of stippled noise: a mannequin. The first scale's 48-pixel faces,
simpler, had what they lacked: big chunky shapes filling the frame, strong brows, eyes that
said something, beards with a silhouette, a little caricature. B11 drew every face again to that.

- **72 × 72**, drawn at that size and never scaled from a sprite; a bust on a dark disc, each face
  in the colours of its figure. Shown at 2, 4/3 and 2/3 CSS pixels per art pixel (144, 96, 48):
  **never cropped**, whole in the dungeon's 48-pixel panel; everything that names a face above row
  56, inside its safe box (`PORTRAIT2_SAFE`, data, measured from the drawings).
- **Every person is their own head**, drawn by hand (`src/art/dungeon2/folkFaces.ts`): their own
  shape as a ring of hand-placed points (a broad dome for the smith, a heart for the trader, a
  square jaw for the docker, a cannonball for the powder monkey, a long face with high cheekbones
  for the market woman), their own eyes, brows, nose and mouth as rows of characters. The tools
  (`heads.ts`) only shade what was drawn: a rounded solid in clean bands, a cast shadow, a stroke.
  Nothing in them decides what a face looks like.
- **What makes a face appealing here:**
  - It **fills the frame** as the first scale's did: a head about 40 pixels across on the 72
    square, a face at least 30 across, the chin near row 52, shoulders filling the bottom.
  - **Broad, appealing head shapes**, a jaw and cheekbones with some width, never a tall oval.
  - **Eyes big enough to act**: about eight wide and three or four open, a dark lash line thicker
    at the outer corner, the iris centred (three wide) with a dark pupil and a white catch-light,
    whites either side, a crease above and a lid line below. Brows two to four rows thick, dark,
    shaped by the expression. A sideways glance only as a deliberate expression (the footpad
    sizing up a purse, the powder monkey eyeing his fuse).
  - **One expression a viewer can name**: the smith steady and proud, the trader's knowing smile
    with one brow up, the captain's gold-toothed grin, the alewife laughing with her eyes shut, the
    market woman's "well, are you buying?", the docker's lazy grin, the old man's crinkled smile,
    the footpad's sly glance, the smuggler's narrowed eye and smirk, the deckhand's snarl, the
    powder monkey's gap-toothed delight, Brinebeard's glower under his hat, the goblin's spite.
    Friendly people look friendly; rogues look roguish, never dead-eyed.
  - **Hair and beards are solid shaded masses** with a few deliberate locks: a parting, three or
    four strokes down a beard, lit tips. Stubble is one darker tone over the jaw with a broken
    edge, never a speckle.
  - A neck under the jaw in shadow, not a column; proper shoulders and collar.
  - Hats frame faces without burying them: brims and helm rims sit above the brows; a tricorn is
    cocked into three points, the front one a V over the brow.
- **Don't:** a stipple beard; a mannequin oval; a shared head with features swapped; dot eyes or a
  stare without lids; a face floating small in the frame; features evenly spaced on a blank.
- **Animals keep the silhouette that names them** and an expression in the brows and mouth (the
  boar's snout and tusks under a bristle crest, the wolf's ears and muzzle, the rat's round ears,
  whiskers, brows slanted in and crooked grin, the gull side-on with its stolen chip). Where the
  first scale's had more character it was restored (`beastFaces.ts`): the crabs' furious eyes on
  thick stalks under hard lids and their raised claws, the troll's great tusks, ears out like jug
  handles and weed for hair, the parrot's big ringed eye under a lowered brow.
- **The hero's** (`heroFace.ts`) is the H2 head at three times its size: round, a little wider than
  tall, open eyes with the iris centred and a catch-light, soft brows in the hair's colour at the
  step that stands clear of the skin, a broken fringe, a small easy smile. Five hairstyles each
  with their own silhouette and volume, the hang (long hair's curtains, the braid) worn under helms
  and hoods, the hair at the temples under a brim; the head gear and the shirt and body garment
  worn. A likeable adventurer in every look.

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
- **The velvet cap** (B10b): soft plum velvet slouched to one side, a sheen along its crown, its
  band below, a gold pin at the front; a new icon ramp, `velvet`, the C-scale figure's plum.
- **Tab icons** (B10b, `tabArt.ts`, through `tabIcon`): one object each, in the item icons' hand
  and size (24 x 24, shown at the same whole-pixel scale), told apart by silhouette: crossed pick
  and axe (Skills), an iron-bound strongbox with a gold lock (Bank), the hero's head and shoulders
  in his teal tunic (Character), a limewashed house under a red roof with a smoking chimney
  (Town), a sealed scroll (Menu). Two states: lit for the open tab, and muted for the rest (every
  colour mostly its own lightness in a warm grey lifted toward the bar's muted text, a fifth of its
  hue kept), so the open tab reads at a glance as its gold label does; `art.css` shows one or the
  other by `.tab[aria-current='page']`.

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
