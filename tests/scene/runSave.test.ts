import { describe, expect, it } from 'vitest';
import { spoilsOf } from '../../src/scene/battle';
import { advanceRun, type Run } from '../../src/scene/dungeon';
import { RUN_SCENE_VERSION, restoreRun, savedRunOf, snapshotRun } from '../../src/scene/runSave';
import { begin, decide, GROTTO_DUNGEON, prepared } from './grottoBot';

// A run as plain data for a save (lane A's design): what JSON keeps, read back,
// goes on exactly as the run would have. No save is wired here; that is lane A's.

/** The scripted hero's tenth of a second: a decision, then the time. */
const step = (run: Run): Run => {
  const decided = decide(run);
  return advanceRun(GROTTO_DUNGEON, decided, decided.play, 100);
};

/** Through JSON and back, as a save would keep it. */
const throughJson = (run: Run): Run => restoreRun(JSON.parse(JSON.stringify(snapshotRun(run))))!;

/** Plays on until `until` says so, or the run ends. */
function playUntil(run: Run, until: (r: Run) => boolean, most = 12_000): Run {
  for (let i = 0; i < most && !run.finished && !until(run); i++) run = step(run);
  return run;
}

describe('a run kept as plain data', () => {
  it('comes back whole through JSON, infinities and all', () => {
    const run = playUntil(begin(prepared(), 7), (r) => r.ms >= 20_000);
    expect(run.battle!.struckAt).toBe(-Infinity);
    const back = throughJson(run);
    expect(back).toEqual(run);
    expect(back.battle!.struckAt).toBe(-Infinity);
  });

  it('goes on after being restored exactly as the run would have, dice and all', () => {
    let inAir = 0;
    for (const seed of [1, 5, 9]) {
      // Stopped with the parrot in the air (its round's end is Infinity), mid-fight on the bridge.
      let run = playUntil(
        begin(prepared(), seed),
        (r) =>
          r.room === 'bridge' &&
          !!r.battle?.foes.some((f) => f.flight && f.flight.until === Infinity),
      );
      if (run.room === 'bridge') inAir++;
      else run = playUntil(begin(prepared(), seed), (r) => r.ms >= 60_000);
      let restored = throughJson(run);
      for (let i = 0; i < 600 && !run.finished; i++) {
        run = step(run);
        restored = step(restored);
      }
      expect(restored).toEqual(run);
      expect(restored.battle!.seed).toBe(run.battle!.seed);
    }
    expect(inAir).toBeGreaterThan(0);
  });

  it('is well under the save’s cap, and keeps the spoils so far beside it', () => {
    const run = playUntil(begin(prepared(), 3), (r) => r.room === 'brig');
    const saved = savedRunOf(run);
    expect(saved.dungeon).toBe('brinebeards_grotto');
    expect(saved.scene).toBe(RUN_SCENE_VERSION);
    expect(saved.spoils).toEqual(spoilsOf(run.battle!));
    expect(JSON.stringify(saved).length).toBeLessThan(256 * 1024);
  });

  it('is not taken up from another version of its shape, or from anything that is not a run', () => {
    const data = snapshotRun(begin(prepared(), 2));
    expect(restoreRun(data, RUN_SCENE_VERSION + 1)).toBeNull();
    for (const bad of [null, 3, 'run', [], {}, { dungeon: 'x' }, { ...(data as object), play: 1 }])
      expect(restoreRun(bad)).toBeNull();
    expect(restoreRun({ ...(data as object), ms: { $n: 'nothing' } })).toBeNull();
    expect(restoreRun(data)).not.toBeNull();
  });
});
