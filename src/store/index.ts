import EXERCISE_SEED from '@/data/exerciseSeed.json'
import type { Exercise } from './types'

export type { Exercise } from './types'

/**
 * The persistence shape the Store needs for Exercises. Deliberately narrower
 * than Dexie's Table type so the Store stays independent of Dexie's API —
 * a Dexie Table satisfies this structurally, and tests can pass an in-memory
 * fake instead.
 */
export interface ExerciseTable {
  count(): Promise<number>
  toArray(): Promise<Exercise[]>
  get(id: string): Promise<Exercise | undefined>
  add(exercise: Exercise): Promise<unknown>
  put(exercise: Exercise): Promise<unknown>
  delete(id: string): Promise<void>
  bulkAdd(exercises: Exercise[]): Promise<unknown>
}

export interface StoreDeps {
  exercises: ExerciseTable
}

export class Store {
  private readonly exercises: ExerciseTable
  private seedPromise: Promise<void> | null = null

  constructor(deps: StoreDeps) {
    this.exercises = deps.exercises
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
}
