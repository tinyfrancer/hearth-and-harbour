# Lane C: scenes

**Next session: S16: Dungeon progression and replay** (brief to come in `docs/lanes.md`).

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

Five rooms in `src/scene/grotto.ts` (each sketched in a comment above its rows), read by
`buildDungeon` (`src/scene/dungeon.ts`) through `readGround` (`src/scene/ground.ts`, which has the
key: `#` rock, `.` rock floor, `:` dry sand, `=` planks, `~` deep water, `,` shallows, `0`-`3` sand
the tide reaches by height, `s` start, `x` end, `B`/`D` cell bars of the first and second wave,
`K C T A R N` props, `L` a lantern on the rock, any other lower-case letter a door). The tide
(`src/scene/tide.ts`) has four levels; one level over a tile is shallows, two is deep water.

| Room     | Tiles   | Doors              | Who (col, row)                                                           | The tide here                                                                                        |
| -------- | ------- | ------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `pools`  | 38 x 14 | `a` east (37, 6)   | giant crab (28, 7), (33, 10)                                             | a sandbar over the channel: the short way at low water, wading at 1, gone at 2; the ledge goes round |
| `store`  | 36 x 14 | `a` west, `b` east | deckhand (12, 4), (22, 6); powder monkey (31, 3)                         | the sand below the plank deck floods to shallows: kegs go out in water, but you wade                 |
| `bridge` | 42 x 14 | `b` west, `c` east | deckhand (30, 6), (35, 7), (36, 4); parrot, perches (20, 3) and (22, 10) | the bridge never floods; sandbars below are a second way only at low water, and reach the low perch  |
| `brig`   | 34 x 14 | `c` west, `d` east | two waves of two, behind bars `B` then `D`                               | stone floor; the sea wells up through the grating and pushes the fight out to the walls              |
| `cove`   | 36 x 14 | `d` west           | Brinebeard (24, 5); help comes ashore at (7, 6) and (29, 6)              | his own tide: out until he calls it at two thirds, then up a level every 5 s to high water           |

- Every room keeps its doors' inside tiles and the start dry at every level; at low water each
  room is one floor; ground only gets wetter as the water rises, so anywhere dry at a high tide
  rejoins the floor when it falls (the cycle always comes back to low); the cove is one floor at
  every level. `tests/scene/grotto.test.ts` holds all of it, and that every wash-off lands within
  five tiles.
- Lanterns hang only on rock with open floor below (north-facing walls).

## Done

- **S15: Brinebeard's Grotto.** The grey box is gone; the first real dungeon is in.
  - **The tide** (`tide.ts`, pure): a 60 s cycle on the run's own clock, 18 s low, a level every
    6 s up, 18 s high, and down; the run starts 4 s into low water. Every rise is shown 3 s ahead:
    the gauge's water creeps and it says "Rising" with a flashing arrow, sand about to be covered
    turns to wet sand with foam ripples drifting over it, shallows about to go deep darken. The
    cove's tide is the captain's (`surgeTide`). A room is a tile map per state of the tide, barred
    doors and opened cells (`groundMap`, each made once and kept).
  - **The water in a fight** (`battle.ts`): shallows slow anyone in them to 0.6 of their pace;
    deep water is solid; anyone (hero or foe; fliers excepted) standing where the sea has just
    gone deep is carried at three times walking pace to the nearest ground to stand on, reached
    over water and never through rock (`shoreOf`). For the hero that costs a fourteenth of his
    hit points, never the last one. A walk the water has since cut is planned again round it. All
    of it is decided on ticks, so a run is the same however the frames fall (tested through a turn
    of the tide at 20, 50 and 100 ms frames).
  - **The cast** (`cast.ts` for numbers and drops, `foes.ts` for how they move); the idle game's
    formulas decide every blow. Deckhands walk up and hit. The powder monkey keeps 92 px off,
    backs away inside 60, and lobs a lit keg at where the hero stands; it stands still while the
    fuse burns, and a keg that lands in shallows or deep water goes out. Giant crabs are slow and
    slam all round them. The parrot sits on a perch out of a blade's reach (a bow reaches it),
    comes down beside the hero after 6 s, stays 2.8 s and flies up to its other perch; while it
    lives, any of the crew within 120 px of it strike half as fast again (green chevrons over
    them, a green ring at their feet, a squawk spreading from the parrot).

    | Id              | Level | HP  | Attack | Defence | Max hit | Blow every | Walks | Heavy attack                                             |
    | --------------- | ----- | --- | ------ | ------- | ------- | ---------- | ----- | -------------------------------------------------------- |
    | `deckhand`      | 16    | 30  | 54     | 36      | 8       | 2.4 s      | 44    | none                                                     |
    | `powder_monkey` | 14    | 22  | 44     | 34      | 6       | 2.0 s      | 50    | keg, radius 28, marked 1.8 s, 18 damage, every 4.6 s     |
    | `giant_crab`    | 18    | 52  | 50     | 50      | 8       | 3.0 s      | 22    | slam, radius 46, marked 1.7 s, 24 damage, every 5.6 s    |
    | `ships_parrot`  | 15    | 18  | 58     | 56      | 3       | 2.0 s      | flies | none (rallies the crew)                                  |
    | `brinebeard`    | 22    | 180 | 64     | 50      | 12      | 2.8 s      | 34    | anchor (phase 3), 210-degree sweep, radius 58, 1.6 s, 24 |

  - **Brinebeard**, in three phases by his hit points. Phase 1: in person, with cannon volleys of
    two lines straight down the cove every 7 s, marked 2 s, 18 damage, the first through the hero,
    lines at least 48 px apart, each 20 px wide. Phase 2 (two thirds): he shouts, calls the sea in
    (a 3 s warning, then a level every 5 s to high water, where it holds) and two deckhands come
    ashore. Phase 3 (one third): he shouts again; volleys of three every 4.5 s, marked 1.6 s, and
    the anchor every 7 s. One big thing at a time: no volley starts while the anchor is winding up
    and no sweep while a volley is coming (tested over a minute of phase 3). When he falls his
    crew run for it (no kill), the sea goes out, and the cove is cleared.
  - **Readable at a glance**: circles in red with a fire edge (slams, kegs; a keg arcs over and
    lies sparking where it fell), lines hatched in marching fire with the shots' shadows growing
    (volleys), a pale steel wedge filling round as he swings (the anchor), and blue for the sea.
    The fairness test now finds each mark's worst spot by search and holds every warning to the
    walk out of it plus half a second, and to the wade out of it plus a quarter.
  - **The brig**: the doors bar as you come in (every room's do while anything stands); its first
    two cells open once the hero is 40 px inside, the other two when those are beaten.
  - **Loot and spoils**: each of the cast drops doubloons and sometimes its own thing (deckhand:
    cutlass 1 in 30, boarding axe 1 in 45; powder monkey: tricorn 1 in 20; crab: pearls 1 in 5;
    parrot: feathers). The captain drops 8 to 14 doubloons, the coat or the spyglass one clear in
    two, the anchor one in 30, the figurehead one in 20. Every roll is made whether or not the
    tables know the item, and an item they do not know is left out, so the dungeon worked before
    lane A's items landed and rolls the same after. Loot from something that falls over water
    lands on the nearest shore. `spoilsOf` now gives `kills` by monster id and, for a clear,
    `cleared: 'brinebeards_grotto'`. After rebasing onto lane A's items a clear paid doubloons and
    a spyglass into the bank.
  - **On screen**: dusk, lit by lanterns (the hero is lit by the room's lanterns, not the town's);
    a tide gauge beside Leave; the captain's health in the target's place while he stands, with a
    notch across his bar where each phase begins; each room's name for a moment on the way in; what the captain shouts in a
    bubble over him. The boat's panel says where it goes and what to bring. Art comes through
    `dungeonTile`, `dungeonProp` and `foePicture`, each falling back to this lane's own drawing on
    null; a sprite of any size drops in (its feet and height taken from the picture for drawing
    only, its health bar above whichever is taller, picture or tap box), mirrored to face left.
  - **The scripted hero** (`tests/scene/grottoBot.ts`): walks out of anything marked or about to
    flood, eats below half health, goes for the nearest foe he can reach, never uses an ability,
    and notices anything new 0.4 s late. `grottoRun.test.ts` plays twelve fixed seeds at each
    strength. Over twenty seeds: at the end of tier 1 (levels 19, full iron, 20 cooked cod) 19
    cleared, median 8.3 min (6.8 to 10.3), eating a median 19 of the 20 fish; median room times
    pools 90 s, store 61, bridge 97, brig 84, cove 167; the one failure fell to the captain. With
    no reaction delay: 17 of 20, median 8.2 min, the three failures all in the cove. At half
    strength (levels 10, bronze, the same fish): 0 of 20, falling in the brig (12) or the cove (8).
  - **Seen dressed** after rebasing onto lane B's grotto art (B6), and fixed on this side: each
    cell asks for its own tile wear (its index in the room); shadows, under props and walkers, in
    lane B's step for the ground (`GROTTO_SHADOW`); every light taken from the glows in the props'
    own pictures, so the lanterns light from their flames; the parrot drawn by how far its picture
    already hovers (perched on its post, down on the ground when it lands); health bars over the
    top of what is drawn, not the picture's empty rows; the monkey's fuse glow mirrored with him;
    tap boxes grown to the new figures (deckhand 22 x 44, monkey 18 x 36, parrot 22 x 22, captain
    36 x 56); and the captain's name fitting beside his portrait at 667 x 375 (phases became
    notches on the bar). Depth order, the brig's bars and the props' feet sat right as they were.
  - Found on the way: the room's ground is refreshed after each frame as well as before it, so a
    tap in the instant after a room clears walks through its door; `mergeBoxes` leaves apart boxes
    whose union would be mostly empty.
  - Measured in headless Chromium at 844 x 390 (3x), CPU throttled 4x, on a production build: a
    quiet room 60 fps (median 16.7 ms, p95 16.8); the bridge fight (three deckhands and the
    parrot) median 16.7, p95 33.4, worst 50, about 48 fps; the captain's last phase with his crew,
    volleys and the anchor, median 16.7, p95 33.4, worst 50, about 49 fps. The frame callbacks
    take p95 4.6 ms (bridge) and 6.5 ms (cove). Most of each fight frame is the browser copying
    the changed 2532 x 1170 canvas for the compositor, in software here (about 14 ms a frame);
    `main`'s grey-box rat fight, measured the same way, pays about 12 and just holds 60. Dressed
    in lane B's art, the same: quiet rooms 60, the bridge fight about 48 fps, the captain's last
    phase about 46, frame callbacks p95 4.5 and 6.8 ms.
  - Checked in headless Chromium at 844 x 390 and 667 x 375 with a melee character of the
    intended strength, a ranged one (willow bow) and a weak one; screenshots in
    `/home/claude/lane-shots/wave6-c/`.

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

- From S15: **a run is not saved while it lasts**: a reload, or a phone that drops the page while
  locked, loses a seven-to-ten-minute run and what it picked up. Turning to portrait and the page
  going to the background both pause it cleanly (the background is tested: ten minutes away
  moves the run a quarter of a second). Saving a run needs a place in the save (lane A's).
- From S15: fight frames run near 48 fps in headless software rendering at 4x; not checked on a
  phone's GPU, where the canvas copy that costs most here is cheap. If it shows on a phone, the
  next step is fewer, smaller patches a frame.
- From S15: dungeons are always dusk; the waterline's foam moves only when the tide changes level.
- From S14b, by choice: no eating by itself in a run (the food button is the player's); a run
  does not report kills by monster, so bounties do not count dungeon kills (lane A noted the
  same); no fall animation beyond a red blink; the foes' figures are placeholders (B6); a heavy
  attack's circle is drawn over rock as well as floor.
- Walk cycle.
- Ship, boat and buoys do not bob; the waterline foam on the ship and rock does not move.

## Needs from another lane

- Nothing blocking. For lane B: the store asks `dungeonProp('grotto', 'crate')` and the bridge
  `dungeonProp('grotto', 'perch')` (a mooring post the parrot sits on); neither id is in the
  fixed list, so both show this lane's own drawing beside lane B's art until lane B adds them.
  Every other tile and prop id in `docs/lanes.md` is used. A foe sprite of any size drops in
  (`foeSprite` in `foes.ts`); a prop stands on its tile with its `base` row two pixels above the
  tile's bottom, and whatever glows in its picture lights the room.
- For lane A, when wanted: the grotto's cast lives in `src/scene/cast.ts`, not the monster
  tables, so `kills` by those ids count for nothing in the bestiary yet (as S10's brief says an
  unknown id should). Saving a run in progress would need a place in the save.

## Notes for this lane's next session

- **The grotto's pieces:** the tide in `tide.ts`, a room's ground in `ground.ts`, the rooms in
  `grotto.ts`, the cast's numbers in `cast.ts`, how they move in `foes.ts`, the rules in
  `battle.ts` (`tideOf`, `mapOf`, `shoreOf`, `bossTurn`, `fly`), drawing in `grottoArt.ts`
  (rooms, tiles, props) and `fightArt.ts` (marks, foes, effects), words in `grottoWords.ts`.
  `groundNow(dungeon, run)` is the map to walk on now.
- A room's tide matters only if its rows use `0`-`3`; `stoneTide` draws that ground as a flooded
  stone floor with a grating at height 0. A flier in a plan must start on one of its room's
  `perches`.
- `keepRun(run)` in `townView.ts` lets a screenshot script put a run in place (jump rooms, set
  the clock or a foe's health). To time frames on a production build, build a scratch HTML entry
  that also loads the screenshot helpers and exposes them on `window`.
- Balance is held by `tests/scene/grottoRun.test.ts` (twelve fixed seeds a strength, 0.4 s
  reactions). Changing a number in `cast.ts` or `foes.ts` that breaks it is a decision.

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
