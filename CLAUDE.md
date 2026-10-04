# CLAUDE.md

**Hearth & Harbour**: a single-player fantasy idle RPG for the phone (Melvor Idle with a walkable
town, a house to fill and short action dungeons). Cody's personal project; it replaces
`untitled-boomer-mmo`, which grew too tangled. Keeping this one small and legible is the point.

## Where the plan lives

The design, the session-by-session plan and the status are in the claude.ai Project ("Fantasy
AFK/ARPG"): `claude/START-HERE.md`, `claude/status.md`, `claude/plan.md`, `claude/design.md`. Read
START-HERE, then the status, then only your session's brief. Update `status.md` when a session
ends. In this repo: `docs/style-guide.md` (art direction, read before drawing or styling
anything) and `docs/art-reference/town-mockup.html` (the approved mock-up, with the pixel engine to
harvest in S7).

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

## Rules

- **No runtime dependencies, no framework, no game engine.** Menus are plain DOM through
  `src/ui/dom.ts`; scenes are Canvas 2D.
- **Time is passed in, never read.** Core takes `now` or `ms` as an argument, so live play, offline
  catch-up and tests run the same code. `advance(state, ms, content)` in `src/core/actions.ts` is
  the only way time passes. It works in whole completions by arithmetic, never a loop of ticks, and
  `advance(a)` then `advance(b)` must equal `advance(a + b)`: keep that test passing. Anything that
  changes an action as it runs (mastery does: it shortens the time) must change it only on a
  completion and in whole milliseconds, and `advance` spends the time in stretches between changes.
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
