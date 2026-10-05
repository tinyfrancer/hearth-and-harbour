# CLAUDE.md

**Hearth & Harbour**: a single-player fantasy idle RPG for the phone (Melvor Idle with a walkable
town, a house to fill and short action dungeons). Cody's personal project; it replaces
`untitled-boomer-mmo`, which grew too tangled. Keeping this one small and legible is the point.

## Where the plan lives

Everything a session needs is in this repo:

- `docs/lanes.md`: how the parallel lanes work, who owns which files, and the full briefs. **Read
  it next.**
- `docs/status/lane-a.md`, `lane-b.md`, `lane-c.md`: what each lane has done and does next.
- `docs/plan.md`: every session still to build. `docs/design.md`: what the game is.
- `docs/style-guide.md`: the art direction; read before drawing or styling anything.
- `docs/art-reference/town-mockup.html`: the approved mock-up, with the pixel engine to harvest.

## Commands

```bash
npm run dev      # dev server, http://localhost:5173
npm run check    # everything CI runs: lint, format:check, typecheck, test, build
npm run format   # prettier --write
npm run icons    # redraw the home-screen icons from scripts/make-icons.mjs
```

Run `npm run check` before every push. Work on a branch and open a PR; once CI passes, merge it
(Cody's standing rule). Merging to `main` deploys to Vercel (only `main` deploys).

## Layers

```
src/core/         pure game state and rules. Imports nothing outside itself. Fully unit-tested.
src/data/         skills, items, actions as tables. Imports core only.
src/persistence/  save service, migrations, export/import. Imports core only.
src/art/          all drawing. Knows nothing about the game.
src/ui/           HTML/CSS idle menus. May import everything above.
src/scene/        canvas town and dungeons (from S11). May import everything above.
```

ESLint enforces the arrows (`eslint.config.js`). Do not weaken those rules to make an import work.

## Lanes

Up to three sessions build at once, each in its own lane (`docs/lanes.md` has the rules and
briefs). A lane changes only what it owns:

| Lane          | Owns                                                                      | Its door into the app                                                          |
| ------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| A: idle rules | `src/core`, `src/data`, `src/persistence`, `src/ui`, and the save version | n/a                                                                            |
| B: art        | `src/art` (and `tests/art`)                                               | `icons.ts`, `portraits.ts`, `character.ts`, `town.ts`, `gallery.ts`, `art.css` |
| C: scenes     | `src/scene` (and `tests/scene`)                                           | `townView.ts`, `scene.css`                                                     |

Lanes B and C do not edit `src/ui/app.ts`, `src/ui/styles.css`, `src/main.ts`, `package.json` or
anything under `src/core`, `src/data` or `src/persistence`. If a lane needs a change outside what
it owns, it says so in its PR and its status file and lane A (or the orchestrator) makes it. Before
merging, rebase on `main` and run `npm run check` again.

## Rules

- **No runtime dependencies, no framework, no game engine.** Menus are plain DOM through
  `src/ui/dom.ts`; scenes are Canvas 2D.
- **Time is passed in, never read.** Core takes `now` or `ms` as an argument, so live play, offline
  catch-up and tests run the same code. `advance(state, ms, content)` in `src/core/actions.ts` is
  the only way time passes, and `advance(a)` then `advance(b)` must equal `advance(a + b)` exactly,
  as must a night away and the same night in 16 ms frames: keep those tests passing. It never loops
  over slices of time. An action is worked in whole completions by arithmetic; anything that
  changes an action as it runs (mastery does: it shortens the time) must change it only on a
  completion and in whole milliseconds, and `advance` spends the time in stretches between changes.
  A fight (`advanceFight`, `src/core/fight.ts`) goes by chance, so it is walked **event by event**
  (each blow, each respawn) in the order they fall, with an event at the very end of the time
  counted in it. Its dice are seeded (`src/core/rng.ts`), their state is in the save, and they are
  rolled only inside an event, in a fixed order, so the same events roll the same numbers however
  the time is cut. Nothing random anywhere else, and never `Math.random`.
- **Time away is `catchUp(state, awayMs, content)`** (`src/core/away.ts`): `advance` with a 24-hour
  cap and a report of the difference. A closed game is measured from `savedAt`; a page left in the
  background is the same rule, triggered by a gap of a minute between ticks. `savedAt` therefore
  means "the game has been paid up to here": every save stamps it, and nothing else may.
- **Core never imports the tables.** It defines their shapes (`src/core/content.ts`) and its rules
  take a `Content` argument; `src/data/` fills them in. New content is a row, not code.
- **State is immutable.** Every rule returns a new `GameState`; nothing edits one in place.
- **Screens are built once and updated in place.** A `View` (`src/ui/view.ts`) builds its DOM when
  shown and `update(state)` moves only bars and counts each frame. Rebuild (`render`) only when the
  structure changes: navigation, start/stop, a level-up.
- **Balance is held by simulation** (`tests/data/pacing.test.ts`). A new skill or tier adds a case
  there; changing a number that breaks one is a decision, not a fix-the-test.
- **A change to the save's shape or meaning** bumps `GAME_STATE_VERSION`, adds a step to
  `src/persistence/migrations.ts`, a check to `saveProblem` in `saveFile.ts`, and a test for each.
  A save the game cannot read is set aside, never deleted.
- **Art stays replaceable**: game code names things by id, never by picture; tap targets and
  collision are data, never measured from a sprite; colours are named once (`src/ui/styles.css` for
  menus, palette ramps for art). Placeholder art until the scheduled art passes.
- **No browser dialogs** (`alert`, `confirm`): destructive actions confirm with a second tap inline.
- **Harvest rule**: copy from `untitled-boomer-mmo` only what the session needs, trimmed to what is
  used, and say so in a comment at the top of the file.
- Tests live in `tests/`, mirroring `src/`. UI tests drive the real app in jsdom the way a thumb
  would (`tests/ui/app.test.ts`).
- Comments say why, not what. British spelling in player-facing text.
- **Lore is Claude's to write and Cody's to discover**: never retell story in a PR or summary; name
  the parts touched, not what they say.
- Phone first: portrait, one thumb, 48px tap targets, inputs at 16px or more (smaller makes iPhones
  zoom), safe-area insets respected.
