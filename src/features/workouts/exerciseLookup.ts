import type { Exercise } from '@/store'

export function exerciseNameById(exercises: Exercise[], id: string): string {
  return exercises.find((exercise) => exercise.id === id)?.name ?? id
}
