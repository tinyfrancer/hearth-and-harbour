# Lane A: idle rules

**Next session: S9: Thieving and Bounties** (brief in `docs/lanes.md`, wave 5).

## Done

- S2 Idle engine and woodcutting (PR #2)
- S3 Offline progress and the away report (PR #3)
- S4 Fishing, Mining, Foraging, the bank, mastery (PR #4)
- S5 Cooking and Smithing: recipes in the tables (`recipe()` in `src/data/actions.ts`), cooked
  fish, bronze and iron bars, and a bronze and an iron axe, sword, helmet, breastplate and shield
  as bank items; the action card shows what a recipe uses, how many are held, how many times it
  can be made, and what is short; the Skills list is grouped under Gathering and Artisan
  (`SkillDef.group`); both skills paced in `tests/data/pacing.test.ts` (PR #6)
- S6 Crafting, Fletching, Alchemy and potions (PR #11):
  - **Crafting** (Foraging into things): shell vial, bowstring, linen, a shell necklace and a
    shell bracelet, and a linen hood, trousers and tunic (bank items until S7b).
  - **Fletching** (logs into things): arrow shafts (ten a log), bronze and iron arrows (ten
    shafts and ten heads make ten), and a pine, oak and willow shortbow (two logs and a
    bowstring). Smithing gains bronze and iron arrowheads, ten a bar. `recipe()` takes an
    optional eighth column for how many one completion makes, and the card title says `×10`.
  - **Alchemy** (Sageleaf and Glowcap into four potions). **Container: a Crafting recipe**, the
    shell vial from one seashell, at Crafting 1. Chosen over a new Foraging find because it adds
    no new gatherable and so leaves Foraging's pacing alone; the cost is one extra cheap step.
  - **Potions are charges**, counted in completions (`src/core/potions.ts`, `PotionDef` on
    `ItemDef.potion`). Drinking one gives its charges; each completion of an action of a skill
    it helps uses one; it ends on the completion that uses the last. One at a time; drinking
    another replaces it, and the bank asks with a second tap if charges are left. Three kinds of
    effect, all whole numbers per completion: `speed` (duration rounded once with mastery),
    `xp` (skill XP rounded once per completion; mastery XP is not boosted), `extra` (a
    completion's items again on every charge whose number is a multiple of N, counted down from
    the charges so it needs nothing else saved). `advance` treats the last charge as a stretch
    boundary beside a mastery level.
  - The potions: Sage tonic (Alchemy 1: Gathering 10% quicker, 150 charges), Steady-hand draught
    (6: Artisan 10% more XP, 150), Glowcap tincture (11: Gathering, an extra item every 5th,
    150), Midnight oil (16: Gathering and Artisan 15% more XP, 200).
  - Screens: drink from the bank's item card (what it does, for which skills, how long it
    lasts); the potion and its falling charges show at the top of the Skills tab and on the
    pages of the skills it helps; numbers it changes on an action card show in violet; a toast
    when it wears off; the away report says how many charges were used and whether it wore off.
    A player action (start, stop, sell, drink) now keeps the screen scrolled where it was.
  - Save version 4 (`potion`), with a migration, a `saveProblem` check and tests for both.
  - Pacing: the three skills reach level 20 in 1.80, 1.82 and 1.87 hours with materials on hand;
    each potion's worth over an hour is pinned in `tests/data/pacing.test.ts`.

- S7b Equipment and the character (PR #15):
  - **Rules** (`src/core/equipment.ts`): eight slots (`SLOTS` in `src/core/content.ts`: head,
    body, legs, main hand, off hand, neck, wrist, ammunition). `ItemDef.equip` gives the slot,
    `twoHanded`, a `style` (`melee` or `ranged`) and `attack`, `strength`, `armour`. `equip`
    moves one from the bank (ammunition: the whole stack, joining a stack of the same kind) and
    sends back what was there; a two-handed weapon sends back the off hand, and an off-hand item
    sends back a two-handed weapon. `unequip`, `wornItemIds`, `wearablesFor`, `combatStyle` and
    `equipmentTotals`. An item's attack and strength count only when its `style` matches the
    weapon's (arrows add nothing to a sword); armour always counts; no weapon is melee.
  - **Numbers** (on the items in `src/data/items.ts`, pinned by `tests/data/content.test.ts`:
    iron at least 1.5 times bronze, cloth at most a third of the metal piece):

    | Item                         | Slot                          |     Attack |  Strength |  Armour |
    | ---------------------------- | ----------------------------- | ---------: | --------: | ------: |
    | Bronze / iron sword          | main hand, melee              |     6 / 10 |     5 / 9 |         |
    | Bronze / iron axe            | main hand, melee              |      4 / 7 |    6 / 10 |         |
    | Bronze / iron helmet         | head                          |            |           |   4 / 7 |
    | Bronze / iron shield         | off hand                      |            |           |  6 / 10 |
    | Bronze / iron breastplate    | body                          |            |           |  9 / 15 |
    | Linen hood, tunic, trousers  | head, body, legs              |            |           | 1, 2, 1 |
    | Shell necklace               | neck                          |          2 |           |         |
    | Shell bracelet               | wrist                         |          1 |         2 |         |
    | Pine / oak / willow shortbow | main hand, both hands, ranged | 5 / 8 / 12 | 3 / 6 / 9 |         |
    | Bronze / iron arrows         | ammunition, ranged            |            |     3 / 6 |         |

  - **The look** is `GameState.look`: `skin`, `hair`, `hairColour`, each an id from art's
    `LOOK_CHOICES`, each optional. Core never knows the choices; `fullLook` in `src/ui/look.ts`
    fills a part never chosen, or no longer offered, with art's first choice. So no look id is
    written anywhere in lane A's code, and an old character (`look: {}`) is drawn with the
    default.
  - **Screens.** Creation asks for a name and a look, drawn live (`characterCanvas`); a part with
    one choice shows its name and no buttons, a part with several steps through them with ‹ and ›.
    The Character tab is the sheet: the character drawn at sheet size wearing `wornItemIds`, the
    three totals named for the weapon's style ("Ranged attack"), the eight slots two to a row
    (tap one for what the bank holds for it, what is in it and Take off; a note when a bow is in
    the way of the off hand), and Change look. The bank's item card says where a thing is worn
    and what it gives, and has an Equip button. A toast says what went on and what went back to
    the bank. Toasts now replace one another instead of printing over each other.
  - **Save version 5** (`look`, `equipment`): migration (`look: {}`, `equipment: {}`; gear in
    the bank stays there), `saveProblem` checks (look parts are strings and only those three;
    slots are real, one of a thing except a stack of ammunition) and tests for both.
  - **Housekeeping.** A skill page with more than eight actions whose rows have a `group`
    (`ActionDef.group`, set with `grouped()` in `src/data/actions.ts`) lists them under
    collapsible headings in table order. Smithing: Bars, Bronze, Iron. First shown, the first
    heading is open and so is the one with the running action (or the newest unlocked); taps are
    remembered per skill while the app runs; the running action's heading always opens on a
    redraw.

- S8 Idle combat (PR #22). Pick an area and a monster on the Skills tab's Combat section; the
  character fights by itself, eats from the food slot, banks the loot, and keeps going while the
  game is shut.
  - **State.** `GameState.fight` (beside `action`; at most one is set, and starting either clears
    the other): the monster, both sides' hit points, the milliseconds until each side's next blow
    (the monster's wait is the respawn while its hit points are 0), and a tally. `food` (a stack
    of one cooked fish, moved from the bank whole, like arrows), `eatAt` (percent, default 50,
    10 to 90 in steps of 10), `rng` (the dice: one uint32) and `bestiary` (kills and drops seen,
    per monster). Player hit points exist only in a fight: a new fight starts at full health.
  - **Dice** (`src/core/rng.ts`): mulberry32, its state in the save, seeded from `createdAt` for
    new and migrated characters. Rolled only inside fight events, in a fixed order.
  - **The walk** (`advanceFight`, `src/core/fight.ts`): event by event (the next blow, or the next
    monster arriving), in plain variables with one new state at the end. At the same instant the
    character strikes first; an event exactly at the end of the time is part of it. Tests cut
    time at random frames and exactly on a kill, a respawn, the blow that kills the character,
    the last arrow and the last fish, and play nights in 16 ms frames against `catchUp`, on test
    tables and on the real ones.
  - **The formulas** (`src/core/combat.ts`), one sentence each:
    - The character attacks every 2.4 s whatever is in hand; a monster every `speedMs`.
    - Attack rating is 10 + the attacking skill's level + the gear's attack; defence rating is
      10 + Defence level + armour; a monster's two ratings are in its table row.
    - A blow lands with chance attack / (attack + defence).
    - A blow that lands does 1 to max hit, each equally likely; the character's max hit is
      1 + floor((attacking level + gear strength) / 2).
    - Hit points are 20, plus 4 for each Vitality level after the first.
    - After a blow leaves health below the line, the character eats fish until above it or out;
      a blow that takes health to 0 knocks them out before any eating.
    - A dead monster is replaced 3 s later, and the kill gives back a tenth of the character's
      hit points (rounded up).
    - A bow uses an arrow a shot; the shot that uses the last arrow ends the fight.
    - Being knocked out ends the fight and nothing else: no loss, full health, idle.
  - **XP split.** The attacking skill (Melee or Ranged, by the weapon in hand) earns 5 XP per
    point of damage dealt; Defence earns 2 XP per point of the monster's max hit for every attack
    it makes, hit or miss (so better armour never costs XP); Vitality earns half of both, rounded
    down blow by blow.
  - **Monsters** (`src/data/monsters.ts`; numbers tuned by the simulations below):

    | Monster       | Lvl |  HP | Atk | Def | Max hit | Speed | Coins | Always        | Rare                            |
    | ------------- | --: | --: | --: | --: | ------: | ----: | ----- | ------------- | ------------------------------- |
    | Dock rat      |   1 |  10 |   8 |   8 |       2 |  2.4s | 1-3   | hide          | raw herring 1/8                 |
    | Sand crab     |   3 |  16 |  16 |  22 |       4 |  3.0s | 1-4   | seashells 2-4 | pearl 1/64                      |
    | Thieving gull |   5 |  14 |  30 |  14 |       5 |  1.8s | 2-8   | feathers 1-3  | shell necklace 1/40             |
    | Bramble boar  |   8 |  30 |  36 |  24 |       7 |  2.8s | none  | hide 1-2      | glowcap 1/10                    |
    | Footpad       |  11 |  40 |  50 |  32 |       9 |  2.4s | 8-25  | cudgel        | iron sword 1/50                 |
    | Grey wolf     |  14 |  46 |  56 |  36 |       9 |  2.2s | none  | hide 1-2      | sageleaf 1/8                    |
    | Smuggler      |  17 |  64 |  60 |  44 |      13 |  2.4s | 15-40 | smuggled tea  | iron arrows 1/10, cutlass 1/120 |
    | Marsh troll   |  20 |  96 |  62 |  40 |      20 |  3.6s | 5-30  | hide 2-4      | iron ore 1/6, trollstone 1/150  |

  - **Items.** Cooked fish heal 6 / 12 / 20. New: hide, feathers, pearl, cudgel, smuggled tea, the
    smuggler's cutlass (Melee 18), the trollstone (neck, Defence 18), leather, and leather
    bracers, cap and jerkin (the archer's armour: some armour and a little ranged attack).
    Crafting tans hide into leather (level 3) and makes the bracers (9), cap (12) and jerkin
    (18); Crafting's pacing still holds. Feathers and pearls have no use yet.
  - **Wearing needs levels** (`EquipDef.requires`, checked by `equip` only, so what is worn stays
    worn): iron weapons Melee 10, iron armour Defence 10, oak bow and iron arrows Ranged 10,
    willow bow Ranged 15, cudgel Melee 5. The sheet's slot picker and the bank card say so.
  - **Balance** (`tests/data/duels.test.ts`; the gear ladder is in `tests/data/fighting.ts`): a
    fresh character in linen with a bronze sword wins every rat duel and survives an hour of rats
    without food, and loses to a boar; at each monster's level in that level's gear, melee and
    ranged both win at least 70% of no-food duels (rat aside, a win costs at least a third of
    health); ten levels early they win under 5%. Fish an hour at level, pinned: rat 0, crab 54,
    gull 135, boar 117, footpad 189, wolf 250, smuggler 187, troll 190. Pacing
    (`tests/data/pacing.test.ts`): level 20 in 3.1 h (Melee) and 2.7 h (Ranged), Defence and
    Vitality 2.7 to 3.0 h, with no deaths. Changed because of the simulations: XP per damage 4 to
    5 (Melee took 3.85 h), fish heal more (the top tiers ate 300 to 430 an hour), crab and gull
    harder, wolf, smuggler and troll easier.
  - **Catch-up time** for a whole day of fighting (`catchUp`, 24 h), rats being the worst case
    (about 11,000 kills): Node 6 to 35 ms; Chromium 9 ms; Chromium with the CPU throttled 4x
    21 ms median, 52 ms worst, 27 ms on a cold first run. `tests/core/away.test.ts` keeps it
    under 250 ms.
  - **Screens.** The Skills tab has a Combat heading: a Fight card and the four skills (tapping a
    combat skill also goes to the fighting). The areas page: the character's numbers, the food
    slot and its line, then each area's monsters with portrait, level, hit points, max hit, drops
    ("?" until seen) and kills. The fight screen: the monster's portrait, both health bars (the
    eating line marked on the character's), both waits for the next blow, the hit chances, the
    food slot, the tally, Stop. When a fight ends it says how (knocked out, out of arrows,
    stopped) with the tally and "Fight again". Toasts for a knock-out, the last arrow and the
    last fish. The bank card says what food heals (with "Put in the food slot"), what gear
    needs, and which monsters have been seen to drop a thing. The away report covers a fight:
    kills, loot and coins, XP and levels, fish eaten, arrows shot, a knock-out or the last arrow.
  - **Save version 6** (`fight`, `food`, `eatAt`, `rng`, `bestiary`): migration (no fight, no
    food, line at 50, dice seeded from `createdAt`), `saveProblem` checks (including "fighting and
    doing something else at once") and tests for both. The shell's `pauseIdle` holds a fight
    still: no blows, no dice, nothing owed (`tests/ui/shell.test.ts`).

## Deferred

- Nothing from the brief. Not built, by choice: Magic (as the brief says), a food slot holding
  anything but cooked fish, and a use for feathers and pearls.

## Needs from another lane

- Nothing blocking. For B5: icons for the new items (`hide`, `feathers`, `pearl`, `cudgel`,
  `smuggled_tea`, `smugglers_cutlass`, `trollstone`, `leather`, `leather_bracers`, `leather_cap`,
  `leather_jerkin`), wardrobe layers for the wearables among them, and portraits for the eight
  monsters. The fight screen frames `portrait(id)` in a 148 CSS px box and the lists in 100 (a
  48-pixel face at 3x and 2x, inside the frame's border); a portrait is placed as given, centred,
  never resized.
- For S14b: a dungeon fight can reuse the formulas in `src/core/combat.ts` (`playerCombat` gives
  the character's ratings, max hit and hit points; `hitChance`, `maxHitFor`), and the food slot
  is `state.food`, with `heals` on the item. A run that wants dice should take its own seed
  rather than roll `state.rng`, so idle fights stay repeatable; ask lane A for a rule that pays
  XP and loot from a run.
- For S12c: the town's hero can draw the player with `fullLook(state.look)` (`src/ui/look.ts`) and
  `wornItemIds(state)` (`src/core/equipment.ts`).

## Notes for this lane's next session

- Save is version 6. The next shape change is 7.
- Combat's skill ids are constants in core (`MELEE`, `RANGED`, `DEFENCE`, `VITALITY` in
  `src/core/combat.ts`); `tests/data/content.test.ts` checks the tables match. Bounties (S9) can
  read kills per monster from `state.bestiary`.
- Decisions Cody may want to reverse: the character's hit points live only in a fight, so
  stopping and starting again heals (harmless while being knocked out costs nothing); the
  breather after each kill makes the weakest fights free of food; feathers and pearls are only
  for selling.
- **Tools that help skilling** (not built): `EquipDef` would take `tool?: { skill: string;
percent: number }`, and `actionDuration` would fold the worn tool's percent in beside mastery
  and the potion, rounded once. Equipment changes only by the player's hand, never inside
  `advance`, so it needs no stretch boundary; an axe would be worn in the main hand, so
  choosing between a better sword and a woodcutting axe becomes a real choice.
- A bow and arrows are roughly a sword and shield's attack and strength with no armour; that
  trade is S8's to balance.
- An `extra` potion must not help a skill with recipes (it would make things from nothing);
  `tests/data/content.test.ts` checks it. Midnight oil names its groups, so combat skills (S8)
  are left out until someone decides they belong.
- XP rounding favours small actions: Midnight oil on a 10 XP action pays 12 (round of 11.5).
- An artisan skill is paced as if its materials were on hand: about two hours to level 20. The
  pacing sim tops up whatever a skill's recipes use, so a new artisan skill only needs adding to
  the `it.each` list.
- Item sale values are placeholders until the shop (S10).
- Open with Cody, none blocking: the level curve, three-hour tiers, speed-only mastery, VT323
  digits beside Pixelify Sans letters, the potion numbers above, and the equipment numbers.
