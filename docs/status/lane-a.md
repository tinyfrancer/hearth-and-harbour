# Lane A: idle rules

**Next session: S6: Artisan skills, part 2 (Crafting, Fletching, Alchemy)** (brief in
`docs/lanes.md`, wave 2).

## Done

- S2 Idle engine and woodcutting (PR #2)
- S3 Offline progress and the away report (PR #3)
- S4 Fishing, Mining, Foraging, the bank, mastery (PR #4)
- S5 Cooking and Smithing: recipes in the tables (`recipe()` in `src/data/actions.ts`), cooked
  fish, bronze and iron bars, and a bronze and an iron axe, sword, helmet, breastplate and shield
  as bank items; the action card shows what a recipe uses, how many are held, how many times it
  can be made, and what is short; the Skills list is grouped under Gathering and Artisan
  (`SkillDef.group`); both skills paced in `tests/data/pacing.test.ts` (S5's PR)

## Deferred

- Nothing.

## Needs from another lane

- Nothing. For B2: recipe inputs on the action card also ask `itemIcon` for each input, so input
  rows pick up icons with no change here.

## Notes for this lane's next session

- Save is still version 3 (`coins`, `mastery`); S5 changed no shape. The next shape change is 4.
- An artisan skill is paced as if its materials were on hand: about two hours to level 20 (the sim
  gives 1.85, beside 2.77 for gathering), XP per second climbing from 5 to about 12. The pacing
  sim tops up whatever a skill's recipes use, so a new artisan skill only needs adding to the
  `it.each` list.
- Smithing pays twice per bar, once to smelt and once to smith. Iron opens at Smithing 15 to match
  Mining 15; bronze needs tin, which Mining opens at 8.
- A recipe the bank cannot pay for is a button with `aria-disabled` that still answers a tap with
  the reason as a toast.
- The door tests in `tests/ui/app.test.ts` check that the gallery and town doors open, not what
  they show, so lanes B and C can fill them without touching this lane's tests.
- Item sale values are placeholders until the shop (S10).
- Open with Cody, none blocking: the level curve, three-hour tiers, speed-only mastery, and VT323
  digits beside Pixelify Sans letters.
