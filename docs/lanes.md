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

| Wave     | Lane A                               | Lane B                                                  | Lane C                                                                          |
| -------- | ------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1 (done) | S5 Cooking and Smithing              | S7a Art pipeline                                        | S11 Scene engine                                                                |
| 2 (done) | S6 Crafting, Fletching, Alchemy      | B2 The rest of the town's art                           | S12a The town on the engine                                                     |
| 3        | S7b Equipment and character          | B3 The character's wardrobe: looks and gear layers      | S12b The whole town                                                             |
| 4        | S8 Idle combat                       | B4 Icons for every item and skill; portraits            | S12c The player's own look and gear in town; then S14 Dungeon engine (needs S8) |
| later    | S9, S10, then the Milestone A review | art passes are review sessions with Cody, one at a time | S15, S16                                                                        |

A lane that reaches a session whose needs have not landed stops and says so in its status file.
Lanes do not wait for a whole wave: each takes its next session as soon as what it needs is on
`main`.

**Known cost of this order:** the scene engine and town are built before the Milestone A review
that was meant to come first. The scene engine does not depend on idle pacing, so the risk is
wasted polish on the town if the review changes direction, not rework of the engine.

## Wave 3 briefs

New since wave 2: `src/art/character.ts` is the door for drawing the player's character. The game
passes a `Look` and the ids of the items worn; art returns a picture
(`characterPicture`) or a ready element (`characterCanvas`). Lane A calls it; lane B fills it in.
Today it is a placeholder: the look is ignored and almost no items show.

### Lane A · S7b: Equipment and the character

Read: `docs/design.md` section 4; `docs/status/lane-a.md`; `src/art/character.ts` (read it, do
not edit it).

The character gets a look, things to wear, and a sheet that shows both.

- **Equipment in the rules.** Slots: head, body, legs, main hand, off hand, neck, wrist, and
  ammunition. `ItemDef` gains an optional `equip` saying which slot, whether it takes both hands
  (bows do), a weapon's style (`melee` or `ranged`), and its numbers. Keep the numbers to three
  totals that S8's combat will read: **attack**, **strength** and **armour** (ranged weapons give
  ranged attack and ranged strength as the same two totals under their style). Give every wearable
  made so far its slot and numbers: the bronze and iron sword, axe, helmet, shield and
  breastplate; the linen hood, tunic and trousers; the shell necklace and bracelet; the three
  shortbows; the two kinds of arrow. Iron should beat bronze clearly; cloth gives little armour.
  Do not invent combat itself; S8 does that.
- **Wearing things.** Equipping moves one of the item from the bank to the slot and returns
  whatever was there to the bank; ammunition moves the whole stack. A two-handed weapon empties
  the off hand; equipping an off-hand item with a two-handed weapon held puts the weapon back.
  A level requirement to wear (say Smithing has nothing to do with it; use a flat "any level" for
  now and leave the field for S8's combat levels) is not needed yet. All of it as pure functions
  in core with tests, nothing random.
- **The look.** A character has a `Look` (skin, hair, hair colour). Take the choices from
  `LOOK_CHOICES` in `src/art/character.ts`; never hard-code them, since lane B is adding to that
  list as you work.
- **Screens.**
  - Character creation asks for the name and the look, with the character drawn live as choices
    change (`characterCanvas`). With only one choice for a part, show it but do not make a fuss.
  - The Character tab becomes the sheet: the character drawn large wearing what is equipped, the
    eight slots with what is in each (tap a slot to choose from what the bank holds for it, or to
    take it off), and the three totals. A way to change the look later.
  - The bank's item card gets an Equip button for wearables, and says what a thing's numbers are.
- **Save.** Version 5: `look` and `equipment`. Existing characters get the default look and
  nothing worn. Migration, `saveProblem` checks and tests.
- **Housekeeping.** The Smithing page is six screens long. On a skill's page, group its actions
  under collapsible headings when the skill has more than about eight (for Smithing: Bars, Bronze,
  Iron; let the data say which group a row is in), keeping whichever group holds the running
  action open.
- Tools that help skilling (an axe that speeds woodcutting) are a tempting next step. Do not build
  it; note in your status file how the `equip` shape would carry it.

Minimum: slots and equip rules in core under test, the sheet showing the drawn character and
slots, save version 5.
Done when: `npm run check` passes; a phone-sized run shows a new character made with a look, a
sword and shield equipped from the bank and shown in their slots with totals changing, a bow
emptying the off hand, and an old (version 4) save loading with nothing worn.

### Lane B · B3: The character's wardrobe

Read: `docs/style-guide.md` (the Figures section above all); `docs/status/lane-b.md`;
`src/art/character.ts`, `figure.ts`, `wardrobe.ts`.

Make `src/art/character.ts` real: looks to choose from, and every wearable item in the game drawn
on the character. Lane A is building the character sheet against that file's exports right now,
so **do not change the name, parameters or return type of anything it exports**; change what they
do and add to `LOOK_CHOICES`.

- **Looks.** Several skin tones (as palette ramps: the skin steps must come from a ramp per tone,
  not from repainting pixels), four or more hairstyles including a bald one and at least two
  longer ones, and five or six hair colours. Every combination must read well at game scale. Keep
  `fair`, `short` and `brown` as the first of each so existing characters are unchanged. Faces
  stay symmetric; nothing cute.
- **Gear layers, drawn to fit the standard body,** for each of these item ids:
  - swords: `bronze_sword`, `iron_sword`; axes: `bronze_axe`, `iron_axe` (one-handed, held like
    the sword);
  - helmets: `bronze_helmet`, `iron_helmet` (decide and note how a helmet and hair combine);
  - shields: `bronze_shield`, `iron_shield`;
  - body: `bronze_breastplate`, `iron_breastplate`, `linen_tunic`;
  - `linen_hood`, `linen_trousers`;
  - `shell_necklace`, `shell_bracelet` (a few pixels each; they must still be findable);
  - bows: `pine_shortbow`, `oak_shortbow`, `willow_shortbow` (held in the weapon hand; the three
    should differ by their wood's colour).
    Bronze and iron must be told apart at a glance, by colour and not by shape alone. Add the ramps
    bronze needs to the palette, with their day and dusk values following the style guide's rule.
- **The mapping from item id to layer lives in `character.ts`**, with a test that lists the ids
  above and fails if any draws nothing. Arrows show nothing (a quiver is welcome if it is cheap).
- **Under the gear:** with no body item the character wears the everyday tunic; with no legs item
  the everyday trousers; boots always, until the game has boots.
- **The mock-up's hero must not change:** `figure('standard', HERO_OUTFIT)` stays pixel for pixel
  what it is, and its test stays as it is.
- **Gallery:** a "Wardrobe" section: every look choice side by side; the character in full bronze,
  full iron, full linen, and with each bow; day and dusk for one of them.
- If time remains after all of the above is solid, start on icons (24 × 24, through `itemIcon`),
  beginning with the items worn here. Otherwise icons are the next session (B4) with portraits.

Minimum: three skin tones, three hairstyles, three hair colours, and layers for both metals'
sword, shield, helmet and breastplate.
Done when: `npm run check` passes; the gallery's wardrobe section looks right at game scale and
at twice that (look for: arms that hang like sticks, gear that floats off the body, a helmet with
hair poking through, bronze you cannot tell from gold or from iron); nothing outside `src/art`,
`tests/art`, `docs/style-guide.md` and this lane's status file changed.

### Lane C · S12b: The whole town

Read: `docs/status/lane-b.md` (the town index: every piece, its base line, its walk-up spots and
shadow, and how to paint the grounds); `docs/status/lane-c.md` (your plots);
`docs/design.md` section 7.

Fill the plots with lane B's art so the Town tab is the approved picture, walkable, and put the
three townsfolk in it.

- **Every piece from the index in its place:** the smithy (forge glowing), the market stall, the
  quay wall and the pier, the ship, the rowing boat on its mooring, the rock and wreck, the buoy,
  the signpost, anvil, net, bucket, crab and gulls, and the chimney smoke. Use `townLayout()` as
  the guide to where things stand relative to each other, adapted to your larger map.
- **The real grounds:** sea with foam, the road with its ruts, the cobbled square's ragged edge,
  the quay wall with its rings, the flowers on the grass. Ground shadows under standing things, as
  the index describes. No flat-colour plots should remain.
- **Footprints for all of it,** as your data: you can walk the pier to its end, not onto the
  water, the boat or the ship; behind buildings where there is room, with depth sorting right.
- **The townsfolk.** The smith by his forge, the trader at her stall, the pirate captain on the
  pier, each standing where the mock-up has them. They do not walk. Tap one: the hero walks up,
  and the panel opens with their name and what they say. Give each a handful of lines that change
  from visit to visit (in order, then round again) and at least one different after dark. The
  smith's panel offers Smithing; the trader's offers the Bank until there is a shop. Names, lines
  and whatever is going on with that pirate are yours to write, in the game's voice. Keep it light
  and leave threads a later story session can pick up; do not write anything that commits the
  game to a plot.
- **Doors and counters** use the index's spots: the smithy door and anvil lead to Smithing, the
  stall counter to the trader's panel, the notice board keeps its lines until bounties exist.
- **A little life, cheaply:** smoke that drifts, a gull or two that crosses, foam that shifts.
  Each must cost nothing when the tab is not showing and must not force a full redraw every frame
  on a phone; if any of them cannot be done cheaply, leave it out and say so.
- **The hero at dusk** is still unlit. Light him if you can do it by caching (for example, one
  lit and one unlit picture, cross-chosen by distance to a lamp); otherwise leave it.
- The hero is still drawn in the fixed outfit. Showing the player's own look and gear waits for
  lane A's equipment to land; note it for your next session.
- Tests for whatever rules you add: line rotation, footprints of the new pieces, who is tapped
  when things overlap.

Minimum: the smithy, stall, quay, pier and sea drawn and walkable, and the three townsfolk
standing with one line each.
Done when: `npm run check` passes; a phone-sized run, scrolled over the whole map in day and
dusk, looks like the approved mock-up with no placeholder plots; each of the three can be walked
up to and read; nothing outside `src/scene`, `tests/scene` and this lane's status file changed.

## Wave 2 briefs (done)

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

- **S8** (A): idle combat, reading the equipment totals from S7b.
- **B4** (B): 24 x 24 item icons and skill icons for everything in the tables, through the doors;
  48 x 48 portraits.
- **S12c** (C): the town's hero drawn with the player's look and worn gear.
- **S14** (C): landscape dungeons on the scene engine.
