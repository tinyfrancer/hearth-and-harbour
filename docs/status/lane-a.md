# Lane A: idle rules

**Next: the Milestone A review with Cody** (`docs/lanes.md`, "The order of work"). Nothing of
lane A's is waiting on another lane; the next building session is whatever the review decides.

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

- Wave 9: the C-scale hero in the menus, the grotto's cast in the bestiary (PR to follow):
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

## Deferred

- Wave 9: nothing from the brief. Left alone on purpose: the grotto's cast shows no level or
  drops in the bestiary (their numbers are lane C's, in `src/scene/cast.ts`, and are not
  duplicated here), and the cast is not fightable idle (that is the "dungeon made idle-able"
  decision lane C's cast notes leave for later).
- Nothing from S10's brief; it was all built, past the minimum line. Not built, by choice: an
  extra food slot (see the store), rewards for achievements (the house, S18), unlocks by a
  clear (S16), uses for feathers and pearls, and arrows that can be picked up again (see the
  notes).

## Needs from another lane

- **For lane B:** the five tab icons (`tabIcon` still returns null; the bar picks them up the
  moment it gives them). `velvet_cap` has a C-scale worn layer but no item icon, so its slot
  square shows its name.
- **For lane C:** the grotto's cast now also has rows in `src/data/dungeons.ts` (id and name
  only, for the bestiary); if `src/scene/cast.ts` renames or adds one, change both, or
  `tests/data/content.test.ts` says so. Grotto kills reported through `settleRun` now count.
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

- Save is version 8. The next shape change is 9.
- The character sheet is a paper doll (wave 9). The doll's squares are 56px and the figure's room
  takes what is left, so a 320px phone still fits; the figure itself is whatever size
  `characterCanvas2` gives (it picks its own scale from the window). Tests that need what the
  figure was asked to draw mock `characterCanvas2` around the real one (`tests/ui/figure.test.ts`).
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
