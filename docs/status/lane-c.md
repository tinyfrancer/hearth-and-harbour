# Lane C: scenes

**Next session: the dungeons at the C scale** (lane B's grotto art at 24 pixels is drawing now; the
exact steps are under Notes, "Switching the dungeons to the C scale"), then **S16: Dungeon
progression and replay** (brief to come in `docs/lanes.md`).

## The town's map

Everything is in art pixels; walking tiles are 24 (`TOWN2_TILE`). The town is lane B's
(`src/art/town2/`): 60 x 89 tiles, 1440 x 2136, laid out by `town2Layout()` and walked on
`town2Walk()`. This lane adds only footprints for the townsfolk, words, lookouts and taps
(`src/scene/town2.ts`).

| Rows  | What                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------ |
| 0–8   | The forest (solid); its back-row pines are scenery, the front row (row 9) can be tapped          |
| 9–45  | Grass: the road north, your house (cols 34–47, rows 22–27) with its garden fence, the oak, pines |
| 40–45 | The tavern (cols 3–23) and the smithy (cols 34–51), fronts on row 45                             |
| 46–59 | The square: well, stall, benches, lamps, notice board; the quay's cargo along rows 57–59         |
| 57–64 | The beach west of the quay, down its stairs                                                      |
| 60    | The quay wall; the pier (cols 27–30) runs out to row 77                                          |
| 61–88 | Sea: the rowing boat, the ship, the rock and its wreck, two buoys                                |

- Townsfolk (`TOWNSFOLK2_AT`): smith (40, 48), trader (13, 53), captain (28, 64) on the pier; the
  villagers alewife (17, 46) and docker (38, 58). Each stands on a tile of their own (solid), is
  talked to from the side(s) listed at a talking point (`Thing.stand`) far enough off not to
  overlap, breathes, and casts a contact shadow laid into the ground when it is painted.
- Strollers (`STROLLERS2`, routes in `TOWNSFOLK2_AT.stroll`): the market woman from (6, 53) up to
  (6, 51) and west to (2, 51), 40 px/s, resting 4 s at each end; the old man from (34, 54) up to
  (34, 52) and east to (41, 52), 30 px/s, resting 5 s. Never solid, tapped where they are, their
  shadows cut from the ground as they walk; nobody else is sent to stand on their tiles.
- Start: lane B's `TOWN2_START` (26, 56); the boat lands him at (18, 59).
- Scenery only (no tap, no words): forest pines with nowhere to stand beside them. `buoy-far`
  (moved by lane B to foot (840, 2084)) is tapped like the near buoy, looked at from (30, 77).

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

- **Wave 10: the walk, and the weak spots.** Lane B's B9 walk cycle is wired for the hero and two
  strollers, the town is kept between visits, and every weak spot left by S16a is dealt with.
  The grotto is untouched in behaviour (its test files unmodified, all passing).
  - **The walk** (`figures2.ts`): a figure is painted in a `Pose2` (walking: lane B's facing and
    frame; standing: a breath frame each way) through `characterWalkPicture2`,
    `characterIdlePicture2`, `townsfolkWalkPicture2` and `townsfolkIdlePicture2`, lit by the
    scene's own lights as before. Frame by distance: `strideFrame(walked - strideFrom,
WALK2_STRIDE)`, so the ground moves exactly one stride under the planted foot a frame at any
    pace (the strollers use `TOWNSFOLK2_STRIDE`); a walk starts on frame 0 (`Play.strideFrom`
    is set when he stops); `walked` now counts the path walked, corners included
    (`stepBy`), so one long frame and many short ones give the same distance and frame. Lane B's
    `'left'` frames are used as given. The stage's one-pixel bob is gone for the town's walker
    (`StageArt.walkerPlaced` places him; the dungeons keep the old path). Standing, the breath
    alternates by the scene's clock (`breathFrame(now)`), the standing townsfolk each out of step.
    - **Facing**: `Play.way` (across, down, up) with hysteresis in `wayAfter`: across turns to
      down or up only past 60 degrees from level, and back only under 30, so a diagonal never
      flickers. The choice of lane B's facing is one function, `walkFacing(way, side)`: down
      shows the down frames, across the side frames (lane B's `'left'` as given, never mirrored
      here), and **up shows lane B's `'up'` back view** (B10b landed during this wave; the
      switch was that one line, and the walk was recorded again after it).
    - Every pose (32 stride frames in four facings and 4 breaths) is painted ahead of need, one a frame
      (`Painted.warm`), so the first walk each way does not hitch. By day a walker's pictures are
      36 canvases of 16 KB (about 580 KB for the hero, the same per stroller); at dusk a lit picture
      per place and pose is kept, 48 at most, the oldest lending its canvas to the next.
  - **Strollers** (`stroll.ts` pure, `town2Folk.ts` rules): the market woman and the old man take
    a turn there and back on data-defined routes, resting at each end; where they are is a pure
    function of their own clock, which runs with the scene's time and holds while the hero is on
    his way to them or talking. Their routes keep clear of every tap box, door spot and talking
    spot (tested every 100 ms of a round), and no one is sent to stand on their tiles. A tap on
    one (their own box first; a thumb-grown box only where no thing's own box holds the tap)
    stops them; the hero walks to the nearer talking point beside where they stopped, they turn
    to him and breathe, he turns to them, and they walk on when the panel closes. The others
    stand and breathe. Their pictures are painted on the page (the standing ones in the worker),
    and each has a contact shadow cut from the ground as they walk.
  - **Talking spots** (`Thing.stand`, `talkGap`, `standBeside` in `town2.ts`): the hero stands
    level with whoever he talks to, their reach toward him (from lane B's picture) plus his
    widest reach in any gear (`HERO_FRONT` 17, every wearable tested) plus 2 px of air: smith 35,
    trader 37, captain 33, alewife 34, docker 39, market 30, old man 32. Reached from the tile
    beside them by a short last step (`STAND_HALF`, so his boots may come up to the smith's anvil).
    Both face each other. Shots: `talk-smith.png`, `talk-trader.png`, `talk-alewife.png`.
  - **The town kept between visits** (`town2Cache.ts`, all in the worker): the facts and, per time
    of day, the still (every standing piece on it), pieces, foam, smoke, gull and townsfolk as
    PNG bytes, and the ground cells gzipped (`CompressionStream` where there is one), in
    IndexedDB. **Key**: the worker's own fingerprinted file name (`town2Worker-<hash>.js`),
    prefixed with a format number. Vite hashes the worker's whole bundle, which holds every line
    that decides a town pixel (lane B's drawing, palettes, layout, figures; this lane's painting,
    shadows, words, townsfolk), so any deploy that changes the town's look is a new key, and one
    that changes only menus keeps the kept town; it needs nothing from another lane and no
    hand-kept version. A worker without a hash (the dev server) keeps nothing. Each store throws
    away every other version. The worker answers from storage when it can (bitmaps decoded
    straight from the PNGs, `colorSpaceConversion: 'none'`), and otherwise works the town out,
    sends it, and keeps it after (the page lets the worker go on its last word, `kept`, or 30 s
    after the town). Storage that is missing, refuses, is full or does not answer in 1.5 s is
    skipped: the town is worked out as before. `forgetTown2Grids()` frees lane B's composed ground
    after painting, and the pieces too once painted in the worker; the gull's size and loops come
    from `town2Facts(id)` without drawing it.
    - **Storage used**: 1.68 MB for one time of day (1,680,485 bytes of pictures and cells), about
      3.4 MB with both; Chromium reports 5.1 MB of IndexedDB for the origin (its own overhead).
    - **First open**, measured from the page's start with the Town tab tapped as soon as it is
      there (production build, Playwright 390 x 844 at 3x, headless Chromium), three of each:
      unthrottled, cold 2.34 to 2.91 s, warm 0.48 to 0.66 s (the town 90 to 250 ms after the tab);
      at 4x CPU throttle, cold 3.27 to 4.29 s, warm 1.01 to 1.18 s. The kept town is pixel for pixel
      the town worked out (the whole 1440 x 2136 still compared).
  - **The loading card is a scene** (`loadingScene.ts`): the harbour from the water at the town's
    own size on screen (240 x 96 art pixels, one CSS pixel each at 3x), sky and far shore and the
    swell rocking in the town's cells, the quay in its stone, lane B's rowing boat pulling in
    toward the quay a quarter of the way for each real step of the work, bobbing, and lane B's
    gull crossing; the town's name, its line and the stepped bar under it. Shot: `loading.png`.
  - **The slow walking frames**: measured with long-animation-frame attribution, CPU profiles and
    traces at 4x. Causes found and fixed: a tap's path search over the 60 x 89 map (two searches
    for a tap on a thing) was 34 to 38 ms of event handling at 4x, made of a tuple per heap push
    and an object per tile looked at; it now works on typed arrays with each map's solid tiles
    worked out once (`path.ts`), the same order of visits, 7 times faster (2.1 ms to 0.3 ms a search
    unthrottled). The walker's shadow made two new buffers every frame he walked (with two
    strollers, three), keeping the collector busy; it now paints into one kept buffer. Posing a
    walk frame the first time it was needed was a hitch on the first walk each way; they are
    painted ahead. Every patch asked every standing piece its size (a call into the browser each
    time, about a fiftieth of a frame's script); the boxes are kept. What is left: at 4x, 0 to 4
    frames over 40 ms in two minutes of walking (was about one a minute), each with no script in it
    by long-animation-frame attribution and next to no rendering: the browser's own work (the
    canvas's commit in software, or collection between tasks), which headless Chromium cannot
    say more about.
  - **Frame rates** (production build, 390 x 844 at 3x, a scripted tap route round the square,
    quay and upper street, frames where the hero moved): unthrottled 60.0 fps, p95 16.7, worst
    33 ms, none over 40 in a minute; at 4x 59.9 fps, p95 16.8, two frames over 40 (50, 67 ms) in
    two minutes; dusk at 4x 59.8, two (67 ms) in a minute. Measured again after rebasing onto
    lane B's four-facing walk (B10b). One 4x run of several showed three frames of 150 to 167 ms
    together 18 s in, on a cold open while the worker was likely still storing the town (the
    throttle slows the worker too, and this sandbox has few cores); not seen again. JS heap 15 to
    30 MB.
  - **Contact shadow on busy ground** (`shadow2.ts`): on cobbles and stone (flagstones, the well's
    paving, the quay) the shadow goes a step further and is never lighter than a floor (core at
    least step 5, penumbra step 4), so it reads as one dark shape among the joints; grass, sand,
    the road and boards keep one and two steps. Shot: `shadow-cobbles-400.png` (cobbles, quay,
    grass, at 400%).
  - **`buoy-far`** is tappable (out of `LOOKED_AT_ONLY`, now empty); `reach.test.ts` passes at 360,
    390 and 430 CSS px with it.
  - **The dungeon's target panel** (`framedFace` in `dungeonView.ts`): the face is lane B's
    48 x 48 `portraitPicture`, drawn at the most whole device pixels an art pixel that fit the
    48 px frame (3 at 3x), so the whole face shows, hat to chin; the boss panel the same. It was
    lane B's 2x canvas (96 px) cut to its middle 48. Shot: `grotto-fight.png`.
  - **The room's name** (`titleSlot`, `combatantBoxes`): while it shows, it sits under the health
    bars unless anyone in the fight (hero, any foe still standing, each box with its health bar)
    is under it; then above the ability bar; if both are taken, it waits unseen. The stage now
    says where its camera was after each frame (`seen`). Shot: `banner-cove-600ms.png`.
  - **The dungeons' scale as data** (`dungeonMetrics.ts`): `DUNGEON` (today `FIRST_SCALE`: 270
    across, 16-pixel tiles, distance 1) decides `dungeonScale`'s world, every tile in `dungeon.ts`,
    `battle.ts` and `ground.ts`'s maps, and every distance in `battle.ts` (reaches, stands, pickup,
    the brig's step, sweeps, step back, backing off, keeping beside, the hero's pace) and in
    `foes.ts` (`kindAtScale`: paces, notice, reach, keep, shy, tap boxes, heavy marks and ranges,
    fliers, rallies, volley lines). `C_SCALE` (360, 24, 1.5) is declared, not in force. Every grotto
    test passes unmodified; the steps left are under Notes.
  - Tests: `walk2` (frame by distance at five paces; a stride of ground per frame shown on real
    walks with uneven frames at three paces; first frame on setting off; the breath; facings;
    hysteresis at 29/31 and 59/61 degrees and a wavering diagonal; down the pier and back up it from behind; one step against many for place,
    distance and frame), `stroll` (the hero's widest reach in any gear; every talking point clear,
    level, walkable and within notice; walking up to each standing person and facing them; rounds;
    clocks however time is cut, held while talking; routes clear of taps and spots; tapping each
    stroller mid-walk stops them, the hero comes beside, both face each other, and they walk on;
    a thing's own box wins a tap), `town2Cache` (version from the file name; miss, store, hit with
    the same pixels, cells and facts; both times counted; a new version misses and evicts the old;
    an old shape is not read; failing, full and silent storage fall back), `dungeonPolish` (the
    whole face in its frame at five ratios; the room's name never over anyone over a grid of
    arrangements, moving or waiting; first scale unchanged; C scale's numbers), `loadingScene`,
    `townView` (a stroller stopped by a tap and walking on after; villagers walked up to where they
    are), `shadow2` and `town2Paint` for the busy grounds, `town2` for strollers and the buoy.
  - Checked in Playwright (390 x 844 at 3x, touch, production build; 844 x 390 for the grotto).
    Recorded on a stepped clock from the canvas's own pixels and looked at frame by frame:
    `walk-in-town.gif` (across the square right, left past the old man, up, and down to the quay)
    and `stroll-elder.gif`; no sliding or facing flicker seen. All in `/home/claude/lane-shots/w10-c/`.

- **S16a: the C-scale town is the town.** No query string, no preview: the Town tab shows lane
  B's C-scale town with lane B's C-scale figures for everyone. The dungeons are untouched (same
  scale, figures and rules; their seven test files pass unmodified).
  - **Deleted:** `preview.ts` and its test; the first town's `town.ts`, `townArt.ts`,
    `ambient.ts` and their tests (`town.test.ts`, the preview's `town2View.test.ts`, which
    became `townView.test.ts`). Its words came across into `town2.ts` under the same names. The
    few old-scale figure helpers the grotto still draws with (`HERO_FEET`, `litWalker`, `litBy`,
    `mirrored`, `walkerShadow`) moved to `walkerArt.ts`, unchanged; the dungeon files only had
    their import path changed. The town's code is no longer loaded on demand. Nothing under
    `src/art` was touched (lane B retires the first town's art).
  - **Scrolling at one canvas pixel per art pixel.** The stage takes `pixelated: true` (the town
    only): the canvas holds the view at one pixel per art pixel and the browser enlarges it by
    the whole scale (`image-rendering: pixelated`, with `-webkit-optimize-contrast`,
    `-moz-crisp-edges` and `crisp-edges` before it for older engines). `pixelFit` (`scale.ts`)
    sizes it so the enlargement is exactly the scale both ways and the CSS size is whole device
    pixels, trimming a step at most. A frame writes a ninth of the pixels it did at 3x. The
    dungeons keep drawing every device pixel, because the fight writes words and thin lines.
    Measured (production build with a scripted tap route round the whole town, about 58 s of
    walking, counting only frames where the hero moved, 390 x 844 at 3x, headless Chromium in
    software): unthrottled 60.0 before, 59.8 after; at 4x CPU throttle 46.1 fps before (p95 33 ms,
    worst 117) and 59.9 after (p95 16.7, worst 50); at dusk at 4x 42.4 before, 59.9 after. A
    second route (holding a finger to steer, standing included): 51.5 before, 59.9 after at 4x.
  - **First open.** Nothing heavy on the page's thread: the worker (`town2Worker.ts`) now works
    out the facts too (`town2Facts.ts`: the scene, the lights, where smoke and gulls are, as plain
    data), and paints everything time-dependent (ground with townsfolk's shadows, pieces, foam,
    smoke frames, the gull, the townsfolk facing each way). Where workers can draw
    (`OffscreenCanvas`) it composes the still and sends bitmaps; elsewhere raw pixels, composed
    on the page. The page starts the worker as soon as it loads, so the town is usually ready
    before the tab is opened; if not, the tab shows a loading card at once (the town's name, a
    line, a bar filled a quarter at a time by the worker's real steps: facts, ground, pixels,
    town), with the stage under it from the moment the facts are in. Measured at 4x, tab tapped
    about a second after load: before, a 914 ms long task and a dark scene until 2.7 s; after,
    the card on the first frame, no long task, worst frame 20 ms, the town at 2.8 s. Opened the
    moment a reloaded page is up, at dusk, at 4x: before, a 1.77 s freeze and the town at 7.0 s;
    after, worst frame 53 ms, the town at 2.3 s. Unthrottled: the card at 2 ms, the town at
    0.9–1.4 s, worst frame 17–67 ms.
  - **Shadows** (`shadow2.ts`): a person's contact shadow is the ground's own cells darkened, as
    the art lane shades everything (two steps in a core under the soles, one step in a penumbra
    that falls further right than left, longer at dusk; never to the line step). The townsfolk's
    are laid into the ground before it is painted; the hero's is cut from the ground's cells as
    he walks and painted with the lamps that reach it, onto one small canvas reused. Right on
    grass, road, cobbles, flagstones, sand, the pier and the quay, and at dusk.
  - **Taps:** `reach.test.ts` walks every tile the hero can stand on at 360, 390 and 430 CSS px
    (3x, with each phone's Town-tab height) and holds every tappable thing to being brought on
    screen and picked by a tap somewhere not under the sun button (whose place now comes from
    `SCENE_BUTTONS`). It found 17: back-row forest pines whose only unhidden part lay off the map
    (one under the sun button), and `buoy-far`. The pines with nowhere to stand beside them are
    scenery now; `buoy-far` is scenery until lane B moves it.
  - **The villagers**: the alewife by the tavern, the market woman by the stall, the docker by
    the east cargo, the old man by the bench east of the well, each with a name, a round of
    lines and an evening one, no button (`townsfolk.ts`).
  - **Day/dusk flip:** the new time's town arrives as bitmaps; nothing is composed on the page.
    Worst frame 33 ms at 4x (was 183, with two long tasks of about 100 ms), 17 ms unthrottled
    (was 33). The old picture stays up until the new one is in, as before.
  - **Crisp, checked in Chromium**: screenshots at 390 x 844 at 3x (day and dusk), 412 x 915 at
    2.625x and 375 x 667 at 2x, every art pixel tested as a uniform block of 3 x 3 (2 x 2 at 2x)
    device pixels across the whole canvas: no exceptions. **Not checked in Safari or WebKit:**
    no WebKit build in this sandbox and its download is blocked (see Deferred).
  - Walked on a phone-shaped screen by taps: every villager's panel, the house, the oak, the
    tavern, the smithy at dusk, the pier's end, the boat, into the grotto (sideways) and back to
    the boat. Screenshots in `/home/claude/lane-shots/w9-c/`.
  - Tests: `townView` (rewritten for the town: no query string shows it, the hero at its start,
    buttons, crate, smithy, house, stall, oak, smith's round, each villager, day and dusk,
    steering, dress, the boat and back; the loading card with a stand-in worker, asked once a
    page, a flip keeping the old picture), `reach`, `shadow2`, `scale2` (`pixelFit` at seven
    screens), `town2` (words, villagers, scenery), `town2Paint` (the paint as the worker makes
    it, shadows laid only near the townsfolk and only one or two steps), and `path`, `walker`,
    `steer`, `hero`, `draw`, `run` moved off the first town. `run.test.ts` changed only where it
    walks the town to the boat and where it expects the landing.

- **S16-prep: the C-scale town, walkable, as a preview.** Lane B's redrawn town
  (`src/art/town2/`, 1440 x 2136 art pixels) is a scene to walk in, shown only on a page opened
  with `?town=2`. Without the query nothing a player sees has changed: the default town was
  screenshotted on `main` and on this branch at day and at dusk, standing and after a walk, on a
  frozen clock, and the PNGs are byte-identical.
  - **The switch** (`preview.ts`, temporary): reads `?town=2` once a page. `townView` asks it and
    shows either town through the same door, loading the new town's code (`town2Place.ts`) only
    when asked, so players download 4.5 KB more than before, not the new town; the dungeons are
    the same either way, and the boat lands the hero back beside the boat in whichever town he
    left.
  - **Scale belongs to the scene** (`scale.ts`): `SceneSize` (width, least height, slack) and
    `scaleFor(size)`; the current town and the dungeons keep 270 wide, the new town is
    `TOWN2_SCENE`, 360 wide and at least 213 tall with 12 pixels of slack, so a 412-wide Android
    at 2.625x (whose canvas `canvasFit` trims to 1071 device pixels) keeps 3 rather than dropping
    to 2. Whole device pixels everywhere: 3 at 360, 390 and 430 CSS pixels at 3x (360, 390 and 430
    art pixels across); 2 on a 375-wide iPhone SE. Wider screens: the app column stops at 480
    CSS pixels, so a 2x tablet gets 2 and a 1x desktop 1, which is one CSS pixel an art pixel,
    showing 480 art pixels across with the people the same size on screen as on a phone.
  - **Tiles belong to the map** (`tileMap.ts`): `TileMap.tile` (16 when absent), `tileOf(map)`,
    and `cellAt`/`centreOf` take a tile size. Path-finding, walking, steering, facing and the
    stage read the map's; feet are `FOOT_HALF` in proportion (6 on 24-pixel tiles). A scene may
    set its own `speed` (88 here), `stride` (8) and `notice` (54).
  - **The stage takes a scene-made still** (`stage.ts`): `StageArt.still(palette)` instead of
    `ground` and the things' sprites, `standers` (people drawn as actors, redrawn only when one
    turns), `life` (moving things already on canvases), a canvas wherever a `Picture` went
    (`Look`), and `focusRise`. The current town and the dungeons take the old paths unchanged.
    `drawFrame` now copies only the part of a picture a patch needs (the same pixels; a building
    redrawn in front of the hero no longer costs its whole size at the scale).
  - **The town** (`town2.ts` data, `town2Art.ts` drawing, `town2Paint.ts` pixels,
    `town2Worker.ts`): every placement but smoke, gulls and the pier's boards is a thing under
    lane B's name, with lane B's footprints, spots and tap boxes (trees tapped by trunk and lower
    boughs, as the oak's whole-picture box took taps meant for the bush and boulder in front of
    it). Places that share a name with the current town say and open exactly what they do there
    (the same `Use` objects); new words for the signpost (two arms now), the house, the oak
    (Woodcutting), the forest's pines (Woodcutting), fences, benches, planters, bushes (Foraging)
    and boulders (Mining). Things afloat and the net have lookout spots on the quay, pier and
    beach. The smith stands between the anvil and the forge, the trader at the stall's east end,
    the captain on the pier.
  - **Drawing, memory and time.** One still at a time: the ground's pixels and every standing
    piece composed into one 1440 x 2136 canvas (12.3 MB), the pieces' own canvases kept for
    drawing in front of the hero (26 canvases, 4.0 MB by day; 38, 4.2 MB at dusk, where lamps
    light their neighbours), the moved foam (0.5 MB): about 17 MB, plus under 1 MB of figures and
    smoke. The pixels are painted in a worker, colours a 128-row strip at a time (never the art
    lane's 98 MB whole-town colour buffer), and handed over without copying; until the first
    arrives the scene shows its backdrop, and on a day/dusk flip the old still stays up (with the
    hero, townsfolk and smoke in its time of day) until the new one is ready, then goes. Figures
    from the adapter: the hero lit at dusk by lamps within reach, a picture per 6 pixels of
    ground, the last 48 kept.
  - **Life**: chimney smoke on the house, tavern and smithy sways (lane B's plume, each row moved
    in proportion to its height, so the mouth stays put and the loop has no jump); three gulls
    circle where lane B put them, facing the way they fly; the shore's foam shifts along
    `shoreAt` every 1.1 s, on water only.
  - **Figures** (`figures2.ts`): the only door for people in the new town. Written against a
    stand-in (today's figures blown up to 64 pixels) while lane B drew the C-scale ones; lane B's
    B8 landed on `main` during the session, and the swap to `character2.ts`
    (`characterPicture2`, `facingLeft2`, `townsfolkPicture2`, the `FIGURE2_*` constants) was a
    change to that file alone, as intended. Lit at dusk by the lamps near them; none glow.
  - **Measured** (Playwright, 390 x 844 at 3x, touch, production build): steering
    the hero across town for 24 s, 60.0 fps by day and at dusk (1,446 frames, the worst
    16.8 ms). At 4x CPU throttling, 38.2 to 38.4 fps (frames 33 ms): every frame the camera moves is a
    whole-view redraw, and in the big town the camera nearly always moves; the current town
    kept scrolling the same way manages 44.8 (54.8 on the same walk, as its camera soon stops
    at an edge). Headless software rendering; not checked on a phone's GPU. The JS heap stays
    at 6 to 10 MB; the town's own code allocates nothing a frame (heap sampling shows only the
    shared stage's small records, about 0.8 MB/s while walking as before, and path searches,
    larger on the bigger map). Day/dusk flip: no stop; the new still is up 1.5 to 1.9 s later
    (2.3 to 2.4 s at 4x), with one frame of up to 90 ms (220 ms at 4x) as it goes on.
  - Tests: `preview`, `scale2` (both scales at seven screens, the camera at all four edges of the
    big town), `town2` (the walk map is lane B's, every usable thing reachable from the start,
    taps pick the thing under them, doors on lane B's spots, shared words, new words, pace),
    `town2View` (the Town tab with `?town=2` walked by taps to the crate, smithy, house, stall,
    oak and boat, through the shell, into the grotto and back), `figures2` (size and anchor),
    `town2Paint` (strip painting matches whole, lights match lane B's, foam on water only, smoke
    loops).

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

## Weak spots, honestly (wave 10)

- The loading scene is a composition of what exists, not drawn for the purpose: the sky is three
  flat bands, the boat is large for the frame and has no shadow on the water, the swell is short
  ripples. It reads as the game's harbour, but an art pass would do better (lane B's, if wanted).
- Strollers pass through the hero and he through them; if he stands on a stroller's route they
  overlap while one walks by. Their routes are short and chosen out of the way, not avoided.
- When both of the room's name's places are taken by the fight, the name is not shown at all;
  a player who fights at the door of every room may never read one.
- The cold first open is unchanged (about 2 s of worker time); only later visits are quick.
  Storing the town costs a further second or so of the worker's time after the town is shown,
  once per deploy and time of day.
- Frame rates and timings are headless Chromium in software on this sandbox, not a phone.
- The planted-foot test checks the arithmetic (one stride of ground per frame shown), not the
  pixels of lane B's frames, by design; if lane B's frames ever moved the foot by something other
  than `WALK2_STRIDE`, only looking would catch it.

## Deferred

- From S16a: **not checked in Safari.** No WebKit build exists under `/opt/pw-browsers` and the
  Playwright WebKit download is blocked by this sandbox's proxy. Unverified there: that WebKit
  enlarges the town's canvas nearest-neighbour (`image-rendering: pixelated`, which Safari has
  supported since 10; on an iPhone with GPU-accelerated canvas this is the one thing to look at:
  a zoomed screenshot of the square should show square, even pixels, no blur), that module
  workers with `OffscreenCanvas` take the bitmap path (Safari 16.4 and later; older ones take the
  raw-pixel path, which composes on the page and costs one long frame on first open and each
  flip), and the frame rates on a real phone. If Safari smooths, the way back is one line:
  `pixelated: true` off in `town2Stage()` (`town2Place.ts`), at the old frame cost.
- From wave 10, **unverified, no WebKit here**: the kept town in Safari and in the home-screen
  app. Safari 16.4 or later has what it needs (IndexedDB in a module worker, `OffscreenCanvas`
  with `convertToBlob`, `createImageBitmap` with its options, `CompressionStream`), but none of
  it was run there; iOS keeps a home-screen app's storage apart from Safari's and may clear a
  site's storage after weeks unused, both of which only mean a cold open. Older Safari takes the
  raw-pixel path, which keeps nothing. Also unchecked: that the 48 px face and the loading
  picture stay crisp in WebKit, and frame rates on a real phone's GPU.
- From wave 10: strollers do not step round the hero: he can walk through one, drawn in
  front or behind by their feet as anyone is. The hero's widest reach is a fixed 17 px tested
  over every wearable; a new wide shield would need it raised (the test says so).
- From wave 10: a few frames over 40 ms still occur at 4x (0 to 4 in two minutes), with no
  script in them; not something this lane's code can reach in headless Chromium.
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
- Ship, boat and buoys do not bob; the waterline foam on the ship and rock does not move.

## Needs from another lane

- **Lane B, for the town** (nothing blocking): (1) none for the walk: `'up'` is in use. (2) Lights live in the pieces' pictures, so the
  worker still draws every piece to find them (`townLights`): lights in `town2Facts` would let a
  cold open skip that. (3) As before, retire the first town's art and the style guide's
  first-town sizes; `walkerArt.ts` still reads `townPiece('hero').base` for the dungeons' hero
  until the dungeons move.
- **Lane A**: nothing needed. A later wish, as before: the notice board could open
  `openBounties`. If a deploy should ever be forced to forget the kept town without changing it,
  bumping `CACHE_FORMAT` (`src/scene/town2Cache.ts`) does it; nothing in lane A's files is
  involved.
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

- **Switching the dungeons to the C scale** (what wave 10 left ready, and the exact steps left):
  1. Lane B's 24-pixel grotto art (`dungeonTile2`, `dungeonProp2`, `foePicture2` or whatever B10
     names them) must be on `main`. Draw the rooms with it in `grottoArt.ts` (tiles at
     `DUNGEON.tile`, props on their tile's base) and the cast in `fightArt.ts`/`foes.ts`
     (`foeSprite` takes any size; feet from the picture), the hero from `characterSprite2` and the
     walk (`Painted` from `town2Art.ts` works on any `Figure2`) with `HERO_FEET` replaced by
     `FIGURE2_ANCHOR_X`/`FIGURE2_SOLE_Y`.
  2. Re-cut the five rooms in `grotto.ts` on 24-pixel tiles (about 32 x 12 tiles each; corridors
     two tiles), keeping each room's doors, tide rows, start and end and every guarantee
     `grotto.test.ts` holds; the cells in `foes`, `perches` and `spawns` move with them.
  3. Set `DUNGEON = C_SCALE` in `dungeonMetrics.ts`. That alone sets the world to 360 across
     (`dungeonScale` gives 3 at 3x on its side), every tile to 24 (maps carry `tile`, and
     `dungeon.ts`, `battle.ts`, `ground.ts` read it) and every distance to 1.5 times (battle's
     constants through `far`, every foe row through `kindAtScale`).
  4. What `far` does not reach yet, to scale by hand: `fightArt.ts`'s drawn sizes (health bars,
     numbers, chevrons, ring widths, the keg's arc), `grottoArt.ts`'s shadow sizes and
     `LANTERN_LIGHT.radius`, `walkerArt.ts`'s shadow, the `OVERHEAD` and hero box in
     `combatantBoxes` (`dungeonView.ts`), and `grottoBot.ts`'s distances (tests).
  5. Balance must hold unchanged: `grottoRun.test.ts` and the fairness test are a decision if
     they move (times stay; every distance and pace is ×1.5, so walks take as long). Several
     dungeon tests name first-scale numbers (16-pixel cells, 64 px/s); those are the tests that
     legitimately change with the switch, and only those.
  6. `pixelated` for rooms needs the fight's words and thin lines on an overlay canvas at
     device resolution first (as before).
  7. Lane B's B10a (now on `main`, `src/art/dungeonArt2.ts`, `portraits2.ts`) lists its own seven
     steps for this switch in `docs/status/lane-b.md` ("Lane C, to switch the dungeon"): tiles by
     `roomKinds2`, contact shadows by `GROUND2_SHADOW`, `lightGround2` and `CAVE_DUSK`, props by
     `dungeonPropSprite2`, foes by `foeSprite2` with their poses (walk frame by distance, as the
     town's), and faces by `portrait2(id)`, which replaces `framedFace` (it carries a 48-pixel
     canvas shown whole). Read those with steps 1 to 5 above; they are the same plan from the art's
     side. Not done this wave: the brief kept the grotto exactly as it was.
- **The walk** (wired): `heroPose(play, now)` and `strollersNow` give `Pose2`s; `Painted`
  (`town2Art.ts`) paints any `Figure2` per pose, lit at dusk, warming every pose a frame at a
  time; `walkFacing` is the one place a facing is chosen. Lane B's frames are relied on only for
  their size, anchor and the `WALK2_*`/`TOWNSFOLK2_*`/`IDLE2_*` constants.
- **The kept town**: `townKept()` (`town2Place.ts`) says whether this visit's town was a hit, was
  stored (with bytes) or not kept and why; screenshot scripts read it. In DevTools it is the
  `hearth-and-harbour-town` IndexedDB database. Moving `.shots` aside for a check: use a new,
  unique name (a shared scratch folder may already hold one of the same name).
- **The dungeons at the C scale (the original plan; see the steps above for what is left).** Today a 270-wide world on 16-pixel tiles,
  played sideways, `dungeonScale` the short side over 270, the first-scale hero (`walkerArt.ts`)
  and foes. At the C scale:
  - **Tiles of 24** (`TileMap.tile = 24`). Re-cut each room on the new grid rather than scaling
    its rows: rooms about 32 x 12 tiles (768 x 288), two sideways screens long as now (the screen
    shows 360 x about 200 art pixels), corridors two tiles wide. Every room keeps its doors, its
    tide rows and the guarantees `grotto.test.ts` holds; the tide's 0–3 heights and the
    wash-off's five tiles stay counted in tiles.
  - **Scale**: `dungeonScale` takes a `SceneSize` like the town (360 on the short side, slack
    12), so the hero is the same size on screen in town and in a run. `pixelated` could then
    serve the rooms too, but only once the fight's words and thin lines (`fightArt.ts`,
    `fillText` and 2-pixel strokes) go on an overlay canvas at device resolution.
  - **Distances x 1.5** in `battle.ts`, `foes.ts`, `cast.ts`: walking paces (hero 64 to 88 as in
    town; deckhand 44 to 66, powder monkey 50 to 75, crab 22 to 33, parrot 40 to 60, captain 34
    to 51), notice ranges (104, 150, 96, 176 and the rest), reaches (22–32 to 33–48; melee 30 to
    45; a bow's 120 to 180), the powder monkey's 92 keep-off and 60 back-away (138, 90), heavy
    attacks' radii (keg 28 to 42, slam 46 to 69, anchor 58 to 87), volley line widths and
    spacing (20 to 30, 48 to 72), the parrot's rally 120 (180), the brig's 40 (60), Step back's
    40 (60). Times stay. Tap boxes scale with the figures. `grottoRun.test.ts` and the fairness
    test must hold unchanged: a change in result is a change in design.
  - **Art needed from lane B, by id** (a C-scale door beside each of today's, as
    `characterPicture2` sits beside `characterPicture`):
    - tiles at 24 for `grotto`: `sand`, `wet_sand`, `rock_floor`, `wall_top`, `wall_face`,
      `shallows`, `deep_water`, `planks`, `door_barred`, `door_open` (`dungeonTile2`);
    - props at the C scale: `powder_keg`, `crate`, `treasure_chest`, `anchor`, `rope_coil`,
      `cannon`, `lantern`, `perch` (`dungeonProp2`);
    - foes at the C scale, each a `Picture2` with an anchor and soles like `FIGURE2_*`:
      `deckhand`, `powder_monkey`, `giant_crab`, `ships_parrot`, `brinebeard`, and the grey-box
      `dock_rat`, `sand_crab`, `smuggler` (`foePicture2`);
    - the hero is there already (`characterPicture2`); cave ground in cells, so `shadow2.ts`
      can cast contact shadows in the rooms as it does in town.
  - This lane's overlays (warning circles, numbers, health bars, the tide gauge) scale with the
    tile; the HUD's CSS does not change.
- **The town's pieces:** `town2.ts` (things, words, lookouts, townsfolk, scenery, pace),
  `townsfolk.ts` (what people say), `town2Facts.ts` (the facts and the paint: what the worker
  works out, pure), `town2Worker.ts` (bitmaps, or raw pixels), `town2Paint.ts` (pure pixel
  helpers: palettes, lights, foam, smoke), `shadow2.ts` (contact shadows), `town2Art.ts` (what
  the stage draws: held pictures, life, the hero and his shadow, the painter), `town2Place.ts`
  (asking for the town once a page, the loading progress, the stage's options), `figures2.ts`
  (the only door for people). `townView.ts` starts the worker when the page loads.
- Measuring: a scratch entry under `.shots/` (`perf.html` loading `src/main.ts` and a hooks
  module that puts `heroAt` and `town2ArtNow` on `window`), built with its own Vite config
  (`root` the repo, `rollupOptions.input` the HTML), lets a script count only frames where the
  hero moved and know when the town is held. `.shots` is ignored by version control but `eslint .`
  lints it: move it aside before a local `npm run check`. For "before" numbers, extract `main`
  into a scratch folder with `node_modules` linked and build the same entry there.
- Crispness: screenshot at the phone's ratio and test every `scale` x `scale` block of device
  pixels over the canvas for one colour (skip the sun button, which is DOM); offset the grid by
  0..scale-1 both ways and take the best.

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
