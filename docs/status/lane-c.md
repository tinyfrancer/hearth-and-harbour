# Lane C: scenes

**Next session: S14b: fighting in dungeons** (needs lane A's S8 combat on `main`; brief to be written
in `docs/lanes.md`, wave 5). What it needs from the combat rules is under "Notes for this lane's
next session".

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

## The grotto's map

Three grey-box rooms in `src/scene/grotto.ts`, read by `buildDungeon` (`src/scene/dungeon.ts`).
Key: `#` rock, `.` floor, `~` water, `s` where the boat puts you ashore, `x` the end, and a lower-case
letter a door joined to the door with the same letter in exactly one other room.

| Room      | Size (tiles) | Doors                              | What                                    |
| --------- | ------------ | ---------------------------------- | --------------------------------------- |
| `landing` | 24 × 12      | `a` east                           | the sea along the west; the start       |
| `pools`   | 40 × 12      | `a` west, `b` north (far east end) | pools and rocks to walk round; scrolls  |
| `cove`    | 22 × 13      | `b` south                          | the marked spot at the top ends the run |

## Done

- **S12c and S14a: your own character in town, and the way into a dungeon.**
  - The hero is the player's character: `characterPicture(fullLook(state.look), wornItemIds(state))`
    through `Hero` (`src/scene/hero.ts`). A new character is a villager in his everyday tunic.
    Every frame's state is compared by the identity of `look` and `equipment` first, then by a key
    of the look's parts and the worn ids; only a real change draws him again and drops his kept
    dusk pictures. The `Hero` lives with the Town tab's module state, so a rebuilt tab does not
    draw him again.
  - The townsfolk turn to look at the hero: the smith, the trader and the captain each have a
    mirrored picture (`Sprite.turned`); someone within 40 art pixels each way with the hero off to
    their left turns (`turnedTo` in `play.ts`), otherwise they stand as drawn. The map's still
    picture is composed with them turned (once, then kept: up to eight per scene, by palette and
    who is turned), so turning costs one composition, not a frame's work.
  - Hold and drag to steer: a press on the ground still walks there as a tap does; held 220 ms or
    dragged 12 CSS pixels it becomes steering, and the hero heads for the finger, re-planning only
    when the finger is over another tile (`steering` and `steer` in `play.ts`). The point under a
    still finger moves as the camera follows him, so holding near an edge keeps him walking. A
    press on a thing is only ever a tap.
  - A person's panel shows `portrait(id)` beside their name if the art lane has drawn one
    (`smith`, `trader`, `pirate`); null today, so nothing shows.
  - The rowing boat's panel says plainly that the grotto is unfinished and offers to row out.
  - A run (`dungeonView.ts`, rules in `dungeon.ts`): entering asks the shell for full screen, then
    pauses the idle clock. A prompt to turn the phone covers the run until the view is wider than
    tall; turning back puts it up again and stops the run's clock and the walker. A Leave button,
    top right inside the safe area, asks once more ("Row back" or "Stay"). Rooms are tile maps
    with doors; walking onto a door dims the screen (180 ms), loads the next room with the hero on
    the tile inside the matching door facing in, and dims back in. The marked spot ends the run:
    the results give the time taken (only time played sideways) and a button back to town.
  - Landscape: the dungeon's scale is the town's scale for the screen's short side
    (`dungeonScale`), so the hero is the same size on screen after the phone is turned. The camera
    keeps the hero clear of insets (`DUNGEON_INSETS`: 56 CSS pixels top and sides, 72 bottom) where
    the Leave button, the notches, and S14b's health (top) and ability bar (bottom) go; a room
    smaller than what is left is centred in it.
  - The clock and the bars, by every way out:
    - Leaving (confirmed): full screen off, clock on, back in town on the quay by the boat.
    - Finishing: the clock starts again the moment the end is reached, while the results show in
      full screen; "Back to town" turns full screen off.
    - Rotating back to portrait: neither changes; the run is paused behind the prompt.
    - The tab being rebuilt: the run is module state like the hero's place, so the new tab shows it
      as it was and, on its first frame, asks the shell again for full screen and (unless the run
      is over) the pause, in case the shell let go. A rebuilt tab with no run gives back anything
      this scene still holds, so the town is never shown paused or without its bars.
    - Leaving the Town tab: the shell gives both back itself; the bars are hidden during a run, so
      the player cannot do this.
    - Shell calls made from inside a frame (finishing, a rebuilt tab) are guarded: pausing ticks
      the game, which draws a frame, and that frame does not come back into the scene.
  - Checked in headless Chromium: a woodcutting action left running made
    no progress during a 25-second run (the save at 11 s and 25 s into it, and straight after
    leaving, all at 10 XP and 1 log) and carried on afterwards (3 logs 6.5 s later). The same is a
    jsdom test against the real app, with half an hour's gap inside the run.
  - Measured on the dev server at 390 × 844 (3x) with the CPU throttled 4x, walking to the smith:
    median frame 16.7 ms, p95 16.8 ms once the dusk pictures and the turned still are made (the
    first pass has one hitch of up to 83 ms when the smith turns and the still is composed); main
    measured the same way gave p95 16.8 to 33 ms. Walking the grotto in landscape: every frame
    16.7 ms.
  - Tests: the hero in look and gear, drawn again only on a change, lit at dusk; door links (every
    door leads somewhere and back, onto open floor), every door and the end reachable, a bad plan
    refused; a door's dark and the next room; the end stopping the clock; the rotate prompt's rule
    and the dungeon's scale; steering and re-aiming, tap versus hold; who turns which way; in
    jsdom, rowing out, the prompt, rotating mid-run, Leave asking once more, three rooms walked to
    the results and back, a rebuilt tab mid-run and after, and the idle task paused in the real
    app.

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

- Walk cycle.
- Ship, boat and buoys do not bob; the waterline foam on the ship and rock does not move.
- The grotto's rooms are flat placeholder colours until lane B draws dungeon tiles (B5).

## Needs from another lane

- Nothing.

## Notes for this lane's next session

- **What S14b needs from lane A's combat (S8):** the player's side as numbers a scene can read
  without running the idle fight: hit points and their maximum, attack, strength, armour and attack
  speed for the weapon in hand (`equipmentTotals` and the combat skills), and a pure function for
  one blow (hit chance and damage range) that takes its dice from a caller-supplied generator, so a
  dungeon can roll its own dice without touching the save's seeded generator. Monsters by id with
  their numbers and loot tables (`dock_rat` and friends, plus the grotto's own). Food: which cooked
  fish heal how much, and a rule to take items from the bank and give loot back at the end of a
  run, as one state change, so failing a run can keep what was picked up. Nothing of the run
  itself needs saving.
- The run never reads `state.action`; it only pauses the clock. The look and worn ids are the only
  things a scene reads from the state.
- A new room's stage is told its size by its own `ResizeObserver`; jsdom tests must call the
  observers again after a door (see `tests/scene/run.test.ts`).
- `runNow()`, `heroAt()` and `heroNow()` in `townView.ts` report the run, the hero's place and his
  pictures, for tests and screenshot scripts. A screenshot script on the dev server can import
  them (`await import('/src/scene/townView.ts')`) to find where things are.
- Taps near a thin thing pick it: a 12-pixel lamp's tap box grows to a thumb. A hold that starts
  on or near a thing is a tap on it, not steering.
- Where the hero is, what is open, how many times each person has been visited and any run under
  way live in module variables in `townView.ts`, not the save; they start again when the page is
  reloaded.
- The smith's bald head catches the forge's glow at dusk so strongly it reads orange; that was so
  before this session (the glow is lane B's).
- Checked in headless Chromium at 390 × 844 (3x) and 844 × 390. Not checked on a real phone or in
  Safari: notably not the safe-area insets on a notched phone held sideways, or iOS's own handling
  of rotation in a home-screen app.
