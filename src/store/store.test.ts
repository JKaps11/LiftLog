import { beforeEach, describe, expect, it } from 'vitest'
import { Store, type Exercise, type Workout } from './index'
import type { EntityTable } from './table'
import EXERCISE_SEED from '@/data/exerciseSeed.json'

function createInMemoryTable<T extends { id: string }>(): EntityTable<T> {
  const rows = new Map<string, T>()
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
    async add(entity) {
      rows.set(entity.id, entity)
      return entity.id
    },
    async put(entity) {
      rows.set(entity.id, entity)
      return entity.id
    },
    async delete(id) {
      rows.delete(id)
    },
    async bulkAdd(entities) {
      for (const entity of entities) rows.set(entity.id, entity)
      return entities.at(-1)?.id
    },
  }
}

describe('Store', () => {
  let exercises: EntityTable<Exercise>
  let workouts: EntityTable<Workout>
  let store: Store

  beforeEach(() => {
    exercises = createInMemoryTable<Exercise>()
    workouts = createInMemoryTable<Workout>()
    store = new Store({ exercises, workouts })
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

      const relaunchedStore = new Store({ exercises, workouts })
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

  describe('createWorkout', () => {
    it('creates a Workout with a name and preserves Exercise order as stored/retrieved', async () => {
      const bench = await store.createExercise('Bench Press')
      const ohp = await store.createExercise('Overhead Press')
      const dips = await store.createExercise('Dips')

      const workout = await store.createWorkout('Push Day', [bench.id, ohp.id, dips.id])

      expect(workout.name).toBe('Push Day')
      expect(workout.exerciseIds).toEqual([bench.id, ohp.id, dips.id])

      const [reloaded] = await store.listWorkouts()
      expect(reloaded.exerciseIds).toEqual([bench.id, ohp.id, dips.id])
    })

    it('rejects an empty name', async () => {
      await expect(store.createWorkout('   ', [])).rejects.toThrow()
    })
  })

  describe('listWorkouts', () => {
    it('lists all Workouts', async () => {
      await store.createWorkout('Push Day', [])
      await store.createWorkout('Pull Day', [])

      const all = await store.listWorkouts()
      expect(all.map((w) => w.name).sort()).toEqual(['Pull Day', 'Push Day'])
    })
  })

  describe('updateWorkout', () => {
    it('updates the name of an existing Workout', async () => {
      const workout = await store.createWorkout('Leg Day', [])

      const updated = await store.updateWorkout(workout.id, { name: 'Leg Day (Heavy)' })

      expect(updated.id).toBe(workout.id)
      expect(updated.name).toBe('Leg Day (Heavy)')
    })

    it('updates the Exercise list (add/remove), preserving the given order', async () => {
      const squat = await store.createExercise('Squat')
      const lunge = await store.createExercise('Lunge')
      const calfRaise = await store.createExercise('Calf Raise')
      const workout = await store.createWorkout('Leg Day', [squat.id, lunge.id])

      const updated = await store.updateWorkout(workout.id, {
        exerciseIds: [lunge.id, calfRaise.id],
      })

      expect(updated.exerciseIds).toEqual([lunge.id, calfRaise.id])
    })

    it('leaves fields unspecified in the update untouched', async () => {
      const squat = await store.createExercise('Squat')
      const workout = await store.createWorkout('Leg Day', [squat.id])

      const updated = await store.updateWorkout(workout.id, { name: 'Leg Day (Heavy)' })

      expect(updated.exerciseIds).toEqual([squat.id])
    })

    it('rejects updating a nonexistent Workout', async () => {
      await expect(store.updateWorkout('missing-id', { name: 'New Name' })).rejects.toThrow()
    })

    it('rejects an empty name', async () => {
      const workout = await store.createWorkout('Leg Day', [])
      await expect(store.updateWorkout(workout.id, { name: '   ' })).rejects.toThrow()
    })
  })

  describe('deleteWorkout', () => {
    it('removes the Workout from the list', async () => {
      const workout = await store.createWorkout('Leg Day', [])

      await store.deleteWorkout(workout.id)

      expect(await store.listWorkouts()).toEqual([])
    })
  })

  describe('reorderWorkoutExercises', () => {
    it('reorders the Exercises within a Workout, preserving the new order as stored/retrieved', async () => {
      const bench = await store.createExercise('Bench Press')
      const ohp = await store.createExercise('Overhead Press')
      const dips = await store.createExercise('Dips')
      const workout = await store.createWorkout('Push Day', [bench.id, ohp.id, dips.id])

      const reordered = await store.reorderWorkoutExercises(workout.id, [
        dips.id,
        bench.id,
        ohp.id,
      ])

      expect(reordered.exerciseIds).toEqual([dips.id, bench.id, ohp.id])
      const [reloaded] = await store.listWorkouts()
      expect(reloaded.exerciseIds).toEqual([dips.id, bench.id, ohp.id])
    })

    it('rejects a reorder that does not contain exactly the same set of Exercise ids', async () => {
      const bench = await store.createExercise('Bench Press')
      const ohp = await store.createExercise('Overhead Press')
      const workout = await store.createWorkout('Push Day', [bench.id, ohp.id])

      await expect(store.reorderWorkoutExercises(workout.id, [bench.id])).rejects.toThrow()
    })

    it('rejects reordering a nonexistent Workout', async () => {
      await expect(store.reorderWorkoutExercises('missing-id', [])).rejects.toThrow()
    })
  })
})
