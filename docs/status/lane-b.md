# Lane B: art

**Next session: B2: Icons for everything so far** (brief to be written in `docs/lanes.md`).

## Done

- **S7a: Art pipeline.** The mock-up's pixel engine is in `src/art/` as tested TypeScript:
  - `palette.ts`: every colour, as named ramp steps (`wood2`), with the day and dusk shifts and
    the mock-up's lit and kept-bright dusk values. Both palettes equal the mock-up's, all 79
    colours.
  - `grid.ts`: drawing primitives with the mock-up's rounding, sprites from rows of characters,
    the automatic outline, the ground shadow. `raster.ts`: palette plus glows to pixels at a whole
    scale (pure). `canvas.ts`: the thin canvas part, whole-number scaling, padding to whole CSS
    pixels so nothing is stretched. `rng.ts`: the mock-up's seeded random.
  - `figure.ts`, `wardrobe.ts`: a posed standard body plus gear layers by id. The hero's outfit
    (`HERO_OUTFIT`: short hair, red cloak, iron sword, grey trousers, leather boots, teal tunic,
    iron plate, leather belt, kite shield) on the standard body is the mock-up's hero pixel for
    pixel.
  - `scenery.ts`: the tavern, barrel, crate, street lamp, well, notice board, pine, grass and
    cobbles, each identical to the mock-up's drawing for the same seed. `plates.ts`: the gallery's
    little scenes.
  - `gallery.ts`: the hero close up and at game scale, the tavern and props in day and dusk, the
    body being dressed layer by layer, and every ramp in both palettes.

## Deferred

- The pirate, smith and trader figures, the smithy, ship, stall, dock and the rest of the town
  (S12 and B3 will want them; harvest them the same way). The figures were posed on their own
  bodies in the mock-up; they will need their own body or gear on the standard body.
- Portraits (48 × 48): not started.
- The tab icons and home-screen icon are still the S1 placeholders.

## Needs from another lane

- Nothing.

## Notes for this lane's next session

- Game scale is worked out from the app's width: a world 270 art pixels wide across it (4 device
  pixels per art pixel on a 390-wide 3x phone). If lane C's town settles on a different rule (for
  example measuring inside the screen's padding), make `gameScale` in `canvas.ts` agree.
- At a fractional device pixel ratio (2.625 on many Androids) pictures are close to exact but not
  always pixel-perfect; at whole ratios they are exact (checked against screenshots).
- The teal tunic got a chest and shoulders the mock-up never showed (they sit under the plate),
  so it can be worn alone.
- Gear ids are art ids. B3 maps lane A's item ids onto them.
