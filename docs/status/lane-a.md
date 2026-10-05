# Lane A: idle rules

**Next session: S7b: Equipment and the character** (brief in `docs/lanes.md`, wave 3).

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

## Deferred

- Leather for Crafting waits for hides from combat (S8); noted in `src/data/actions.ts`.

## Needs from another lane

- Nothing. For B3: the new items and the three skills ask `itemIcon` and `skillIcon` by id
  already; the potion panel asks `itemIcon` for the potion.

## Notes for this lane's next session

- Save is version 4 (`potion`). The next shape change is 5.
- Wearable from S6 for S7b: the linen hood, tunic and trousers, the shell necklace and bracelet,
  the three shortbows and the two kinds of arrow (ammunition, used up in S8).
- An `extra` potion must not help a skill with recipes (it would make things from nothing);
  `tests/data/content.test.ts` checks it. Midnight oil names its groups, so combat skills (S8)
  are left out until someone decides they belong.
- XP rounding favours small actions: Midnight oil on a 10 XP action pays 12 (round of 11.5).
- An artisan skill is paced as if its materials were on hand: about two hours to level 20. The
  pacing sim tops up whatever a skill's recipes use, so a new artisan skill only needs adding to
  the `it.each` list.
- Item sale values are placeholders until the shop (S10).
- Open with Cody, none blocking: the level curve, three-hour tiers, speed-only mastery, VT323
  digits beside Pixelify Sans letters, and the potion numbers above.
