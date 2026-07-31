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
 *
 * The measurement fields (weight, reps, durationSeconds) are present if and only
 * if the Set was actually performed (ADR-0004) — a Set carrying none of them is a
 * Pending Set. A weight of 0 is a real measurement (bodyweight work); an *absent*
 * weight is what means "not performed". Which measurements a Set is expected to
 * carry follows from its Exercise's isTimed flag, never from which fields happen
 * to be present (ADR-0005).
 */
export interface SessionSet {
  weight?: number
  reps?: number
  durationSeconds?: number
  side?: 'left' | 'right'
}

/**
 * Some subset of a Set's measurements — what a write claims, as opposed to a whole
 * Set. Excludes `side`, which is per-Set data rather than something measured.
 */
export type SetMeasurements = Partial<Pick<SessionSet, 'weight' | 'reps' | 'durationSeconds'>>

/** The measurement keys, so a write can walk them without restating them at each call site. */
export const MEASUREMENT_FIELDS = ['weight', 'reps', 'durationSeconds'] as const

/**
 * A Pending Set: present in a Session but not yet performed, so it carries no
 * measurements at all (ADR-0004). `side` is added separately by logSet where the
 * Exercise is unilateral — side is per-Set data, not a measurement.
 */
export function pendingSet(): SessionSet {
  return {}
}

/** Strips measurement keys whose value is absent, so "not performed" is a missing key rather than an explicit undefined. */
export function withoutAbsentMeasurements(set: SessionSet): SessionSet {
  const cleaned: SessionSet = {}
  if (set.side !== undefined) cleaned.side = set.side
  if (set.weight !== undefined) cleaned.weight = set.weight
  if (set.reps !== undefined) cleaned.reps = set.reps
  if (set.durationSeconds !== undefined) cleaned.durationSeconds = set.durationSeconds
  return cleaned
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
