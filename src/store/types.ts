/** Declared order is the fixed display/grouping order used by exercise-browsing UI (not alphabetical). */
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'neck',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const EXERCISE_TYPES = ['strength', 'stretch', 'mobility'] as const

export type ExerciseType = (typeof EXERCISE_TYPES)[number]

/**
 * primaryMuscleGroup and type are independent axes (ADR-0002) — an Exercise's
 * muscle group doesn't change based on whether it's a Strength movement or a
 * Stretch, and vice versa. otherMuscleGroups is captured for exercises that
 * span more than one region, but has no dedicated filter UI yet.
 */
export interface Exercise {
  id: string
  name: string
  isUnilateral: boolean
  isTimed: boolean
  primaryMuscleGroup: MuscleGroup
  otherMuscleGroups: MuscleGroup[]
  type: ExerciseType
}

/** exerciseIds is an ordered list — order is significant and must be preserved. */
export interface Workout {
  id: string
  name: string
  exerciseIds: string[]
}

/**
 * side is present only on Sets logged against a unilateral Exercise; absent on plain Sets.
 * durationSeconds is present only on Sets logged against a timed Exercise, in which case
 * weight/reps are absent — the two shapes are mutually exclusive per Set.
 */
export interface SessionSet {
  weight?: number
  reps?: number
  durationSeconds?: number
  side?: 'left' | 'right'
}

export function emptySet(): SessionSet {
  return { weight: 0, reps: 0 }
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

/** The full local dataset, as produced by Store.exportData and consumed by Store.importData. */
export interface ExportedData {
  version: 1
  exercises: Exercise[]
  workouts: Workout[]
  sessions: Session[]
}
