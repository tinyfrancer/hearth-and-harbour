# Lane C: scenes

**Next session: S12b: The whole town** (brief in `docs/lanes.md`, wave 3).

## Plots for lane B's pieces

Everything is in art pixels; tiles are 16. The town is 28 × 40 tiles (448 × 640). A standing
piece is placed centred on its footprint's bottom edge, which is also its base line, unless it has
an explicit `at` in `TOWN_LAYOUT` (`src/scene/town.ts`). Ground plots are painted in
`paintGround` (`src/scene/townArt.ts`) from `GROUND_PLAN`.

| Plot         | Kind                   | Footprint (tiles)          | Placeholder picture / area                               | Base line |
| ------------ | ---------------------- | -------------------------- | -------------------------------------------------------- | --------- |
| Smithy       | standing, solid        | cols 16–21, rows 4–8       | at (255, 54), 98 × 90, flat `slate2`                     | y 144     |
| Market stall | standing, solid        | cols 3–6, rows 13–14       | at (49, 196), 62 × 44, flat `wood2`                      | y 240     |
| Quay         | ground, solid          | row 22, all columns        | (0, 352), 448 × 16, flat `stone2`                        | n/a       |
| Pier         | ground, walkable       | cols 13–14, rows 22–30     | (208, 352), 32 × 144, flat `wood2`                       | n/a       |
| Sea          | ground, solid          | rows 23–39 (pier excepted) | (0, 368), 448 × 272, flat `sea2`                         | n/a       |
| Road north   | ground; rows 0–2 solid | cols 13–14, rows 0–9       | centre x 224, 24 wide, y 0–160, flat `sand2`, wanders ±5 | n/a       |

- The smithy's yard (the grass of row 9 below it) is open for its anvil and the smith. The ship, the
  rowing boat, the rock and the wreck have open sea either side of the pier: x 240–448 and
  x 0–208, y 368–640. A lamp already stands at the pier's end (col 13, row 30).
- To fill a standing plot, swap its piece in `townPieces()` for lane B's picture; if the size
  differs, the picture re-centres on the footprint by itself, and only a footprint that should
  change needs touching. Doors and counters from lane B's index become `spots` and `tap` boxes.

## Done

- **S12a: The town on the engine.** The Town tab is the first piece of Gullwick, drawn with lane
  B's art, laid out after the approved mock-up and widened so the camera has somewhere to go.
  - `town.ts`: the town as data. Tile map (forest along the top, a tree line down each side so
    the map's edge never cuts the hero off, grass, the square, the road north, quay, pier, sea);
    every placed thing with its footprint, tap box, where to stand and what it says. Things with
    lines: the tavern door (a different line after dark), the well, the notice board, the four
    street lamps (lit and unlit lines), the barrels, the cargo crates, "your crate" (button: the
    Bank tab) and the pines (button: Woodcutting).
  - `townArt.ts`: the ground painted with lane B's grass and cobbles (the square's top edge
    ragged as in the mock-up), the forest from lane B's pines, flat plots, and a soft shadow under
    every standing thing in the dark step of whatever ground it is on. Each thing is lit by every
    lamp and window that reaches it, so the scene lights as the mock-up did as one drawing.
  - `things.ts`: depth order by base line, footprints made solid, the open spots beside a thing,
    the nearest one by walking distance, and tap targets grown to a thumb (44 CSS pixels).
  - `play.ts`: the rules of a scene, pure: a tap sets off a walk or a walk up to a thing, time
    moves the walker, arriving opens the thing; facing (mirrored for left) and a one-pixel bob
    while walking.
  - `daylight.ts`: dusk from 18:00 to 06:00 by the phone's clock, flipped for the session by the
    sun-and-moon button in the scene's top-left corner (where nothing the hero can reach is ever
    under it).
  - `panel.ts`: the panel over the bottom of the scene (name, lines, a button, a close button),
    styled from the menu's custom properties. The view slides up while it is open so it never
    covers the hero; it stays open across the shell rebuilding the tab and closes when its button
    is pressed.
  - `draw.ts`: each picture is rasterized once per palette into its own canvas (cached for the
    page) and copied at the whole scale; the hero is mirrored once. `stage.ts`: driven by the
    shell's `update`, no loop of its own, redraws only when something changed; the canvas is
    sized to whole CSS and device pixels (`canvasFit`), which fixed a one-row seam S11 had at a
    fractional screen height.
  - Removed `colours.ts`, `testRoom.ts`, the private animation loop and the `:has()` rule.
  - Tests: depth order, footprints, nearest free spot (round a wall, named door spots, none
    reachable), tap targets, walking up and opening, facing, bob, day and dusk by the hour, the
    town's layout (reachability, edges, plots, shadows, lights), and the view in jsdom: the panel
    opening, its buttons calling the shell, closing, surviving a rebuild, the time button.

## Deferred

- The hero is not lit by lamps at dusk (the scenery is); lighting him means rasterizing him as
  he moves, which this session ruled out.
- Walk cycle; hold-and-drag to steer.
- Plots say nothing when tapped; the mock-up's flowers on the grass, nets, rope and crab.

## Needs from another lane

- Nothing.

## Notes for this lane's next session

- Taps near a thin thing pick it: a lamp's 12-pixel tap box grows to a thumb, so tapping the
  tile right beside a lamp walks up to the lamp. Screenshot scripts must aim clear of tap boxes.
- Where the hero is and what is open live in module variables in `townView.ts`, not the save.
- Checked in headless Chromium at 390 × 844 (3x), 320 × 568 (2x and 3x), 430 × 932 (3x),
  412 × 915 (2.625x) and 844 × 390 landscape: art pixels exact everywhere. Not checked on a real
  phone or in Safari.
