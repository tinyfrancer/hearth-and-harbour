# Lane A: idle rules

**Next: wave 18, part 2** (the menus: results card and toasts, a foldable Dungeons card, lane B's
seal and sparkle), then Cody's review of wave 18.

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

- S9 Thieving and Bounties. Pick pockets under a new Roguery heading; take bounties from the
  notice board on a page reached from the Combat section; spend the points in a shop of three
  things; and hit points now last between fights.
  - **How thieving sits in the rules: a kind of action with a roll, not a third activity.** A
    mark is an `ActionDef` with a `steal` (`StealDef`: description, difficulty, stun, coins,
    loot), `gives: []`, `xp` paid per success. So starting, stopping, the level to start, one
    thing at a time, mastery keyed by action id, the Skills list's "doing" line, the away
    report's action and "New:" unlocks all come for free. Only the passing of time differs:
    `advance` hands a theft to `advanceTheft` (`src/core/thieving.ts`), which walks it attempt by
    attempt with the save's dice as `advanceFight` walks blows. A third activity kind would have
    duplicated start/stop/level/mastery/one-at-a-time for nothing. The stun lives on the action
    (`ActiveAction.stunMs`, absent when not stunned, with `progressMs` 0 under it). Potions never
    help a theft (the walk ignores them; a content test keeps them off Thieving).
  - **The rules, a sentence each** (`src/core/thieving.ts`): an attempt takes the mark's set time
    (mastery makes a mark surer, not quicker); the thief's rating is 10 + Thieving level + half
    the mark's mastery level, rounded down; an attempt succeeds with rating / (rating +
    difficulty), never above 95%; a success pays coins, XP, mastery and rolls each loot line on
    its own; being caught is a stun of the mark's few seconds and nothing else (no coins, items
    or health lost). Dice per attempt, in order: success, coins, then each loot line and its
    count. The chance is read afresh each attempt, so a level gained on one counts from the next.
  - **Marks** (`src/data/actions.ts`; chance is at the mark's own level / at 20, mastery 1):

    | Mark                      | Lvl | Time |  XP | Diff | Stun | Coins | Chance    | Loot                                                     |
    | ------------------------- | --: | ---: | --: | ---: | ---: | ----- | --------- | -------------------------------------------------------- |
    | Dozing fisherman          |   1 |   3s |  22 |    8 |   3s | 1-7   | 58% / 79% | raw shrimp 1-3 1/5                                       |
    | Fish stall                |   5 | 3.5s |  36 |   11 |   4s | 3-11  | 58% / 73% | cooked shrimp 1-2 1/4, cooked herring 1/10               |
    | Tipsy sailor              |   9 |   4s |  50 |   14 |   4s | 6-18  | 58% / 68% | smuggled tea 1/20, pearl 1/80                            |
    | Travelling pedlar         |  13 | 4.5s |  70 |   17 |   5s | 11-30 | 57% / 64% | linen 1-2 1/8, sage tonic 1/30, bracelet 1/100           |
    | Harbourmaster's strongbox |  18 |   5s |  88 |   20 |   5s | 18-46 | 58% / 60% | smuggled tea 1-2 1/6, iron arrows 10-20 1/15, pearl 1/50 |

  - **Bounties** (`src/core/bounty.ts`): combat level is the better of Melee and Ranged, Defence
    and Vitality, averaged, rounded down. The board posts a monster with a `bounty` row from six
    levels below that up to the level itself (never above while anything is below; past the
    tables, the strongest; before them, the weakest), with the save's dice (monster, then count),
    rolled only when the player takes, hands in or swaps. Kills count inside the fight walk while
    the bounty is held, up to its count. Handing in pays the row's points and 10 coins a point
    and posts the next (on another monster when there is one). A swap costs 3 points, or what
    there is if fewer, and is refused only when the board has nothing else for the character.
    `MonsterDef.bounty` is `{ kills: [min, max], points }`; `bountyOnly` monsters can be fought
    only while the bounty names them, and handing in or swapping away ends that fight.
  - **Bounty rows** (counts set by simulation so either weapon takes 10 to 20 minutes at the
    monster's level): rat 50-90 / 2 points, crab 28-50 / 3, gull 40-65 / 4, boar 21-34 / 5,
    footpad 20-34 / 7, wolf 18-30 / 8, smuggler 16-27 / 10, troll 14-21 / 12, goblin poacher
    23-38 / 9, bramble wyrm 15-24 / 15.
  - **Bounty-only monsters**, in Blackthorn Wood (`blackthorn_wood`):

    | Monster        | Lvl |  HP | Atk | Def | Max hit | Speed | Coins | Always       | Worth the trip         |
    | -------------- | --: | --: | --: | --: | ------: | ----: | ----- | ------------ | ---------------------- |
    | Goblin poacher |  10 |  36 |  46 |  30 |       8 |  2.2s | 5-20  | feathers 2-4 | poacher's longbow 1/30 |
    | Bramble wyrm   |  18 |  76 |  62 |  46 |      14 |  2.8s | 10-35 | hide 2-3     | wyrmscale shield 1/30  |

    Poacher's longbow: two-handed, ranged attack 10, strength 8, Ranged 10 (oak is 8/6 at the
    same level). Wyrmscale shield: armour 14, Defence 18 (iron is 10).

  - **The shop** (`src/data/shop.ts`, `ShopEntry`): feathered hat (head, armour 1, one to a
    customer, 30 points), barbed arrows ×150 (ranged strength 8, Ranged 15; 20 points), hunter's
    charm (neck, attack 3, strength 1, a shade above the shell necklace's 2; 90 points). A
    one-off is refused while one is held, banked or worn; no new state for it.
  - **Hit points between fights.** `GameState.health` (`{ hp, regenMs }`, null at full health,
    always null in a fight, where `fight.hp` is the truth). Out of a fight the character gets
    back 1 hit point every 6 s, whatever else they are doing, live or away, worked out by
    arithmetic on the total (`rest`, `src/core/combat.ts`); `advance` heals for the time left
    after a fight ends inside it, so cuts still agree. Stopping a fight, or leaving it for an
    action, carries its hit points out; a new fight starts with them, eating from the food slot
    first if below the line. **A knock-out now leaves the character with a tenth of their hit
    points** (the breather), not full health, so that dying is never the quickest heal; the
    screens say "you come round sore, and heal as you rest". The duel simulations and fish pins
    are unchanged (they start fresh); combat pacing moved by less than its rounding: Melee
    3.13 h, Ranged 2.68 h, Defence and Vitality 2.77 to 2.95 h, no deaths.
  - **Balance held by tests.** `tests/data/pacing.test.ts`: Thieving reaches 20 in 2.77 h (best
    mark for XP, looked at each minute); an hour from levels 1, 10 and 20 on the best mark for
    coins pays 3,959, 5,671 and 9,736 coins plus loot worth 605, 578 and 2,322, which is 1.31,
    1.31 and 1.47 times an hour of the best-selling gathering skill from the same level, sold
    (the test holds it between 1.2 and 1.6). `tests/data/duels.test.ts`: every bounty 10 to 20
    minutes at its monster's level with melee and with ranged; at every combat level 1 to 22 the
    hardest monster the board may post wins at least 70% of duels; both bounty-only monsters fair
    at their level (melee 92% / 74%) and the wyrm hopeless ten levels early; fish an hour pinned
    for both (165, 182).
  - **Invariant tests** (`tests/core/thieving.test.ts`, `bounty.test.ts`, `health.test.ts`):
    repeatable from a save; cuts at random frames, inside a stun and either side of it, on the
    level-up and on the mastery level that change the chance, on the kill that completes a
    bounty; nights in 16 ms frames against `catchUp` for a theft, a bounty fight and healing.
    A deliberately stale chance makes seven of them fail. Catch-up for a whole day of thieving
    (the fisherman, about 24,000 attempts): 17 ms in Node; `tests/core/away.test.ts` keeps it
    under 250 ms.
  - **Screens.** Skills tab: a Roguery heading with Thieving, and a Bounties card under Combat
    beside Fight. Thieving's page: a card per mark with its description, the chance and stun
    ("58% chance · caught: 3s stun"), coins and loot ("?" until seen), picked and caught counts,
    and mastery with what it has added to the chance; while stunned the line turns red ("Caught!
    Lying low for 2.8s") and the bar runs down in red. Bounties page: points, the bounty (face,
    "Wanted: 34 Bramble boars", level and area, progress bar, what it pays), Hunt (or Watch the
    fight), Hand in when done, Swap with a second tap, and the shop. The areas page has the
    Bounties card, the character's health ("23 / 68 hit points, healing", kept current),
    Blackthorn Wood's monsters marked "Only with a bounty on it" until one names them, and a
    "Bounty: 4 / 20" line on the wanted monster; the fight screen counts the bounty in place. A
    toast when a bounty is done, on taking, handing in, swapping and buying. The away report: "N
    attempts: got away with it N times, caught N times." and "Bounty on the X: 60 of 60. Ready
    to hand in." (or how far it came).
  - **Save version 7** (`marks`, `bounty`, `bountyPoints`, `health`, and `stunMs` on a theft's
    action): migration (nothing robbed, no bounty, no points, full health; a fight keeps its own
    hit points), `saveProblem` checks (a stun is positive with an empty bar; marks; a bounty with
    no more done than asked; whole points; health above 0; no health while fighting) and tests.
  - `settleRun` takes an optional `hp` (see below). `Trained` and `masteryXpPer` moved to
    `src/core/xp.ts` (re-exported where they were) so the two walks share them.

- S10 Shop, collection log, achievements (PRs #30 and #31). The grotto's loot first, on its own
  (#30), so lanes B and C could build against real items; then runs that count, the price pass,
  the general store, the collection log, achievements, tab icons and the notice board's door.
  - **The grotto's loot** (`src/data/items.ts`, ids fixed in `docs/lanes.md`):

    | Item                | Worn                         | Attack | Strength | Armour | Needs      | Sells for |
    | ------------------- | ---------------------------- | -----: | -------: | -----: | ---------- | --------: |
    | Doubloon            |                              |        |          |        |            |       250 |
    | Pirate cutlass      | main hand, melee             |     13 |       11 |        | Melee 18   |       600 |
    | Boarding axe        | main hand, melee             |      9 |       14 |        | Melee 19   |       600 |
    | Tricorn             | head                         |      2 |          |      6 | Defence 18 |       500 |
    | Captain's coat      | body                         |      3 |          |     14 | Defence 20 |     1,200 |
    | Spyglass            | off hand                     |      5 |          |        | Melee 18   |       700 |
    | Brinebeard's anchor | main hand, both hands, melee |     15 |       21 |        | Melee 20   |     3,000 |
    | Ship's figurehead   |                              |        |          |        |            |        50 |

    The spyglass's attack carries no style: every bow takes both hands, so a "ranged" off hand
    could never be held by an archer. As it is, it is a melee character's choice between a
    shield's armour and a surer blow, and it would help a one-handed ranged weapon if one came.
    Pinned in `tests/data/content.test.ts` (a clear step above iron; the anchor out-hits every
    melee weapon; levels 18 to 20).

  - **Runs that count** (`settleRun(state, spoils, content?)`, `src/core/run.ts`): `kills` go to
    the bestiary and to a bounty held on that monster, up to its count, exactly as idle kills
    do; an id the monster tables do not hold (the grotto's own cast, today) counts for nothing,
    as does an odd amount, and nothing is rolled. `cleared` (a dungeon id in the new `dungeons`
    table) adds a clear to `GameState.dungeons`, with the best time when `RunSpoils.timeMs` (new,
    optional) says how long the run took. Without `content` (as lane C's own tests call it) kills
    and clears count for nothing and everything else settles as before. The shell's `settleRun`
    passes the tables, and toasts a bounty done by a run.
  - **The price pass, by simulation** (`tests/data/economy.ts`, pinned in
    `tests/data/pacing.test.ts`). Every price went up tenfold first, because a pine log at 1 coin
    left no room for an arrow shaft (ten from a log) to be worth anything but more than the log;
    old saves get their coins times ten in the migration, so a purse is worth what it was.
    Monster and theft coins and bounty coins (now 100 a point) went up with them. Then:
    - gathering: each tier pays more the further up a skill, and the four skills pay within 1.3
      times of each other at any level (herring, cod, flax, sageleaf and glowcap came down;
      oak, willow, tin and iron ore went up);
    - made things: every recipe sells for more than its materials, and gathering and making the
      whole chain pays 1.04 to 1.24 times selling what was gathered (rising with the recipe's
      level), so selling raw goods is never foolish. A made thing's price is the gathered
      value behind it times its time, times 1.05 + 1% a level, rounded; leather, from fighting,
      is priced as if a hide were a four-second gather;
    - Thieving: still 1.39 to 1.49 times gathering (the strongbox's purse came down a little);
    - fighting for money (the best-paying fight open, melee, after the fish eaten) sits between
      gathering and Thieving: 1.16 to 1.24 times gathering;
    - the store's tools cost about twice what they sell back for, and its two dear things a few
      hours' earnings.

    What an hour earns, from levels 1, 10 and 20 (an hour from a level, playing for coins:
    the best-paying thing open, looked at again each minute; artisan skills with materials on
    hand, counted as what they add to their materials):

    | An hour of                                       |             L1 |            L10 |               L20 |
    | ------------------------------------------------ | -------------: | -------------: | ----------------: |
    | Woodcutting                                      |         23,050 |         31,500 |            50,400 |
    | Fishing                                          |         25,920 |         32,710 |            51,000 |
    | Mining                                           |         24,940 |         33,000 |            48,000 |
    | Foraging                                         |         28,530 |         38,685 |            54,000 |
    | Cooking (over its materials)                     |         36,720 |         55,380 |            78,000 |
    | Smithing (over its materials)                    |         44,955 |         59,400 |            84,000 |
    | Crafting (over its materials)                    |         43,620 |         50,400 |            61,200 |
    | Fletching (over its materials)                   |         42,450 |         51,000 |            81,000 |
    | Alchemy (over its materials)                     |         60,958 |         69,864 |            79,560 |
    | Thieving: coins (and loot sold)                  | 39,532 (6,237) | 56,760 (6,290) |   80,562 (22,368) |
    | Fighting for money, melee, after fish            |  32,953 (rats) | 47,020 (gulls) | 67,024 (footpads) |
    | Strongest monster, melee, after fish             |   32,953 (rat) |   2,625 (boar) |    56,305 (troll) |
    | Strongest monster, ranged, after fish and arrows |         16,718 |        -33,271 |            14,771 |

    Gross for the artisan skills (what the hour's goods sell for, materials and all) is about
    two and a half to six times the figure above. Each monster at its own level, melee, after fish:
    rat 32,953, crab 30,680, gull 30,811, boar -3,275, footpad 33,364, wolf -13,340, smuggler
    51,777, troll 56,305; the two bounty-only monsters about 19,000 to 20,000 (plus points).

  - **The general store** (`src/core/store.ts`, `src/data/store.ts`; the Bank tab's "The general
    store" card). It buys anything at its worth (the bank's Sell, as before) and sells, for
    coins: a bronze sword (500), a pine shortbow (200), bronze arrows ×50 (1,500), cooked shrimp
    ×10 (600), shell vials ×5 (180); and, to save for, the cork-lined potion case (150,000, a
    lasting perk: every potion drunk lasts half as long again, rounded down once) and a velvet
    cap (75,000, one to a customer, head, armour 1, for the look). A perk is a `StoreEntry` with
    a `perk` instead of an item, kept in `GameState.perks`. An extra food slot was not used: the
    food slot already takes a whole stack of any size, so a second one would only let two kinds
    of fish be carried, which is a change to the fight walk for very little.
  - **The collection log** (`src/core/collection.ts`; Character tab, "Collection log"). Every item
    ever held (bank, worn, food slot, the potion working), in `GameState.collection`, noted after
    every change, live or away, by the app (never inside `advance`): things only ever arrive in
    those places, and nothing made in a stretch of time is used up in the same stretch, so
    looking after each change misses nothing however time is cut (a test cuts it). Listed by
    source: Gathering, Artisan, each monster, each mark, the bounty shop, the grotto, and the
    store for what it alone sells; an item from several places shows under each. Found things
    show their icon (a dashed square while art has none) and name; the rest a "?". 73 things in
    all. A page left open turns things over in place as they are found.
  - **Achievements** (`src/core/achievements.ts`, `src/data/achievements.ts`; Character tab,
    "Achievements"). An achievement is an id, a name, a line and a rule; rules are data, ten
    kinds (`AchievementRule` in `src/core/content.ts`: a level, total level, mastery, things in
    the log, number of things in the log, kills, gear worn at once, clears, coins held, thefts
    or times caught, and running counts kept in `GameState.stats`: bounties handed in, the run of
    them without a swap and its best, potions drunk, store purchases). 28 of them: eleven
    firsts (log, fish, ore, find, cooked fish, bar, kill, theft, bounty, potion, purchase), four
    of levels (any skill at 10, any at 20, every gathering skill at 20, total 100), two of
    mastery (10, 20), a hundred
    rats, a monster's rarest prize, two full sets worn (iron, leather), a bounty streak of five,
    100,000 coins held, fifty things logged, the grotto cleared, and three hidden ones. Earned
    for good the moment the state shows them; a note each (two at most at once, "and N more")
    above the toasts, so neither hides the other; on return they are in the away report too.
    The page lists them in order, earned in gold, hidden ones as "???" until earned.
  - **Tab icons**: the tab bar shows `tabIcon(id)` from `src/art/icons.ts` when it gives one, and
    the old glyph while it gives null.
  - **The notice board's door**: `Shell.openBounties?()` opens the Skills tab's Bounties page. It
    is optional on the interface so lane C's stand-in shells need not change.
  - **Save version 8** (`collection`, `achievements`, `dungeons`, `stats`, `perks`; coins times
    ten): the migration fills the log from what a version 7 save proves (bank, worn, food slot,
    potion, every drop the bestiary and marks have seen); achievements come on first load like
    any other change. `saveProblem` checks each (lists of ids none twice, clears above 0 with a
    positive best time, known running counts with the streak no longer than the best).
  - The bank card's "From" now names the dungeon and the shops too.

- Wave 9: the C-scale hero in the menus, the grotto's cast in the bestiary (PR #37):
  - **Character sheet** (`src/ui/characterScreen.ts`): the hero is lane B's C-scale figure
    (`characterCanvas2(look, worn, 'sheet')`, 56 × 72 art pixels at 112 × 144 CSS on a 2x or 3x
    phone), standing on a lit floor with a shadow in a dark framed room (`.figure` in
    `styles.css`, menu colours only). The eight slots are 56px squares down either side of it,
    a paper doll: head, neck, body, legs on the left; main hand, off hand, wrist, ammunition on
    the right. A filled square shows the item's icon (the name if art has none, as for the
    velvet cap); an empty one its slot's name, dimmed; ammunition shows the count, kept live
    while the sheet is open. Each says "Slot: Item" to a screen reader. The three totals sit
    in three tiles under the figure. An open slot's choices come as one panel under the sheet
    (they used to open between rows of the grid); the "Worn" heading is gone with the grid.
  - **Character creator** (`src/ui/createScreen.ts`): the same figure in the same room, full
    width; the look's steppers now sit straight under it and the name below them, so each step
    shows on the figure where the thumb is. The look rows no longer push the "next" button off a
    360px screen (the choice's column is `minmax(0, 1fr)`).
  - **Crispness**: checked in Chromium at 390 × 844 and 360 × 740 at device pixel ratio 3 and 2,
    and 412 × 915 at 2.625, by comparing a screenshot of the figure's box with the canvas's
    own pixels: every opaque pixel matches (one device pixel to one canvas pixel, pixelated).
    `pixelCanvas2` already sized it right; nothing in the menus stretches it. No fix needed.
  - **The grotto's cast in the bestiary**: `DungeonDef.cast` (`src/core/content.ts`) lists who
    is fought in a dungeon by id and name (`src/data/dungeons.ts`: the five ids and names of lane
    C's `src/scene/cast.ts`; a content test keeps them in step and checks each has a portrait).
    `settleRun` keeps their kills like a table monster's (`knownFoe` in `src/core/run.ts`); no
    bounty names them. They are not table monsters: that would make them idle-fightable, posted
    on the board and part of the money sims. The Combat page lists them after the areas, under
    the dungeon's name: face, name and kills once beaten, a "?" until then. **No save change**:
    the bestiary's shape is the same and an older build reads the new ids without harm (it
    already summed every entry for the kill achievements), so the version stays 8.
  - `captains_coat`'s description now says purple, as the C-scale figure and its icon draw it.
  - The tab bar still shows the old glyphs: `tabIcon` in `src/art/icons.ts` returns null for
    every tab.

- Wave 11: the sheet and creator polished, the C-scale faces in the menus, the grotto's numbers
  in the bestiary (PR in this branch, `lane-a/w11-menus`). **No save change** (still 8). Carries
  over the menu half of the superseded PR #41 by hand, reworked onto current `main`.
  - **The breathing figure** (`src/ui/figure.ts`, `heroFigure`): one canvas, made once, at a
    whole number of device pixels to an art pixel (`deviceScale`: 3 CSS pixels is 9 at 3x, 6 at
    2x, 8 at 2.625x), onto which lane B's `characterIdle2(look, worn, 'day', frame)` is stamped
    with smoothing off. `breathe(ms)` draws only when the frame (`breathAt`, every
    `IDLE2_FRAME_MS`) changes; `dress(look, worn)` redraws the same canvas. **Time is passed
    in**: `View.update(state, now?)` now takes the app's own `now()` for the frame (optional, so
    lane C's views and calls are unchanged), and the creator, which has no state yet, is
    breathed by `tick` too. Nothing reads a clock of its own.
  - **Character sheet** (`characterScreen.ts`): the hero is three CSS pixels an art pixel
    wherever the doll leaves him room (`sheetScale`: every phone from 356 wide; two below), so
    he fills his room from the floor to just under its top; the sheet's side padding went from
    14 to 10 and the doll's gap from 10 to 8 to make that room at 360. Under the doll, **what is
    worn is named** in two columns in the doll's order (empty slots dimmed, "Neck: nothing";
    hidden from screen readers, which hear it from the squares). **An opened slot's choices
    open in place of the names**, straight under the doll, and the screen stays where the player
    had it, then glides just far enough to show them (`scrollToShow` in `app.ts`: the foot into
    view if it fits, else the top to the screen's top; never up; no glide with reduced motion).
    "Change look" does the same for the steppers. Only the figure's canvas changes per frame.
  - **Creator** (`createScreen.ts`): the hero is four CSS pixels an art pixel on a tall phone and
    three on a 360 × 740 one (`creatorScale`), in a frame sized to him (36 px either side) and
    centred, with the steppers, name and Begin under him at one width (320 at most); on a short
    phone the title gives up some air so Begin is on the first screen. He breathes. The tagline
    no longer leaves a word alone on its last line.
  - **Faces** (`src/ui/face.ts`): every face comes from `portrait2(id)` now, in frames the sizes
    the art draws at: 148 (the fight screen; the 144 canvas), 100 (lists; 96) and a new 48
    header frame. Where: every monster in the Combat lists (the bounty-only goblin and wyrm have
    faces now), the grotto's cast once beaten, the fight screen and the fight-over panel, the
    bounty held, and **the general store's keeper** (the trader's face, `trader`, beside the
    store's name and the purse). The hero's own face (`heroPortrait2(look, worn)`, in the hat and
    clothes worn): **opposite the foe on the fight screen** (the foe's face on the left of its
    panel, the hero's on the right of theirs, with "Melee · max hit N"), and **in the header
    beside the name** on every tab but Town (where the hero walks on screen), a 48-pixel button
    to the sheet, kept between redraws until the look or the outfit changes. The header frame
    crops 2 CSS pixels a side and 4 at the foot of the 48-pixel face, outside
    `HERO_PORTRAIT2_SAFE` (a test holds it). A thieving mark shows `portrait2(mark.id)` beside its
    name the moment art draws one, and nothing until then (`faceIfDrawn`): no mark has one.
    Nothing depends on a face's pixels: lane B is redrawing them behind the same doors.
  - **The grotto's numbers are data now** (`src/data/dungeons.ts`): `DungeonFoe` is a monster's
    row less its area and bounty, plus `pick` (one thing or another; `PickDrop` moved to
    `src/core/content.ts`). The five rows are copied exactly from lane C's `src/scene/cast.ts`,
    which the scene still fights by, and `tests/data/content.test.ts` holds every field of the two
    equal (and every drop a real item, weakest first). Nothing lane C reads changed. The
    bestiary shows a beaten foe as it shows a table monster: level, hit points and max hit,
    drops (named once in the collection log, since a run does not say who dropped what; "?"
    until then), kills; the dungeon's line gives its range of levels. Unmet foes stay a "?".
  - The total-kill achievement question from #41 needs no change: `first_kill` counts grotto
    kills already (it sums the bestiary), monster-named ones count that monster only. Not
    re-pinned here; #41's test for it was not carried over.
  - **Checked in Chromium** at 390 × 844 and 360 × 740 at 3x and 412 × 915 at 2.625x, touch:
    before and after in `/home/claude/lane-shots/w11-a/before/` and `after/` (the sheet in linen
    and in iron, a slot open, the creator, the Combat list and the grotto, the fight, the
    bounty, the store, Thieving). **Crispness**: a screenshot of the figure's box against its
    own canvas at 390@3, 360@3, 360@2 and 412@2.625, creator and sheet: every pixel is one of
    the art's colours or the room's (about 200 of 145,000 to 580,000 are the shadow's soft
    edge), so nothing is resampled. Not checked in Safari.
  - **Tests**: `tests/ui/figure.test.ts` rewritten (scales, the breath on the same canvas, draws
    only on a change, the worn names, choices under the doll, the scroll into view at 360 ×
    740, `scrollToShow`'s rules, the 2.625 sizes); `tests/ui/faces.test.ts` new (the doors are
    wrapped to write their id on each face: lists, bounty, fight face to face, store keeper,
    header, its crop against the safe box, marks); `tests/ui/combat.test.ts` gained the grotto's
    numbers and drops. **Expectations changed on purpose**: the goblin's blank "G" in
    `combat.test.ts` is now a face from `portrait2` (every monster has one); the deckhand's card
    text is no longer just name and kills; `app.test.ts`'s look test expects the same canvas
    redrawn, not a new one; `tests/core/run.test.ts`'s test cast row is a full row;
    `content.test.ts` checks faces against `PORTRAIT2_IDS` instead of the old `portrait`.
    `tests/data/pacing.test.ts` is untouched. What jsdom cannot check (it lays nothing out and
    draws no pixels): the figure filling its frame, the names fitting at 360, the glide, the
    crop's look; those are the screenshots.

- Wave 11b: the tab bar and the doll's icons (the two parts of wave 11's brief #45 did not
  reach; PR in this branch, `lane-a/w11b-tabbar-icons`). **No save change** (still 8).
  - **Tab bar, checked** at 320, 360, 390 and 430 wide (3x; 320 at 2x): the five icons show,
    32 CSS pixels over their labels. The open tab differs from the rest by more than lightness
    already: a 4-pixel gold bar along its top (shape), a lighter panel behind it, the icon in
    full colour against the muted one, and a gold label. Not bolded: the pixel font smears when
    the browser fakes a bold. **Fixed**: at 360 "Character" (70 CSS pixels) filled its 72-pixel
    share to the pixel, so its lit panel ended at the letters (and at 320 the label spilled into
    its neighbours). A tab now has 4 pixels of air a side and never gets narrower than its
    label: equal at 390 and 430, Character 78 and the rest 70.5 at 360, 78 and 60.5 at 320.
  - **The doll's icons** (`dollIcon` in `src/ui/figure.ts`): an item worn on the sheet was art's
    32-pixel icon (1.33 CSS pixels an art pixel) in a 56-pixel square beside a hero at three, so
    the squares looked half empty and the icons a finer grain than the hero. The doll now shows
    art's own `itemIcon` canvas at two CSS pixels an art pixel (48, the square's inside), at a
    whole number of device pixels per art pixel (6 at 3x, 4 at 2x, 5 at 2.625x), so it stays
    crisp; the art size is read off the canvas through the door's `iconScale`, not assumed. The
    slot's choices, the bank and every other list keep the 32-pixel icon beside 18-pixel text,
    where it sits well (checked; no figure there). Nothing in `src/art` changed.
  - **Tests** (`tests/ui/figure.test.ts`, new, no expectation changed): the doll's icon is 96
    device pixels drawn and 48 CSS shown at 3x while the choices under it stay 32; whole device
    pixels per art pixel at 2x (4) and 2.625x (5).
  - **Screens**: `/home/claude/lane-shots/w11-a/tabs-before/` and `tabs-after/`: each tab bar
    close-up with Skills, Bank and Character open, and the Skills, Bank and Character screens,
    at 360, 390 and 430 (and 320 after).

- Wave 12: polish and weak spots (Cody: "Go for the cleanup and the weak spots you
  mentioned"; branch `lane-a/w12-polish`). **No save change** (still 8).
  - **Character sheet** (`characterScreen.ts`, `figure.ts`, `styles.css`): the worn items are
    at the hero's grain now. Each square's inside is exactly a 24-pixel icon at the sheet's
    scale (72 CSS pixels at three; `dollSlotSize`, written on the doll as `--slot`), and the
    icon is a canvas of its own holding the picture alone (`dollIcon` copies art's icon canvas
    across pixel for pixel; art pads its own at the right and foot, which is what sat the
    picture 2 pixels off centre at 2.625x). Centred at every ratio; one grain for hero and
    squares at every width (`sheetScale` picks three only where two squares and the hero at
    three fit, so at 320 wide both are two, 52-pixel squares). To make the room at 360 the
    sheet lost its panel (the squares, the room, the names and the totals keep their own
    frames) and the doll reaches 6 pixels into the screen's side padding; the name heads the
    figure's room instead of sitting above the doll. **An open slot keeps the doll in view**:
    the doll sticks to the screen's top (`.sheet.choosing`) and the choices scroll beneath it;
    opening scrolls only until the doll reaches the top (`scrollToChoose`), never past it.
    Close sits beside the slot's name and Take off beside what is worn, so the first choice
    shows under the doll on a 360 x 740 phone. **Worn names** are laid out row by row and wrap
    rather than being cut ("Brinebeard’s / anchor" at 360; one line at 412).
  - **Header face** (`face.ts`, `headerFaceSize`): drawn at the fewest whole device pixels per
    art pixel that make it at least 48 CSS across, never fewer than the art's mini face
    (`portraitScales2`): 2 at 3x (48 whole), 2 at 2.625x (54.9 whole), 2 at 2x and 1 at 1x
    (72, cropped to the hero's safe box, 66 x 56, since the next step down is 36). The art's
    mini canvas is shown at that many device pixels a block, pixelated; the frame is sized to
    what it shows. The header is 66 tall at 3x, 73 at 2.625x, 74 at 2x (62 before). **On the
    Town tab too**: lane C's `tap()` already takes `canvas.scene-canvas`, and `npm run check`
    passes with the face there.
  - **Bestiary drops** (`src/core/run.ts`, `combatScreen.ts`): `RunSpoils.dropped` (new,
    optional): item ids by foe, what each was seen to drop. `settleRun` keeps them in the
    foe's bestiary `seen`, only for a known foe and an item its own row can drop
    (`foeRow`/`foeDrops`). A grotto foe's drops are listed from its row in
    `src/data/dungeons.ts` (the single source of the cast's levels, numbers and drops) and
    named only once that foe has dropped them, "?" until then, as a table monster's are. Never
    from the collection log: a pearl from a sand crab no longer names the giant crab's. Until
    lane C fills `dropped`, every grotto drop shows "?" (honest, and what it should be).
  - **Thieving marks' faces**: unchanged code (`faceIfDrawn(mark)`, `portrait2(id)`); now tested
    both ways: a door that gives nothing leaves the card whole with no frame; a door that gives
    a face shows it in the lists' frame beside the name. Lane B's faces need no change here.
  - **Old art imports moved**: `src/ui/look.ts` takes `LOOK_CHOICES2` from `character2` and
    names the look's type itself (`DrawnLook`); `characterScreen.ts`, `createScreen.ts`,
    `face.ts` and `figure.ts` take that type from `./look` instead of `art/character`;
    `app.ts` no longer imports `art/tabIcons` (`TAB_ICONS`) or `art/pixelSvg` (the tab bar's
    placeholder glyph; an empty `.tab-icon` place if art ever has no icon);
    `tests/ui/app.test.ts` uses `LOOK_CHOICES2`; `tests/ui/look.test.ts` mocks `character2`.
    Nothing in `src/ui`, `src/main.ts` or `tests/ui` imports `art/character`, `art/portraits`,
    `art/town`, `art/dungeonArt`, `art/tabIcons` or `art/pixelSvg` now.
  - **Checked in Chromium** at 390 x 844 @3, 360 x 740 @2 and @3, 412 x 915 @2.625 (and 320 x
    568 @2 for the sheet), touch: `/home/claude/lane-shots/w12-a/before/` and `after/` (sheet,
    slot open, slot open part-way down the choices, header and its face on Skills and Town,
    the bestiary's grotto, Thieving, the town). **Crispness**, screenshot against canvas: the
    header face and the doll's icons are only their own colours, and every colour change falls
    on a whole block of the expected device pixels (2 for the face, 9/6/8 for the icons) at 1x,
    2x, 2.625x and 3x. Not checked in Safari.
  - **Tests**: `tests/ui/figure.test.ts` (icons at three, 216 device pixels at 3x, the square
    76; 6 and 8 device pixels at 2x and 2.625x, the canvas the picture alone; squares and hero
    at two on 320; art's icons 24 square; sheet scale per ratio; worn names row by row; the
    scroll under the doll; `scrollToChoose`; no stickiness for the look), `tests/ui/faces.test.ts`
    (header sizes at 1x to 3x, the sizes written on the frame, marks with and without a face,
    the face on Town), `tests/ui/combat.test.ts` (drops from what that foe dropped, not the
    collection log; a run's `dropped` named), `tests/core/run.test.ts` (`dropped` kept only for
    a known foe and its own items, `foeDrops`). **Expectations changed on purpose**: the doll's
    icon at 3x is 216 device / 72 CSS (was 96 / 48), and 6 and 8 device pixels an art pixel at
    2x and 2.625x (was 4 and 5); worn names are one list in row order (was two lists); opening
    a slot scrolls until the doll reaches the top (was until the choices' top did); the
    header's face is on Town (was absent); the header crop test is replaced by the size test;
    "the grotto foe's drops named once in the collection log" now reads the foe's own `seen`
    (the captain's doubloon in the log no longer names his); the tab bar test wants art's
    canvas (was "svg or canvas", the old glyph). `tests/data/pacing.test.ts` untouched.

- Wave 13: Cody's Milestone A feedback, the rules-and-menus half (branch `lane-a/w13-feedback`).
  **Save version 9**, one step for all of it.
  - **Achievements by doing, not owning** (`src/core/achievements.ts`, `src/data/achievements.ts`):
    the six skill firsts (log, fish, ore, find, cooked fish, bar) read the collection log, so a
    sand crab's shells earned the first foraging one, a dock rat's herring the first fish, a
    troll's ore the first ore and the store's cooked shrimp the first meal. New rule kind `made`:
    any non-theft action that gives one of the items with mastery XP above 0 (only doing an
    action earns mastery), so **no new counter in the save**. Audited the rest: `rare_prize`,
    `doubloon` and `anchor` are about owning things no skill makes (kept as `found`; a content
    test now forbids a `found` achievement naming anything an action makes); kills, thefts,
    clears, levels, mastery, coins, worn sets and running counts read what they say. Earned ones
    are kept for good, wrongly earned or not (nothing is taken back).
  - **Store**: `PerkDef` has `effect` (what it does, plainly, in numbers) and `shows` (the
    screens it shows on, `PerkPlace`, today only `potions`); `perksFor(state, content, place)`
    in `src/core/store.ts`. The potion case says "Every potion you drink from now on helps 50%
    more actions: one that helps 150 actions helps 225." Owned upgrades leave the stock for a
    **Yours** section, marked Owned; on the potion panel (Skills tab and skill pages) and a
    potion's bank card ("225 actions (150, and 50% more from your Cork-lined potion case)").
    A future upgrade with a place in `shows` appears there from its row. The store also says
    what an item is used in ("Used in Alchemy.").
  - **Screens update in place** (`View.stale?(before, after)` in `src/ui/view.ts`): `tick` no
    longer calls `render()` for a level, a potion wearing off, a stopped action, a finished
    fight, an empty food slot, a bounty done or a new kind of thing in the bank. Each view says
    whether time changed what it is built of; if so only the view is rebuilt, in place, scrolled
    where it was (`rebuildView`), else it updates. No view other than the fight, the areas list
    (fight started or ended, bounty target changed, food slot emptied) and the bounties page
    rebuilds on a kill; skill pages only on their own level, the running action or their potion.
    The away report is laid over the screen without rebuilding it. Lists made to follow the
    state in place: the bank (`keyedList`, `src/ui/keyed.ts`), a slot's choices, levels on the
    skills list, the bestiary's kills and drops, the achievements, the combat and bounty
    entries, the fight's own numbers after a level, the bounty shop's buttons, the header face.
    **The bank opens a card where it stands** and keeps the tapped thing still on screen.
  - **Total level**: a panel heading the skills list (with the combat level) and two tiles on
    the sheet; achievement `total_200` (Pillar of the Community) beside `total_100`.
  - **Bounties** (`src/core/bounty.ts`, rewritten): why trolls repeated: the board posted only
    monsters within six levels of the combat level, and with nothing there the strongest below,
    so from combat level 27 the troll alone; swapping fell back to it. Now: every monster with a
    bounty row at or below the combat level, bounty-only ones too, weighted `max(1, 12 - (top -
level))`; a board of three different offers (`bountyBoard`), never the last target while
    anything else is open (`lastBounty`); **fresh notices for 1 point**; **give up** (was swap,
    3 points, breaks the streak) shows a fresh board. An offer's points are fixed when posted:
    `count × expectedKillMs(level, monster)` at `pointsAnHour(level) = 15 + 1.5 × level`, where
    `expectedKillMs` is the exact expected kill time of a hunter judged by combat level alone
    (gear worth `6 + level / 3`, so taking a sword off cannot raise the pay). **Auto bounty**
    (`autoBounty`): the kill that finishes a bounty in `advanceFight` hands it in and takes the
    next board's first offer (`payBounty`, dice rolled inside the kill after its drops) and the
    fight goes on against the new monster; `catchUp`'s report says how many and the points
    (`claimed`); switching it on with one done claims it (`setAutoBounty`); a run that finishes
    one hands it in too (`settleRun` → `autoHandIn`). Points an hour, before → after, the real
    fight in that level's gear (`tests/data/pacing.test.ts`): level 5, 8–16 → 22–25; level 10,
    11–34 → 31–36; level 20, 13–59 (rat to wyrm) → 42–50; level 30, 14–78 → 53–57 (and the old
    board offered only the troll there, at 60).
  - **Greaves**: `bronze_greaves` (Smithing 8, 3 bars, 5 s, 38 XP, armour 5, worth 355) and
    `iron_greaves` (Smithing 18, 3 bars, 5 s, 60 XP, armour 8, Defence 10, worth 610), legs slot,
    on lane B's art (B13a). Smithing's pacing and money pins are unchanged.
  - **Looks**: `Look.beard` (migration: `'none'`); `src/ui/look.ts` builds the creator's and
    Change look's rows from whatever parts and choices `LOOK_CHOICES2` holds at run time
    (`lookParts`), the known ones first, others named from their key, unknown ids and parts
    dropped. A save may name any part by a plain name. Today the beard row shows "None" alone
    (lane B's beards come in their second PR) and becomes a stepper with no change here.
  - **The run kept through a reload**: `GameState.run: SavedRun | null`; `Shell.keepRun?` and
    `Shell.savedRun?` (`src/ui/view.ts`). On load, a run left under a minute ago is offered back
    and no idle time is paid for the gap; one left longer is settled from its spoils as rowed
    back (no clear) and then the time away is paid. `saveProblem` checks it (spoils numbers not
    below zero, `data` a plain object under 256 KB). The scene's half is lane C's.
  - **Housekeeping**: the cast drift test is gone (the scene reads `src/data/dungeons.ts`).
  - **Save version 9**, migration 8 → 9: `bountyBoard: []`, `lastBounty: null`, `autoBounty:
false`, `run: null`, `look.beard: 'none'`; a bounty already held keeps no `points` and pays
    its monster's old row. `saveProblem`: the board (up to three offers, different monsters,
    whole positive counts and points, empty while a bounty is held), `lastBounty`,
    `autoBounty`, `bounty.points`, `run`, look parts.
  - **Expectations changed on purpose**: the old-save achievement test now carries mastery to
    prove chopping (`records.test.ts`); "posts monsters from six levels below" and "the
    strongest below" became "anything at or below"; `duels.test.ts` "nothing trivial" became
    "the trivial under a third"; "takes a bounty" became read/take/reroll; "swapping" became
    "giving up"; handing in shows a board instead of posting the next; bounties held in tests
    carry `points`; the potion case's store row moves to Yours (was "Yours" on its button); the
    look test in `saveFile.test.ts` rejects a part with a space (was any unknown part); every
    migration test gains the version 9 fields; `newGame`'s shape; the away report's `claimed`.
    `tests/data/pacing.test.ts`: cases added, none changed.
  - **Checked** at 390 x 844 and 360 x 740 at 3x: `/home/claude/lane-shots/w13-a/`.

- Wave 14: Cody's feedback, continued (branch `lane-a/w14-bank-activity-title`). **Save version
  unchanged (9)**: nothing here changes the save's shape or meaning.
  - **The bank as a grid** (`src/ui/bankScreen.ts`, `src/ui/bankOrder.ts`, `src/ui/grid.ts`):
    every stack a square cell (its 24-pixel icon at a whole number of device pixels, about 36 to
    40 CSS, `GRID_ICON_SCALE`), its count in the corner shortened and rounded down (999, 1.2k,
    12k, 1.2M; `shortCount`); five across at 360, six at 390 and 430, each cell at least 54 CSS.
    The purse and the store's door share a row; a search field (18px) and a sort menu share the
    next; the kinds are chips in a row that scrolls sideways on its own. **Kinds** come from each
    item's own row and the action tables (`categoryOf`): potions, food (heals), ammunition and
    equipment (worn), resources (an action makes or uses it), other (only monsters, marks, shops
    and dungeons give it). **Sorts**: type (headed by kind, in that order: resources, food,
    potions, equipment, ammunition, other), name, value each, value of the stack, count, and
    newest find (the collection log's order, which is the order things were first held, so it
    needs no new state). Ties keep the tables' order. **The open card** is pinned at the foot of
    the screen above the strip and the tabs (sticky inside the screen, at most 58% of its height,
    scrolling inside), with the doing first (drink, equip, food slot, the sell amounts and Sell)
    and the facts after; opening one scrolls nothing unless the card would cover its cell, and then
    only enough to show it; a second tap on the cell closes it. **In place**: counts move every
    frame without a rebuild; a new kind gets its cell where the sort puts it and whatever the eye
    was on (the open cell, or the first cell on screen) is held still; the order is worked out
    again only when the kinds held change or the player sorts, so climbing counts never shuffle
    cells under a thumb. **The sort is kept on the device** across sessions, not in the save: a
    new `Prefs` store (`src/persistence/Prefs.ts`, local storage under
    `hearth-and-harbour:pref:`, `AppDeps.prefs`, memory-only if left out); the kind and the
    search are kept for the session. Selling several at once: as before (1, 10, 100, All).
  - **The store and the collection log as grids**: the store's beginner things are cells with
    their lot (×50) and price under the picture, a tap opening the card (everything it said, and
    Buy) at the foot of the screen; the dear things stay as panels (they need their words). The
    log's chips are cells: a picture once found, a "?" until then, a tap names it under its
    source.
  - **The hero at work** (`src/ui/atWork.ts`, `src/ui/nowDoing.ts`): lane B's
    `characterActivity2` and `activityProp2` on one canvas, in the player's look and gear, drawn
    with whole device pixels per art pixel and only when the frame (or the outfit) changes; a
    hidden page draws nothing; with less motion asked for, one still frame. **Which loop** comes
    from the tables: `SkillDef.activity` (new, optional; every skill has one, a test holds them to
    `ACTIVITY2_IDS`); a fight uses its style's skill's. **Frames tied to the action**: a whole
    number of turns of the loop to each completion (as near the art's own pace as it can be), each
    turn starting on the frame where the work lands, so the axe bites as the log lands; a fight is
    timed by the wait for the hero's next blow, so the blow lands as the hit is rolled. An action
    shorter than 0.6 of a turn runs at the art's pace by the clock. Between foes, stunned, or with
    nothing running, he stands and breathes. **Where**: a "now doing" strip above the tabs on
    every tab (hidden in a full-screen dungeon), made once and kept across screens, with the
    hero at 2 device pixels an art pixel at 3x, what is being done, a bar (the action's progress,
    or the foe's health gone) and a line under (what it makes and how many are held, or kills); a
    tap opens the action's skill page, the fight, or the skills when resting. The running
    action's card (and a running theft's) has him at work at its top, at 4 device pixels at 3x.
    The fight screen opens on a duel: the hero striking on the left at the large portrait's
    height, the foe's portrait opposite; the panels below keep the numbers (their faces moved to
    the duel).
  - **The new app icon**: the ship at sunset, harvested from the study as its colour grids (36
    x 36, and the field grown to 48 x 48 for maskable) into `scripts/make-icons.mjs`:
    `apple-touch-icon.png` at 180 (was 176), `icon-192.png` and `icon-512.png` (5 and 14 pixels a
    cell, the edge cells run out to fill), `icon-maskable-192.png` and `icon-maskable-512.png`
    (4 and 10 a cell), `favicon-32.png` (the 36 drawing less a 2-pixel border) and
    `favicon.svg` (crisp squares). The manifest names "any" and "maskable" separately;
    `background_color` is the dusk sea (`#2e2450`), `theme_color` stays the menus' panel
    (`#1e1a2a`, the bars a player sees). The service worker's cache is `hearth-and-harbour-v2`.
  - **The title screen** (`src/ui/titleScreen.ts`, on lane B's `titleScene` from B14): the
    first screen on every cold start (`AppDeps.title`, set by `src/main.ts`; tests leave it out
    and open on the game as before), and the Menu's new "Title screen" entry (which saves first).
    With no game, "Tap to begin" (a tap anywhere does it too) leads to the creator; with one,
    "Continue" with the name and how long it has been left ("Cody · away 3h 12m", from a minute)
    leads in. **Time away is paid on Continue**, by the same code as before (`welcomeBack`: the
    run kept or settled, then `returnFrom(now - savedAt)`), so the away report comes after
    Continue; while the title is up the game is neither advanced nor saved (`save()` writes
    nothing, so a phone hiding the page cannot stamp `savedAt`). Whether a dungeon run left a
    moment ago is kept is judged by the gap at opening, not after the title. A page coming back
    from the background never shows the title. The picture's code is loaded only when the title
    shows (its own 52 KB chunk; the art gallery, which also holds it, is now loaded when opened
    too): until it arrives the screen is the dusk colour with the name in words and the button
    already there, so it is never blank and Continue never waits for it. It is drawn from the
    app's tick every `TITLE_FRAME_MS` with the time since it appeared, `dispose()`d on leaving,
    rebuilt on a resize; with less motion, frame 0 alone. The button, the name and the version
    line sit in the picture's `safe` box (the button 52 px tall, the safe-area inset added).
  - **Wave 13's weak spots**: the away report names the monsters whose bounties auto bounty
    handed in (`AwayReport.claimed.monsters`, read off the bestiary: every kill in that time is of
    a bounty's monster, so each monster killed was handed in, but for the bounty now held unless
    more fell than it counts); the combat pages' food list follows the bank in place (a kind
    arriving gets its row). **Greaves in the simulations**: `gearAt(level, style, greaves)` in
    `tests/data/fighting.ts`; the pins are held without them, and new cases in
    `tests/data/pacing.test.ts` pin what greaves move (see Deferred).
  - **Expectations changed on purpose**: the bank's open card leaves its cell in the grid,
    marked (was: the card replaced the row) in `inPlace.test.ts`; the store's beginner things
    are bought from their card (a tap on the cell first) in `records.test.ts`; the fight's faces
    moved to the duel in `faces.test.ts`; the store door says "General store" (the test matches
    it without case); the auto bounty away line names its monsters (`roguery.test.ts`); the first
    combat list's test has 20 s (it draws every face, about 3.5 s in jsdom on main too). `tests/data/pacing.test.ts`: cases added, none changed.
  - **Checked** at 390 x 844, 360 x 740 and 430 x 932 at 3x: `/home/claude/lane-shots/w14-a/`.

- Wave 15, part 1: the harbour chart's rules and the Tidepool Cave (branch
  `lane-a/w15-dungeons`). **Save version unchanged (9)**: a first clear is the save's
  `dungeons[id].clears` reaching 1, which wave 10 already keeps.
  - **The dungeon table is a chart** (`DungeonDef`, `src/core/content.ts`): every row has a
    `description` (a line), an `order` on the chart, a `recommended` combat level (advice, never
    a gate), an `unlock` rule as data (`{ kind: 'none' }`, `{ kind: 'combat', level }` or
    `{ kind: 'cleared', dungeon }`) with `unlockText` (a line for the player), and optionally
    `firstClear` (items paid once by the first clear) and `comingSoon` (a landing with nothing
    there yet). Rows: `tidepool_cave` (order 1, level 1, open from the start),
    `brinebeards_grotto` (order 2, level 20, open from the start: nothing gated it, so advice
    only), and three landings to come, `unknown_1` (opens on clearing the grotto),
    `unknown_2` and `unknown_3` (each on clearing the one before; named `uncharted_1`/`_2` in
    PR #61 and renamed to lane B's chart's landing ids), placeholder ids with the name "Uncharted", no loot,
    cast or reward, renamed when each is designed (no save can hold a clear of one).
  - **`dungeonStatus(state, id, content)`** (`src/core/dungeons.ts`): `soon`, `locked`, `open`
    or `cleared`, with the unlock text, the recommended level, clears and best time; null for an
    id the tables do not hold. Also `unlocked`, `mayEnter` (open or cleared), `dungeonDef` and
    `dungeonsInOrder` (by `order`). A landing to come is always `soon` and never counts a clear.
  - **First clears pay**: `settleRun` puts a dungeon's `firstClear` in the bank once, on the run
    that takes its clears from 0 to 1, beside what the run picked up (`firstClearOf`). The shell
    says so in a toast ("First clear of Tidepool Cave! Into the bank: …").
  - **The Tidepool Cave's numbers** (its own cast rows; hit points are blows needed, since a
    brand-new character's landed blow does exactly 1):

    | Id            | Lvl |  HP | Atk | Def | Max hit | Speed | Coins | Drops                     |
    | ------------- | --: | --: | --: | --: | ------: | ----: | ----- | ------------------------- |
    | `dock_rat`    |   1 |   4 |   1 |   1 |       1 |  3.0s | 1-2   | hide 1/4                  |
    | `sand_crab`   |   1 |   4 |   1 |   2 |       1 |  3.6s | 1-2   | seashells 1               |
    | `old_snapper` |   2 |  12 |   2 |   2 |       1 |  3.6s | 4-8   | seashells 1-2, pearl 1/40 |

    First clear: a bronze sword and five cooked shrimp. **Held by** `tests/data/tidepool.test.ts`
    (the model in `tests/data/cave.ts`: two rats, two crabs, the boss, everyone in a room at the
    hero at once from the first moment, health carried, no food, no breather; the crab's slam as
    the scene has it, twice its max hit every 6 s; the boss's heavy at most three times its max
    hit every 7 s; 400 dice each): a brand-new character standing still in the first room is
    never knocked out (96% of health left on average, 80% at worst); dodging two heavy blows in
    three clears it 99% of the time with 47% left; dodging nine in ten, every time (74% left);
    dodging none, never. In linen with the bronze sword, every time with 81% left. **No farm**
    (`tests/data/pacing.test.ts`, a case added): about 75 coins' worth and 140 XP a run; run as
    fast as the model's quickest fight, plus 12 s of walking and 15 s of round trip (39 s), that
    is about 6,900 coins an hour (under half of level-1 Woodcutting's 23,050) and 12,900 XP (under
    dock rats idle at level 1, 14,130). With no round trip at all its XP would be about 1.5 times
    the rats'.

  - **The bestiary: one creature, one entry.** The cave's `dock_rat` and `sand_crab` share the
    tables' ids: their kills, drops seen and a bounty held on them count to the one entry, as any
    dungeon kill has since wave 10 (bounties: yes; achievements reading kills, such as a hundred
    dock rats: yes). The bestiary shows the tables' row (`foeRow`); the cave's drops are among the
    tables' rows' own, so they are seen. The Combat page lists only the cave's own boss under it
    and says its rats and crabs are counted with those above.
  - **The Shell** (`src/ui/view.ts`): `takeRequest?(): ShellRequest | null` (`ShellRequest` is
    `'chart'`), taken once, dropped if the Town tab is left before it is taken; `chartOpened?()`
    for the scene to call whenever the chart opens. Starting any dungeon by id and settling it
    were already generic (`settleRun(spoils)`, `cleared` by id, `keepRun`/`savedRun` carry the
    dungeon's id); nothing in core or the shell named the grotto.
  - **A kept run opens the Town tab**: after a quick reload (the run under a minute old) the app
    opens on Town, where the scene takes it up (lane C's need). After a long gap it opens where it
    always did, the run come home.
  - **The Dungeons card** (Combat page, above the you-line): every landing in chart order with
    Open / Cleared / Locked / Not yet charted, the description, the recommended level, clears and
    best time (`formatClock`, 1:24), a locked one's unlock text; a landing to come as "?" with
    what will open it; and "To the harbour", which opens Town with the chart asked for.
  - **Tests changed**: `content.test.ts` no longer expects the grotto to be the only dungeon (it
    checks the chart's rows instead); `combat.test.ts`'s grotto section follows the cave's;
    `title.test.ts`'s kept run now opens on Town, where the real scene takes it up (and, unable
    to read the test's empty snapshot, settles it itself), so it checks the tab and that the app
    did not cut it short; tables in `run.test.ts` and `collection.test.ts` gained the chart's
    fields. New: `tests/core/dungeons.test.ts`, `tests/data/tidepool.test.ts`, the cave's pacing
    case, shell and Dungeons card tests.

- Wave 15, part 2: the menus point at the boat (branch `lane-a/w15-menus`; Cody: "make it more
  apparent we need to click the boat"). **Save version unchanged (9).** Sheets in
  `/home/claude/lane-shots/w15-a/` (390 x 844 and 360 x 740 at 3x; the strip also at 2x).
  - **First steps** (`src/ui/hints.ts`): at the top of the Skills tab for a character whose
    learning dungeon (the first on the chart at the lowest recommended level: the cave) is open
    and never cleared, a card naming it, what it teaches and that the rowing boat at the quay
    goes there, with "To the harbour" and "Not now". Either puts it away for good.
  - **The Town tab's dot**: a gold dot (never a number) while some dungeon is open, never
    cleared, and was not open the last time the chart was seen. Gone when the scene takes a
    chart request, calls `chartOpened`, or rows out to a dungeon (`keepRun`); a landing that
    opens later brings it back once. Updated on every full render and at once on those calls
    and a settle; a dungeon opened by combat level alone (none today) shows it at the next
    render. A mid-game character who has never seen the chart gets it once for the grotto.
  - **Where the hints are kept: the menus' preferences on this device** (`Prefs`), keyed by the
    character's `createdAt`, not the save: they are about learning these menus, not progress,
    so no save version, nothing exported, and a hint seen again on another phone does no harm;
    a new character on the same phone is shown them afresh.
  - **Achievements**: Sea Legs (clear the Tidepool Cave) and Quick Study (clear it in under a
    minute and a half), the latter read from the best time the save keeps: `AchievementRule`
    `cleared` gains `withinMs` (a best time under it; an untimed clear never counts). Ninety
    seconds asks for clean play bare-handed (the model's quickest fight is 60 s, about 72 with
    the walk; one with heavy blows taken is slower) and comes easily with the first clear's
    bronze sword (12 s of fighting at best). Not done: a no-damage
    clear, which would need a new field in the save (the run's health at the end is not kept).
  - **The strip** (`src/ui/nowDoing.ts`, `src/ui/atWork.ts`): its stage is fitted to the work
    under way (`workColumns`: every frame of this loop in this look and gear, and its prop, read
    off the art's pictures, a pixel of air each side; as tall as every loop so he stands on one
    line), so no other loop's prop leaves air beside him. The hero is shown at the fewest whole
    device pixels that give at least 0.6 CSS an art pixel (`stripScale`): 2 at 3x (48 CSS tall,
    unchanged), 2 at 2.625x, **2 at 2x (72 CSS, was 36)**, 1 at 1x; he fills his canvas's
    height, so at 2x the strip is 75 tall (55 at 3x). **It folds** to a slim bar (the line and
    the progress bar, 34 tall) with a ▾/▴ button at its right (48 wide; folded, its target
    reaches above the bar to 48), remembered on the device (`strip-folded`); folded, the hero is
    not drawn. The strip is now a `div.now-strip` holding the strip's button (still
    `[data-now-doing]`) and the fold button.
  - **The bank's card**: at most `min(44dvh, 340px)` (was 58dvh), its head and body padding
    trimmed; measured 295 of 740 (40%) at 360 x 740 and 281 of 844 (33%) at 390 x 844, the sell
    line still on screen without scrolling the card.
  - `activityHitFrame2`: not on `main` when this was built, so `LANDS` stays.
  - **Tests changed**: `content.test.ts`'s achievement count bound 30 → 36 (31 now). New:
    `tests/ui/harbour.test.ts` (first steps, the dot, the strip folding, fitting and scale), the
    `withinMs` rule in `achievements.test.ts`.
  - **Greaves, reported, not retuned** (item 7): unchanged from wave 14 (below); pacing as is.

- Wave 16, part 1: things remembered, and the cave's numbers (branch `lane-a/w16-rebalance`).
  **Save version 10.**
  - **Things remembered** (`src/core/remembered.ts`): `GameState.seen`, a list of short keys
    chosen by the caller, each once, in the order first remembered, only ever added to.
    `remembered(state, key)`, `remember(state, key)` (the same state back when there is nothing to
    add) and `isSeenKey`. A key is letters and digits in parts joined by `.`, `_` or `-`, at most
    48 characters (`town.pan`, `cave.lesson.wide_swing`); any other shape is never remembered and
    is ignored when asked to be. At most 256 keys (`SEEN_MAX`); past that new ones are ignored.
  - **The Shell** (`src/ui/view.ts`): `remembered?(key): boolean` and `remember?(key): void`, as
    lane C is coding against. `remember` saves at once (a reload straight after keeps it) and
    rebuilds nothing, so the scene is not disturbed; it does not touch the idle task.
  - **Save version 10**: migration 9 → 10 adds `seen: []`; `saveProblem` wants a list of keys of
    that shape, none twice, at most 256 (a save failing it is set aside, never deleted, as any).
  - **The menus' own hints stay in `Prefs`** (the first-steps card, the chart-seen dot), not moved
    onto `seen`: they are about these menus on this phone, already survive a reload, and moving
    them would need their device keys carried into the save for no gain to the player. Lane C's
    flags needed the save because a scene cannot reach `Prefs` (it imports no persistence).
  - **The Tidepool Cave's numbers** (lane C's measure, wave 15 → 16): dock rat hp 4 → 6, attack
    1 → 4; sand crab hp 4 → 6, attack 1 → 5; Old Snapper hp 12 → 18, attack 2 → 5, max hit 1 → 2
    (defences, speeds, coins and drops as they were; the idle monsters of the same ids untouched).
    Lane C's scripted novice on them, rerun here: 12 of 12 seeds cleared bracing or not, 2:23 to
    2:56 of run, lowest 7 to 19 of 20 (7 to 12 bracing); bare-handed and with nothing worn the
    same. **Quick Study stays at 90 s**: out of reach bare-handed now; with the first clear's
    bronze sword and no lessons the scripted player takes 59 to 83 s (median 74; lane C's
    `caveRun` test holds the median under 90), so it asks for clean play on a return visit.
  - **The cave's model** (`tests/data/cave.ts`) now has the scene's cast in the groups it is met
    (a rat; four rats; two crabs; the boss; it held two rats and two crabs before, and
    undercounted), the boss's slam at twice its max hit as the scene has it (was a budget of
    three), and the four cooked shrimp the landing holds, eaten under half health. **Changed
    expectations** (`tests/data/tidepool.test.ts`): "cleared with health to spare dodging two in
    three" became "dodging nine in ten and eating what is found" (99.5%, 56% left); "every time
    dodging nine in ten" became "every time dodging every heavy blow"; new: the usual run falls
    under half health (median lowest 40%) and without the fish the same play is a knock-out 95%
    of the time; the bronze sword case eats the found fish too (100%, 63% left).
  - **The cave's economy** (`tests/data/pacing.test.ts`): a run is now 98 coins' worth and 300
    XP (was 75 and 140 on the undercounted model), the quickest 71 s with the walk and round
    trip (was 39): about 5,000 coins an hour (under a quarter of level-1 Woodcutting) and **1.08
    times dock rats' XP idle at level 1** (was under it). The case said "less XP than the rats";
    it now says about the rats', never more than 1.15 times, pinned at 1.08. A decision for Cody
    if he wants it under: the cave's XP is its hit points, which are what make it two and a half
    minutes and worth eating in.

- Wave 16, part 2: rebalanced around greaves, and small things (branch `lane-a/w16-greaves`).
  **Save version unchanged (10).**
  - **Greaves are the assumed leg armour** (Cody: "We can rebalance around the greaves"): the
    simulations' melee ladder (`gearAt`, `tests/data/fighting.ts`) wears bronze greaves from
    level 5 and iron from 10, with the plate, as a player who smithed them would (was linen
    trousers). **The archer's ladder keeps linen trousers**: it dresses a hunter in leather and
    no metal (no bronze helmet or breastplate either, though they would be more armour), and
    there are no leather trousers. Measured, greaves on the archer would break a limit the other
    way (a bounty on the footpad could be done in 9.8 minutes with a bow).
  - **Numbers moved to restore the limits** (no greaves weakened; nothing else in the tables):

    | What                  | Before    | After     | Why                                                                                                                                        |
    | --------------------- | --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
    | Smuggler bounty kills | 16-27     | 16-26     | most kills, melee in greaves: 20.25 → 19.50 min (bow's fewest: 10.00)                                                                      |
    | Marsh troll bounty    | 14-21     | 14-20     | most kills, melee in greaves: 21.00 → 20.00 min (bow's fewest: 10.63)                                                                      |
    | Bramble wyrm bounty   | 15-24     | 15-23     | most kills, melee in greaves: 20.57 → 19.71 min (bow's fewest: 10.59)                                                                      |
    | Marsh troll coins     | 600-1,500 | 600-1,600 | the strongest fight at level 20 pays its way: 0.978 → 1.042 of an hour's gathering (52,807 → 56,258 against 54,000; in linen it was 1.043) |

    The troll's shortfall in greaves was mostly the dice (the same hour in greaves rolled five
    fewer kills and less ore), but the limit is the limit; the coins change no dice, only the
    purse.

  - **Pins moved because they encoded linen** (the wave-14 "for a decision" cases, now the pins
    themselves, and that block deleted): fish an hour (`duels.test.ts`) gull 135 → 139, footpad
    189 → 168, grey wolf 250 → 216, smuggler 187 → 174, marsh troll 190 → 206, goblin poacher
    165 → 145, bramble wyrm 182 → 169 (rat 0, crab 54 and boar 117 as they were); the best fight
    for money (`pacing.test.ts`) at level 10 (gull) 47,020 → 48,060 and at 20 (footpad) 67,024 →
    66,979; bounty points an hour at level 10 31-36 → 31-38, at 20 42-50 → 42-49, at 30 53-57 →
    53-58. Combat pacing in greaves: Melee 3.13 → 3.15 h, Defence 2.78 and Vitality 2.95 as they
    were (bounds only; ranged unchanged).
  - **Limits holding, all in greaves**: every monster a fair fight at its level with either
    weapon (70%+ of duels won, a third of health or more lost but for the rat) and hopeless ten
    levels early (under 5%); every bounty 10 to 20 minutes with either weapon, no deaths; the
    board posts nothing hopeless at combat levels 1 to 22; combat skills 2.5 to 3.5 h to level 20
    with no deaths; fighting for money between gathering and Thieving; the strongest fight at
    levels 1 and 20 pays its way (the animals aside); bounty points an hour even across monsters
    (least over most above 0.8). The grotto's balance tests (`tests/scene`, which read the
    tables) pass unchanged; no grotto number moved.
  - **`activityHitFrame2`** (lane B's, B15) replaces the copied `LANDS` table in
    `src/ui/atWork.ts`; a test holds every loop landing on the art's frame.
  - **Every dungeon's cast has a face**: a content test over every `cast` (so `old_snapper` too).
  - **The strip is capped** (`stripScale`, `src/ui/nowDoing.ts`): the hero never stands taller
    than 56 CSS pixels (`STRIP_TALLEST`) on a phone. At 2x the only whole sizes are 36 and 72 CSS,
    and 72 made the strip 75 tall; he is 36 again there, the strip its 52 minimum, as at 3x (48,
    unchanged) and 2.625x (55, unchanged); 3.5x two device pixels (41, was three); 1x one (72).
  - **The Town dot at once**: a level gained by time (live or away) that changes the combat
    level re-reads the dot in place (`refresh` in `app.ts`), so a landing opened by combat level
    alone is marked straight away, without a rebuild. A test with a landing at combat level 2.
  - **Changed expectations**: the fish, money and points pins above; the strip scale test
    (`harbour.test.ts`: 1, 1, 2, 2, 2 at 1x, 2x, 2.625x, 3x, 3.5x; was 1, 2, 2, 2, 3); the
    greaves "for a decision" block removed from `pacing.test.ts`. New: the strip cap, the dot on
    a level, the landing frames, the cast's faces.

- Wave 17, part 1: S16's shared contract (branch `lane-a/s16-progression`). **Save version 11.**
  - **Run statistics**: `RunSpoils.stats?: RunStats` (`src/core/content.ts`): `timeMs`,
    `damageTaken` (hit points lost to blows, before food), `foodEaten` (from the slot and found),
    `braces`, `stepOuts`, `knockedOut`, `kills`. Every field to be filled by a new run; a reader
    takes any missing one as unknown, never nothing (`readStats`). Also new on `RunSpoils`:
    `dungeon?` (the dungeon the run was in, cleared or not) and `modifier?: string | null` (the
    day's modifier it was played under). A kept run carries them in its `spoils` (`saveProblem`
    checks them), so nothing is duplicated outside lane C's opaque blob.
  - **Challenges**: `DungeonDef.challenges` (`ChallengeDef`: `id`, `name`, `text`, `rule`,
    `reward`). `ChallengeRule` is a closed set: `{ kind: 'atMost', stat, n }`,
    `{ kind: 'atLeast', stat, n }`, `{ kind: 'withModifier', id? }`, `stat` one of `timeMs`,
    `damageTaken`, `foodEaten`, `braces`, `stepOuts`, `kills`. `challengeMet(rule, stats, {
cleared, modifier })` (`src/core/progress.ts`): only a clear, never knocked out, never on a
    statistic not reported. Rewards (`ChallengeReward`): `coins`, `bountyPoints`, `items`.
    Cave (gentle): `tidepool_cave.quick` (2:00 or less; 250 coins and 2 points),
    `tidepool_cave.unhurt` (10 damage or less; 250 and 2), `tidepool_cave.no_food` (nothing
    eaten; 100 and 5 cooked shrimp), `tidepool_cave.snapper_dodge` (step out of three heavy
    blows; 150). Grotto (real): `brinebeards_grotto.swift` (7:00 or less; 6,000 and 10),
    `brinebeards_grotto.no_food` (nothing eaten; 8,000 and 10), `brinebeards_grotto.nearly_unhurt`
    (150 damage or less; 6,000 and 10), `brinebeards_grotto.spring_tide` (on a Spring Tide day;
    4,000 and 5). The scripted grotto player takes 7:35 to 9:00, eats 13 to 20 cod and takes 290
    to 480 damage, so none of these comes with a first clear. **The ids are chosen so lane B's
    icon matcher (B17, `challengeKind`/`modifierKind`, which reads words in the id) draws the
    right picture**: its test reads this table, so an id it cannot place fails CI.
  - **The day's modifier**: `DUNGEON_MODIFIERS` (`src/data/dungeons.ts`, `Content.modifiers`),
    `ModifierEffects` a closed set documented on the type: fight effects `foeHealth`,
    `foeDamage`, `foeSpeed`, `heroDamage`, `noFood` (scene and idle, through `foeUnder` and
    `heroMaxHitUnder`); scene-only `tideFaster`, `darker`; rewards `loot` (the dungeon's regular
    drops only: what some foe drops on every kill), `coins`, `xp`, **paid by `settleRun` from
    `spoils.modifier`, never by the scene** (`spoilsUnder` says what will be paid, for a results
    card). Ids: kind, for the cave, `slack_tide` (foes strike 20% less often) and
    `rich_pickings` (50% more shells and coins); trades, for the grotto, `thick_skulls` (health
    1.3, XP 1.3), `angry_crew` (damage 1.3, loot 1.3), `quick_tempers` (speed 1.25, XP and loot
    1.15), `spring_tide` (tide 1.5, damage 1.1, loot 1.35), `no_rations` (no food, XP 1.2, loot
    1.25), `unlit_lamps` (darker, hero damage 0.85, XP 1.25). Every trade has a catch the idle
    game feels.
    `dailyModifier(now, dungeonId, content, utcOffset)`: the day from `now` and the phone's
    offset (minutes ahead of UTC), turning at local midnight; a dungeon's pool comes round in
    turn, each once, shuffled afresh each time round by a hash of the turn and the dungeon's id
    (never the save's dice), never the same two days running. `modifierOn(day, …)`,
    `localDay`, `msToMidnight`, `effectWords` (the plain effect text), `isKind`.
  - **Records**: a clear keeps the least damage and food (`leastDamage`, `leastFood`), the
    modifiers cleared under (`modifiers`) and the challenges done (`challenges`) on
    `DungeonRecord`; each challenge pays once (`newChallenges` for the toast: "Challenge done:
    Stand Firm! 100 coins and 5 Cooked shrimp.").
  - **Tier unlock**: `tierUnlocked(state, n, content)`, read from clears (`DungeonDef.opens`:
    the grotto opens tier 2), so no state. `mayIdle(state, id, content)`: cleared by hand and the
    row has `idle` (none has until part 2).
  - **The Shell**: `todaysModifier?(dungeon)` (the app's clock and time zone; `AppDeps.utcOffset`,
    the phone's by default) and `sendIdle?(dungeon)` (declared; the app answers it in part 2).
  - **Save version 11**: `GameState.idleRun: IdleRun | null` (part 2 runs it; always null now) and
    the record fields above, optional. Migration 10 → 11 adds `idleRun: null`; `saveProblem`
    checks the record fields, a kept run's `stats`/`modifier`/`dungeon`, and `idleRun` (its
    shape, never beside an action or a fight, never with `health` kept).
  - **Tests**: `tests/core/progress.test.ts` (new), content and pacing cases (challenge rewards
    all told under half an hour of gathering at the dungeon's level), save and migration cases,
    the shell's two new behaviours. Changed: the version pin (11) and the version-9 migration
    case (it now also gains `idleRun`).

- Wave 17, part 2: S16's rules and menus (branch `lane-a/s16-idle`). **Save version unchanged
  (11)**: `idleRun` and the record fields were in part 1's one bump.
  - **A dungeon run idle** (`src/core/idleRun.ts`; `startIdleRun(state, id, content, now,
utcOffset)`, `stopIdleRun`, `alignIdleClock`, `advanceIdleRun` inside `advance`,
    `idleRunEnded`). Once cleared by hand (`mayIdle`), the hero runs it over and over as the idle
    task, replacing whatever ran (and anything started replaces it, carrying the hit points out).
    **The model**: `DungeonDef.idle.rooms` are the scene's own groups (a content test holds them
    to `src/scene/plans.ts`, boss calls included): a walk to each, then everyone there at once,
    each foe striking from the moment it is met, the hero striking the first still up, with idle
    combat's own ratings, chances, max hits, waits and XP on the cast's rows. Telegraphed blows,
    bracing and the tide are not modelled (the hero sent alone is taken to step out and do nothing
    clever). No breather between foes; eating by idle combat's rule; between runs `tripMs`
    rowing home and back, a hit point back every 6 s of it. The cave: a rat; three rats; two
    crabs; the snapper; walks 8, 8, 4, 8 s; trip 60 s. The grotto: two crabs; the store's three
    one by one; the parrot; three deckhands; the brig's two waves; in the cove the two deckhands
    who come ashore met with the captain and dealt with first; trip 120 s. **Each run sets out
    under its day's modifier**, read from the run's own calendar (`IdleRun.clock`, moved on by
    the time `advance` spends, and `utcOffset`), so crossing midnight changes the next run's,
    the same live or away; the app sets the calendar to its clock when the idle clock starts again
    after a hand run and after time away is paid (`alignIdleClock`: nothing paid, the run under
    way keeps its day). **What falls**: each drop (and a kill's purse) kept on a 50% roll
    (`lootPercent`), the modifier's `loot` on regular drops and `coins`/`xp` as by hand; the
    grotto's anchor and figurehead never idle (`activeOnly`). Never a clear, a first-clear reward
    or a challenge; `DungeonRecord.idleRuns` counts runs. Kills count to the bestiary and a
    bounty held; **auto bounty** hands in on the kill that finishes one and takes the next, and
    the runs go on (the away report cannot name which monsters were handed in, and says only how
    many). **Potions**: none helps a fight, so none helps an idle run (unchanged rule). A
    knock-out ends it as any does; out of arrows likewise.
  - **The invariants** (`tests/core/idleRun.test.ts`): walked event by event (walk ends, blows;
    at the same moment the hero first, then foes in order), dice only inside events in a fixed
    order. Random 1 to 40 ms frames equal one advance over 30 minutes (twice, two frame seeds);
    cuts at ±1 ms of a room met, the first kill, the next room met and a run's end agree; cuts
    round the knock-out agree; a run across local midnight takes the new day's modifier and every
    cut and frame series agrees; a night (8 h + 1,234 ms) of 16 ms frames equals `catchUp`.
  - **Per hour** (`tests/data/pacing.test.ts`, pinned; hand play is lane C's bots' median clear
    plus 15 s round trip, every foe once, drops at their odds):

    | Level 1, the cave      |  Melee XP/h | Coins' worth/h |
    | ---------------------- | ----------: | -------------: |
    | By hand (bronze sword) |      11,530 |         ~3,850 |
    | Idle, any of its days  | 7,170-7,265 |    1,040-1,600 |
    | Dock rats idle         |      14,130 |   32,953 (net) |

    | Level 20, the grotto             |       Melee XP/h | All combat XP/h | Earned/h (after fish) |
    | -------------------------------- | ---------------: | --------------: | --------------------: |
    | By hand (level 19, iron)         |           22,631 |         ~71,000 |         ~70,700 gross |
    | Idle, no modifier                |           18,750 |          62,326 |                 8,095 |
    | Idle, best day (Thick Skulls XP) |           27,477 |          85,495 |      -1,255 to 19,935 |
    | Best idle fight                  | 31,085 (footpad) |  97,865 (troll) |      66,979 (footpad) |

    The idle grotto eats about 137 cod an hour at level 20 (the hand bot about 20 a run): it is
    for XP, kills and the collection, not money.

  - **The menus** (`src/ui/dungeonsCard.ts`, moved out of `combatScreen.ts`): per dungeon its
    facts (clears, best time, least damage, runs idle), today's modifier (lane B's
    `modifierIcon(id)`, the name and its plain effect words; turns at local midnight in place),
    its challenges (lane B's `challengeIcon`, what each asks and pays, a gold or dull
    `challengeMedal`, "n of 4 done"), what its first clear opens ("Tier 2 unlocked. It is still
    being built; when it comes, it brings …" or "Its first clear unlocks tier 2, still being
    built: …"), and once cleared "Send the hero through idle" / "Call the hero home". While
    running, a panel at the top of the Combat page (room n of m, health, runs, foes, food, what
    was kept, Call the hero home), moving in place. The strip: "Running Tidepool Cave idle",
    "Fighting, 2 of 4 · 7 runs · Slack Tide", the bar the room's health gone; a tap opens the
    Combat page; the hero rows on lane B's `dungeon` loop on the way out, strikes while fighting,
    breathes between rooms. The away report: "running Tidepool Cave idle", "237 runs through
    Tidepool Cave, 1,659 foes felled.", food and arrows, "Knocked out in …". The Shell's
    `sendIdle(id)` answers (a toast says why not). Challenge rewards toast on settling (part 1).
  - **Achievements** (eleven, 42 in all): Regular and Part of the Furniture (cave 10 and 50),
    Not a Scratch (a cave clear with no damage, from `leastDamage`), Top of the Class (every cave
    challenge), Fair Weather Sailor (the cave on both its days), Old Salt and Scourge of the Grotto
    (10 and 50), Shipshape (every grotto challenge), All Weathers (the grotto on all six days),
    Sent Ahead (an idle run), Knows the Way Blindfold (a hundred).
  - **Weak spot fixed**: the cave model (`tests/data/cave.ts`) reads its groups from the cave's
    idle rooms, so it has the scene's three rats under the pool.
  - **Changed expectations**: `tidepool.test.ts` "without the fish, a knock-out" from under 10%
    cleared to under 30% (three rats, not four: 24% cleared); the cave economy pin `[98, 300, 71]`
    → `[90, 270, 66]` and its XP 1.08 → 1.05 times the rats'; the achievement bound 36 → 48;
    away-report fixtures gain `dungeon: null`. New: `tests/core/idleRun.test.ts`,
    `tests/ui/dungeonReplay.test.ts`, `tests/data/idleRuns.ts`, two pacing cases, a content case
    for the idle rooms against the scene's plans.
  - **Checked** at 390 x 844 and 360 x 740, 3x: `/home/claude/lane-shots/w17-a/` (the card new,
    mid and all done, the idle run in the strip and on the Combat page, the away report after a
    night, achievements).

- Wave 18, part 1: the grotto's days made fair trades (branch `lane-a/w18-modifier-tuning`).
  **Save version unchanged (11).**
  - **Why**: the grotto is balanced on what is brought to eat. Lane C's careful player at combat
    20 eats 19 of his 20 cod on a plain day (and clears only 40 of 48 seeds on a plain day: his
    twelve are a lucky dozen), so wave 17's days, each a quarter to a third harder on top, cleared
    0 to 9 of 12. With 30 cod even wave 17's numbers clear 11 or 12 of 12: the wall was food.
  - **The trades** (`DUNGEON_MODIFIERS`): each costs one thing and gives most of it back another
    way, and pays for the difference. Before → after:

    | Id              | Wave 17                           | Wave 18                                                               | Costs               |
    | --------------- | --------------------------------- | --------------------------------------------------------------------- | ------------------- |
    | `thick_skulls`  | health 1.3, XP 1.3                | health 1.2, swing 0.8, XP 1.2, loot 1.15                              | a longer clear      |
    | `angry_crew`    | damage 1.3, loot 1.3              | damage 1.1, health 0.95, loot 1.1                                     | more damage         |
    | `quick_tempers` | swing 1.25, XP 1.15, loot 1.15    | swing 1.1, health 0.93, XP 1.15                                       | more damage         |
    | `spring_tide`   | tide 1.5, damage 1.1, loot 1.35   | tide 1.25, loot 1.25                                                  | more damage, longer |
    | `no_rations`    | no food, XP 1.2, loot 1.25        | **replaced** by `short_rations`: food heals 0.8, health 0.9, loot 1.1 | more food           |
    | `unlit_lamps`   | darker, hero damage 0.85, XP 1.25 | darker, hero damage 0.85, swing 0.9, XP 1.25, loot 1.1                | a longer clear      |

    Lane C's careful player, combat 20, 20 cod, their twelve seeds (and 48), clears / median clear
    / median lost to blows: plain 12 (40/48), 8.2 min, 406; thick skulls 12 (42), 9.8, 413; angry
    crew 11 (42), 7.9, 422; quick tempers 10 (38), 8.0, 441; spring tide 10 (42), 7.9, 447; short
    rations 11 (39), 7.5, 331 (with the scene feeding him as `foodUnder` says; he eats more fish
    with 30 carried); unlit lamps 11 (38), 8.9, 416. An hour by hand against a plain day (XP,
    coins' worth earned after fish, their mean): thick skulls 1.22 / 1.00 / 1.11, angry crew 1.00 /
    1.15 / 1.08, quick tempers 1.09 / 0.98 / 1.04, spring tide 1.00 / 1.26 / 1.13, short rations
    0.98 / 1.22 / 1.10, unlit lamps 1.15 / 1.01 / 1.08 (`tests/data/pacing.test.ts`, pinned).

  - **Short rations** (`ModifierEffects.foodHeals`, `foodUnder(heals, effects)` in
    `src/core/progress.ts`, "Food heals 20% less"): replaces No Rations, which no careful player
    could clear at any level. The scene must apply `foodUnder` to the food slot's and found food's
    heals (Needs, below); until it does, the day plays as a plain one with foes 10% weaker and a
    10% loot bonus: kinder than meant, never impossible. `noFood` stays in the type for a scene
    that honours it; no row sets it, and a content case forbids a trade from setting it.
  - **Idle runs on a modifier day** (`idleModifier`, `src/core/idleRun.ts`): a kind day as it
    comes, a trade day plain, catch and bonus both left out. A run saved under a trade day before
    this is played plain from its next step. So a night away never ends at midnight, and the
    idle grotto earns the same on every day: about 8,100 coins' worth an hour net at level 20 in
    the first hour, 13,000 to 17,000 an hour over six hours at levels 18 to 20 (about 120 cod an
    hour eaten). Its drop rate stays 50%. Pins unchanged (`IDLE_GROTTO`, `IDLE_CAVE`).
  - **Challenges**: Hard Tack (`brinebeards_grotto.no_food`) is honest about itself: "One for a
    seasoned fighter: combat 45 or so." (the careful player clears without eating 4 of 12 at combat
    40, 9 at 45, 12 at 50). Barely a Scratch becomes Light on the Bandages, 250 hit points lost to
    blows (was 150 damage; met once at combat 25, 4 times at 30, 8 at 35; 150 was met only from
    35). Ahead of the Tide unchanged (once at 20, 9 times at 25). Spring Tide Sailor on 10 of 12
    spring tides at 20. The cave's four, by the cave's novice with the bronze sword its first clear
    gives (12 seeds, lessons off, stepping out): Brisk 12 of 12 (61 to 75 s), Mostly in One Piece
    12 (1 to 4 lost), Packed Lunch 12, Out of the Snapper's Way 12 (median 5 step-outs).
  - **Tests**: content (no trade forbids food; every trade within a quarter of 1; idle plays
    trades plain), progress (`foodUnder`, `idleModifier`, the new words), idle (every trade day
    equals the plain day's hour; an old run under a trade day is played plain; a kind day is
    taken), pacing (the days by hand, the idle grotto never loses money on any day or over a
    night at 19 and 20).

## Deferred

- Wave 14: greaves and the combat pins. **Done in wave 16** (Cody: "We can rebalance around the
  greaves"; above).

- Wave 13: nothing from the brief. Not done: greaves in the simulations' gear ladder
  (`tests/data/fighting.ts` still wears linen trousers, so fights are a little easier in play
  than the pins assume); a mocked beard screenshot (the real row shows "None").

- Wave 12: **the run's save**, not built: lane C's pure serialise/restore for a run has not
  landed on `main` (the brief said build only if it had). The design below stands.
- Wave 11: **saving a dungeon run** is designed below ("A run that survives a reload"), not
  built: it needs the scene to hand a run over and take it back, which is lane C's half, and a
  save field with nothing yet to fill it would only be churn. Not built: faces for the thieving
  marks (art has none; the cards take them when it does).
- Wave 9: nothing from the brief. Left alone on purpose: the grotto's cast shows no level or
  drops in the bestiary (their numbers are lane C's, in `src/scene/cast.ts`, and are not
  duplicated here), and the cast is not fightable idle (that is the "dungeon made idle-able"
  decision lane C's cast notes leave for later).
- Nothing from S10's brief; it was all built, past the minimum line. Not built, by choice: an
  extra food slot (see the store), rewards for achievements (the house, S18), unlocks by a
  clear (S16), uses for feathers and pearls, and arrows that can be picked up again (see the
  notes).

## Needs from another lane

- **For lane C (wave 18)**: (1) **wire short rations**: where `modifiedFighter` builds the hero
  under the day's effects, take what each thing eaten heals through `foodUnder` from
  `src/core/progress.ts` (re-export it in `fromLaneA.ts`): the food slot's
  `food: fighter.food && { ...fighter.food, heals: foodUnder(fighter.food.heals, e) }`, and the
  same for each kind of found food (`RunSetup.heals`, the battle's `larder`). Until then the day
  plays plain but for its foes' health. (2) **Two of your expectations name `no_rations`, which
  is gone** (replaced by `short_rations`), and fail for that alone: `modifierRun.test.ts` "no
  rations: NOT cleared by the careful player" (now 12 of 12: an unknown id plays plain) and
  `runStats.test.ts` "forbids eating on a day of no food" (`effectsOf` of an unknown id is
  `{}`, so no `mods`); the `noFood` flag itself still stands, so a test row of your own
  (`{ noFood: true }`) keeps that case. (3) The per-modifier bounds in `modifierRun.test.ts`
  pass on the new numbers as they are (measured above); tighten them to the new figures as you
  see fit, and add `short_rations` once (1) is in. (4) The grotto's careful player clears a plain
  day on only 40 of 48 seeds with 20 cod (your twelve are all clears): its margin is the cod, not
  the modifiers.
- **For lane B (wave 18)**: `short_rations` replaces `no_rations`; your matcher reads it as
  `hungry` from "ration" (checked: the content/art id test passes). Its effects are `foodHeals:
0.8` (new), `foeHealth: 0.9`, `loot: 1.1`; `modifierIconFor` is not needed for it while the id
  matches. Every other id is unchanged.
- **For lane C (wave 17)**: (1) fill `RunSpoils.stats` (all seven fields), `dungeon` and
  `modifier` in `spoilsOf`, so a kept run carries them too; (2) read `shell.todaysModifier?.(id)`
  once as a run rows out, keep it in the run, apply `foeUnder`/`heroMaxHitUnder` and `noFood`
  and your own `tideFaster`/`darker`, and do **not** apply `loot`/`coins`/`xp` (settling pays
  them; `spoilsUnder(spoils, content)` gives the paid amounts for the results card); (3) the
  results card may show `challengeMet` for each of `content.dungeons[id].challenges`; the toast
  of rewards is the shell's; (4) the chart may show `dailyModifier` and `mayIdle`, and call
  `shell.sendIdle?.(id)` (answered since part 2: false with a toast if not allowed). (5) The
  rooms of `DungeonDef.idle` are your plans' groups; a content test fails if a plan's foes change
  without them, so a change to a plan's cast needs lane A to move the idle rooms too.
- **For lane B (wave 17)**: done and used (B17): `modifierIcon(id)`, `challengeIcon(id)`,
  `challengeMedal`, the `dungeon` loop; B17b's `slow` picture for Slack Tide (by its id). Not used yet: `dungeonSeal`, the `new` medal's sparkle.

- **For lane C (wave 16)**: `shell.remembered?.(key)` / `shell.remember?.(key)` are on `main`
  (save version 10). Keys: letters and digits in parts joined by `.`, `_` or `-`, at most 48
  characters, e.g. `town.pan`, `cave.lesson.attack`; anything else is ignored. `remember` saves
  at once. The cave's numbers are lane C's (above); `caveRun.test.ts` passes on them unchanged.

- **For lane C (wave 15)**: (1) poll `shell.takeRequest?.()` when `townView` mounts and on each
  update, and open the chart on `'chart'`; call `shell.chartOpened?.()` whenever the chart opens
  (by the boat or a request). (2) The chart's landings: `dungeonsInOrder(content)` and
  `dungeonStatus(state, id, content)` from `src/core/dungeons.ts` (`soon` shows a silhouette and
  `unlock`; never the name); the boat goes only where `mayEnter` says. (3) The cave's cast:
  `DUNGEONS.tidepool_cave.cast` (rats and crabs share the tables' ids but fight by the cave's
  rows, as the grotto's cast does). Budget the cave was tuned to: two rats, two crabs, then the
  boss; the boss's heavy at most three times its max hit (3), no oftener than every 7 s, first
  after 4 s or more; no tide. A clear reports `cleared: 'tidepool_cave'` with `timeMs`. (4)
  Quick Study asks a clear under 90 s, read from the best time: say if the rooms make that out
  of reach with a bronze sword. (5) The Town tab's dot clears on `takeRequest` giving `'chart'`,
  on `chartOpened`, and on rowing out; calling `chartOpened` from the boat is what clears it
  for a player who walks there.
- **For lane B (wave 15)**: `old_snapper`'s face: done (a content test now holds every cast's
  face). Landing ids for the chart: `tidepool_cave`, `brinebeards_grotto`,
  and the three to come, `unknown_1` to `unknown_3` (matching B15's `harbourChart2`).

- **For lane B (wave 14)**: `activityHitFrame2`: done (B15), and used since wave 16.

- **For lane C (wave 13), the run's save**: call `shell.keepRun?.(savedRunOf(run))` on entering a
  room, every few seconds and on `pagehide`, and take `shell.savedRun?.()` back when `townView`
  is built (restore it if `restoreRun` can, else `settleRun(saved.spoils)`); the shell clears it
  on settling. Also `dressKey` should include `look.beard` (lane B's note).
- **For lane B (wave 13)**: nothing blocking. `LOOK_CHOICES`'s declared type can widen to include
  `beard` now: core's `Look` and `src/ui/look.ts` carry it.

- **For lane C (wave 12), who dropped what.** Fill `RunSpoils.dropped` when a run is settled:
  by foe id, the item ids that foe dropped in the run (any order, repeats fine), e.g.
  `{ deckhand: ['doubloon', 'pirate_cutlass'] }`. The bestiary names a grotto foe's drops from
  it; until then they all show "?". Only items the foe's row in `src/data/dungeons.ts` lists
  count.
- **For lane C, the grotto's numbers.** `src/data/dungeons.ts` holds the cast's full rows
  (`DungeonDef.cast: DungeonFoe[]`, the `MonsterDef` shape less `area`, `bounty` and
  `bountyOnly`, plus `pick`; `PickDrop` is in `src/core/content.ts`). Proposed: `cast.ts` stops
  keeping its own table and reads them, e.g. `GROTTO_CAST = Object.fromEntries(
DUNGEONS.brinebeards_grotto.cast.map((foe) => [foe.id, { ...foe, area: GROTTO_ID }]))`, with
  `CastDef`/`PickDrop` from core; then a number is changed in one place, and the drift test in
  `tests/data/content.test.ts` becomes trivially true (lane A deletes it after). Until then, a
  change to a cast row in `cast.ts` must be made in `dungeons.ts` too, or that test says so.
- **For lane C, the run's save** (the design below): `snapshotRun`/`restoreRun` and the two shell
  calls, when it is scheduled.
- **For lane B (wave 12), nothing blocking.** The old-scale doors can go: nothing in
  `src/ui`, `src/main.ts` or `tests/ui` imports `art/character`, `art/portraits`, `art/town`,
  `art/dungeonArt`, `art/tabIcons` or `art/pixelSvg`. The menus still use `art/icons`
  (`itemIcon`, `itemIconPicture`, `iconScale`, `skillIcon`, `tabIcon`), `art/character2`,
  `art/portraits2` and `art/gallery`; `portraits2.ts` and `character2.ts` themselves import
  `Look`, `DEFAULT_LOOK` and `LOOK_CHOICES` from `art/character`, so those must move with it.
  Optional: the doll's squares now show icons at the hero's grain (72 CSS); the necklaces and
  bracelets still use about the middle third of their 24-pixel grid. The marks' faces
  (`steal_fisherman`, `steal_fish_stall`, `steal_sailor`, `steal_pedlar`, `steal_strongbox`)
  appear the moment `portrait2(id)` gives them.
- Done since wave 9: the five tab icons arrived (B10b) and the bar shows them.
- Nothing blocking. **For lane B, ids with no picture yet** (all look tidy without one): the
  eight grotto items (icons; worn layers for the six wearables), `velvet_cap` (icon and a worn
  layer: head, a plum velvet cap with a gold pin, the store's cosmetic), and still from S9
  anything B6 has not reached. The tab bar takes `tabIcon(id)` the moment it returns one.
- **For lane C:** `shell.openBounties?.()` opens the notice board's page (optional on `Shell`,
  so stand-ins need not change). `settleRun` now counts `kills` (monsters in the tables only;
  the grotto's own cast count for nothing until they are in them) and `cleared` (use
  `'brinebeards_grotto'`, the id in `src/data/dungeons.ts`), and keeps a best time if the
  spoils carry `timeMs` (the run's length in milliseconds, new and optional). **Coins are ten
  times what they were**: a doubloon sells for 250, and the test dungeon's monsters drop their
  table coins (a rat 50 to 110). A cleared grotto run should come to something like ten to
  fifteen minutes of good play, roughly 10,000 to 15,000 coins in doubloons and coins together;
  the grotto's coin and doubloon numbers are yours.

## Notes for this lane's next session

- Save is version 11 (wave 17: `idleRun`, dungeon records). The next shape change is 12.
- **Remembered for good, in the save**: `remember`/`remembered` (`src/core/remembered.ts`, the
  Shell's two calls). A one-off a player should not see twice on any phone is a key there; how
  the menus are arranged on one phone is still `Prefs`.
- **Menu preferences are not the save**: `Prefs` (`src/persistence/Prefs.ts`) keeps how the menus
  are arranged on a device (today `bank-sort`). A new preference is a key there, never a save
  field.
- The "now doing" strip (`nowDoing`) is made once in `mountApp` and appended by every `render`;
  `tick` updates it after the game's step. A view that wants the hero at work makes its own
  `workStage` and calls `show(state, now)` from its `update`.
- `View.stale(before, after)`: a view that rebuilds when time changes what it is built of. A new
  view that shows something time changes structurally must say so, or update it in place.
- The character sheet is a paper doll (wave 9). Since wave 12 the squares and the figure share
  one grain, `sheetScale()` (three from 356 wide, two below): a square is a 24-pixel icon at that
  scale plus its border (`dollSlotSize`, set on the doll as `--slot`), and the figure's room takes
  what is left. The figure is `heroFigure` (`src/ui/figure.ts`, wave 11); what it shows is written
  on its canvas (`data-look`, `data-worn`, `data-breath`, `data-draws`), which the tests read.
  While a slot is open the sheet has `.choosing` and the doll is sticky.
- `View.update(state, now?)`: `now` is the app's clock for the frame. Anything on a menu that
  moves by time alone takes it from there.

### A run that survives a reload (design, wave 11; not built)

Wave 12: still waiting on lane C's half (a pure `snapshotRun`/`restoreRun` for a run, with the
round-trip test below). Nothing changed in the design. When it lands: the save goes to 9 with
`run: SavedRun | null`, a migration step (`run: null`), a `saveProblem` check and a test for
each, exactly as below; `savedAt` keeps its meaning.

Today a run lives in `townView`'s closure; a reload or a dropped page loses it, and whatever
was picked up with it (nothing is settled until the run ends).

- **What goes in the save** (version 9): `GameState.run: SavedRun | null`, where `SavedRun` is
  `{ dungeon: string; scene: number; spoils: RunSpoils; data: unknown }`. `data` is the scene's
  own snapshot of the `Run` (room, walker, battle with its dice `seed` as it stands, clock),
  opaque to core, with `scene` the snapshot's own version number (lane C's), so lane C can change
  its battle's shape without a save migration. `spoils` is the run's `spoilsOf(battle)` as of the
  snapshot, in core's own shape: whatever happens to `data`, what was picked up is never lost.
- **Migration** 8 → 9: `run: null`. **`saveProblem`**: `run` is null or an object with a known
  dungeon id, a whole `scene` ≥ 1, `spoils` passing the same checks `settleRun` makes (whole,
  non-negative), and `data` a plain object under a size cap (say 256 KB of JSON). A bad `run` is
  a problem like any other (the save is set aside, never deleted). Tests for each.
- **What the scene hands over**: `Shell.keepRun?(run: SavedRun | null)` (optional, like
  `openBounties`): called on entering a room, every few seconds of play, and on `pagehide` /
  `visibilitychange` (the shell forwards these: it already saves there), and with `null` when
  the run is settled. The app holds it in `state.run` and writes it with the next save; it never
  advances it. **What it takes back**: `Shell.savedRun?(): SavedRun | null`, read when
  `townView` is built. If it holds a run the scene can read (`scene` matches), the scene
  restores it (`restoreRun(data)`), pauses the idle clock and goes full screen as on rowing
  out; if it cannot (an older snapshot), it settles `spoils` as a run rowed back early, clears
  `run`, and shows the town.
- **Time away**: a gap of less than a minute (`AWAY_MS`, a reload) resumes the run where it
  was. A longer one settles the snapshot's `spoils` as rowed back (no clear), clears `run`, and
  the time is paid to the idle task by `catchUp` from `savedAt` as for any closed game: a run
  is played by hand, so nothing of it happens while away, and the idle task is not robbed of a
  night because a run was left open.
- **Determinism**: the battle already carries its dice's position (`seed`, moved on inside
  `advanceBattle`) and its own clock on 100 ms ticks, so a restored snapshot rolls exactly what
  the unbroken run would have: `restore(JSON.parse(JSON.stringify(snapshot(run))))` advanced by
  the same taps must equal `run` advanced (lane C's test; note that `-Infinity`/`Infinity` in
  `struckAt` and `flight.until` do not survive JSON and need encoding). The seed should come
  from the save's dice moved on, or from `now` passed in, rather than `Date.now()` in the
  scene. Reloading to dodge a blow gets the snapshot at most a few seconds old, with the same
  dice: the same taps give the same blow.
- **Size**: a battle is a few dozen foes and piles; well under the cap.

### Weak list (wave 17)

- On a No Rations day the idle grotto knocks a level-20 hero out in the first run (nothing can
  be eaten), which ends the idle task; a night that crosses into one ends there. Honest to the
  modifier, but harsh: Cody may want idle runs to skip a no-food day's catch, or the menus to warn.
- The idle grotto loses money at level 20 on its harder days (cod eaten outweighs half the
  doubloons); only XP, kills and finds recommend it.
- The idle model's simultaneous groups and ignored heavy blows are a reduction, tuned only
  against the bots' totals; the cove's two deckhands are there from the start.
- The calendar resyncs only on the idle clock restarting and after time away; a phone changing
  time zone mid-session keeps the old offset until then.
- Challenges for the grotto cannot be checked until lane C reports `stats`; "Not a Scratch" in
  the cave is untested by a person (the bots never get there).
- The Dungeons card is long on a phone (four challenges each); not folded.

### Weak list (wave 12)

- With a slot open on a 360 x 740 phone the doll (about 330 pixels) leaves roughly 250 pixels
  for the choices under it: one card and a half at a time. A smaller doll while choosing
  would give more, at the cost of a figure that changes size; not done.
- The header is 74 pixels tall at 2x (62 before) and 73 at 2.625x: whole pixels leave a face
  of 36 or 72 at 2x, and 36 was the complaint. At 2x and 1x the face is cropped to its safe box
  (the disc's edge and the shoulders go).
- A grotto foe's drops are all "?" until lane C fills `RunSpoils.dropped`.
- The sheet has no panel round it any more; the doll reaches 6 pixels into the screen's side
  padding (10 pixels from the screen's edge at 360).
- The figure's room is taller than the hero by about 90 pixels at three (the squares set its
  height); the name sits in that air.
- At 2.625x an icon is 73.14 CSS pixels in a 77.14 square: the square's edge falls between
  device pixels, so its border's outer row is blended (the icon itself is exact).
- The header's face keeps the old look while "Change look" is open; it catches up on Done.
- The cast's rows live in two places until lane C reads them from `src/data/dungeons.ts`; the
  drift test is what keeps them honest.
- The creator fits Begin on a 360 x 740 screen only by trimming the title's air; "I have a
  save" is below the fold there (as before).
- The tab bar's shares are a few pixels unequal at 360 and below (Character is wider).
- Not looked at in Safari; no WebKit here.
- **Prices are held by `tests/data/pacing.test.ts`**, through `tests/data/economy.ts`: a new
  gathered thing is priced by the hour of its skill, a new made thing by the chain behind it
  (the content tests also want it dearer than its materials), a new monster's coins by its hour
  for money. The exact pins will move with any number; the bounds are the story.
- Decisions from S10 Cody may want to reverse: prices tenfold; a spyglass that helps melee; the
  animals (boar, wolf) carry no coins, so an hour at their own level costs more in fish than
  their hides fetch (they are for XP and hides); **ranged costs about as much in arrows as it
  earns** (a bow shoots 900 to 1,400 arrows an hour, each worth what an hour of making them is
  worth), so archers earn about half what melee does, or less: arrows that can be picked up
  again, or more arrows a bar, would be the fix and is a rule change; achievements on first load
  of an old save arrive in a burst; the collection log names nothing not yet found.
- Combat's skill ids are constants in core (`MELEE`, `RANGED`, `DEFENCE`, `VITALITY` in
  `src/core/combat.ts`); `tests/data/content.test.ts` checks the tables match.
- A new monster needs a `bounty` row (a test says every monster is posted) and a fish pin in
  `tests/data/duels.test.ts`; its bounty counts follow from its kills an hour.
- Decisions Cody may want to reverse: a knock-out leaves a tenth of the hit points instead of
  full health (S8 said full); healing is 1 hit point every 6 s, so a level-20 character takes
  about 9 minutes from nearly nothing; mastery of a mark raises the chance instead of the speed;
  XP for a theft only on success; bounties are posted only at or below the character's combat
  level, and on bounty-only monsters as often as any other; a swap is free with no points; the
  one-off hat may be bought again after selling it; Thieving's coins plus loot come to about
  1.8 times gathering at level 20 (coins alone 1.47); the breather after each kill makes the
  weakest fights free of food; feathers and pearls are only for selling.
- Bounties are not a skill with levels, though the design's table lists "Tasks: Bounties" among
  the skill groups; the brief asked for points, and a Bounties level would want its own S-number.
- Stopping a theft while stunned and starting it again skips the rest of the stun. It is a few
  seconds and costs nothing either way, so it was left.
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
- Open with Cody, none blocking: the level curve, three-hour tiers, speed-only mastery, VT323
  digits beside Pixelify Sans letters, the potion numbers above, and the equipment numbers.
