import type { Exercise } from '@/store'

export function exerciseNameById(exercises: Exercise[], id: string): string {
  return exercises.find((exercise) => exercise.id === id)?.name ?? id
}

export function filterExercisesByName(exercises: Exercise[], query: string): Exercise[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return exercises
  return exercises.filter((exercise) => exercise.name.toLowerCase().includes(normalized))
}
