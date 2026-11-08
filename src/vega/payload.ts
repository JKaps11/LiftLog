import { isSetLogged, isTimedSet } from '@/store'
import type { Exercise, ExportedData, Session, SessionSet } from '@/store'

/**
 * The export as Vega reads it: finished Sessions only, carrying only the Sets
 * that were performed and that Vega can read.
 *
 * Vega refuses a whole export when any one Set is not something it reads,
 * because a partial copy of the record reads as the whole one. A full export
 * can hold several such things, all normal here, so they are left out of the
 * payload (never deleted from the device):
 *
 * - The in-progress Session (ADR-0004). It is left out entirely, Pending Sets
 *   and all, and reaches Vega once it ends.
 * - A Set the Exercise says was not performed (isSetLogged): a Pending Set, or a
 *   half-entered one, which endSession keeps on purpose. For a weighted Exercise
 *   that is a weight with no reps, or reps with no weight.
 * - A Set of a deleted Exercise that is missing a measurement of its shape. Its
 *   shape comes from isTimedSet, as it does on screen, and it needs the same
 *   measurements a known Exercise's Set would: a duration, or both weight and
 *   reps. So reps with no weight is dropped whether the Exercise exists or not.
 * - A Set with a number Vega cannot read: reps or a duration that is not a whole
 *   number, zero or more, or a weight that is not a finite number, zero or more.
 *   A typed 7.5 reps or -5 kg would otherwise make Vega refuse every sync.
 *
 * A Set that is sent goes in the shape isTimedSet gives it (ADR-0005), so a
 * timed Set never carries stray reps and the other way round.
 *
 * @param data - The full export, as Store.exportData produces it.
 * @returns The same export with only finished Sessions and sendable Sets.
 */
export function payloadForVega(data: ExportedData): ExportedData {
  const exercisesById = new Map(data.exercises.map((exercise) => [exercise.id, exercise]))
  return {
    ...data,
    sessions: data.sessions
      .filter((session) => session.endTime !== null)
      .map((session) => withPerformedSets(session, exercisesById)),
  }
}

function withPerformedSets(session: Session, exercisesById: Map<string, Exercise>): Session {
  return {
    ...session,
    exercises: session.exercises.map((entry) => {
      const exercise = exercisesById.get(entry.exerciseId)
      return {
        ...entry,
        sets: entry.sets.flatMap((set) => {
          const sent = performedSet(exercise, set)
          return sent === null ? [] : [sent]
        }),
      }
    }),
  }
}

function performedSet(exercise: Exercise | undefined, set: SessionSet): SessionSet | null {
  if (!isSetLogged(exercise, set)) return null
  const side = set.side === undefined ? {} : { side: set.side }
  if (isTimedSet(exercise, set)) {
    return isCount(set.durationSeconds) ? { durationSeconds: set.durationSeconds, ...side } : null
  }
  return isCount(set.reps) && isLoad(set.weight)
    ? { reps: set.reps, weight: set.weight, ...side }
    : null
}

/** Vega's rule for reps and durations: a whole number, zero included (a failed Set is 0 reps). */
function isCount(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value >= 0
}

/** Vega's rule for a weight: any finite number, zero or more, since plates come in fractions. */
function isLoad(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= 0
}
