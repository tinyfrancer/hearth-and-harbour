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

| Wave          | Lane A                                                    | Lane B                                        | Lane C                             |
| ------------- | --------------------------------------------------------- | --------------------------------------------- | ---------------------------------- |
| 1 to 4 (done) | S5, S6, S7b, S8                                           | S7a, B2, B3 (three passes), B4                | S11, S12a to S12c, S14a            |
| 5 (done)      | S9 Thieving and Bounties                                  | B5 Things in hands; combat's items; portraits | S14b Fighting in dungeons          |
| 6             | S10 Shop, collection log, achievements; the grotto's loot | B6 The grotto's look: tiles, cast, props      | S15 Brinebeard's Grotto            |
| then          | **Milestone A review with Cody**                          | art passes are review sessions with Cody      | S16 Dungeon progression and replay |

A lane that reaches a session whose needs have not landed stops and says so in its status file.
Lanes do not wait for a whole wave: each takes its next session as soon as what it needs is on
`main`.

**Known cost of this order:** the scene engine and town are built before the Milestone A review
that was meant to come first. The scene engine does not depend on idle pacing, so the risk is
wasted polish on the town if the review changes direction, not rework of the engine.

## Wave 6 briefs

This wave builds the first real dungeon, across all three lanes at once. Ids are fixed here so
nobody waits for anybody; each lane builds against the ids and the doors, and everything meets on
`main`. Whatever another lane has not landed yet shows as a placeholder or is skipped, never as an
error.

New since wave 5:

- `src/art/dungeonArt.ts`: three new art doors, null for everything today. `foePicture(id)` is a
  monster's sprite; `dungeonTile(theme, kind, variant)` a 16 x 16 tile; `dungeonProp(theme, id)`
  something standing in a room.
- `RunSpoils` (`src/core/run.ts`) has two new optional fields, `kills` and `cleared`. A scene may
  fill them now; lane A makes them count this wave.
- Anything held is now drawn with a fist over its grip (the rule is in the style guide's Figures
  section). New held things follow it.

**Brinebeard's Grotto, the fixed ids.**

The cast (dungeon-only; their numbers live with the dungeon in `src/scene`, not in the idle
tables, until a later session makes the dungeon idle-able):

| Id              | Who                                             | Behaviour in a fight                                                       |
| --------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| `deckhand`      | a pirate with a boathook                        | walks up and hits                                                          |
| `powder_monkey` | a small, gleeful pirate with an armful of fuses | keeps away and lobs lit kegs (telegraphed)                                 |
| `giant_crab`    | a crab the size of a rowing boat                | slow; a wide telegraphed slam                                              |
| `ships_parrot`  | the ship's parrot                               | stays out of reach; makes nearby pirates hit faster until it is dealt with |
| `brinebeard`    | Captain Brinebeard, the boss                    | cannon volleys and a rising tide, in phases                                |

The loot (items; lane A adds them to the tables, lane B draws them, lane C drops them):

| Id                   | What                                                  | Worn                         |
| -------------------- | ----------------------------------------------------- | ---------------------------- |
| `doubloon`           | old gold; sells well                                  | no                           |
| `pirate_cutlass`     | a deckhand's blade                                    | main hand, melee             |
| `boarding_axe`       | a long-hafted axe with a spike                        | main hand, melee             |
| `tricorn`            | a three-cornered hat                                  | head                         |
| `captains_coat`      | Brinebeard's coat                                     | body                         |
| `spyglass`           | brass, dented                                         | off hand                     |
| `brinebeards_anchor` | rare: the captain's own anchor, swung with both hands | main hand, both hands, melee |
| `ships_figurehead`   | rare: a trophy for the house, later                   | no                           |

The tiles (`dungeonTile('grotto', kind, variant)`, 16 x 16): `sand`, `wet_sand`, `rock_floor`,
`wall_top`, `wall_face`, `shallows`, `deep_water`, `planks`, `door_barred`, `door_open`.

The props (`dungeonProp('grotto', id)`): `powder_keg`, `treasure_chest`, `brig_bars`, `lantern`
(glows), `anchor`, `rope_coil`, `cannon`.

### Lane A · S10: Shop, collection log, achievements

Read: `docs/design.md` sections 7, 9 and 10; `docs/status/lane-a.md`.

The last pieces of the idle game before Cody plays it for a few days and judges its pace.

- **First, the grotto's loot, as data.** Add the eight items in the table above to
  `src/data/items.ts` with names, descriptions, sale values and `equip` rows. They come from the
  dungeon that gates tier 2, so they sit just above iron: the cutlass and boarding axe a clear
  step up from the iron sword and axe; the tricorn and coat about iron's armour with a little
  attack on top; the spyglass an off-hand that gives ranged attack and no armour; the anchor the
  strongest melee weapon in the game so far, two-handed and slow to earn. All need level 18 to 20
  in the relevant skill. A doubloon sells for a satisfying sum; the figurehead sells for little
  and says it belongs on a wall. Land this early in the session (its own commit, pushed) so the
  other lanes can rebase onto it.
- **Runs that count.** `settleRun` now also takes `kills` (by monster id) and `cleared` (a
  dungeon id). Make kills count towards the bestiary and a held bounty exactly as idle kills do
  (an id that is not in the monster tables counts for nothing and is not an error), and record
  dungeon clears in the save (how many, and the best time if `RunSpoils` is given one; add a
  field for it). Nothing unlocks by a clear yet; that is S16.
- **Coins and the general shop.** A shop in the Bank tab (and so, later, behind the trader's
  stall): buys anything at its sale value, as now, and sells a small, useful stock for coins:
  the first tools of each trade so a new player is never stuck (a few vials, basic arrows, cooked
  shrimp), and one or two dear things to save for (an extra food slot is a good one if S9's shop
  did not use it; a bigger potion charge; a cosmetic). Prices are a pass over every item's sale
  value at the same time: they were placeholders, and now coins have a use, so set them by what
  an hour of the skill that makes the thing should earn, and pin the result in the pacing tests
  beside thieving's.
- **The collection log.** Every item the character has ever held, by where it comes from
  (gathering, artisan, each monster, each mark, the bounty shop, the grotto), shown as found or
  not, with a count of how many of each source's things have been found. Start recording from
  now; fill in what an existing save already proves (what is in the bank and worn, what the
  bestiary and thieving tallies show as seen).
- **Achievements.** A framework (an achievement is an id, a name, a line of text, and a rule
  that reads the state) and a first set of about twenty-five across everything that exists:
  first of each kind of thing, level milestones, mastery, a bounty streak, a potion drunk, a
  full set worn, a monster's rare drop, a dungeon cleared. A toast when one is earned, live or
  on return; a page listing them, earned and not. Hidden ones are welcome. No rewards yet beyond
  the having of them; the house (S18) will give them somewhere to live.
- **Tab icons.** Make the tab bar show `tabIcon(id)` from `src/art/icons.ts` when it gives one,
  falling back to the old glyph when it gives null (as it does today).
- **The notice board.** Add `openBounties()` to the `Shell` (and implement it), so the town can
  lead there. Lane C will call it next wave.
- **Save.** Version 8, with a migration, `saveProblem` checks and tests.

Minimum: the grotto's items; kills and clears from runs counting; the shop buying and selling
with the price pass.
Done when: `npm run check` passes; a phone-sized run shows something bought, the collection log
filling as a thing is found, and an achievement earned with its toast; the status file gives a
table of what an hour of each skill earns in coins at levels 1, 10 and 20.

### Lane B · B6: The grotto's look

Read: `docs/style-guide.md`; `docs/status/lane-b.md`; `docs/design.md` section 8 (the grotto);
`src/art/dungeonArt.ts` (the doors to fill); `src/scene/foes.ts` (read only: how the scene uses a
foe's picture and what size it expects).

The dungeon is being built right now by lane C in flat colours with marked shapes for enemies.
Give it its look, through the doors, in this order.

1. **The grotto's tiles** (`dungeonTile('grotto', kind, variant)`): the ten kinds listed above.
   A sea cave at dusk: the style guide gives dungeons the dusk mood, lit by lanterns. Sand and
   rock floors with wear and a few variants each so a floor is not one tile repeated; walls with
   a top face and a front face, so rooms read as hollowed out of rock; shallows you could wade
   in and deep water you could not, plainly different; planks for the pier and bridge; a barred
   door and an open one. Tiles must join without seams in any arrangement, including the edges
   between sand and water and between floor and wall (give `wall_face` a dark foot so anything
   reads against it). Show them assembled as a room in the gallery.
2. **The cast** (`foePicture(id)`), figures in the game's own hand, facing right, feet marked:
   the three already in the test dungeon (`dock_rat`, `sand_crab`, `smuggler`), then the grotto's
   five. Creatures are their own drawings at whatever size suits (the scene's notes say up to
   about 26 x 36 drops in for ordinary foes; the giant crab and Brinebeard should be bigger, and
   say how big in your status file for lane C). People are posed bodies, by the figure rules:
   arms doing something, weapons held by the hand rule, eyes mirrored unless deliberately not.
   Brinebeard is the boss of the first dungeon and the game's first real villain: he gets
   attitude from silhouette (hat, coat, beard, the anchor), bigger than the hero, unmistakable
   at a glance, menacing and a little ridiculous. He is not the captain on the town's pier.
3. **Props** (`dungeonProp('grotto', id)`): the seven listed above, the lantern with a glow.
4. **What S9 and this wave added to the menus:** the `thieving` skill icon; icons and worn
   layers for `poachers_longbow`, `wyrmscale_shield`, `barbed_arrows`, `hunters_charm` and
   `feathered_hat`; icons and worn layers for the grotto's eight loot items (the worn ones sit on
   the gear ladder between iron and the knight: a pirate's finery, salt-stained, a little showy).
   Their ids are fixed in the table above; lane A is adding them to the game's tables this wave.
5. **Faces** (`portrait(id)`) for `goblin_poacher`, `bramble_wyrm` and the grotto's five.
6. **The five tab icons** (`tabIcon(id)`), if anything is left.

Minimum: the ten tiles, and sprites for the three test-dungeon foes and the grotto's five.
Done when: `npm run check` passes; the gallery shows a grotto room assembled from the tiles with
the cast standing in it, in the dusk palette with a lantern lit; nothing outside `src/art`,
`tests/art`, `docs/style-guide.md` and this lane's status file changed.

### Lane C · S15: Brinebeard's Grotto

Read: `docs/design.md` section 8 (all of it, and the grotto's own part twice);
`docs/status/lane-c.md`; `src/art/dungeonArt.ts` (the doors art will fill).

Replace the grey-box test dungeon with the real first dungeon: seven to ten minutes, five rooms,
one idea (the tide), four kinds of enemy and a boss. It should be beatable by a character at the
end of tier 1 (levels about 18 to 20 in iron, with a slot of cooked cod) who plays it properly,
and should send a level 10 character home wet.

- **Five rooms,** in order, each teaching one thing: the tide pools (the tide, with crabs), the
  smugglers' store (deckhands among crates and kegs; the powder monkey's lobbed kegs), the
  rope-bridge cavern (a narrow way across deep water, a parrot making everyone faster), the brig
  (a locked-in fight: the doors bar behind you until it is cleared), the captain's cove (the
  boss). Hand-made layouts; the design calls for hand-designed, not generated.
- **The tide** is the dungeon's gimmick: on a slow clock the water rises and falls, and where
  you can stand changes with it. Low tide opens sandbars and short cuts; high tide covers them.
  Shallows slow the hero and can be fought in; deep water cannot be entered. The tide's state and
  what is coming must be readable at a glance (the waterline moving, wet sand darkening before it
  floods, a small tide gauge on screen). Being on a sandbar when it floods pushes the hero to the
  nearest dry ground and costs a little health; never an instant loss. Enemies obey the same
  water.
- **The cast** (ids and behaviours fixed in the table above). Their numbers (hit points, attack,
  defence, max hit, speed, heavy attack) are yours, in a table of your own in `src/scene`, since
  these are dungeon-only for now. Keep using the idle game's formulas for who hits whom.
- **Brinebeard,** in phases: first he fights in person while cannon volleys land in marked lines
  across the cove; at two thirds of his health the tide begins rising and the fight moves to
  what is left of the dry ground, with deckhands arriving; in the last third the volleys come
  faster and he swings the anchor in a wide telegraphed arc. Every big hit is telegraphed and
  walkable-out-of, by the fairness rule S14b set and tests. He should take a prepared character
  two or three minutes.
- **Loot.** Each of the cast drops doubloons and, sometimes, the item that suits it (ids in the
  table above: a deckhand the cutlass or the boarding axe, the powder monkey the tricorn, and so
  on); Brinebeard drops the coat or the spyglass, and rarely the anchor or the figurehead. Rolled
  by the run's own dice. An item id the game's tables do not know yet (lane A is adding them this
  wave) is skipped, not an error, so the dungeon works whichever lane lands first.
- **Spoils.** Fill `kills` (by monster id) and, when the boss falls and the end is reached,
  `cleared: 'brinebeards_grotto'`, in what goes to `shell.settleRun`.
- **Art through the doors.** Draw tiles with `dungeonTile('grotto', kind, variant)`, props with
  `dungeonProp('grotto', id)` and enemies with `foePicture(id)`, each falling back to what you
  draw today (a flat base-ramp colour, a marked shape) when the door answers null. Lane B is
  drawing all of them this wave; whichever of you lands second should find the dungeon dressed
  without either changing a line. The dungeon is in the dusk palette, lit by lanterns.
- **The way in** stays the rowing boat; its panel no longer says unfinished. Say on the panel what
  a sensible character brings. The grey-box rooms go.
- **Fair and readable.** Everything S14b held still holds: telegraphs, one thumb, sixty frames a
  second with a full room on a throttled CPU (measure the bridge room and the boss).
- Tests: the tide's cycle and what is walkable at each stage; being flooded off a sandbar; the
  parrot's effect and its ending; the boss's phases changing at the right health; every heavy
  attack's walk-out time; loot ids unknown to the tables skipped; the spoils of a clear; and a
  played-through run by a scripted hero of the intended strength finishing inside ten minutes
  and one of half that strength failing.

Minimum: the five rooms with the tide working, the deckhand, powder monkey and crab, and a
one-phase Brinebeard.
Done when: `npm run check` passes; a run at 844 x 390 shows each room, the tide low and high in
the same place, a keg dodged, the parrot's effect, each boss phase, and the results of a clear;
nothing outside `src/scene`, `tests/scene` and this lane's status file changed.

## Wave 5 briefs (done)

New since wave 4:

- `src/core/run.ts`: `settleRun(state, spoils)` brings a dungeon run's spoils home as one change
  (XP, loot and coins in; food eaten and arrows shot out), and the `Shell` a scene is given has
  `settleRun(spoils)` to call it and save. It is what S14b ends every run with.
- Card headings are centred (`.card-head`), so icons line up with the text beside them.
- From Cody, on looking at wave 4: **"weapons seem to be appearing behind the character's hand."**
  How things sit in the hand is lane B's first job this wave.

### Lane A · S9: Thieving and Bounties

Read: `docs/design.md` section 5 (the Roguery and Tasks rows); `docs/status/lane-a.md`;
`src/core/fight.ts` and `src/core/rng.ts` (how chance is done here).

Two reasons to come back that are not "number goes up": picking pockets, played for laughs, and
the notice board's bounties.

- **Thieving.** A skill under a "Roguery" group. Marks as data, across levels 1-20 (four or five:
  from a dozing fisherman to the harbourmaster's strongbox, say; yours to choose and name). Each
  attempt takes a set time and succeeds by a chance that rises with level against the mark's
  difficulty (and with mastery of that mark). Success pays coins and sometimes an item from the
  mark's table. Failure is being caught: a short stun (a few seconds in which nothing happens)
  and no other cost. No fines, no lost items, no health: the design says "a short stun, not a
  punishment". Show the chance on the card.
- **Chance, as fights do it.** Attempts are events with seeded dice from the save, walked in
  order; `advance(a)` then `advance(b)` must equal `advance(a + b)` with thieving running,
  through stuns and across level-ups that change the chance. Decide whether thieving is a third
  activity kind beside `action` and `fight` or a kind of action with a roll, and say why in the
  status file. Tests for the invariant come before screens, as in S8.
- **Bounties.** The notice board posts a bounty: kill so many of a monster the character can
  reasonably fight (chosen by seeded dice from those near the character's combat level, never
  one hopeless or trivial). Kills count while the bounty is held, live or away. Handing it in
  pays bounty points and a little coin and posts the next. A bounty can be swapped for another
  at a small cost in points, so nobody is stuck. One at a time.
- **The bounty shop.** Points buy things nothing else gives: start small (three or four things),
  for instance a quiver of better arrows, a charm worn at the neck or wrist with numbers a shade
  above shell, a one-off cosmetic. Anything wearable needs an `equip` row; lane B will draw
  worn layers and icons for new ids next wave, and until then they show without a picture.
- **Bounty-only monsters.** Two monsters that can only be fought while a bounty names them, one
  around level 10 and one around 18, with a drop each that is worth the trip. Add them to the
  monster tables under an area of their own; their ids are yours (say them in the status file so
  lane B can draw their portraits).
- **Screens.** Thieving is a skill page like the others, with the chance and the stun shown.
  Bounties get a page reached from the Combat section: the current bounty and its progress, hand
  in, swap, points, and the shop. The away report covers both (attempts, successes, times
  caught, coins; bounty progress and "ready to hand in").
- **Balance, by simulation.** Thieving reaches 20 in about three hours like the gathering skills,
  and earns coins at a rate that is better than selling gathered goods but not absurdly so (pin
  the coins per hour at levels 1, 10 and 20). A bounty near the character's level takes ten to
  twenty minutes of fighting.
- **Save.** Version 7, with a migration, `saveProblem` checks and tests.
- Also, small: health now returns in full whenever a fight stops, so stopping and restarting
  heals for free. Carry hit points between fights and regenerate them slowly out of combat
  instead (as part of state, advanced by time like everything else), unless that breaks the
  duel simulations badly; if it does, leave it and say why.

Minimum: thieving with its dice exact through time away; one bounty at a time with points.
Done when: `npm run check` passes; a phone-sized run shows a pocket picked, getting caught, a
bounty taken, progressed by fighting and handed in, and something bought with points.

### Lane B · B5: Hands, then the new items, then faces

Read: `docs/style-guide.md` (Figures, Gear ladder, Portraits); `docs/status/lane-b.md`;
`src/art/wardrobe.ts`, `src/art/armoury.ts`, `src/art/depth.ts`, `src/art/character.ts`.

**1. How things sit in the hand (first, and the most important part of this session).**
Cody's words after playing wave 4: "weapons seem to be appearing behind the character's hand.
Dig into the character and how items sit in their hands." So the character does not look as if
he is holding his weapon: it looks as if the weapon is behind his hand, or stuck to it.

- Find out what is actually happening before changing anything. Render the character large,
  holding each kind of thing in turn (hero's long sword, iron sword, bronze short sword, both
  axes, each bow, and each shield on the other arm), in both the standard pose and at game
  scale, and study the hand: which pixels are fist, which are grip, what is drawn over what
  (`depth.ts` has `HELD_BEHIND`, `HAND` and `HELD_FRONT`), and where the weapon's line passes
  relative to the knuckles. Look at the same things in the town at game scale, mirrored to face
  left, since that is where Cody saw it.
- A held thing reads as held when: the grip passes **through** the fist (some of it visible
  below the hand as a pommel or butt, the rest emerging above), the fingers wrap **over** the
  grip (hand in front of the grip, but only the grip), the guard or head sits clear above the
  fist and in front of the forearm and body, and the weapon's angle agrees with the forearm's.
  It reads as "behind the hand" when the whole weapon is one layer drawn under a solid fist, when
  no grip shows below the hand, when the fist is wider than what it holds with no wrap, or when
  the blade passes behind the arm or torso. Work out which of these is true here.
- Fix it in the structure, not weapon by weapon: decide the rule for how any held thing is
  layered around the hand (what is behind the fist, what is in front, where fingers are drawn,
  where the grip must enter and leave), write it in the style guide's Figures section, and make
  every weapon, both shields' grips or straps and the bows follow it. A bow is held at its
  middle with the string behind the hand; a shield is strapped to the forearm with the hand
  hidden behind it or gripping its edge.
- The approved hero is included. If his sword hand has this fault, fix it: this is the owner
  asking for a change to the approved figure. Change as few pixels as do the job, update his
  pinned test deliberately in the same commit, and show before and after. The town draws him and
  the three townsfolk too: check the pirate's cutlass and the trader's basket by the same rule.
- Show the work: a labelled before-and-after sheet of every held thing at 2x and at game scale,
  day and dusk, facing both ways, and a close-up diagram of the hand with the layers named.
  Tests that hold the rule where a test can (for example, for every held layer: some grip pixel
  lies directly below the fist and some directly above it; no fist pixel is drawn over a blade
  or head pixel).

**2. The eleven new items.** Icons for `hide`, `feathers`, `pearl`, `cudgel`, `smuggled_tea`,
`smugglers_cutlass`, `trollstone`, `leather`, `leather_bracers`, `leather_cap` and
`leather_jerkin`; worn layers (through `ITEM_LAYERS`) for the wearables among them (read
`src/data/items.ts` to see which have `equip`). Leather sits on the gear ladder between linen and
bronze: a hunter or woodsman, no metal. The smuggler's cutlass is a rare drop and may look a
little finer than its tier. Held ones follow the new hand rule from the start.

**3. Portraits, 48 x 48, through `portrait(id)`.** The eight monsters first (`dock_rat`,
`sand_crab`, `thieving_gull`, `bramble_boar`, `footpad`, `grey_wolf`, `smuggler`, `marsh_troll`;
`src/data/` says what each is), then the smith, the trader and the pirate captain (ids `smith`,
`trader`, `pirate`). The fight screen shows a portrait at 3x in a 148px frame and lists at 2x in
100px, placed as given and never resized, so return an element at the right size for its place
if the door lets you tell which, or at one size that suits both. One clear expression each, on a
dark tinted disc as the style guide says; menace by silhouette and attitude, never gore; funny is
welcome (the gull especially), cute is not. Any you do not reach stay null.

Not this session: dungeon tiles, the tab icons, tier 2 gear.

Minimum: part 1 complete, with its sheet and tests; icons for the eleven items.
Done when: `npm run check` passes; the before-and-after sheet shows weapons plainly held, in the
town as well as on the sheet; nothing outside `src/art`, `tests/art`, `docs/style-guide.md` and
this lane's status file changed.

### Lane C · S14b: Fighting in dungeons

Read: `docs/design.md` section 8; `docs/status/lane-c.md`; lane A's notes for you in
`docs/status/lane-a.md`; `src/core/combat.ts` (the formulas) and `src/core/run.ts`
(`settleRun`).

The dungeon has rooms and a way through them. Put the fight in: short, active, one thumb.

- **The rules are lane A's; the run is yours.** Use `playerCombat(state, content)` for the
  character's attack, defence, max hit and hit points, `hitChance` and the monsters' own numbers
  from the content tables for who hits whom and how hard, and the weapon's style for reach
  (melee beside the target, ranged from a distance, one arrow a shot). Roll your own dice from a
  seed taken when the run starts (`src/core/rng.ts` has the generator; never touch `state.rng`).
  Nothing about a run is saved while it lasts. When it ends, by any route, call
  `shell.settleRun(spoils)` exactly once with what it came to: it pays the XP, loot and coins in,
  takes the food eaten and arrows shot out, and saves. It is the only way a scene changes the
  save.
- **Enemies.** Placed in rooms as data. They notice the hero within a range, come at him, and
  attack on their timers. Use monsters that exist (`dock_rat`, `sand_crab`, `smuggler`) with a
  placeholder figure each (a labelled shape in a base-ramp colour is fine; their real sprites are
  a later art session). A room's doors stay shut until it is cleared.
- **Auto-attack.** The hero attacks whatever is in reach by himself, on his attack timer. Tap an
  enemy to choose it as the target; tap the ground to move, as ever.
- **Telegraphed attacks.** At least one enemy has a heavy attack that marks the ground first (a
  shape that fills over a second or so) and hits hard only if the hero is still in it when it
  lands. This is the heart of the active game: moving out of the way must work and feel fair.
- **Abilities.** A bar of two for the weapon's style, each with a cooldown shown on the button:
  melee, say, a wide swing that hits everything adjacent and a brace that halves the next heavy
  hit; ranged, a quick double shot and a step back. Yours to design; keep them few and readable.
  Buttons sit at the bottom edge, thumb-sized, inside the safe area.
- **Food.** A button that eats one from the food slot (the count the character walked in with),
  with a short cooldown. No food slot loaded, no button.
- **Health** for the hero on screen at all times, and over each enemy.
- **Ending.** Clearing the last room ends the run with results: time, kills, XP by skill
  (`XP_PER_DAMAGE` and its friends in `combat.ts` say how much), coins and loot (roll each
  monster's table from the content). Falling to zero ends it too: "washed back to town" with
  whatever was picked up so far, nothing lost. Leaving early keeps what was picked up. All three
  settle through `settleRun`.
- Keep it grey-box. The grotto's own rooms, tide, enemies and boss are the next session (S15).
- Tests: targeting and reach; the telegraph (in the shape when it lands: hit; out of it: not);
  cooldowns; a cleared room opens its doors; each of the three endings settles exactly once with
  the right spoils; a run rolls the same from the same seed.

Minimum: enemies that chase and hit, auto-attack, health, one telegraphed attack, and the three
endings settling their spoils.
Done when: `npm run check` passes; a landscape phone-sized run shows a room cleared, a heavy
attack dodged and one taken, an ability used, food eaten, a run finished and a run failed, and
afterwards the bank and skills showing what was earned; nothing outside `src/scene`,
`tests/scene` and this lane's status file changed.

## Wave 4 briefs (done)

New since wave 3:

- The `Shell` a scene is given (`src/ui/view.ts`) has two more calls: `pauseIdle(on)` stops the
  idle game's clock for a dungeon run and owes nothing for the time, and `fullScreen(on)` hides
  the top bar and tabs. Both are undone automatically when the Town tab is left.
- `src/art/portraits.ts` is a new art door: `portrait(id)` gives a 48 x 48 face for an id, or
  null. It answers null for everything today.
- Art direction from Cody: **gear starts simple and moves up as the player gets more powerful**
  (the "Gear ladder" in `docs/style-guide.md`).

**The monsters of tier 1**, fixed here so that lane A can build them and lane B can draw them at
the same time. Ids are final; names and numbers are lane A's to tune.

| Area           | Monster id      | Roughly                              | Combat level about |
| -------------- | --------------- | ------------------------------------ | ------------------ |
| The Docks      | `dock_rat`      | a rat the size of a terrier          | 1                  |
| The Docks      | `sand_crab`     | a crab with opinions                 | 3                  |
| The Docks      | `thieving_gull` | a gull that steals, and fights dirty | 5                  |
| The North Road | `bramble_boar`  | a boar with thorns in its hide       | 8                  |
| The North Road | `footpad`       | a roadside robber with a cudgel      | 11                 |
| The North Road | `grey_wolf`     | a lean wolf                          | 14                 |
| The Saltmarsh  | `smuggler`      | a cutlass and a bad attitude         | 17                 |
| The Saltmarsh  | `marsh_troll`   | big, slow, hard to discourage        | 20                 |

### Lane A · S8: Idle combat

Read: `docs/design.md` sections 4, 5 and 6; `docs/status/lane-a.md`; `src/core/actions.ts`,
`src/core/away.ts` and their tests before designing anything.

Pick an area and a monster; the character fights by itself, eats when hurt, collects loot, and
keeps doing so while the game is closed.

- **Skills.** Melee, Ranged, Defence and Vitality join the tables under a "Combat" group. (Magic
  waits until there is something to cast with.) Which attacking skill earns XP follows the weapon
  in hand; Defence earns from being attacked; Vitality earns from all fighting and sets hit
  points. Decide the split and write it down.
- **The fight, as rules.** Player and monster each attack on their own timer. A blow hits or
  misses by attack against the other's defence or armour, and does damage up to a maximum set by
  strength. Read the player's side from `equipmentTotals`. A ranged weapon uses one arrow per
  shot; out of arrows ends the fight. A monster that dies is replaced by a fresh one after a short
  pause. Keep the formulas few and plain enough to state in a sentence each.
- **Chance, done properly.** Combat needs dice and the game has had none. Put a seeded random
  number generator's state in the save and draw from it only inside the rules, in a fixed order
  per event, so that a fight is exactly repeatable from a save. `advance` for combat cannot be
  closed-form arithmetic: it walks the fight **event by event** (the next blow, the next
  respawn), which is fine and is not the "loop of ticks" `CLAUDE.md` forbids, because events are
  the game's own and not slices of time. The invariant does not bend: `advance(a)` then
  `advance(b)` equals `advance(a + b)` exactly, and a night away equals the same night in 16 ms
  frames, dice included. Prove that with tests before building screens. A day at the cap is tens
  of thousands of events; measure how long a 24-hour catch-up takes and keep it well under a
  second on a phone-class CPU (report the number).
- **Food.** A food slot holds one kind of cooked fish. The character eats one when hit points
  fall below a line the player can set (give a sensible default), each fish healing by its kind.
  Out of food does not stop the fight; it just stops the eating.
- **Death.** Dying ends the task and costs nothing permanent: the character is back at full
  health and idle. Say so plainly on screen and in the away report.
- **Loot.** Each monster has a table: coins, something always (hides, feathers, bones or the
  like), and rarer things. **Hides must feed Crafting**: add leather and a small leather set
  (cap, jerkin, bracers or boots) so the note S6 left is closed. Give the smuggler and the troll
  one rare drop each worth chasing. Loot goes to the bank.
- **Wearing things needs levels.** Add the level requirement S7b left room for
  (`requires` on `EquipDef`): bronze at 1, iron at about 10 Defence or the weapon's skill,
  bows by Ranged. Existing characters keep what they are already wearing.
- **Screens.** A Combat section on the Skills tab: areas, then monsters with their level and what
  they drop (show a drop only once it has been seen; unseen ones as "?"). The fight screen: both
  health bars, both attack timers, the monster's portrait (`portrait(id)` from
  `src/art/portraits.ts`, with a tidy placeholder when it is null), the food slot and its
  threshold, a running tally of kills and loot this session. Starting a fight stops any other
  action, as ever.
- **Away.** The away report covers a fight: kills, loot, XP and levels, food eaten, arrows used,
  and whether it ended in death or for want of arrows.
- **Balance, held by tests.** Duel simulations in the style of `tests/data/pacing.test.ts`: a
  fresh character in linen with a bronze sword beats dock rats without food and loses to a boar;
  each monster is a fair fight at about its level in the gear of that level and hopeless ten
  levels early; a combat skill takes about three hours to level 20 on level-appropriate monsters;
  how many cooked fish an hour each tier of fight costs.
- **Save.** Version 6, with a migration, `saveProblem` checks and tests.
- Thieving and Bounties are S9. Do not start them.

Minimum: melee against The Docks' three monsters with food, loot and death, exact through time
away, with the fight screen.
Done when: `npm run check` passes; a phone-sized run shows a fight won, a fight lost, eating,
loot arriving in the bank, and an away report after hours of fighting; the status file states the
formulas and the measured catch-up time.

### Lane B · B4: Icons, and the hatchet

Read: `docs/style-guide.md`; `docs/status/lane-b.md`; `src/art/icons.ts`, `src/art/portraits.ts`.

The menus have had no pictures since the first session. Fill the two icon doors, fix one piece of
the wardrobe, and start on faces if there is time.

- **The hatchet, first.** `bronze_axe` on the character has had three passes and its head still
  reads as a hook or a club. Look at `/home/claude/lane-shots/wardrobe-pass-3/ladder.png` and
  `candidates-axe.png`. The trouble is the head's outline: a thin curved bar hooking off the top
  of the haft. An axe head is a solid wedge: narrow where the haft passes through it, widening
  to a cutting edge as tall as the head is long, with the edge on the side away from the body.
  Draw it as a filled trapezoid first and refine from there; four or five pixels of solid head
  beats an elegant outline. Hold it beside the iron bearded axe, which works. Budget a small part
  of the session for this and stop when it passes the squint test.
- **Item icons, 24 x 24, for every item in `src/data/items.ts`** (read the file for the ids and
  what each thing is; do not import it, art knows nothing about the game). `itemIcon(id)` returns
  an element showing it, or null for an id it does not know. Roughly sixty: logs, fish raw and
  cooked, ores and bars, herbs and shells, arrows and their parts, cloth, the worn gear in bronze,
  iron, linen and shell, the bows, the potions and the vial. Lane A is adding items this wave
  (leather and a few leather pieces, hides and other monster drops, with ids not yet known):
  icons for those are next session's, and an unknown id must stay null.
- **Icons are their own drawings,** not shrunken gear layers: an object alone, turned to show its
  best side, filling most of the square, with the automatic outline and the light from the upper
  left. Families must read as families and differ at a glance: the three logs by bark and wood
  colour, raw fish against cooked, bronze gear against iron by colour and (per the gear ladder)
  by how plain or solid it is, the four potions by colour and bottle. The bronze hatchet's icon
  and its worn layer should plainly be the same object.
- **Skill icons** for every skill in `src/data/skills.ts`, and for the four combat skills lane A
  is adding now: `melee`, `ranged`, `defence`, `vitality`. One clear object each (an axe in a
  stump, a fish on a hook, an anvil).
- **How they are shown.** The UI puts an icon in front of a heading at whatever size the element
  comes; make the element a pixel-exact canvas (as `characterCanvas` does) at a whole scale that
  suits a line of 18px text on a phone, crisp at device pixel ratios 2 and 3. Look at them in the
  real screens: the bank's rows and cards, the skills list, action cards, recipe inputs, the
  potion panel, the character sheet's slots. If an icon is cramped or misaligned there and the
  fix is in `src/ui`, do not make it: record exactly what is needed under "Needs from another
  lane".
- **Replace the placeholder tab icons** (`src/art/tabIcons.ts`) only if `src/ui` can take the new
  ones without a change there; otherwise leave them and note it.
- **Gallery:** an "Icons" section with every icon on a grid, labelled, in families.
- **If time remains, portraits** (48 x 48, `portrait(id)`), in this order: the eight monsters in
  the table above, then the three townsfolk. One clear expression each; the style guide's
  Portraits section is the rule. Not cute, not grim. Any you do not reach stay null.
- Tests: every id listed in a test's own copy of the item and skill ids gives an icon; an unknown
  id gives null; no two icons are the same picture.

Minimum: the hatchet, and icons for every current item.
Done when: `npm run check` passes; the icons read at true size in the bank and skills screens on
a 390-wide phone at 3x; nothing outside `src/art`, `tests/art`, `docs/style-guide.md` and this
lane's status file changed.

### Lane C · S12c and S14a: Your own character in town, and the way into a dungeon

Read: `docs/status/lane-c.md`; `docs/status/lane-a.md` (how to read the player's look and worn
gear); `docs/design.md` sections 3 and 8; `src/ui/view.ts` (the `Shell`).

Two things, the first small.

**S12c: the hero is you.**

- Draw the town's hero with `characterPicture` from the player's own look and worn items (lane
  A's status file names the two functions that read them from the state). A new character
  arrives in town in linen, not in plate. Redraw him when gear or look changes; keep the caching
  that makes dusk lighting cheap.
- The townsfolk turn to face the hero when he walks up (mirror the picture).
- Hold and drag to steer: while a finger is held on the ground, the hero keeps walking towards
  it, re-aiming as it moves. A tap still does what it does now.

**S14a: the dungeon's shell.** Combat is being built by lane A this wave, so there is nothing to
fight yet. Build everything about a dungeon that is not the fight, on `stage.ts`:

- **The way in.** The rowing boat at the quay: walk up, and its panel offers to row out to the
  grotto. For now it is plainly labelled as unfinished.
- **Sideways.** Dungeons are played in landscape. Phones cannot be made to rotate, so entering
  shows a "turn your phone" prompt and the run begins when the screen is wider than it is tall;
  turning back to portrait pauses the run behind the same prompt. Use `shell.fullScreen(true)`
  for the run and give the scene its own way out, always on screen (a "Leave" button that asks
  once more before it acts).
- **The idle task waits.** `shell.pauseIdle(true)` on entering, `false` on leaving by any route.
  Check it: an action left running in the Skills tab must have made no progress during the run.
- **Rooms and doors.** A dungeon is rooms as data (each a tile map with footprints, as the town
  is), joined by doors: walk into a door and the next room loads with the hero at the matching
  door. A grey-box dungeon of three rooms in flat placeholder colours, the last with a marked
  spot that ends the run with a plain results screen ("You reached the end", time taken, a button
  back to town).
- **Made for landscape:** the camera, scale and tap-to-walk all right in a wide, short view; the
  hero drawn as in town. Leave clear room at the screen's edges where S14b will put the ability
  bar and health; do not build them.
- Failing a run and anything to do with enemies, damage, loot or food is S14b, after lane A's
  combat has landed. Note in your status file what S14b will need from the combat rules.
- Tests: door links (every door leads somewhere and back), entering and leaving pause and resume
  the clock through the shell, the rotate prompt's rule, drag-to-steer re-aiming.

Minimum: S12c's hero in the player's look and gear; a dungeon you can enter from the boat, walk
through three rooms of, and leave, with the idle task paused throughout.
Done when: `npm run check` passes; a run on a phone-sized screen shows the hero in town wearing
what the character sheet shows, the rotate prompt in portrait, three rooms walked in landscape,
the results screen, and the town again with the bars back; nothing outside `src/scene`,
`tests/scene` and this lane's status file changed.

## Wave 3 briefs (done)

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

- **Milestone A review** (Cody plays for a few days): pacing, prices, the art direction.
- **S16** (C, with A): first-clear unlock of tier 2, the idle-able dungeon, daily modifier,
  challenges; the notice board opening bounties.
- **B7** (B): whatever of B6's list was not reached; walk cycle; the hero's portrait.
