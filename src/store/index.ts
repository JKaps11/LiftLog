import EXERCISE_SEED from '@/data/exerciseSeed.json'
import type { EntityTable } from './table'
import type { Exercise, Workout } from './types'

export type { Exercise, Workout } from './types'
export type { EntityTable } from './table'

export interface StoreDeps {
  exercises: EntityTable<Exercise>
  workouts: EntityTable<Workout>
}

export function isSamePermutation(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((value, i) => value === sortedB[i])
}

export class Store {
  private readonly exercises: EntityTable<Exercise>
  private readonly workouts: EntityTable<Workout>
  private seedPromise: Promise<void> | null = null

  constructor(deps: StoreDeps) {
    this.exercises = deps.exercises
    this.workouts = deps.workouts
  }

  /**
   * Seeds the bundled common-exercise list, but only if the table is currently
   * empty. Concurrent calls (e.g. React StrictMode double-invoking an effect)
   * share a single in-flight seed instead of racing each other's empty-check.
   */
  async seedExercisesIfEmpty(): Promise<void> {
    if (!this.seedPromise) {
      this.seedPromise = this.performSeedIfEmpty().catch((error: unknown) => {
        this.seedPromise = null
        throw error
      })
    }
    return this.seedPromise
  }

  private async performSeedIfEmpty(): Promise<void> {
    const count = await this.exercises.count()
    if (count > 0) return
    const seeded: Exercise[] = EXERCISE_SEED.map((name) => ({
      id: crypto.randomUUID(),
      name,
    }))
    await this.exercises.bulkAdd(seeded)
  }

  async listExercises(): Promise<Exercise[]> {
    const all = await this.exercises.toArray()
    return all.sort((a, b) => a.name.localeCompare(b.name))
  }

  async createExercise(name: string): Promise<Exercise> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Exercise name cannot be empty')
    const exercise: Exercise = { id: crypto.randomUUID(), name: trimmed }
    await this.exercises.add(exercise)
    return exercise
  }

  async renameExercise(id: string, name: string): Promise<Exercise> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Exercise name cannot be empty')
    const existing = await this.exercises.get(id)
    if (!existing) throw new Error(`Exercise not found: ${id}`)
    const updated: Exercise = { ...existing, name: trimmed }
    await this.exercises.put(updated)
    return updated
  }

  async deleteExercise(id: string): Promise<void> {
    await this.exercises.delete(id)
  }

  async listWorkouts(): Promise<Workout[]> {
    const all = await this.workouts.toArray()
    return all.sort((a, b) => a.name.localeCompare(b.name))
  }

  async createWorkout(name: string, exerciseIds: string[]): Promise<Workout> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Workout name cannot be empty')
    const workout: Workout = { id: crypto.randomUUID(), name: trimmed, exerciseIds: [...exerciseIds] }
    await this.workouts.add(workout)
    return workout
  }

  async updateWorkout(
    id: string,
    updates: { name?: string; exerciseIds?: string[] }
  ): Promise<Workout> {
    const existing = await this.workouts.get(id)
    if (!existing) throw new Error(`Workout not found: ${id}`)

    const name = updates.name !== undefined ? updates.name.trim() : existing.name
    if (!name) throw new Error('Workout name cannot be empty')

    const exerciseIds =
      updates.exerciseIds !== undefined ? [...updates.exerciseIds] : existing.exerciseIds

    const updated: Workout = { ...existing, name, exerciseIds }
    await this.workouts.put(updated)
    return updated
  }

  async deleteWorkout(id: string): Promise<void> {
    await this.workouts.delete(id)
  }

  async reorderWorkoutExercises(id: string, exerciseIds: string[]): Promise<Workout> {
    const existing = await this.workouts.get(id)
    if (!existing) throw new Error(`Workout not found: ${id}`)

    if (!isSamePermutation(existing.exerciseIds, exerciseIds)) {
      throw new Error(
        'reorderWorkoutExercises must be given the same set of Exercise ids, only reordered'
      )
    }

    const updated: Workout = { ...existing, exerciseIds: [...exerciseIds] }
    await this.workouts.put(updated)
    return updated
  }
}
