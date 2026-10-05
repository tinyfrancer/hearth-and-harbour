# Lane C: scenes

**Next session: S12c and S14a: your own character in town, and the dungeon's shell** (brief in
`docs/lanes.md`, wave 4).

## The town's map

Everything is in art pixels; tiles are 16. The town is 28 × 40 tiles (448 × 640), laid out in
`TOWN_LAYOUT` and `GROUND_PLAN` (`src/scene/town.ts`). Its middle is the approved mock-up's town
spaced out by about half again down the square; the extra width is a pine grove east of the smithy
and room round the stall to the west.

| Rows  | What                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------ |
| 0–2   | Forest (solid), the road north running into it (solid until it opens)                                              |
| 3–10  | Grass: a strip behind the tavern (cols 5–12, rows 7–10) and the smithy (cols 16–21, rows 7–9), the road, the grove |
| 11–19 | The cobbled square                                                                                                 |
| 20    | The quay wall (solid) with the pier's head at cols 13–14                                                           |
| 21–30 | The pier, cols 13–14, over the sea                                                                                 |
| 31–39 | Sea                                                                                                                |

- A standing piece stands centred on its footprint's bottom edge unless it has an `at`. Things
  afloat (ship, rowing boat, rock, buoys) have no footprint (the water is solid already), sort by
  their own picture's base line and have `spots` on the pier or quay to be looked at from.
- The net is painted with the ground and has a tap box but no footprint: people walk over it.
- The hero starts at (14, 17), right of the well, with the tavern and smithy both in view.

## Done

- **S12b: The whole town.** The Town tab is the approved mock-up, walkable, with its people.
  - Every piece from lane B's index in its place: the smithy (forge glowing by day, brighter at
    dusk), the stall, the quay wall with its rings, the pier (192 long, drawn with lane B's
    `pier()`), the ship, the rowing boat on its line to a ring, the rock and wreck, two buoys, the
    signpost, anvil, net, bucket, crab, three gulls and both chimneys' smoke; the tavern, well,
    board, lamps, barrels, crates and pines now come from the index too, so they are the mock-up's
    own pictures.
  - Grounds painted with lane B's painters in the mock-up's order: grass, wild flowers, the road
    with its ruts, the cobbled square with its ragged top edge, the forest, the quay wall, the sea
    with its swell and shore foam, then the pier and net. A shadow under every standing thing on
    land in its ground's dark step (the index's own where it has one). No flat plot is left; a
    test checks that no tile of land is a single colour.
  - Footprints for all of it: the pier walks to its end, never onto the water, the boat or the
    ship; there is room behind the tavern and the smithy, where their roofs stand in front of the
    hero, and behind the stall's awning.
  - The three townsfolk stand where the mock-up has them: the smith in front of his smithy, the
    trader beside her stall, the captain on the pier. Tap one and the hero walks up beside them
    (never in front, where he would stand over them) and the panel gives their name and the next
    of their lines. Each has five lines that go round in order, visit by visit, and one or two of
    their own after dark that start the round. The smith's panel offers Smithing; the trader's
    offers the Bank.
  - Doors and counters from the index: the smithy's door spot and the anvil lead to Smithing; the
    stall's counter spot opens the trader's panel (counted as a visit to her). New things with
    lines: the smithy, anvil, signpost, crab, bucket, net, rowing boat, ship (another line after
    dark), rock and buoys.
  - Drawing: the ground and everything standing still are composed once per palette into one
    picture of the map. A frame copies what the camera sees of it, then draws only what moves and
    the few things that stand in front of the hero where he overlaps them, clipped to his box. When
    the camera has not moved, only the patches that changed are redrawn (a gull's few pixels).
  - A little life, all as pure functions of time, redrawn in small patches and only while the tab
    is showing: chimney smoke rising (six frames from lane B's puffs, the first exactly hers), three
    gulls on lazy loops over the harbour, and the shore foam shifting along every second or so.
  - The hero is lit at dusk by the lamps and windows near him, like everything else: one lit
    picture per four-pixel step of where he stands, each made once and kept.
  - Measured on the built app at 390 × 844 (3x) in headless Chromium with the CPU throttled 4x:
    59–61 fps standing and walking, day and dusk. Each frame's update and draw (the shell's
    animation-frame callback) took 0.1 ms median standing, 0.2 ms median walking by day
    (p95 1.4 ms), 0.7 ms median walking at dusk (p95 4 ms, max 9.5 ms when he first stands
    somewhere new by a lamp). That is CPU time issuing the canvas work; the GPU's share is not in
    it.
  - Tests: lines going round by visit and after dark, the stall opening the trader, who is picked
    where tap boxes overlap, the pier walkable to its end and not onto water, room behind the
    buildings, every index piece placed, the townsfolk's places and spots, the doors and buttons,
    the grounds painted, shadows, lights, the lit hero and his kept pictures, smoke, gulls and foam,
    the patch-redraw rules, and the view in jsdom walking up to the smith, the trader and the
    captain.

- **S12a: The town on the engine.** The first piece of Gullwick with lane B's art: the tile map,
  depth order, footprints, spots, tap targets grown to a thumb, the panel, day and dusk with the
  sun-and-moon button, the scene driven by the shell's frames.

## Deferred

- Walk cycle; hold-and-drag to steer.
- The townsfolk do not turn to face the hero (their pictures face one way).
- Ship, boat and buoys do not bob; the waterline foam on the ship and rock does not move.

## Needs from another lane

- Nothing.

## Notes for this lane's next session

- The hero is still drawn in the fixed outfit (`heroPicture()` in `townArt.ts`). S12c swaps it for
  `characterPicture(look, worn)` from `src/art/character.ts` once lane A's equipment lands; the lit
  pictures (`litWalker`) take any picture, so the swap is one line plus rebuilding when the look or
  gear changes.
- `heroAt()` in `townView.ts` reports where the hero is and what is open, for tests and screenshot
  scripts.
- Taps near a thin thing pick it: a 12-pixel lamp's tap box grows to a thumb. The pier-end lamp
  stands on the deck's edge so the end itself can be tapped.
- Where the hero is, what is open and how many times each person has been visited live in module
  variables in `townView.ts`, not the save; the lines start again from the first when the page is
  reloaded.
- Checked in headless Chromium at 390 × 844 (3x), 320 × 568 (2x; shows the whole mock-up's width),
  430 × 932 (3x) and 844 × 390 landscape. Not checked on a real phone or in Safari.
