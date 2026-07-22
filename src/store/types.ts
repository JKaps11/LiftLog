export interface Exercise {
  id: string
  name: string
}

/** exerciseIds is an ordered list — order is significant and must be preserved. */
export interface Workout {
  id: string
  name: string
  exerciseIds: string[]
}

export interface SessionSet {
  weight: number
  reps: number
}

/**
 * exerciseNameAtLogTime is a denormalized fallback for display only — used when
 * the referenced Exercise has since been deleted. Prefer a live lookup by
 * exerciseId when the Exercise still exists (see resolveExerciseDisplayName).
 */
export interface SessionExerciseEntry {
  exerciseId: string
  exerciseNameAtLogTime: string
  sets: SessionSet[]
}

/**
 * workoutNameSnapshot and the exercises list are copied from the Workout at
 * creation time and never updated afterward (ADR-0001) — later edits to the
 * Workout must not retroactively change a Session.
 */
export interface Session {
  id: string
  workoutId: string
  workoutNameSnapshot: string
  exercises: SessionExerciseEntry[]
  startTime: string
  endTime: string | null
  notes: string
  date: string
}
