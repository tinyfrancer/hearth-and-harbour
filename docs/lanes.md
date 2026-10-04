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

| Wave  | Lane A                                      | Lane B                                                  | Lane C                        |
| ----- | ------------------------------------------- | ------------------------------------------------------- | ----------------------------- |
| 1     | S5 Cooking and Smithing                     | S7a Art pipeline                                        | S11 Scene engine              |
| 2     | S6 Crafting, Fletching, Alchemy             | B2 Icons for everything so far                          | S12 The town (needs S7a)      |
| 3     | S7b Equipment and character (needs S6, S7a) | B3 Portraits and gear layers for S7b's slots            | idle until S8 lands           |
| 4     | S8 Idle combat                              | as needed by A                                          | S14 Dungeon engine (needs S8) |
| later | S9, S10, then the Milestone A review        | art passes are review sessions with Cody, one at a time | S15, S16                      |

A lane that reaches a session whose needs have not landed stops and says so in its status file.
Lanes do not wait for a whole wave: each takes its next session as soon as what it needs is on
`main`.

**Known cost of this order:** the scene engine and town are built before the Milestone A review
that was meant to come first. The scene engine does not depend on idle pacing, so the risk is
wasted polish on the town if the review changes direction, not rework of the engine.

## Wave 1 briefs

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

- **S6** (A): Crafting, Fletching, Alchemy; potions as timed buffs that time away respects.
- **B2** (B): 24 x 24 item icons and skill icons for everything in the tables, through the doors.
- **S12** (C): the town map from the mock-up, people to tap, doors that open menus, day and dusk.
- **S7b** (A): gear slots, stats, the character sheet with the hero drawn from lane B's layers,
  character creation with a look.
- **S14** (C): landscape dungeons on the scene engine.
