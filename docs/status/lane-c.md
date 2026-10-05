# Lane C: scenes

**Next session: S15: Brinebeard's Grotto** (brief in `docs/lanes.md`, wave 6).

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
letter a door joined to the door with the same letter in exactly one other room. Who waits in each
room is `foes` in the plan: a monster id and a floor tile.

| Room      | Size (tiles) | Doors                  | Foes (col, row)                      | What                                    |
| --------- | ------------ | ---------------------- | ------------------------------------ | --------------------------------------- |
| `landing` | 24 × 12      | `a` east               | dock rat (17, 3), dock rat (20, 8)   | the sea along the west; the start       |
| `pools`   | 40 × 12      | `a` west, `b` east (5) | sand crab (25, 5), sand crab (27, 9) | pools and rocks to walk round; scrolls  |
| `cove`    | 22 × 13      | `b` south              | smuggler (10, 3), dock rat (4, 8)    | the last room: clearing it ends the run |

The pools' way on moved from the top-right corner to the east wall: at the corner it sat under the
Leave button.

## Done

- **S14b: Fighting in dungeons.** A run is now a fight, played with the thumbs.
  - **The rules** (`src/scene/battle.ts`, pure): a `Battle` inside the `Run`, advanced by
    `advanceRun` with the hero's walk. The numbers are lane A's: `playerCombat` for the hero
    (attack, defence, max hit, hit points; the run starts at `hp`, the hit points he carries,
    and takes them home), `hitChance`, each monster's row, `PLAYER_ATTACK_MS`, `XP_PER_DAMAGE`
    and `DEFENCE_XP_PER_MAX_HIT` with Vitality's half, loot rolled from each monster's table as an
    idle kill rolls it. Dice: `Dice` seeded from the clock when the boat leaves; `state.rng`,
    `state.fight` and `state.action` are never read.
  - **Time.** The rules act on a tick every 100 ms of the run's own clock (it stops behind the
    turn-the-phone prompt and through doors); movement is carried exactly between ticks. Every
    timer is a whole number of ticks, so a heavy attack lands on a tick and is judged by exactly
    where the hero's feet are then, and the same seed with the same taps at the same moments
    gives the same run however the frames fall (tested at 20, 50 and 100 ms frames).
  - **Foes** (`src/scene/foes.ts`: speed, how far they notice, reach, how near they come, heavy
    attack and tap box, per monster id). They notice the hero in range and in sight (rock hides;
    water does not), walk up beside him, level with his feet (never one over the other), and
    wind up 0.8 s on arriving before the first blow, so stepping away and back resets it. The
    smuggler keeps 72 pixels off and throws. A room's doors are barred (and solid) while anything
    in it stands; the bars lift when it is clear.
  - **The hero** strikes whatever is in reach on his timer: the target if it is in reach, else
    the nearest in reach, which becomes the target. A tap on a foe (its tap box grown to a thumb)
    targets it and he walks up beside it; a tap on the ground walks there and keeps the mark.
    Melee reaches 30 pixels; a bow 120 with nothing but water between, an arrow a shot; out of
    arrows, he says so and does not shoot.
  - **The telegraph.** A heavy attack marks a circle on the ground: the whole circle faintly, its
    edge solid from the first frame, and a fill growing from the middle that reaches the edge as
    it lands; the edge flickers in the last 0.3 s, the attacker flashes and shows a "!" over its
    health, and a thrown one is seen in the air on its way. It lands only on feet nearer the
    middle than the radius, for twice the monster's max hit, no dice. Killing the attacker first
    calls it off. Sand crab: a slam round itself, radius 40, warning 1.3 s, 8 damage, every 6 s,
    only with the hero within 32. Smuggler: thrown at where the hero stands, radius 26, warning
    1.3 s, 26 damage, every 4.5 s, within 136 and in sight. The hero walks 64 pixels a second, so
    walking out from the very middle takes 0.63 s (slam) or 0.41 s (bottle), leaving at least
    0.67 s to see it and tap; a test holds every heavy attack to its walk out plus half a second.
  - **Abilities**, two per style, cooldown on the button: melee, Wide swing (a blow at everything
    within 40, 8 s; with nobody near it does nothing and costs nothing) and Brace (the next heavy
    blow within 6 s is halved, 12 s); ranged, Double shot (two arrows at the target, 8 s) and
    Step back (40 pixels straight away from the nearest foe at four times walking pace, turning
    up to 90 degrees round rock, 9 s). Food: a button with the slot's count, one fish a press,
    3 s between, not at full health; no slot, no button.
  - **On screen.** Foes are placeholder figures from the base ramps (rat grey and low, crab red
    and wide, smuggler tall in navy with a red scarf), each with a red health bar, a thin bar
    under it for its next blow while beside him (hot in the last 0.5 s), and on the target a gold
    ring at its feet and a gold chevron over its bar. Struck: a white flash and a number rising
    (white on foes, red over the hero, green for a heal, "miss"). Loot falls as a sack where the
    foe fell and is picked up by walking over it. The hero's health (with a bar for his next
    blow) is top left, the target's name, level and health top centre (with `portrait(id)` if the
    art lane has one), Leave top right; the three buttons bottom left, 76 × 64, inside the safe
    area, taking only their own taps (the bar between them lets taps through to the floor).
    Ready: a bright edge. Cooling: a dark shade draining away and the seconds left. Ready with
    nobody to use it on: dimmed.
  - **Endings**, each settled once through `shell.settleRun` with `spoilsOf` (XP, loot and coins
    picked up, fish eaten, arrows shot, the hit points left). Clearing the last room (the one
    with the marked spot) gathers its floor and ends the run 1.2 s after the last blow, with
    results: time, kills, XP by skill, coins and loot. Falling to 0 ends it the same way, washed
    back with what was picked up (hp 0 is lane A's knock-out). Leave keeps what was picked up and
    settles before the clock starts again. Loot left lying on a floor is lost.
  - **Drawing.** `fightArt.ts` adds to the stage through three new stage hooks (`drive` moves the
    walker by the run's rules, `tap` offers a tap to the fight first, `extra` adds actors and
    drawing on the ground and over everyone). The fight says where it draws, and the stage
    redraws those boxes (this frame's and last's) rather than the whole view; bars in the HUD
    move by transform. Measured with the CPU throttled 4x at 844 × 390 (3x): on the built app,
    mid-fight with two rats, frames median 16.7 ms, p95 16.8, worst 33; scripting 1.6 ms a frame
    and main-thread task time 14.2 ms a frame, against 14.6 standing still with nothing aware.
    On the dev server in the crabs' room, which scrolls, with telegraphs: median 16.7, p95 33.3,
    worst 50; scripting 2.1 ms a frame.
  - Checked in headless Chromium at 844 × 390 and 667 × 375: a strong melee character in iron and
    a ranged one with a willow bow cleared the grotto (dodging bottles and slams, standing in
    one), a new character with a bronze sword and no food fell in the crabs' room, and the bank,
    skills, food slot, quiver and the save afterwards showed what each run earned and spent.
  - Tests: targeting and reach (melee, bow, rock between), the tap box, noticing and wind-up, a
    thrower in and out of sight; the telegraph landing on him, walked out of, inside the edge and
    on it, braced, called off; every heavy attack's warning against its walk out; each ability
    and its cooldown; food; doors shut until the room is clear; each ending and its spoils, hit
    points carried in and out; a run the same from the same seed at three frame lengths; in
    jsdom, three rooms fought through with the doors opening and one settle, a fall with one
    settle, Leave settling before the clock, the HUD and buttons, and in the real app the spoils
    in the save, the bank and the skills.

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

- From S14b, by choice: no eating by itself in a run (the food button is the player's); a run
  does not report kills by monster, so bounties do not count dungeon kills (lane A noted the
  same); no fall animation beyond a red blink; the foes' figures are placeholders (B6); a heavy
  attack's circle is drawn over rock as well as floor.
- Walk cycle.
- Ship, boat and buoys do not bob; the waterline foam on the ship and rock does not move.
- The grotto's rooms are flat placeholder colours until lane B draws dungeon tiles (B5).

## Needs from another lane

- Nothing blocking. For B6 (lane B): sprites for `dock_rat`, `sand_crab` and `smuggler` to
  replace the placeholders. They are chosen by monster id in `foeFigure` (`src/scene/foes.ts`),
  feet at the bottom middle; tap box, reach and where the health bar sits are data there and do
  not come from the picture, so a sprite up to about 26 × 36 drops in. Facing right as drawn; the
  scene mirrors them.

## Notes for this lane's next session

- **The fight's pieces:** rules in `battle.ts` (pure: `advanceBattle`, `targetFoe`,
  `useAbility`, `eat`, `spoilsOf`), foes as data in `foes.ts`, a room's foes in the plan's
  `foes`, drawing in `fightArt.ts`, the HUD and buttons in `dungeonView.ts`. A new monster in a
  dungeon is a `FOE_KINDS` row (an unknown one fights as a rat) and a figure. A new heavy attack
  is a `Heavy` row: its warning must be a whole number of ticks and pass the fairness test.
- Taps go to the fight first (`tap` on the stage): a foe under the finger is targeted, anything
  else walks. The run's `play` is the truth; the stage's is only a way in for taps (`given` in
  `dungeonView.ts`).
- A run is settled once (`settled` in `townView.ts`), from `finished` or `leave`, whichever comes
  first. A reloaded page loses a run in progress and its spoils (nothing is saved while it lasts,
  as the brief says).
- Screenshot scripts on the dev server can read the run with `runNow()` (its `battle` has every
  foe, pile and timer). Restart the dev server after an edit: it otherwise serves a second copy
  of `townView.ts` that the page's own app does not use.

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
