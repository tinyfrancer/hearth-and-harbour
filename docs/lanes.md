# Lanes: building in parallel

Up to three Claude Code sessions build at once, one per lane. This file is the whole handoff: a
session that has only this repository can start from here.

## Starting a lane session

Paste one of these into a new Claude Code session attached to `tinyfrancer/hearth-and-harbour`:

> You are lane A (idle rules) on Hearth & Harbour. Read `CLAUDE.md`, then `docs/lanes.md`, then
> `docs/status/lane-a.md`. Build the next session listed there, following its brief exactly.

> You are lane B (art) on Hearth & Harbour. Read `CLAUDE.md`, then `docs/lanes.md`, then
> `docs/status/lane-b.md`. Build the next session listed there, following its brief exactly.

> You are lane C (scenes) on Hearth & Harbour. Read `CLAUDE.md`, then `docs/lanes.md`, then
> `docs/status/lane-c.md`. Build the next session listed there, following its brief exactly.

## Rules every lane follows

1. **Stay in your lane's files** (table below). If you need a change outside them, do not make it:
   write it under "Needs from another lane" in your status file and in your PR, and work around it.
2. **One session, one branch, one PR.** Branch from current `main`, named like `a-s5-cooking`.
3. **Before merging:** `git fetch origin main && git rebase origin/main`, run `npm run check`
   again, push, and wait for CI on the rebased commit. Then merge (squash) and confirm the Vercel
   deployment for the merge commit succeeded. Cody's standing rule is merge once checks pass; do
   not ask first.
4. **Update your own status file in the same PR**: what shipped, what was deferred, what the next
   session in your lane is. Never edit another lane's status file.
5. **Stop at the brief's "minimum" line** if the session runs long, and say what was deferred.
6. **Read only what your brief names.** `docs/design.md` sections as listed; `docs/style-guide.md`
   for anything drawn or styled.
7. **Lore is Claude's to write and Cody's to discover.** Never retell story in a PR, a status file
   or a summary; name the parts touched.
8. Mechanics: `gh pr create` does not work in cloud sessions (no GraphQL). Open a PR with
   `gh api repos/tinyfrancer/hearth-and-harbour/pulls -f title=... -f head=... -f base=main -F body=@file`,
   read checks with `.../commits/BRANCH/check-runs`, merge with
   `gh api -X PUT .../pulls/N/merge -f merge_method=squash`, and read the deploy from
   `.../deployments` and its `/statuses`.

## Who owns what

| Lane              | Owns                                                                                                                            | Door into the app                                                                                    | Must not touch               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------- |
| **A: idle rules** | `src/core`, `src/data`, `src/persistence`, `src/ui`, `src/main.ts`, `package.json`, the save version, and the matching `tests/` | n/a                                                                                                  | `src/art`, `src/scene`       |
| **B: art**        | `src/art`, `tests/art`, `docs/style-guide.md`                                                                                   | `src/art/icons.ts` (`itemIcon`, `skillIcon`), `src/art/gallery.ts` (`artGallery`), `src/art/art.css` | everything else under `src/` |
| **C: scenes**     | `src/scene`, `tests/scene`                                                                                                      | `src/scene/townView.ts` (`townView`), `src/scene/scene.css`                                          | everything else under `src/` |

- **Only lane A changes the save's shape**, so save versions never collide. The save is at version
  3; lane A's next change is 4. If B or C believes it needs something saved, it asks lane A.
- The doors are already wired: the UI calls `itemIcon`/`skillIcon` wherever an icon would go and
  shows one if it gets one; Menu has an "Art gallery" page that shows `artGallery()`; the Town tab
  shows `townView()`. A lane fills in behind its door and never edits the caller.
- `src/art` may import nothing from the game (the linter enforces it). `src/scene` may import
  `core`, `data`, `art` and `src/ui/dom.ts` / `src/ui/view.ts`.
- Shared docs: `CLAUDE.md`, `docs/plan.md`, `docs/lanes.md` and `docs/design.md` are changed only by
  lane A or by Cody's orchestrating session, and only when a brief says so.

## The order of work

`docs/plan.md` lists the sessions in their original single-file order. Lanes change the order and
split S7 in two; where the two disagree, this file wins.

| Wave     | Lane A                                 | Lane B                                                             | Lane C                         |
| -------- | -------------------------------------- | ------------------------------------------------------------------ | ------------------------------ |
| 1 (done) | S5 Cooking and Smithing                | S7a Art pipeline                                                   | S11 Scene engine               |
| 2        | S6 Crafting, Fletching, Alchemy        | B2 The rest of the town's art                                      | S12a The town on the engine    |
| 3        | S7b Equipment and character (needs S6) | B3 Icons for every item and skill, and gear layers for S7b's items | S12b The whole town (needs B2) |
| 4        | S8 Idle combat                         | B4 Portraits; as needed by A                                       | S14 Dungeon engine (needs S8)  |
| later    | S9, S10, then the Milestone A review   | art passes are review sessions with Cody, one at a time            | S15, S16                       |

A lane that reaches a session whose needs have not landed stops and says so in its status file.
Lanes do not wait for a whole wave: each takes its next session as soon as what it needs is on
`main`.

**Known cost of this order:** the scene engine and town are built before the Milestone A review
that was meant to come first. The scene engine does not depend on idle pacing, so the risk is
wasted polish on the town if the review changes direction, not rework of the engine.

## Wave 2 briefs

Since wave 1 the shell has changed in three ways that matter to lanes B and C: every view's
`update(state)` is now called once a frame whether or not an action is running; the Town tab's
screen is unpadded and does not scroll (`.screen[data-tab='town']`); and `townView` receives a
third argument, a `Shell` (`src/ui/view.ts`) with `openTab(tab)` and `openSkill(skillId)`.

Scratch files: keep screenshot scripts in a `.shots/` folder inside your own working copy
(gitignored). Do not write scripts to a shared temp folder; another lane will overwrite them.

### Lane A · S6: Artisan skills, part 2 (Crafting, Fletching, Alchemy)

Read: `docs/design.md` sections 5 and 6; `docs/status/lane-a.md`.

Three more artisan skills as rows of data, and potions.

- **Fletching.** From logs: arrow shafts, then a shortbow from each of pine, oak and willow.
  Arrows need shafts plus arrowheads; add bronze and iron arrowheads to Smithing (one bar makes
  several). Bows need a bowstring.
- **Crafting.** From foraging: flax into bowstring and linen; seashells into a first piece or two
  of jewellery; linen into a simple cloth hood, tunic and trousers (bank items for now, wearable in
  S7b). Leather waits for combat (S8) to supply hides; leave a note, do not invent a source.
- **Alchemy.** Sageleaf and glowcap into potions, three or four in all. If a potion needs a
  container, make it a cheap Crafting recipe or a Foraging find, whichever keeps the chain short.
  Your call; say which in your status file.
- **Potions as buffs.** The plan says "timed buffs that offline progress respects". Build them as
  **charges, counted in completions, not as clock time**: drinking a potion gives N charges, each
  completion of an action it applies to uses one, and it ends on the completion that uses the
  last. This is the only form that fits `advance`'s rule (things change only on a completion, in
  whole numbers), and it is what keeps time away exact. One potion active at a time; drinking
  another replaces it (confirm with a second tap if charges remain). Effects must stay whole
  numbers: more XP per completion (rounded once per completion, never accumulated as a fraction),
  a quicker action in whole milliseconds, an extra item every Nth completion if you want a third
  kind. Nothing random. `advance` must treat the potion running out as another stretch boundary,
  exactly as it treats a mastery level. Extend the cut-up-time tests to cover a potion running out
  mid-span, alone and together with a mastery level-up.
- **Screens.** Drink from the bank's item card. The active potion, what it does and its charges
  left show on the Skills tab and on the pages of the skills it helps. The away report says how
  many charges were used and whether the potion ran out.
- **Save.** The active potion is new state: version 4, with a migration, a `saveProblem` check and
  tests for both.
- **Pacing.** Add the three skills to `tests/data/pacing.test.ts` (artisan pace: about two hours
  to level 20 with materials on hand, without potions). Add one case showing what a potion is
  worth, so its strength is a pinned number.

Minimum: Fletching and Crafting as data and shown; one potion working end to end with its tests.
Done when: `npm run check` passes; a phone-sized run shows a potion being drunk, its charges
falling as an action runs, and the action carrying on unbuffed when it runs out; the away report
shows the same after time away.

### Lane B · B2: The rest of the town's art

Read: `docs/style-guide.md`; `docs/art-reference/town-mockup.html`; `docs/status/lane-b.md`.

S7a brought over the engine, the hero, the tavern and a few props. Bring over everything else the
approved mock-up draws, the same way (identical to the mock-up for the same seed, checked against
its own drawing code), so that lane C can build the whole town in its next session.

- **Buildings and structures:** the smithy (with its forge glow at dusk), the market stall, the
  quay and pier, the ship, and anything else standing in the mock-up's town.
- **Ground:** sea (with foam), sand, the road with its ruts, and the edges between grounds as the
  mock-up draws them. Grass and cobbles exist already.
- **Background menace:** whatever the mock-up has out to sea or on the skyline (flag, wreck, rock).
- **Townsfolk:** the pirate, the smith and the trader. In the mock-up they were posed on their own
  bodies; make each a body (or gear on the standard body where that reproduces it exactly) so the
  figure rules still hold: posed, arms doing something, eyes mirrored.
- **For lane C to build with:** export every piece through one index, `src/art/town.ts`, keyed by
  a plain id, each giving a `Picture` (with its dusk glows) and its size, plus where its base
  line sits (the row its feet or foundations stand on) so a scene can sort and place it. Where a
  piece has a door or a counter a person would walk up to, give that spot too, in art pixels from
  the piece's top-left. These are facts about the drawing, not game rules; collision stays lane
  C's data. Describe the index's shape at the top of your status file so lane C can read it there.
- **Gallery:** add the whole town assembled as the mock-up has it, in day and dusk, so it can be
  held against the approved picture; and the three townsfolk beside the hero.
- Tests: each new piece pinned against the mock-up's output the way the hero is.

Minimum: smithy, stall, quay and pier, sea and sand, and the index.
Done when: `npm run check` passes; the gallery's assembled town matches the mock-up side by side
in day and dusk (say exactly where it differs); nothing outside `src/art`, `tests/art`,
`docs/style-guide.md` and this lane's status file changed.

### Lane C · S12a: The town on the engine

Read: `docs/design.md` section 7; `docs/style-guide.md`; `docs/status/lane-b.md` (what art exists
and how to draw it); `docs/status/lane-c.md`.

Turn the test room into the first real piece of Gullwick, drawn with lane B's art, with things in
it to walk up to. Lane B is drawing the rest of the town's buildings at the same time as you, so
build with what is on `main` now (the hero figure, the tavern, well, notice board, lamp, barrel,
crate, pine, grass and cobbles, the day and dusk palettes) and leave clearly marked plots for what
is coming (smithy, stall, quay and pier, sea). S12b fills the plots.

- **Drawn with the art.** Ground painted by lane B's grass and cobbles; props and the tavern
  rasterized from lane B's pictures at one pixel per art pixel and copied at the scene's whole
  scale, as the test room's map is now. Delete `colours.ts` if nothing needs it; a plot not yet
  drawn may be a flat base-ramp colour taken from `src/art/palette.ts`.
- **The hero is the walker.** Lane B's figure in the hero's outfit, standing where the placeholder
  stood, facing the way it last walked (mirror the picture for left; no walk cycle yet, though a
  one-pixel bob while moving is welcome).
- **Depth.** Sort everything that stands (hero, props, buildings) by its base line, so the hero
  walks behind a barrel when above it and in front when below. Solid footprints stay your data,
  separate from the pictures.
- **Layout.** Follow the mock-up's town: tavern and the smithy's plot at the top with the road
  north between them, the square with the well, notice board and the stall's plot, the quay's plot
  and water at the bottom. Bigger than one screen, so the camera has somewhere to go.
- **Things to walk up to.** Tapping the well, the notice board, the tavern door, a lamp, a barrel:
  the hero walks to the nearest free spot beside it, then a small panel opens over the bottom of
  the scene with its name and a line or two of text in the game's voice, and for some a button.
  Use the `Shell` you are given: one prop should be a strongbox or crate that opens the Bank tab,
  and the pine should offer to take you to Woodcutting. Tapping the ground closes the panel and
  walks as before. Lines are flavour and are yours to write; keep them short, dry and warm.
- **Day and dusk.** Dusk from 18:00 to 06:00 by the device's clock, with lamps and windows glowing
  as lane B's pictures define. Add a small sun/moon button in a corner of the scene that flips it
  for the session, so both can be looked at without waiting for evening.
- **Loop.** `update` now arrives every frame; drive the scene from it and remove the private
  `requestAnimationFrame` loop and the wait-for-attach logic if they are no longer needed. Remove
  the `:has()` rule from `scene.css` now that the shell handles the Town tab's screen.
- Keep `stage.ts` reusable for dungeons: the town is data handed to it, not code inside it.
- Tests: depth order, footprints and nearest-free-spot beside a thing, the panel opening and its
  button calling the shell, day or dusk by the hour, and facing.

Minimum: the art-drawn ground, the tavern and props with depth sorting, the hero as walker, and
one thing you can walk up to and read.
Done when: `npm run check` passes; a phone-sized run shows walking behind and in front of things,
a panel opening and its button changing tab, and the scene in day and in dusk; nothing outside
`src/scene`, `tests/scene` and this lane's status file changed.

## Wave 1 briefs (done)

### Lane A · S5: Artisan skills, part 1 (Cooking and Smithing)

Read: `docs/design.md` sections 5 and 6.

Build recipes: actions that use items. The rule already exists and is tested
(`ActionDef.uses`; an action will not start without materials for one completion and stops on the
completion that uses the last), but nothing in the tables uses it and the UI does not show it.

- **Data.** Cooking: cooked shrimp, herring and cod from the raw fish (levels 1, 8, 15). Smithing:
  smelt bronze bars (copper + tin) and iron bars; then a first set of bronze and iron things to
  make from bars (keep it to what S7b can equip later: sword, axe, helmet, body, shield is enough;
  they are only bank items for now). Cooked food and bars need names, descriptions and values.
  Add a `recipe()` helper beside `gather()` in `src/data/actions.ts`.
- **Screens.** The action card shows what a recipe uses and how many you hold of each, and how
  many completions you can afford. A recipe you cannot afford is visibly unavailable and says what
  is short. "Make until out of materials" is simply the stop rule; when it stops, the toast and
  the away report already say why.
- **Skills list.** With six skills, group the list under "Gathering" and "Artisan" headings (add a
  `group` to `SkillDef`).
- **Pacing.** Add Cooking and Smithing to `tests/data/pacing.test.ts`. An artisan skill is paced on
  the assumption that materials are on hand: about two hours to level 20, since gathering the
  materials is the other half of the time.
- **Save.** No shape change is expected. If you find you need one, it is version 4.

Minimum: cook the three fish and smelt bronze, shown properly on the card, under test.
Done when: `npm run check` passes, "Used in" on the bank's item cards names the new recipes by
itself, and a phone-sized run shows cooking stop when the raw fish run out.

### Lane B · S7a: Art pipeline

Read: `docs/style-guide.md` (all of it) and `docs/art-reference/town-mockup.html` (the approved
mock-up; its drawing code is the source to harvest).

Bring the mock-up's pixel engine into `src/art/` as tested TypeScript, and prove it in the gallery.

- **Engine.** Harvest from the mock-up: drawing a sprite from rows of palette characters; the
  automatic one-pixel outline; the soft ground shadow; rendering at a whole number of device
  pixels. Output to a canvas (and a helper that returns a sized `<canvas>` element).
- **Palette.** The base ramps from the style guide as named steps in one file, with the day and
  dusk transforms exactly as the style guide gives them (fire, lamp and window colours exempt).
  Nothing outside that file names a colour.
- **Figure.** The posed base body from the mock-up and its gear layers (at least the hero's
  outfit), so that a figure is a body plus layers chosen by id. Eyes mirrored, arms posed: the
  style guide's figure rules are requirements, not suggestions.
- **Gallery.** `artGallery()` shows: the palette ramps in day and dusk; the hero figure in day and
  dusk at game scale; one building and a few props from the mock-up. This is what Cody will judge
  on his phone, so lay it out to be looked at.
- **Doors.** Leave `itemIcon` and `skillIcon` returning null; icons are the next session (B2).
- Tests in `tests/art/`: the palette transforms (pin a few colours), the outline (a known sprite
  gives a known outline), and sprite parsing (unknown character is an error, ragged rows handled).

Minimum: engine, palette with day and dusk, and the hero in the gallery.
Done when: `npm run check` passes, the gallery matches the mock-up's look side by side, and
nothing outside `src/art`, `tests/art` and this lane's status file changed.

### Lane C · S11: Scene engine

Read: `docs/design.md` sections 3 and 7; `docs/style-guide.md` sections "Sizes" and "Keeping the
art changeable".

Build the engine the town and dungeons will run on, and show it as a plain room on the Town tab.

- **Renderer.** A canvas that fills the Town tab's screen area, drawing a scene 270 art pixels
  wide at a whole number of device pixels per art pixel, never a fraction, and crisp on a
  high-density phone. Handle resize and rotation.
- **World.** A tile map as data (which tiles are solid is data, never read from a picture), a
  camera that follows the player and stops at the map's edges, and a player marker.
- **Movement.** Tap to move: tap a spot, the player walks there around obstacles (grid pathing;
  harvest movement, collision and pathing ideas from `untitled-boomer-mmo` only if that repo is
  available to you, otherwise write them fresh and small). Tapping a solid tile goes to the
  nearest reachable one. Movement speed is in art pixels per second and is advanced by elapsed
  time, so it is the same on every phone.
- **The room.** One test room bigger than the screen, with a few obstacles, drawn with flat
  placeholder colours (take them from the style guide's base ramps; the real tiles come from lane
  B later). `townView()` returns it. The view must stop its animation loop when it is no longer on
  screen.
- **Loop.** The app calls `View.update(state)` every frame; drive the scene from that and from the
  time between calls. Do not start a second `requestAnimationFrame` loop of your own unless you
  also stop it.
- Tests in `tests/scene/`: pathing (finds a path, goes around a wall, nearest reachable tile, no
  path), the camera clamp, and scaling (whole-number scale for a range of screen sizes).
- Nothing is saved. The player's position in town is not part of the save.

Minimum: the room renders crisply and you can tap to walk around obstacles.
Done when: `npm run check` passes, a phone-sized run shows walking and the camera following, and
nothing outside `src/scene`, `tests/scene` and this lane's status file changed.

## Later briefs

Written when their wave is next, by Cody's orchestrating session, from `docs/plan.md` and what the
lanes' status files say they left behind:

- **S7b** (A): gear slots, stats, the character sheet with the hero drawn from lane B's layers,
  character creation with a look.
- **B3** (B): 24 x 24 item icons and skill icons for everything in the tables, through the doors;
  gear layers for the items S7b can equip.
- **S12b** (C): the whole town with lane B's B2 art in the plots, the three townsfolk to talk to.
- **S14** (C): landscape dungeons on the scene engine.
