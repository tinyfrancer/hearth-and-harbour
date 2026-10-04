# Game Design: Hearth & Harbour

Status: draft 3, 2026-10-04. Decisions marked **[Cody]** came from the interview; **[Claude]** are Claude's calls and open to change. Open questions are at the end.

**Name: Hearth & Harbour [Cody].** The hearth is the house you fill; the harbour is where adventures leave from. The town is still called Gullwick (placeholder, **[Claude]**).

## 1. One-line pitch

Melvor Idle with a place to stand: a single-player fantasy idle RPG you progress over weeks from menus, plus a small walkable town, a house to fill, and short hand-made action dungeons that gate and reward the idle game.

## 2. Pillars

1. **Idle is the spine, active is the spice.** Everything can be progressed from the idle menus. Active play is never a chore you must repeat, it is how you unlock and how you get the best stuff.
2. **One thing at a time. [Cody]** Your character does one activity: one idle task, or a dungeon run. Entering a dungeon pauses the idle task; it resumes when you leave.
3. **Active unlocks idle.** Beating a dungeon by hand opens the next tier of nodes, monsters and recipes, and makes that dungeon available as an idle activity.
4. **Everything you earn can be shown.** Rare drops, boss trophies and armour sets go on display in your house. The collection is the long game.
5. **Fun, not grim, and not a kids' game. [Cody]** Earnest fantasy with humour, in the RuneScape register. Lore exists and is found in pieces; it never blocks play.
6. **Long horizon, short sessions.** Good for a two-minute check-in, good for an hour. Progress is measured in weeks.
7. **Single-player. [Cody]** Nothing social. Friends get the link and their own save. Leaderboards are a "maybe one day", not designed for now.
8. **Fantasy first; pirates are one flavour of it. [Cody]** The game has pirates and the first dungeon is theirs, but it is a fantasy world, not a pirate game. Each dungeon and tier brings its own flavour (forest folk, a wizard's tower), and the coast is the home base rather than the whole theme.

## 3. Platform and controls

- Web app on Vercel, installable to the phone home screen (PWA).
- **Portrait** for idle menus, town and house. **Landscape** for dungeons. **[Cody]** (Town in portrait is **[Claude]**.) Note: iPhone browsers cannot force rotation, so entering a dungeon shows a "turn your phone" prompt and starts when it is sideways.
- Dungeons: **tap-to-move, auto-attack, ability bar [Cody]**. One-thumb playable.
- Saves: **on the device, with export/import as code or file; built so cloud sync can be added later without rework. [Cody]**

## 4. The character

- **Classless. [Cody]** One character; what you wear and wield decides your style. Melee, Ranged and Magic are skills levelled by use.
- Created with a name and a look (skin, hair, style). Worn gear shows on the character everywhere.

## 5. Skills **[Claude, with Cody's "borrow what fits the vibe"]**

Levels 1-99 on a long curve. Content ships in four tiers of about twenty levels each (1-20, 20-40, 40-60, 60-80); tier 1 is open from the start and each dungeon opens the next. Levels 80-99 are left for content after the first version.

| Group | Skills | Notes |
|---|---|---|
| Gathering | Woodcutting, Fishing, Mining, Foraging | Foraging gives herbs, fibres, shells |
| Artisan | Cooking, Smithing, Crafting, Fletching, Alchemy | Crafting covers leather and jewellery; Alchemy makes potions |
| Combat | Melee, Ranged, Magic, Defence, Vitality | Vitality is hit points |
| Roguery | Thieving | Borrowed from RuneScape/Melvor. Picking pockets and market stalls, played for laughs |
| Tasks | Bounties | The Slayer idea: the notice board assigns a monster to hunt, paying bounty points for a shop of its own and unlocking monsters only bounty hunters may fight |
| Later | Seafaring, Homesteading, Companions | Seafaring: idle boat voyages along the coast. Homesteading: house building plus a garden (this is where Farming lives). Companions: pets that lend a hand (the Summoning idea, kept light) |

Left out on purpose: Prayer (wrong tone, and it mostly duplicates potions) and Agility (little to do without a world to run across).

Every action also earns **mastery** in the specific thing (this fish, this recipe), giving small permanent perks. It keeps old content worth doing.

## 6. The idle game

- A separate, full idle menu **[Cody]**: pick a skill, pick an action, it repeats. Each completion gives items, skill XP, mastery XP, and a small chance at rare drops.
- **Idle combat**: pick an area and a monster; the character fights automatically, eats food from a chosen food slot, collects loot. Dying ends the task and costs nothing permanent **[Claude]**.
- **Offline progress: up to 24 hours. [Cody]** The game works out what happened while it was closed and shows an away report. Progress stops early if supplies run out (food, ingredients, arrows) or the character dies.
- One engine for both: the same "advance the game by N milliseconds" function runs live and offline, so offline results can never drift from live play.

## 7. The town (Gullwick)

A small walkable coastal town, the only non-combat place you explore. The approved mock-up (see `style-guide.md`) shows the layout: tavern and smithy at the top with the road north between them, a cobbled square with a well, market stall and notice board, and a stone quay with a pier.

- Buildings: general shop, bank, forge and workshop, tavern (quests, rumours, story), notice board (bounties and daily tasks), the docks (dungeon departures, later Seafaring), your house.
- **Everything functional is also reachable from menus [Claude]**, so the town is never a walking tax. What the town adds: people, story, events, daily stock and visitors, and seeing your character and gear.
- Day and evening looks.
- Room to grow: the road north, and the harbour and coast with Seafaring.

## 8. Dungeons

**Three in the first version. [Cody]**

- Short action runs, **7-10 minutes**, landscape, a handful of rooms and a boss.
- Enemies telegraph their big attacks; you move out, use abilities (from your weapon style and gear), and manage food.
- Hand-designed layouts, each with its own gimmick. **Replay value** from: a daily modifier, optional challenges (no food, speed, no hits taken), rare drop tables, and achievements.
- **Progression gates:** each dungeon needs roughly the gear and levels of the tier before it. First clear unlocks the next tier of idle content. After the first clear the dungeon can be idled at lower reward rates, with some drops (trophies, pets, cosmetics) **active-only [Claude]**.
- Failing a run: you are washed back to town with what you picked up so far, nothing lost.

| # | Dungeon | Theme | Its gimmick | Opens |
|---|---|---|---|---|
| 1 | Brinebeard's Grotto **[Cody: theme]** | Pirate sea cave | The tide rises and falls, changing where you can stand | Tier 2 |
| 2 | Thistlewood Burrow **[Claude]** | An overgrown warren under the old forest: mushroom folk, bramble beasts, an offended badger king | Spores and light: lanterns to light, dark rooms where things creep up | Tier 3 |
| 3 | The Wobbling Spire **[Claude]** | An absent-minded wizard's tower left running by itself: animated furniture, escaped experiments | Rooms rearrange and gravity is unreliable | Tier 4 |

Dungeons 2 and 3 are sketches to be designed properly in their own sessions.

### Dungeon 1: Brinebeard's Grotto

- A sea cave hideout reached from the docks. Rooms: tide pools, the smugglers' store, a rope-bridge cavern, the brig, the captain's cove.
- Enemies: deckhands, a powder monkey who throws lit barrels (telegraphed), giant crabs, a parrot that buffs pirates, Captain Brinebeard as the boss (cannon volleys, rising tide phase).
- Loot: cutlass, boarding axe, flintlock (ranged), tricorn and captain's coat, spyglass (offhand), pearls, doubloons, salt-iron ore. Rare: Brinebeard's anchor (two-handed), a parrot pet, the ship's figurehead (house trophy).
- Unlocks tier 2: deep-water fishing, driftwood, salt-iron mining and smithing, richer pockets to pick, the next combat area.

## 9. The house

- Your home in Gullwick. It **levels up as you progress** (total level, dungeon clears, collection milestones), gaining rooms.
- Displays: trophy wall, armour stands, weapon racks, a collection cabinet, pets wandering about.
- Function arrives with rooms: a kitchen (cooking bonus), a garden plot (slow idle crops), a workshop, a bed that gives a rested bonus for logging back in.

## 10. Reasons to come back

- The 24-hour offline cap.
- Daily: dungeon modifier with a first-clear bonus, a fresh bounty, notice-board tasks, rotating shop stock, a visiting trader or small town event.
- Rested bonus from the house.
- Long chases: collection log, mastery, achievements, house levels.

## 11. Art

Settled in session S0; the full rules are in `style-guide.md`. In short: bright, heroic pixel art that is not cute, at 1.5× detail in the world with 2× portraits for close-ups, a dusk palette for evenings and dungeons, and hand-posed figures. Claude draws everything as data in code; no imported sprites. Art is kept separate from game rules so it can be changed later.

## 12. Lore **[Cody: fresh, lighter world; Claude writes it]**

A new setting built around Gullwick and its coast. Present but never in the way: item descriptions, tavern talk, short quests, things found in dungeons. Written to be discovered by playing, so it is not spelled out here.

## 13. Architecture **[Claude]**

- Harvesting from `untitled-boomer-mmo` as sessions need it: synthesised audio, pure rule systems (loot, stats, collection, bounties), movement/collision/pathing, telegraphed enemy abilities. The art engine comes from `art-reference/town-mockup.html`.
- Vite + TypeScript, no game engine, no runtime dependencies. HTML/CSS for menus; Canvas 2D for town and dungeons.
- Layers and lane ownership are in `CLAUDE.md`.
- Balance is held by simulation tests, not by eye.

## 14. Open questions

1. The town's name: Gullwick is a placeholder.
2. Should idled dungeons be able to drop the rarest items at a tiny rate, or stay active-only? Current answer: active-only.
3. Should death in idle combat cost anything (Melvor takes an item)? Current answer: no.
