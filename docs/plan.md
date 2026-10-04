# Implementation Plan: Hearth & Harbour

The sessions, in their original single-file order. **Work now runs in lanes: `docs/lanes.md` sets
the order, the ownership and the full briefs, and wins where it disagrees with this file.** Status
is in `docs/status/`. This file is the map of everything still to build.

Each item is sized for one session. A session builds on a branch with tests, opens a PR, merges
once CI passes, and ends with something Cody can open on his phone and judge.

Harvest rule: code is copied from `untitled-boomer-mmo` only when a session needs it, trimmed to
what is used. Art rule: until an art pass, new things get simple placeholder art in the approved
palette.

## Phase 0: Foundations

**S0. Art style review** — DONE. See `style-guide.md`.

**S1. New repo and app shell** — DONE (PR #1).

## Phase 1: The idle game (Milestone A: a playable Melvor-lite, tier 1)

**S2. Idle engine and first skill** — DONE (PR #2).

**S3. Offline progress** — DONE (PR #3).

**S4. Gathering skills and the bank** — DONE (PR #4).

**S5. Artisan skills, part 1**
Recipes with inputs. Cooking and Smithing, recipe screens, "make until out of materials".

**S6. Artisan skills, part 2**
Crafting, Fletching, Alchemy. Potions as timed buffs that offline progress respects.

**S7. Equipment and the character** (split by the lanes into S7a, art pipeline, and S7b, equipment and the character sheet)
Gear slots, stats, character sheet with the hero portrait. Art pipeline: the pixel engine, palette ramps and day/dusk shift from `art-reference/town-mockup.html`, and the posed base body with gear layers so equipment shows on the character. Character creation (name and look).

**S8. Idle combat**
Areas and monsters as data, auto-fight, food slot, loot tables, combat skill XP by weapon style, death rule. Offline combat. Duel simulations to hold the balance. Enemy portrait in the combat screen.

**S9. Thieving and Bounties**
Thieving: marks, success chance, getting caught (a short stun, not a punishment). Bounties: assigned targets, bounty points, the bounty shop, bounty-only monsters.

**S10. Shop, collection log, achievements**
Coins and the general shop, the collection log, the achievement framework and a first set.
**Milestone A review:** play it for a few days; tune pacing; decide whether the art direction still feels right; amend the plan.

## Phase 2: Active play (Milestone B: town and first dungeon)

**S11. Scene engine**
Canvas renderer at whole-device-pixel scaling, camera, tap-to-move, collision and pathing. A plain test room you can walk around.

**S12. Gullwick v1**
The town map from the approved mock-up, buildings, people you can tap and talk to (with portraits), doors that open the matching menu (shop, bank, notice board), the docks. Day and dusk.

**S13. Art pass 1 (review session)**
Town tiles, buildings, townsfolk, character polish, portraits, item icons for everything so far.

**S14. Dungeon engine**
Landscape mode and the rotate prompt, rooms and doors, enemy behaviour, auto-attack, ability bar by weapon style, telegraphed attacks, food, fail/complete and the results screen. Idle task pauses on entry and resumes on exit. One grey-box test dungeon.

**S15. Brinebeard's Grotto: content**
The five rooms, the tide mechanic, four enemy types, the boss fight and its phases, the loot table.

**S16. Dungeon progression and replay**
First-clear unlock of the next tier, idle-able dungeon after clear, daily modifier, challenges, dungeon achievements.

**S17. Art pass 2 (review session)**
Grotto tiles, pirates, crabs, Brinebeard, pirate gear on the character, effects.
**Milestone B review.**

## Phase 3: Home and reasons to return (Milestone C: the full loop)

**S18. The house**
Interior scene, trophy wall, armour stands, cabinet, house levels and what raises them.

**S19. Story, quests and onboarding**
Opening, the tavern and its people, a short quest chain leading to the Grotto, tips for new systems, lore fragments.

**S20. Daily rhythm**
Notice-board tasks, rotating shop stock, visiting trader, rested bonus from the house.

**S21. Sound and polish**
Harvest the synthesised audio; cues and ambience; menu feel; balance simulation pass across tier 1 and the Grotto.

## Phase 4: The rest of version 1 (Milestone D: three dungeons, four tiers)

**S22. Tier 2 content**
Levels 20-40 across every skill: nodes, recipes, gear, monsters, marks, bounties. Data only; pace simulations extended.

**S23. Thistlewood Burrow: design and build**
Its rooms, the light-and-spores mechanic, enemies, boss, loot. Any dungeon-engine additions it needs.

**S24. Art pass 3 (review session)**
Burrow tiles and creatures, tier 2 gear and icons.

**S25. Tier 3 content**
Levels 40-60, as S22.

**S26. The Wobbling Spire: design and build**
Its rooms, the rearranging-rooms mechanic, enemies, boss, loot.

**S27. Art pass 4 (review session)**
Spire tiles and creatures, tier 3 gear and icons.

**S28. Tier 4 content and the version 1 review**
Levels 60-80, final house rooms and trophies, a whole-arc balance pass. Decide what comes next.

## Later (unscheduled)

Cloud save and sync, Seafaring and the coast, Homesteading and the garden, Companions, levels 80-99, dungeon 4 onward, leaderboards (a maybe).
