import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Store,
  isSetLogged,
  resolveExerciseDisplayName,
  pendingSet,
  EXERCISE_TYPES,
  MUSCLE_GROUPS,
  type Exercise,
  type Session,
  type Workout,
} from './index'
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
    async clear() {
      rows.clear()
    },
  }
}

/** Default categorization for tests that aren't exercising the categorization fields themselves. */
const DEFAULT_CATEGORIZATION = {
  primaryMuscleGroup: 'core' as const,
  type: 'strength' as const,
}

describe('Store', () => {
  let exercises: EntityTable<Exercise>
  let workouts: EntityTable<Workout>
  let sessions: EntityTable<Session>
  let store: Store

  function createExercise(
    name: string,
    options: Partial<Parameters<Store['createExercise']>[1]> = {}
  ) {
    return store.createExercise(name, { ...DEFAULT_CATEGORIZATION, ...options })
  }

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
      expect(all.map((e) => e.name).sort()).toEqual(EXERCISE_SEED.map((e) => e.name).sort())
    })

    it('does not duplicate when called concurrently (e.g. StrictMode double-invoked effects)', async () => {
      await Promise.all([store.seedExercisesIfEmpty(), store.seedExercisesIfEmpty()])

      const all = await store.listExercises()
      expect(all).toHaveLength(EXERCISE_SEED.length)
    })

    it('does not re-seed or duplicate on a later call', async () => {
      await store.seedExercisesIfEmpty()
      const custom = await createExercise('My Custom Move')

      await store.seedExercisesIfEmpty()

      const all = await store.listExercises()
      expect(all).toHaveLength(EXERCISE_SEED.length + 1)
      expect(all.filter((e) => e.id === custom.id)).toHaveLength(1)
    })

    it('marks each seeded exercise as timed/not-timed per its seed data', async () => {
      await store.seedExercisesIfEmpty()

      const all = await store.listExercises()
      const timedNames = all.filter((e) => e.isTimed).map((e) => e.name).sort()
      const expectedTimedNames = EXERCISE_SEED.filter((e) => e.isTimed).map((e) => e.name).sort()
      expect(timedNames).toEqual(expectedTimedNames)
      expect(timedNames).toEqual(expect.arrayContaining(['Plank', 'Side Plank', 'Wall Sit']))
    })

    it('does not re-seed on a later app launch (a fresh Store over the same table)', async () => {
      await store.seedExercisesIfEmpty()

      const relaunchedStore = new Store({ exercises, workouts, sessions })
      await relaunchedStore.seedExercisesIfEmpty()

      const all = await relaunchedStore.listExercises()
      expect(all).toHaveLength(EXERCISE_SEED.length)
    })

    it('gives every seeded exercise a populated primaryMuscleGroup and type, matching its seed data', async () => {
      await store.seedExercisesIfEmpty()

      const all = await store.listExercises()
      expect(all).toHaveLength(EXERCISE_SEED.length)
      for (const exercise of all) {
        expect(exercise.primaryMuscleGroup).toBeTruthy()
        expect(exercise.type).toBeTruthy()

        const seedEntry = EXERCISE_SEED.find((e) => e.name === exercise.name)
        expect(seedEntry).toBeTruthy()
        expect(exercise.primaryMuscleGroup).toBe(seedEntry?.primaryMuscleGroup)
        expect(exercise.type).toBe(seedEntry?.type)
        expect(exercise.otherMuscleGroups).toEqual(seedEntry?.otherMuscleGroups ?? [])
      }
    })

    it('gives every seed JSON entry a primaryMuscleGroup/type/otherMuscleGroups that are real MuscleGroup/ExerciseType values (catches typos in exerciseSeed.json)', () => {
      for (const entry of EXERCISE_SEED) {
        expect(MUSCLE_GROUPS).toContain(entry.primaryMuscleGroup)
        expect(EXERCISE_TYPES).toContain(entry.type)
        for (const group of entry.otherMuscleGroups ?? []) {
          expect(MUSCLE_GROUPS).toContain(group)
        }
      }
    })

    it('covers every muscle group with at least one Stretch and one Mobility seed exercise', async () => {
      await store.seedExercisesIfEmpty()

      const all = await store.listExercises()
      for (const muscleGroup of MUSCLE_GROUPS) {
        const forGroup = all.filter((e) => e.primaryMuscleGroup === muscleGroup)
        expect(forGroup.some((e) => e.type === 'stretch')).toBe(true)
        expect(forGroup.some((e) => e.type === 'mobility')).toBe(true)
      }
    })
  })

  describe('createExercise', () => {
    it('adds a new exercise with just a name', async () => {
      const exercise = await createExercise('Bench Press')

      expect(exercise.name).toBe('Bench Press')
      expect(exercise.id).toBeTruthy()
      expect(await store.listExercises()).toEqual([exercise])
    })

    it('trims whitespace from the name', async () => {
      const exercise = await createExercise('  Squat  ')
      expect(exercise.name).toBe('Squat')
    })

    it('rejects an empty name', async () => {
      await expect(createExercise('   ')).rejects.toThrow()
    })
  })

  describe('createExercise (isUnilateral)', () => {
    it('defaults isUnilateral to false when omitted', async () => {
      const exercise = await createExercise('Bench Press')
      expect(exercise.isUnilateral).toBe(false)
    })

    it('persists isUnilateral when passed', async () => {
      const exercise = await createExercise('Single Arm Row', { isUnilateral: true })
      expect(exercise.isUnilateral).toBe(true)
      expect(await store.listExercises()).toEqual([exercise])
    })
  })

  describe('createExercise (isTimed)', () => {
    it('defaults isTimed to false when omitted', async () => {
      const exercise = await createExercise('Plank')
      expect(exercise.isTimed).toBe(false)
    })

    it('persists isTimed when passed', async () => {
      const exercise = await createExercise('Plank', { isTimed: true })
      expect(exercise.isTimed).toBe(true)
      expect(await store.listExercises()).toEqual([exercise])
    })
  })

  describe('createExercise (categorization)', () => {
    it('persists primaryMuscleGroup and type', async () => {
      const exercise = await createExercise('Hamstring Stretch', {
        primaryMuscleGroup: 'hamstrings',
        type: 'stretch',
      })

      expect(exercise.primaryMuscleGroup).toBe('hamstrings')
      expect(exercise.type).toBe('stretch')
      expect(await store.listExercises()).toEqual([exercise])
    })

    it('defaults otherMuscleGroups to an empty array when omitted', async () => {
      const exercise = await createExercise('Deadlift', { primaryMuscleGroup: 'back' })
      expect(exercise.otherMuscleGroups).toEqual([])
    })

    it('persists otherMuscleGroups when passed', async () => {
      const exercise = await createExercise('Deadlift', {
        primaryMuscleGroup: 'back',
        otherMuscleGroups: ['hamstrings', 'glutes'],
      })

      expect(exercise.otherMuscleGroups).toEqual(['hamstrings', 'glutes'])
      expect(await store.listExercises()).toEqual([exercise])
    })
  })

  describe('updateExercise', () => {
    it('updates the name of an existing exercise', async () => {
      const exercise = await createExercise('Bemch Press')

      const renamed = await store.updateExercise(exercise.id, { name: 'Bench Press' })

      expect(renamed.id).toBe(exercise.id)
      expect(renamed.name).toBe('Bench Press')
      expect(await store.listExercises()).toEqual([renamed])
    })

    it('rejects renaming a nonexistent exercise', async () => {
      await expect(
        store.updateExercise('missing-id', { name: 'New Name' })
      ).rejects.toThrow()
    })

    it('rejects an empty name', async () => {
      const exercise = await createExercise('Bench Press')
      await expect(store.updateExercise(exercise.id, { name: '   ' })).rejects.toThrow()
    })

    it('toggles isUnilateral on an existing exercise, false to true', async () => {
      const exercise = await createExercise('Single Arm Row')

      const updated = await store.updateExercise(exercise.id, { isUnilateral: true })

      expect(updated.isUnilateral).toBe(true)
      expect(updated.name).toBe('Single Arm Row')
    })

    it('toggles isUnilateral on an existing exercise, true to false', async () => {
      const exercise = await createExercise('Single Arm Row', { isUnilateral: true })

      const updated = await store.updateExercise(exercise.id, { isUnilateral: false })

      expect(updated.isUnilateral).toBe(false)
    })

    it('leaves fields unspecified in the update untouched', async () => {
      const exercise = await createExercise('Single Arm Row', { isUnilateral: true })

      const updated = await store.updateExercise(exercise.id, { name: 'Single-Arm Row' })

      expect(updated.isUnilateral).toBe(true)
    })

    it('toggles isTimed on an existing exercise, false to true', async () => {
      const exercise = await createExercise('Plank')

      const updated = await store.updateExercise(exercise.id, { isTimed: true })

      expect(updated.isTimed).toBe(true)
      expect(updated.name).toBe('Plank')
    })

    it('toggles isTimed on an existing exercise, true to false', async () => {
      const exercise = await createExercise('Plank', { isTimed: true })

      const updated = await store.updateExercise(exercise.id, { isTimed: false })

      expect(updated.isTimed).toBe(false)
    })

    it('leaves isTimed untouched when unspecified in the update', async () => {
      const exercise = await createExercise('Plank', { isTimed: true })

      const updated = await store.updateExercise(exercise.id, { name: 'Plank Hold' })

      expect(updated.isTimed).toBe(true)
    })
  })

  describe('updateExercise (categorization)', () => {
    it('independently updates primaryMuscleGroup without disturbing type or otherMuscleGroups', async () => {
      const exercise = await createExercise('Hamstring Stretch', {
        primaryMuscleGroup: 'hamstrings',
        type: 'stretch',
        otherMuscleGroups: ['glutes'],
      })

      const updated = await store.updateExercise(exercise.id, { primaryMuscleGroup: 'glutes' })

      expect(updated.primaryMuscleGroup).toBe('glutes')
      expect(updated.type).toBe('stretch')
      expect(updated.otherMuscleGroups).toEqual(['glutes'])
    })

    it('independently updates type without disturbing primaryMuscleGroup or otherMuscleGroups', async () => {
      const exercise = await createExercise('Hamstring Stretch', {
        primaryMuscleGroup: 'hamstrings',
        type: 'stretch',
      })

      const updated = await store.updateExercise(exercise.id, { type: 'mobility' })

      expect(updated.type).toBe('mobility')
      expect(updated.primaryMuscleGroup).toBe('hamstrings')
    })

    it('independently updates otherMuscleGroups without disturbing primaryMuscleGroup, type, isUnilateral, or isTimed', async () => {
      const exercise = await createExercise('Hamstring Stretch', {
        primaryMuscleGroup: 'hamstrings',
        type: 'stretch',
        isUnilateral: true,
        isTimed: true,
      })

      const updated = await store.updateExercise(exercise.id, { otherMuscleGroups: ['glutes', 'back'] })

      expect(updated.otherMuscleGroups).toEqual(['glutes', 'back'])
      expect(updated.primaryMuscleGroup).toBe('hamstrings')
      expect(updated.type).toBe('stretch')
      expect(updated.isUnilateral).toBe(true)
      expect(updated.isTimed).toBe(true)
    })

    it('leaves categorization fields untouched when unspecified in the update', async () => {
      const exercise = await createExercise('Hamstring Stretch', {
        primaryMuscleGroup: 'hamstrings',
        type: 'stretch',
        otherMuscleGroups: ['glutes'],
      })

      const updated = await store.updateExercise(exercise.id, { name: 'Hamstring Hold' })

      expect(updated.primaryMuscleGroup).toBe('hamstrings')
      expect(updated.type).toBe('stretch')
      expect(updated.otherMuscleGroups).toEqual(['glutes'])
    })
  })

  describe('deleteExercise', () => {
    it('removes the exercise from the list', async () => {
      const exercise = await createExercise('Deadlift')

      await store.deleteExercise(exercise.id)

      expect(await store.listExercises()).toEqual([])
    })

    it('removes the deleted Exercise from every Workout that referenced it', async () => {
      const bench = await createExercise('Bench Press')
      const raise = await createExercise('Cable Lateral Raise')
      const push = await store.createWorkout('Push Day', [bench.id, raise.id])
      const shoulders = await store.createWorkout('Shoulders', [raise.id])

      await store.deleteExercise(raise.id)

      const stored = await store.listWorkouts()
      expect(stored.find((w) => w.id === push.id)?.exerciseIds).toEqual([bench.id])
      expect(stored.find((w) => w.id === shoulders.id)?.exerciseIds).toEqual([])
    })

    it('leaves no dangling id behind when an Exercise is replaced by a unilateral version', async () => {
      const old = await createExercise('Cable Lateral Raise')
      const workout = await store.createWorkout('Shoulders', [old.id])

      await store.deleteExercise(old.id)
      const replacement = await createExercise('Cable Lateral Raise', { isUnilateral: true })

      const [stored] = await store.listWorkouts()
      expect(stored.exerciseIds).not.toContain(old.id)
      expect(stored.exerciseIds).toEqual([])
      expect(workout.id).toBe(stored.id)
      expect(replacement.isUnilateral).toBe(true)
    })

    it('leaves Sessions untouched, which keep their own snapshot (ADR-0001)', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      await store.deleteExercise(bench.id)

      const [stored] = await store.listSessions()
      expect(stored.id).toBe(session.id)
      expect(stored.exercises).toHaveLength(1)
      expect(stored.exercises[0].exerciseNameAtLogTime).toBe('Bench Press')
    })
  })

  describe('createWorkout', () => {
    it('creates a Workout with a name and preserves Exercise order as stored/retrieved', async () => {
      const bench = await createExercise('Bench Press')
      const ohp = await createExercise('Overhead Press')
      const dips = await createExercise('Dips')

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
      const squat = await createExercise('Squat')
      const lunge = await createExercise('Lunge')
      const calfRaise = await createExercise('Calf Raise')
      const workout = await store.createWorkout('Leg Day', [squat.id, lunge.id])

      const updated = await store.updateWorkout(workout.id, {
        exerciseIds: [lunge.id, calfRaise.id],
      })

      expect(updated.exerciseIds).toEqual([lunge.id, calfRaise.id])
    })

    it('leaves fields unspecified in the update untouched', async () => {
      const squat = await createExercise('Squat')
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
      const bench = await createExercise('Bench Press')
      const ohp = await createExercise('Overhead Press')
      const dips = await createExercise('Dips')
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
      const bench = await createExercise('Bench Press')
      const ohp = await createExercise('Overhead Press')
      const workout = await store.createWorkout('Push Day', [bench.id, ohp.id])

      await expect(store.reorderWorkoutExercises(workout.id, [bench.id])).rejects.toThrow()
    })

    it('rejects reordering a nonexistent Workout', async () => {
      await expect(store.reorderWorkoutExercises('missing-id', [])).rejects.toThrow()
    })
  })

  describe('startSession', () => {
    it('skips an exerciseId with no Exercise behind it rather than snapshotting the raw id as its name', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      // A dangling reference, as written by a build predating deleteExercise's cascade.
      await workouts.put({ ...workout, exerciseIds: [bench.id, 'no-such-exercise-id'] })

      const session = await store.startSession(workout.id)

      expect(session.exercises).toHaveLength(1)
      expect(session.exercises[0].exerciseNameAtLogTime).toBe('Bench Press')
    })

    it('snapshots the Workout name and Exercise list, denormalizing each Exercise name, with one empty set when there is no prior Session', async () => {
      const bench = await createExercise('Bench Press')
      const ohp = await createExercise('Overhead Press')
      const workout = await store.createWorkout('Push Day', [bench.id, ohp.id])

      const session = await store.startSession(workout.id)

      expect(session.workoutId).toBe(workout.id)
      expect(session.workoutNameSnapshot).toBe('Push Day')
      expect(session.exercises).toEqual([
        { exerciseId: bench.id, exerciseNameAtLogTime: 'Bench Press', sets: [pendingSet()] },
        { exerciseId: ohp.id, exerciseNameAtLogTime: 'Overhead Press', sets: [pendingSet()] },
      ])
      expect(session.startTime).toBeTruthy()
      expect(session.endTime).toBeNull()
      expect(session.notes).toBe('')
    })

    it('opens an Exercise newly added to an already-logged Workout with one Pending Set', async () => {
      const bench = await createExercise('Bench Press')
      const ohp = await createExercise('Overhead Press')
      const workout = await store.createWorkout('Push Day', [bench.id])

      const first = await store.startSession(workout.id)
      await store.logSet(first.id, bench.id, { weight: 135, reps: 8 })

      await store.updateWorkout(workout.id, { exerciseIds: [bench.id, ohp.id] })
      const second = await store.startSession(workout.id)

      expect(second.exercises).toEqual([
        {
          exerciseId: bench.id,
          exerciseNameAtLogTime: 'Bench Press',
          sets: [pendingSet()],
        },
        { exerciseId: ohp.id, exerciseNameAtLogTime: 'Overhead Press', sets: [pendingSet()] },
      ])
    })

    it('carries over the shape of the most recent prior Session for the same Workout, but none of its numbers', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])

      const first = await store.startSession(workout.id)
      await store.logSet(first.id, bench.id, { weight: 135, reps: 8 })
      await store.logSet(first.id, bench.id, { weight: 155, reps: 5 })

      const second = await store.startSession(workout.id)

      expect(second.exercises).toEqual([
        {
          exerciseId: bench.id,
          exerciseNameAtLogTime: 'Bench Press',
          sets: [pendingSet(), pendingSet()],
        },
      ])
    })

    it('rejects starting a Session for a nonexistent Workout', async () => {
      await expect(store.startSession('missing-id')).rejects.toThrow()
    })
  })

  describe('logSet', () => {
    it('appends a new Set to the given Exercise within the Session', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      const updated = await store.logSet(session.id, bench.id, { weight: 135, reps: 8 })

      expect(updated.exercises[0].sets).toEqual([
        pendingSet(),
        { weight: 135, reps: 8 },
      ])
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

    it('appends a left+right pair for a unilateral Exercise', async () => {
      const row = await createExercise('Single Arm Row', { isUnilateral: true })
      const workout = await store.createWorkout('Pull Day', [row.id])
      const session = await store.startSession(workout.id)

      const updated = await store.logSet(session.id, row.id, { weight: 40, reps: 10 })

      expect(updated.exercises[0].sets).toEqual([
        { side: 'left' },
        { side: 'right' },
        { weight: 40, reps: 10, side: 'left' },
        { weight: 40, reps: 10, side: 'right' },
      ])
    })

    it('does not add a side for a non-unilateral Exercise', async () => {
      const bench = await createExercise('Bench Press', { isUnilateral: false })
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      const updated = await store.logSet(session.id, bench.id, { weight: 135, reps: 8 })

      expect(updated.exercises[0].sets.at(-1)).toEqual({ weight: 135, reps: 8 })
    })

    it('appends a Pending Set for a timed Exercise, carrying no duration', async () => {
      const plank = await createExercise('Plank', { isTimed: true })
      const workout = await store.createWorkout('Core', [plank.id])
      const session = await store.startSession(workout.id)

      const updated = await store.logSet(session.id, plank.id)

      expect(updated.exercises[0].sets.at(-1)).toEqual({})
    })

    it('appends a Pending left+right pair for a timed and unilateral Exercise', async () => {
      const stretch = await createExercise('Single Leg Hamstring Stretch', { isUnilateral: true, isTimed: true })
      const workout = await store.createWorkout('Mobility', [stretch.id])
      const session = await store.startSession(workout.id)

      const updated = await store.logSet(session.id, stretch.id)

      expect(updated.exercises[0].sets).toEqual([
        { side: 'left' },
        { side: 'right' },
        { side: 'left' },
        { side: 'right' },
      ])
    })

    it('does not carry a duration forward into an added Set for a timed Exercise', async () => {
      const plank = await createExercise('Plank', { isTimed: true })
      const workout = await store.createWorkout('Core', [plank.id])
      const session = await store.startSession(workout.id)
      await store.logSet(session.id, plank.id, { durationSeconds: 45 })

      const updated = await store.logSet(session.id, plank.id)

      expect(updated.exercises[0].sets.at(-1)).toEqual({})
    })

    it('does not carry an asymmetric load forward per side into an added pair', async () => {
      const row = await createExercise('Single Arm Row', { isUnilateral: true })
      const workout = await store.createWorkout('Pull Day', [row.id])
      const session = await store.startSession(workout.id)
      const paired = await store.logSet(session.id, row.id, { weight: 40, reps: 10 })
      await store.updateSet(paired.id, row.id, 2, { weight: 35, reps: 10, side: 'right' })

      const updated = await store.logSet(session.id, row.id)

      expect(updated.exercises[0].sets.slice(-2)).toEqual([{ side: 'left' }, { side: 'right' }])
    })

    it('appends a Pending Set when the Exercise has no Sets left at all', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)
      const logged = await store.logSet(session.id, bench.id, { weight: 135, reps: 8 })
      await store.deleteSet(logged.id, bench.id, 1)
      await store.deleteSet(logged.id, bench.id, 0)

      const updated = await store.logSet(session.id, bench.id)

      expect(updated.exercises[0].sets).toEqual([{}])
    })

    it('appends a Pending pair when the preceding Sets predate the Exercise becoming unilateral', async () => {
      const curl = await createExercise('Bicep Curl', { isUnilateral: false })
      const workout = await store.createWorkout('Arms', [curl.id])
      const session = await store.startSession(workout.id)
      await store.logSet(session.id, curl.id, { weight: 30, reps: 10 })
      await store.updateExercise(curl.id, { isUnilateral: true })

      const updated = await store.logSet(session.id, curl.id)

      expect(updated.exercises[0].sets.slice(-2)).toEqual([{ side: 'left' }, { side: 'right' }])
    })
  })

  describe('updateSet', () => {
    it('updates the weight/reps of an existing Set', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)
      const logged = await store.logSet(session.id, bench.id, { weight: 135, reps: 8 })

      const updated = await store.updateSet(logged.id, bench.id, 1, { weight: 145, reps: 6 })

      expect(updated.exercises[0].sets).toEqual([
        pendingSet(),
        { weight: 145, reps: 6 },
      ])
    })

    it('rejects updating a Set at an out-of-range index', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      await expect(
        store.updateSet(session.id, bench.id, 1, { weight: 145, reps: 6 })
      ).rejects.toThrow()
    })

    it('rejects updating a Set for a nonexistent Session', async () => {
      await expect(
        store.updateSet('missing-id', 'exercise-id', 0, { weight: 100, reps: 5 })
      ).rejects.toThrow()
    })
  })

  describe('endSession (pruning Pending Sets)', () => {
    it('drops Sets that were never touched', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)
      await store.logSet(session.id, bench.id)
      await store.updateSet(session.id, bench.id, 0, { weight: 135, reps: 8 })

      const ended = await store.endSession(session.id)

      expect(ended.exercises[0].sets).toEqual([{ weight: 135, reps: 8 }])
    })

    it('leaves Logged Sets completely untouched, including a genuine weight of 0', async () => {
      const pullup = await createExercise('Pull Up')
      const workout = await store.createWorkout('Pull Day', [pullup.id])
      const session = await store.startSession(workout.id)
      await store.updateSet(session.id, pullup.id, 0, { weight: 0, reps: 12 })

      const ended = await store.endSession(session.id)

      expect(ended.exercises[0].sets).toEqual([{ weight: 0, reps: 12 }])
    })

    it('keeps a partially-entered Set rather than discarding a number that was typed', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)
      await store.updateSet(session.id, bench.id, 0, { weight: 135 })

      const ended = await store.endSession(session.id)

      expect(ended.exercises[0].sets).toEqual([{ weight: 135 }])
    })

    it('drops an untouched unilateral pair, side markers and all', async () => {
      const row = await createExercise('Single Arm Row', { isUnilateral: true })
      const workout = await store.createWorkout('Pull Day', [row.id])
      const session = await store.startSession(workout.id)
      await store.logSet(session.id, row.id)

      const ended = await store.endSession(session.id)

      expect(ended.exercises[0].sets).toEqual([])
    })

    it('keeps a fully-skipped Exercise listed with no Sets, recording that it was part of that day’s Workout', async () => {
      const bench = await createExercise('Bench Press')
      const ohp = await createExercise('Overhead Press')
      const workout = await store.createWorkout('Push Day', [bench.id, ohp.id])
      const session = await store.startSession(workout.id)
      await store.updateSet(session.id, bench.id, 0, { weight: 135, reps: 8 })

      const ended = await store.endSession(session.id)

      expect(ended.exercises).toHaveLength(2)
      expect(ended.exercises[1].exerciseId).toBe(ohp.id)
      expect(ended.exercises[1].sets).toEqual([])
    })

    it('persists the pruned Session rather than only returning it', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      await store.endSession(session.id)

      const reloaded = await sessions.get(session.id)
      expect(reloaded?.exercises[0].sets).toEqual([])
    })

    it('leaves notes and times alone while pruning', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)
      await store.updateSessionNotes(session.id, 'felt strong')

      const ended = await store.endSession(session.id)

      expect(ended.notes).toBe('felt strong')
      expect(ended.startTime).toBe(session.startTime)
      expect(ended.endTime).toBeTruthy()
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

  describe('getActiveSession', () => {
    it('returns undefined when there is no in-progress Session', async () => {
      expect(await store.getActiveSession()).toBeUndefined()
    })

    it('returns the in-progress Session so a refresh can resume it', async () => {
      const workout = await store.createWorkout('Push Day', [])
      const session = await store.startSession(workout.id)

      const active = await store.getActiveSession()

      expect(active?.id).toBe(session.id)
    })

    it('ignores Sessions that have already ended', async () => {
      const workout = await store.createWorkout('Push Day', [])
      const session = await store.startSession(workout.id)
      await store.endSession(session.id)

      expect(await store.getActiveSession()).toBeUndefined()
    })

    it('returns the most recently started Session when more than one is in progress', async () => {
      vi.useFakeTimers()
      try {
        const pushDay = await store.createWorkout('Push Day', [])
        const pullDay = await store.createWorkout('Pull Day', [])
        await store.startSession(pushDay.id)
        vi.advanceTimersByTime(1000)
        const second = await store.startSession(pullDay.id)

        const active = await store.getActiveSession()

        expect(active?.id).toBe(second.id)
      } finally {
        vi.useRealTimers()
      }
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

  describe('carried-over lookback ordering', () => {
    it('takes Ghost Values from the most recent prior Session, ignoring Sessions for other Workouts', async () => {
      vi.useFakeTimers()
      try {
        const bench = await createExercise('Bench Press')
        const pushDay = await store.createWorkout('Push Day', [bench.id])
        const pullDay = await store.createWorkout('Pull Day', [bench.id])

        const first = await store.startSession(pushDay.id)
        await store.updateSet(first.id, bench.id, 0, { weight: 95, reps: 12 })
        await store.endSession(first.id)

        vi.setSystemTime(new Date(Date.now() + 1000))
        const otherWorkout = await store.startSession(pullDay.id)
        await store.updateSet(otherWorkout.id, bench.id, 0, { weight: 999, reps: 1 })
        await store.endSession(otherWorkout.id)

        vi.setSystemTime(new Date(Date.now() + 1000))
        const second = await store.startSession(pushDay.id)
        await store.updateSet(second.id, bench.id, 0, { weight: 135, reps: 8 })
        await store.endSession(second.id)

        vi.setSystemTime(new Date(Date.now() + 1000))
        const current = await store.startSession(pushDay.id)
        const carried = await store.getCarriedOverSets(current.id)

        expect(carried[bench.id]).toEqual([{ weight: 135, reps: 8 }])
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('ADR-0001: Sessions snapshot their Workout, independent of later edits', () => {
    it('does not change a past Session when the Workout is renamed or its Exercises edited afterward', async () => {
      const bench = await createExercise('Bench Press')
      const ohp = await createExercise('Overhead Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      await store.updateWorkout(workout.id, { name: 'Push Day (Heavy)', exerciseIds: [ohp.id] })

      const reloadedSession = await sessions.get(session.id)
      expect(reloadedSession?.id).toBe(session.id)
      expect(reloadedSession?.workoutNameSnapshot).toBe('Push Day')
      expect(reloadedSession?.exercises.map((e) => e.exerciseId)).toEqual([bench.id])
    })
  })

  describe('deleteSet', () => {
    it('removes a Set at the given index from an Exercise within a Session', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)
      await store.logSet(session.id, bench.id, { weight: 135, reps: 8 })
      const logged = await store.logSet(session.id, bench.id, { weight: 145, reps: 6 })

      const updated = await store.deleteSet(logged.id, bench.id, 1)

      expect(updated.exercises[0].sets).toEqual([
        pendingSet(),
        { weight: 145, reps: 6 },
      ])
    })

    it('rejects deleting a Set at an out-of-range index', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      await expect(store.deleteSet(session.id, bench.id, 1)).rejects.toThrow()
    })

    it('rejects deleting a Set for a nonexistent Session', async () => {
      await expect(store.deleteSet('missing-id', 'exercise-id', 0)).rejects.toThrow()
    })

    it('deleting the left Set of a unilateral pair removes both', async () => {
      const row = await createExercise('Single Arm Row', { isUnilateral: true })
      const workout = await store.createWorkout('Pull Day', [row.id])
      const session = await store.startSession(workout.id)
      const logged = await store.logSet(session.id, row.id, { weight: 40, reps: 10 })
      // sets: [pendingL, pendingR, left, right] -> the logged left is index 2
      const updated = await store.deleteSet(logged.id, row.id, 2)

      expect(updated.exercises[0].sets).toEqual([{ side: 'left' }, { side: 'right' }])
    })

    it('deleting the right Set of a unilateral pair removes both', async () => {
      const row = await createExercise('Single Arm Row', { isUnilateral: true })
      const workout = await store.createWorkout('Pull Day', [row.id])
      const session = await store.startSession(workout.id)
      const logged = await store.logSet(session.id, row.id, { weight: 40, reps: 10 })
      // sets: [pendingL, pendingR, left, right] -> the logged right is index 3
      const updated = await store.deleteSet(logged.id, row.id, 3)

      expect(updated.exercises[0].sets).toEqual([{ side: 'left' }, { side: 'right' }])
    })

    it('deleting either Set of a timed+unilateral pair removes both', async () => {
      const stretch = await createExercise('Single Leg Hamstring Stretch', { isUnilateral: true, isTimed: true })
      const workout = await store.createWorkout('Mobility', [stretch.id])
      const session = await store.startSession(workout.id)
      const logged = await store.logSet(session.id, stretch.id)
      // sets: [pendingL, pendingR, left, right] -> the logged left is index 2
      const updated = await store.deleteSet(logged.id, stretch.id, 2)

      expect(updated.exercises[0].sets).toEqual([{ side: 'left' }, { side: 'right' }])
    })

    it('deleting one pair leaves other Sets/pairs intact and in order', async () => {
      const row = await createExercise('Single Arm Row', { isUnilateral: true })
      const workout = await store.createWorkout('Pull Day', [row.id])
      const session = await store.startSession(workout.id)
      await store.logSet(session.id, row.id, { weight: 40, reps: 10 })
      const logged = await store.logSet(session.id, row.id, { weight: 45, reps: 8 })
      // sets: [pendingL, pendingR, left1, right1, left2, right2] -> the second logged pair starts at index 4
      const updated = await store.deleteSet(logged.id, row.id, 4)

      expect(updated.exercises[0].sets).toEqual([
        { side: 'left' },
        { side: 'right' },
        { weight: 40, reps: 10, side: 'left' },
        { weight: 40, reps: 10, side: 'right' },
      ])
    })
  })

  describe('unilateral Exercises do not retroactively reinterpret past Sets', () => {
    it('leaves a Set logged before the Exercise was unilateral unmodified after the flag is toggled on', async () => {
      const row = await createExercise('Single Arm Row', { isUnilateral: false })
      const workout = await store.createWorkout('Pull Day', [row.id])
      const session = await store.startSession(workout.id)
      const logged = await store.logSet(session.id, row.id, { weight: 40, reps: 10 })

      await store.updateExercise(row.id, { isUnilateral: true })

      const reloaded = await sessions.get(logged.id)
      expect(reloaded?.id).toBe(logged.id)
      expect(reloaded?.exercises[0].sets).toEqual([pendingSet(), { weight: 40, reps: 10 }])
    })

    it('leaves paired Sets unmodified after the Exercise is later un-flagged as unilateral', async () => {
      const row = await createExercise('Single Arm Row', { isUnilateral: true })
      const workout = await store.createWorkout('Pull Day', [row.id])
      const session = await store.startSession(workout.id)
      const logged = await store.logSet(session.id, row.id, { weight: 40, reps: 10 })

      await store.updateExercise(row.id, { isUnilateral: false })

      const reloaded = await sessions.get(logged.id)
      expect(reloaded?.id).toBe(logged.id)
      expect(reloaded?.exercises[0].sets).toEqual([
        { side: 'left' },
        { side: 'right' },
        { weight: 40, reps: 10, side: 'left' },
        { weight: 40, reps: 10, side: 'right' },
      ])
    })
  })

  describe('timed Exercises do not retroactively reinterpret past Sets', () => {
    it('leaves a weight/reps Set unmodified after its Exercise is later marked timed', async () => {
      const plank = await createExercise('Plank', { isTimed: false })
      const workout = await store.createWorkout('Core', [plank.id])
      const session = await store.startSession(workout.id)
      const logged = await store.logSet(session.id, plank.id, { weight: 0, reps: 30 })

      await store.updateExercise(plank.id, { isTimed: true })

      const reloaded = await sessions.get(logged.id)
      expect(reloaded?.id).toBe(logged.id)
      expect(reloaded?.exercises[0].sets).toEqual([pendingSet(), { weight: 0, reps: 30 }])
    })

    it('leaves a duration Set unmodified after its Exercise is later un-flagged as timed', async () => {
      const plank = await createExercise('Plank', { isTimed: true })
      const workout = await store.createWorkout('Core', [plank.id])
      const session = await store.startSession(workout.id)
      const logged = await store.logSet(session.id, plank.id, { durationSeconds: 45 })

      await store.updateExercise(plank.id, { isTimed: false })

      const reloaded = await sessions.get(logged.id)
      expect(reloaded?.id).toBe(logged.id)
      expect(reloaded?.exercises[0].sets).toEqual([pendingSet(), { durationSeconds: 45 }])
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

  describe('exportData / importData', () => {
    it('round-trips all Exercises, Workouts, and Sessions through export then import', async () => {
      const bench = await createExercise('Bench Press')
      const ohp = await createExercise('Overhead Press')
      const workout = await store.createWorkout('Push Day', [bench.id, ohp.id])
      const session = await store.startSession(workout.id)
      await store.logSet(session.id, bench.id, { weight: 135, reps: 8 })
      await store.updateSessionNotes(session.id, 'Felt good')

      const exported = await store.exportData()

      const freshExercises = createInMemoryTable<Exercise>()
      const freshWorkouts = createInMemoryTable<Workout>()
      const freshSessions = createInMemoryTable<Session>()
      const freshStore = new Store({
        exercises: freshExercises,
        workouts: freshWorkouts,
        sessions: freshSessions,
      })
      await freshStore.importData(exported)

      expect(await freshStore.listExercises()).toEqual(await store.listExercises())
      expect(await freshStore.listWorkouts()).toEqual(await store.listWorkouts())
      expect(await freshStore.listSessions()).toEqual(await store.listSessions())
    })

    it('replaces any existing data on import rather than merging with it', async () => {
      await createExercise('Old Exercise')
      const exported = await store.exportData()

      const otherExercises = createInMemoryTable<Exercise>()
      const otherWorkouts = createInMemoryTable<Workout>()
      const otherSessions = createInMemoryTable<Session>()
      const otherStore = new Store({
        exercises: otherExercises,
        workouts: otherWorkouts,
        sessions: otherSessions,
      })
      await otherStore.createExercise('Should be replaced', DEFAULT_CATEGORIZATION)

      await otherStore.importData(exported)

      const all = await otherStore.listExercises()
      expect(all.map((e) => e.name)).toEqual(['Old Exercise'])
    })

    it('produces an empty export when there is no data', async () => {
      const exported = await store.exportData()
      expect(exported.exercises).toEqual([])
      expect(exported.workouts).toEqual([])
      expect(exported.sessions).toEqual([])
    })
  })

  describe('Pending Sets', () => {
    it('appends a Pending Set carrying no measurements at all from the "Add set" path', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      const updated = await store.logSet(session.id, bench.id)

      expect(updated.exercises[0].sets.at(-1)).toEqual({})
    })

    it('does not carry a weight forward into an added Set, so an added Set never reads as performed', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)
      await store.updateSet(session.id, bench.id, 0, { weight: 135, reps: 8 })

      const updated = await store.logSet(session.id, bench.id)

      expect(updated.exercises[0].sets.at(-1)).toEqual({})
    })

    it('appends a Pending left+right pair for a unilateral Exercise', async () => {
      const row = await createExercise('Single Arm Row', { isUnilateral: true })
      const workout = await store.createWorkout('Pull Day', [row.id])
      const session = await store.startSession(workout.id)

      const updated = await store.logSet(session.id, row.id)

      expect(updated.exercises[0].sets.slice(-2)).toEqual([{ side: 'left' }, { side: 'right' }])
    })

    it('appends the same Pending Set for a timed Exercise as for a weighted one (layout comes from the Exercise, ADR-0005)', async () => {
      const plank = await createExercise('Plank', { isTimed: true })
      const workout = await store.createWorkout('Core', [plank.id])
      const session = await store.startSession(workout.id)

      const updated = await store.logSet(session.id, plank.id)

      expect(updated.exercises[0].sets.at(-1)).toEqual({})
    })

    it('clears a measurement back to absent, returning a Logged Set to Pending', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)
      await store.updateSet(session.id, bench.id, 0, { weight: 135, reps: 8 })

      const updated = await store.updateSet(session.id, bench.id, 0, {
        weight: undefined,
        reps: undefined,
      })

      expect(updated.exercises[0].sets[0]).toEqual({})
      expect('weight' in updated.exercises[0].sets[0]).toBe(false)
    })

    it('preserves a Set’s side when its measurements are cleared', async () => {
      const row = await createExercise('Single Arm Row', { isUnilateral: true })
      const workout = await store.createWorkout('Pull Day', [row.id])
      const session = await store.startSession(workout.id)
      await store.logSet(session.id, row.id)
      await store.updateSet(session.id, row.id, 1, { weight: 40, reps: 10, side: 'left' })

      const updated = await store.updateSet(session.id, row.id, 1, {
        weight: undefined,
        reps: undefined,
        side: 'left',
      })

      expect(updated.exercises[0].sets[1]).toEqual({ side: 'left' })
    })

    it('treats a stored weight of 0 as a real measurement, not an absent one', async () => {
      const pullup = await createExercise('Pull Up')
      const workout = await store.createWorkout('Pull Day', [pullup.id])
      const session = await store.startSession(workout.id)

      const updated = await store.updateSet(session.id, pullup.id, 0, { weight: 0, reps: 12 })

      expect(updated.exercises[0].sets[0]).toEqual({ weight: 0, reps: 12 })
    })
  })

  describe('isSetLogged', () => {
    const weighted: Exercise = {
      id: 'ex-1',
      name: 'Bench Press',
      isUnilateral: false,
      isTimed: false,
      primaryMuscleGroup: 'chest',
      otherMuscleGroups: [],
      type: 'strength',
    }
    const timed: Exercise = { ...weighted, id: 'ex-2', name: 'Plank', isTimed: true }

    it('counts a weighted Set as Logged only once both weight and reps are present', () => {
      expect(isSetLogged(weighted, { weight: 135, reps: 8 })).toBe(true)
      expect(isSetLogged(weighted, { weight: 135 })).toBe(false)
      expect(isSetLogged(weighted, { reps: 8 })).toBe(false)
      expect(isSetLogged(weighted, {})).toBe(false)
    })

    it('counts a weight of 0 as Logged, since bodyweight work is a real measurement', () => {
      expect(isSetLogged(weighted, { weight: 0, reps: 12 })).toBe(true)
    })

    it('counts 0 reps as Logged, distinguishing a failed Set from an unperformed one', () => {
      expect(isSetLogged(weighted, { weight: 135, reps: 0 })).toBe(true)
    })

    it('counts a timed Set as Logged on its duration alone', () => {
      expect(isSetLogged(timed, { durationSeconds: 60 })).toBe(true)
      expect(isSetLogged(timed, { durationSeconds: 0 })).toBe(true)
      expect(isSetLogged(timed, {})).toBe(false)
    })

    it('ignores measurements the Exercise does not imply', () => {
      expect(isSetLogged(timed, { weight: 135, reps: 8 })).toBe(false)
      expect(isSetLogged(weighted, { durationSeconds: 60 })).toBe(false)
    })

    it('falls back to any measurement being present when the Exercise has been deleted', () => {
      expect(isSetLogged(undefined, { weight: 135, reps: 8 })).toBe(true)
      expect(isSetLogged(undefined, { durationSeconds: 60 })).toBe(true)
      expect(isSetLogged(undefined, {})).toBe(false)
      expect(isSetLogged(undefined, { side: 'left' })).toBe(false)
    })
  })

  describe('startSession (Carried-Over Shape)', () => {
    async function loggedSession(workoutId: string, log: (sessionId: string) => Promise<unknown>) {
      const session = await store.startSession(workoutId)
      await log(session.id)
      return store.endSession(session.id)
    }

    it('opens every Set Pending, copying no measurements from history', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      await loggedSession(workout.id, (id) =>
        store.updateSet(id, bench.id, 0, { weight: 135, reps: 8 })
      )

      const session = await store.startSession(workout.id)

      expect(session.exercises[0].sets).toEqual([{}])
    })

    it('opens with as many Set groups as were Logged last time', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      await loggedSession(workout.id, async (id) => {
        await store.logSet(id, bench.id)
        await store.logSet(id, bench.id)
        await store.updateSet(id, bench.id, 0, { weight: 135, reps: 8 })
        await store.updateSet(id, bench.id, 1, { weight: 135, reps: 7 })
        await store.updateSet(id, bench.id, 2, { weight: 135, reps: 5 })
      })

      const session = await store.startSession(workout.id)

      expect(session.exercises[0].sets).toEqual([{}, {}, {}])
    })

    it('shapes each Exercise independently', async () => {
      const bench = await createExercise('Bench Press')
      const ohp = await createExercise('Overhead Press')
      const workout = await store.createWorkout('Push Day', [bench.id, ohp.id])
      await loggedSession(workout.id, async (id) => {
        await store.logSet(id, bench.id)
        await store.updateSet(id, bench.id, 0, { weight: 135, reps: 8 })
        await store.updateSet(id, bench.id, 1, { weight: 135, reps: 6 })
        await store.updateSet(id, ohp.id, 0, { weight: 75, reps: 10 })
      })

      const session = await store.startSession(workout.id)

      expect(session.exercises[0].sets).toEqual([{}, {}])
      expect(session.exercises[1].sets).toEqual([{}])
    })

    it('takes an Exercise’s shape from the last Session that Logged it, skipping one where it was skipped', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      await loggedSession(workout.id, async (id) => {
        await store.logSet(id, bench.id)
        await store.updateSet(id, bench.id, 0, { weight: 135, reps: 8 })
        await store.updateSet(id, bench.id, 1, { weight: 135, reps: 6 })
      })
      await loggedSession(workout.id, async () => {})

      const session = await store.startSession(workout.id)

      expect(session.exercises[0].sets).toEqual([{}, {}])
    })

    it('opens an Exercise with no history in this Workout as a single Pending Set', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])

      const session = await store.startSession(workout.id)

      expect(session.exercises[0].sets).toEqual([{}])
    })

    it('never takes a shape from a different Workout, even one sharing the Exercise', async () => {
      const bench = await createExercise('Bench Press')
      const push = await store.createWorkout('Push Day', [bench.id])
      const fullBody = await store.createWorkout('Full Body', [bench.id])
      await loggedSession(fullBody.id, async (id) => {
        await store.logSet(id, bench.id)
        await store.updateSet(id, bench.id, 0, { weight: 95, reps: 12 })
        await store.updateSet(id, bench.id, 1, { weight: 95, reps: 12 })
      })

      const session = await store.startSession(push.id)

      expect(session.exercises[0].sets).toEqual([{}])
    })

    it('materializes left+right pairs for a unilateral Exercise with no history', async () => {
      const row = await createExercise('Single Arm Row', { isUnilateral: true })
      const workout = await store.createWorkout('Pull Day', [row.id])

      const session = await store.startSession(workout.id)

      expect(session.exercises[0].sets).toEqual([{ side: 'left' }, { side: 'right' }])
    })

    it('materializes pairs from a solo-Set history once the Exercise has become unilateral', async () => {
      const curl = await createExercise('Bicep Curl', { isUnilateral: false })
      const workout = await store.createWorkout('Arms', [curl.id])
      await loggedSession(workout.id, async (id) => {
        await store.logSet(id, curl.id)
        await store.updateSet(id, curl.id, 0, { weight: 30, reps: 10 })
        await store.updateSet(id, curl.id, 1, { weight: 30, reps: 10 })
      })
      await store.updateExercise(curl.id, { isUnilateral: true })

      const session = await store.startSession(workout.id)

      expect(session.exercises[0].sets).toEqual([
        { side: 'left' },
        { side: 'right' },
        { side: 'left' },
        { side: 'right' },
      ])
    })

    it('materializes solo Sets from a paired history once the Exercise is no longer unilateral', async () => {
      const curl = await createExercise('Bicep Curl', { isUnilateral: true })
      const workout = await store.createWorkout('Arms', [curl.id])
      await loggedSession(workout.id, async (id) => {
        await store.updateSet(id, curl.id, 0, { weight: 30, reps: 10, side: 'left' })
        await store.updateSet(id, curl.id, 1, { weight: 30, reps: 10, side: 'right' })
      })
      await store.updateExercise(curl.id, { isUnilateral: false })

      const session = await store.startSession(workout.id)

      expect(session.exercises[0].sets).toEqual([{}])
    })
  })

  describe('getCarriedOverSets', () => {
    it('returns the Sets Logged last time, keyed by Exercise', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const previous = await store.startSession(workout.id)
      await store.updateSet(previous.id, bench.id, 0, { weight: 135, reps: 8 })
      await store.endSession(previous.id)
      const session = await store.startSession(workout.id)

      const carried = await store.getCarriedOverSets(session.id)

      expect(carried[bench.id]).toEqual([{ weight: 135, reps: 8 }])
    })

    it('excludes the Session being opened, so it never ghosts from itself', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)
      await store.updateSet(session.id, bench.id, 0, { weight: 200, reps: 1 })

      const carried = await store.getCarriedOverSets(session.id)

      expect(carried[bench.id]).toBeUndefined()
    })

    it('reaches past a Session where the Exercise was skipped', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const older = await store.startSession(workout.id)
      await store.updateSet(older.id, bench.id, 0, { weight: 135, reps: 8 })
      await store.endSession(older.id)
      const skipped = await store.startSession(workout.id)
      await store.endSession(skipped.id)
      const session = await store.startSession(workout.id)

      const carried = await store.getCarriedOverSets(session.id)

      expect(carried[bench.id]).toEqual([{ weight: 135, reps: 8 }])
    })

    it('offers nothing for an Exercise with no history in this Workout', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      const carried = await store.getCarriedOverSets(session.id)

      expect(carried[bench.id]).toBeUndefined()
    })

    it('keeps left and right Sets in order so sides can be matched', async () => {
      const row = await createExercise('Single Arm Row', { isUnilateral: true })
      const workout = await store.createWorkout('Pull Day', [row.id])
      const previous = await store.startSession(workout.id)
      await store.updateSet(previous.id, row.id, 0, { weight: 40, reps: 10, side: 'left' })
      await store.updateSet(previous.id, row.id, 1, { weight: 35, reps: 10, side: 'right' })
      await store.endSession(previous.id)
      const session = await store.startSession(workout.id)

      const carried = await store.getCarriedOverSets(session.id)

      expect(carried[row.id]).toEqual([
        { weight: 40, reps: 10, side: 'left' },
        { weight: 35, reps: 10, side: 'right' },
      ])
    })
  })

  describe('resolveExerciseDisplayName', () => {
    it('prefers the live Exercise name when the Exercise still exists (renames follow through to past Sessions)', async () => {
      const bench = await createExercise('Bemch Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      const renamed = await store.updateExercise(bench.id, { name: 'Bench Press' })

      const allExercises = await store.listExercises()
      expect(resolveExerciseDisplayName(allExercises, session.exercises[0])).toBe('Bench Press')
      expect(renamed.name).toBe('Bench Press')
    })

    it('falls back to the denormalized name captured at log time when the Exercise has been deleted', async () => {
      const bench = await createExercise('Bench Press')
      const workout = await store.createWorkout('Push Day', [bench.id])
      const session = await store.startSession(workout.id)

      await store.deleteExercise(bench.id)

      const allExercises = await store.listExercises()
      expect(resolveExerciseDisplayName(allExercises, session.exercises[0])).toBe('Bench Press')
    })
  })
})
