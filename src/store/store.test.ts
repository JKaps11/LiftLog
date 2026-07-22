import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Store, resolveExerciseDisplayName, type Exercise, type Session, type Workout } from './index'
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
  let sessions: EntityTable<Session>
  let store: Store

  beforeEach(() => {
    exercises = createInMemoryTable<Exercise>()
    workouts = createInMemoryTable<Workout>()
    sessions = createInMemoryTable<Session>()
    store = new Store({ exercises, workouts, sessions })
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

      const relaunchedStore = new Store({ exercises, workouts, sessions })
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

  describe('startSession', () => {
    it('snapshots the Workout name and Exercise list, denormalizing each Exercise name, with empty sets when there is no prior Session', async () => {
      const bench = await store.createExercise('Bench Press')
      const ohp = await store.createExercise('Overhead Press')
      const workout = await store.createWorkout('Push Day', [bench.id, ohp.id])

      const session = await store.startSession(workout.id)

      expect(session.workoutId).toBe(workout.id)
      expect(session.workoutNameSnapshot).toBe('Push Day')
      expect(session.exercises).toEqual([
        { exerciseId: bench.id, exerciseNameAtLogTime: 'Bench Press', sets: [] },
        { exerciseId: ohp.id, exerciseNameAtLogTime: 'Overhead Press', sets: [] },
      ])
      expect(session.startTime).toBeTruthy()
      expect(session.endTime).toBeNull()
      expect(session.notes).toBe('')
    })

    it('pre-fills each Exercise with sets from the most recent prior Session for the same Workout', async () => {
      const bench = await store.createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])

      const first = await store.startSession(workout.id)
      await store.logSet(first.id, bench.id, { weight: 135, reps: 8 })
      await store.logSet(first.id, bench.id, { weight: 155, reps: 5 })

      const second = await store.startSession(workout.id)

      expect(second.exercises).toEqual([
        {
          exerciseId: bench.id,
          exerciseNameAtLogTime: 'Bench Press',
          sets: [
            { weight: 135, reps: 8 },
            { weight: 155, reps: 5 },
          ],
        },
      ])
    })

    it('rejects starting a Session for a nonexistent Workout', async () => {
      await expect(store.startSession('missing-id')).rejects.toThrow()
    })
  })

  describe('logSet', () => {
    it('appends a new Set to the given Exercise within the Session', async () => {
      const bench = await store.createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      const updated = await store.logSet(session.id, bench.id, { weight: 135, reps: 8 })

      expect(updated.exercises[0].sets).toEqual([{ weight: 135, reps: 8 }])
    })

    it('rejects logging a Set for a nonexistent Session', async () => {
      await expect(
        store.logSet('missing-id', 'exercise-id', { weight: 100, reps: 5 })
      ).rejects.toThrow()
    })

    it('rejects logging a Set for an Exercise not part of the Session', async () => {
      const workout = await store.createWorkout('Push Day', [])
      const session = await store.startSession(workout.id)

      await expect(
        store.logSet(session.id, 'missing-exercise-id', { weight: 100, reps: 5 })
      ).rejects.toThrow()
    })
  })

  describe('updateSet', () => {
    it('updates the weight/reps of an existing Set', async () => {
      const bench = await store.createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)
      const logged = await store.logSet(session.id, bench.id, { weight: 135, reps: 8 })

      const updated = await store.updateSet(logged.id, bench.id, 0, { weight: 145, reps: 6 })

      expect(updated.exercises[0].sets).toEqual([{ weight: 145, reps: 6 }])
    })

    it('rejects updating a Set at an out-of-range index', async () => {
      const bench = await store.createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      await expect(
        store.updateSet(session.id, bench.id, 0, { weight: 145, reps: 6 })
      ).rejects.toThrow()
    })

    it('rejects updating a Set for a nonexistent Session', async () => {
      await expect(
        store.updateSet('missing-id', 'exercise-id', 0, { weight: 100, reps: 5 })
      ).rejects.toThrow()
    })
  })

  describe('endSession', () => {
    it('records an end time', async () => {
      const workout = await store.createWorkout('Push Day', [])
      const session = await store.startSession(workout.id)

      const ended = await store.endSession(session.id)

      expect(ended.endTime).toBeTruthy()
    })

    it('rejects ending a nonexistent Session', async () => {
      await expect(store.endSession('missing-id')).rejects.toThrow()
    })
  })

  describe('updateSessionNotes', () => {
    it('sets the free-text notes on a Session', async () => {
      const workout = await store.createWorkout('Push Day', [])
      const session = await store.startSession(workout.id)

      const updated = await store.updateSessionNotes(session.id, 'Felt strong today')

      expect(updated.notes).toBe('Felt strong today')
    })

    it('rejects updating notes for a nonexistent Session', async () => {
      await expect(store.updateSessionNotes('missing-id', 'notes')).rejects.toThrow()
    })
  })

  describe('getLastSessionForWorkout', () => {
    it('returns undefined when no prior Session exists for the Workout', async () => {
      const workout = await store.createWorkout('Push Day', [])
      expect(await store.getLastSessionForWorkout(workout.id)).toBeUndefined()
    })

    it('returns the most recent prior Session, ignoring Sessions for other Workouts', async () => {
      vi.useFakeTimers()
      try {
        const pushDay = await store.createWorkout('Push Day', [])
        const pullDay = await store.createWorkout('Pull Day', [])

        const first = await store.startSession(pushDay.id)
        vi.setSystemTime(new Date(Date.now() + 1000))
        await store.startSession(pullDay.id)
        vi.setSystemTime(new Date(Date.now() + 1000))
        const second = await store.startSession(pushDay.id)

        const last = await store.getLastSessionForWorkout(pushDay.id)

        expect(last?.id).toBe(second.id)
        expect(last?.id).not.toBe(first.id)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('ADR-0001: Sessions snapshot their Workout, independent of later edits', () => {
    it('does not change a past Session when the Workout is renamed or its Exercises edited afterward', async () => {
      const bench = await store.createExercise('Bench Press')
      const ohp = await store.createExercise('Overhead Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      await store.updateWorkout(workout.id, { name: 'Push Day (Heavy)', exerciseIds: [ohp.id] })

      const reloadedSession = await store.getLastSessionForWorkout(workout.id)
      expect(reloadedSession?.id).toBe(session.id)
      expect(reloadedSession?.workoutNameSnapshot).toBe('Push Day')
      expect(reloadedSession?.exercises.map((e) => e.exerciseId)).toEqual([bench.id])
    })
  })

  describe('deleteSet', () => {
    it('removes a Set at the given index from an Exercise within a Session', async () => {
      const bench = await store.createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)
      await store.logSet(session.id, bench.id, { weight: 135, reps: 8 })
      const logged = await store.logSet(session.id, bench.id, { weight: 145, reps: 6 })

      const updated = await store.deleteSet(logged.id, bench.id, 0)

      expect(updated.exercises[0].sets).toEqual([{ weight: 145, reps: 6 }])
    })

    it('rejects deleting a Set at an out-of-range index', async () => {
      const bench = await store.createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      await expect(store.deleteSet(session.id, bench.id, 0)).rejects.toThrow()
    })

    it('rejects deleting a Set for a nonexistent Session', async () => {
      await expect(store.deleteSet('missing-id', 'exercise-id', 0)).rejects.toThrow()
    })
  })

  describe('updateSessionTimes', () => {
    it('updates the start and/or end time of a Session', async () => {
      const workout = await store.createWorkout('Push Day', [])
      const session = await store.startSession(workout.id)

      const updated = await store.updateSessionTimes(session.id, {
        startTime: '2026-01-01T10:00:00.000Z',
        endTime: '2026-01-01T11:00:00.000Z',
      })

      expect(updated.startTime).toBe('2026-01-01T10:00:00.000Z')
      expect(updated.endTime).toBe('2026-01-01T11:00:00.000Z')
    })

    it('leaves fields unspecified in the update untouched', async () => {
      const workout = await store.createWorkout('Push Day', [])
      const session = await store.startSession(workout.id)
      const ended = await store.endSession(session.id, '2026-01-01T11:00:00.000Z')

      const updated = await store.updateSessionTimes(ended.id, {
        startTime: '2026-01-01T10:00:00.000Z',
      })

      expect(updated.startTime).toBe('2026-01-01T10:00:00.000Z')
      expect(updated.endTime).toBe('2026-01-01T11:00:00.000Z')
    })

    it('rejects updating times for a nonexistent Session', async () => {
      await expect(
        store.updateSessionTimes('missing-id', { startTime: '2026-01-01T10:00:00.000Z' })
      ).rejects.toThrow()
    })

    it('keeps date in sync with a changed startTime', async () => {
      const workout = await store.createWorkout('Push Day', [])
      const session = await store.startSession(workout.id)

      const updated = await store.updateSessionTimes(session.id, {
        startTime: '2026-01-01T10:00:00.000Z',
      })

      expect(updated.date).toBe('2026-01-01T10:00:00.000Z')
    })
  })

  describe('listSessions', () => {
    it('lists all Sessions, most recently started first', async () => {
      vi.useFakeTimers()
      try {
        const pushDay = await store.createWorkout('Push Day', [])
        const pullDay = await store.createWorkout('Pull Day', [])
        const first = await store.startSession(pushDay.id)
        vi.setSystemTime(new Date(Date.now() + 1000))
        const second = await store.startSession(pullDay.id)

        const all = await store.listSessions()

        expect(all.map((s) => s.id)).toEqual([second.id, first.id])
      } finally {
        vi.useRealTimers()
      }
    })

    it('returns an empty list when there are no Sessions', async () => {
      expect(await store.listSessions()).toEqual([])
    })
  })

  describe('deleteSession', () => {
    it('removes the Session from the list', async () => {
      const workout = await store.createWorkout('Push Day', [])
      const session = await store.startSession(workout.id)

      await store.deleteSession(session.id)

      expect(await store.listSessions()).toEqual([])
    })
  })

  describe('resolveExerciseDisplayName', () => {
    it('prefers the live Exercise name when the Exercise still exists (renames follow through to past Sessions)', async () => {
      const bench = await store.createExercise('Bemch Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      const renamed = await store.renameExercise(bench.id, 'Bench Press')

      const allExercises = await store.listExercises()
      expect(resolveExerciseDisplayName(allExercises, session.exercises[0])).toBe('Bench Press')
      expect(renamed.name).toBe('Bench Press')
    })

    it('falls back to the denormalized name captured at log time when the Exercise has been deleted', async () => {
      const bench = await store.createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      await store.deleteExercise(bench.id)

      const allExercises = await store.listExercises()
      expect(resolveExerciseDisplayName(allExercises, session.exercises[0])).toBe('Bench Press')
    })
  })
})
