import { beforeEach, describe, expect, it } from 'vitest'
import { Store, type ExerciseTable, type Exercise } from './index'
import EXERCISE_SEED from '@/data/exerciseSeed.json'

function createInMemoryExerciseTable(): ExerciseTable {
  const rows = new Map<string, Exercise>()
  return {
    async count() {
      return rows.size
    },
    async toArray() {
      return [...rows.values()]
    },
    async get(id) {
      return rows.get(id)
    },
    async add(exercise) {
      rows.set(exercise.id, exercise)
      return exercise.id
    },
    async put(exercise) {
      rows.set(exercise.id, exercise)
      return exercise.id
    },
    async delete(id) {
      rows.delete(id)
    },
    async bulkAdd(exercises) {
      for (const exercise of exercises) rows.set(exercise.id, exercise)
      return exercises.at(-1)?.id
    },
  }
}

describe('Store', () => {
  let exercises: ExerciseTable
  let store: Store

  beforeEach(() => {
    exercises = createInMemoryExerciseTable()
    store = new Store({ exercises })
  })

  it('is constructible in isolation, with no DOM or browser APIs required', () => {
    expect(store).toBeInstanceOf(Store)
  })

  describe('seedExercisesIfEmpty', () => {
    it('seeds the bundled exercise list when the table is empty', async () => {
      await store.seedExercisesIfEmpty()

      const all = await store.listExercises()
      expect(all).toHaveLength(EXERCISE_SEED.length)
      expect(all.map((e) => e.name).sort()).toEqual([...EXERCISE_SEED].sort())
    })

    it('does not duplicate when called concurrently (e.g. StrictMode double-invoked effects)', async () => {
      await Promise.all([store.seedExercisesIfEmpty(), store.seedExercisesIfEmpty()])

      const all = await store.listExercises()
      expect(all).toHaveLength(EXERCISE_SEED.length)
    })

    it('does not re-seed or duplicate on a later call', async () => {
      await store.seedExercisesIfEmpty()
      const custom = await store.createExercise('My Custom Move')

      await store.seedExercisesIfEmpty()

      const all = await store.listExercises()
      expect(all).toHaveLength(EXERCISE_SEED.length + 1)
      expect(all.filter((e) => e.id === custom.id)).toHaveLength(1)
    })

    it('does not re-seed on a later app launch (a fresh Store over the same table)', async () => {
      await store.seedExercisesIfEmpty()

      const relaunchedStore = new Store({ exercises })
      await relaunchedStore.seedExercisesIfEmpty()

      const all = await relaunchedStore.listExercises()
      expect(all).toHaveLength(EXERCISE_SEED.length)
    })
  })

  describe('createExercise', () => {
    it('adds a new exercise with just a name', async () => {
      const exercise = await store.createExercise('Bench Press')

      expect(exercise.name).toBe('Bench Press')
      expect(exercise.id).toBeTruthy()
      expect(await store.listExercises()).toEqual([exercise])
    })

    it('trims whitespace from the name', async () => {
      const exercise = await store.createExercise('  Squat  ')
      expect(exercise.name).toBe('Squat')
    })

    it('rejects an empty name', async () => {
      await expect(store.createExercise('   ')).rejects.toThrow()
    })
  })

  describe('renameExercise', () => {
    it('updates the name of an existing exercise', async () => {
      const exercise = await store.createExercise('Bemch Press')

      const renamed = await store.renameExercise(exercise.id, 'Bench Press')

      expect(renamed.id).toBe(exercise.id)
      expect(renamed.name).toBe('Bench Press')
      expect(await store.listExercises()).toEqual([renamed])
    })

    it('rejects renaming a nonexistent exercise', async () => {
      await expect(store.renameExercise('missing-id', 'New Name')).rejects.toThrow()
    })

    it('rejects an empty name', async () => {
      const exercise = await store.createExercise('Bench Press')
      await expect(store.renameExercise(exercise.id, '   ')).rejects.toThrow()
    })
  })

  describe('deleteExercise', () => {
    it('removes the exercise from the list', async () => {
      const exercise = await store.createExercise('Deadlift')

      await store.deleteExercise(exercise.id)

      expect(await store.listExercises()).toEqual([])
    })
  })
})
