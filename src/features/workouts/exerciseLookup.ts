import { MUSCLE_GROUPS, type Exercise, type ExerciseType, type MuscleGroup } from '@/store'

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  neck: 'Neck',
}

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  strength: 'Strength',
  stretch: 'Stretch',
  mobility: 'Mobility',
}

/**
 * deleteExercise prunes the Exercise from every Workout, so an unresolvable id
 * should not occur — but data written before that cascade existed (or a
 * hand-edited import) can still carry one. Name it as deleted rather than
 * leaking the raw uuid into the UI, which reads as a corrupted Exercise.
 */
export const DELETED_EXERCISE_LABEL = 'Deleted exercise'

export function exerciseNameById(exercises: Exercise[], id: string): string {
  return exercises.find((exercise) => exercise.id === id)?.name ?? DELETED_EXERCISE_LABEL
}

export function filterExercisesByName(exercises: Exercise[], query: string): Exercise[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return exercises
  return exercises.filter((exercise) => exercise.name.toLowerCase().includes(normalized))
}

export type ExerciseTypeFilter = ExerciseType | 'all'

export function filterExercisesByType(
  exercises: Exercise[],
  type: ExerciseTypeFilter
): Exercise[] {
  if (type === 'all') return exercises
  return exercises.filter((exercise) => exercise.type === type)
}

export interface ExerciseGroup {
  muscleGroup: MuscleGroup
  exercises: Exercise[]
}

/**
 * Buckets by primaryMuscleGroup in MUSCLE_GROUPS' fixed declared order (not
 * alphabetical), so related groups (e.g. Biceps/Triceps) stay adjacent.
 * Groups with no matching exercises are omitted rather than rendered empty.
 * Callers should filter (e.g. by name) before grouping, not after.
 */
export function groupExercisesByMuscleGroup(exercises: Exercise[]): ExerciseGroup[] {
  return MUSCLE_GROUPS.map((muscleGroup) => ({
    muscleGroup,
    exercises: exercises.filter((exercise) => exercise.primaryMuscleGroup === muscleGroup),
  })).filter((group) => group.exercises.length > 0)
}
