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
chosen by id, drawn as rows of characters on a 38 × 48 canvas. Each layer has a depth (cloak and a
held blade behind the body, clothes and armour on it, shield in front), and the outline goes round
the dressed figure. The standard body stands in linen smallclothes, left fist at the hip where a
weapon goes and right hand on the hip where a shield goes; every new piece of gear is drawn to fit
that pose. Its hero outfit is the mock-up's hero, pixel for pixel. Townsfolk whose pose differs
(the pirate captain, the smith, the trader) each have a posed body of their own
(`src/art/townsfolk.ts`), drawn only where it shows, with what they hold as gear.

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
