import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '@/store'

export function exerciseNameById(exercises: Exercise[], id: string): string {
  return exercises.find((exercise) => exercise.id === id)?.name ?? id
}

export function filterExercisesByName(exercises: Exercise[], query: string): Exercise[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return exercises
  return exercises.filter((exercise) => exercise.name.toLowerCase().includes(normalized))
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
