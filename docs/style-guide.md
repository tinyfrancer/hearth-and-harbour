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

## Portraits

- 48 × 48 bust on a dark tinted disc, in a gold-edged frame.
- Iris centred in the eye; whites on both sides.
- One clear expression per portrait (a smirk, a glare, a raised eyebrow).
- Portraits were a first pass at approval time and are expected to improve; the hero's and
  Brinebeard's faces need another round.

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
