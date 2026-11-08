import { isSetLogged } from '@/store'
import type { Exercise, ExportedData, Session, SessionSet } from '@/store'

/**
 * The export as Vega reads it: finished Sessions only, carrying only the Sets
 * that were actually performed.
 *
 * Vega refuses a whole export when any Set has neither reps nor a duration,
 * because a partial copy of the record reads as the whole one. A full export
 * can contain two things like that, and both are normal here:
 *
 * - The in-progress Session's Pending Sets (ADR-0004). It is left out
 *   entirely and reaches Vega once it ends.
 * - A half-entered Set (a weight with no reps), which endSession keeps on
 *   purpose. Vega has no use for it, so it is left out of the payload, not
 *   deleted from the device.
 *
 * A performed Set is sent in the shape its Exercise says it has (ADR-0005), so
 * a timed Set never carries stray reps and the other way round.
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
  // A deleted Exercise leaves only the Set itself to say which shape it was.
  const isTimed = exercise?.isTimed ?? (set.durationSeconds !== undefined && set.reps === undefined)
  if (isTimed) {
    return set.durationSeconds === undefined ? null : { durationSeconds: set.durationSeconds, ...side }
  }
  if (set.reps === undefined) return null
  return { reps: set.reps, ...(set.weight === undefined ? {} : { weight: set.weight }), ...side }
}
