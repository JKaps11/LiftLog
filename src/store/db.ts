import Dexie, { type Table } from 'dexie'
import EXERCISE_SEED from '@/data/exerciseSeed.json'
import type { Exercise, MuscleGroup, Session, Workout } from './types'

/** name -> seed entry, for backfilling legacy rows that were seeded before categorization existed. */
const SEED_BY_NAME = new Map(EXERCISE_SEED.map((entry) => [entry.name, entry]))

export class WorkoutLogsDB extends Dexie {
  exercises!: Table<Exercise, string>
  workouts!: Table<Workout, string>
  sessions!: Table<Session, string>

  constructor() {
    super('liftlog')
    this.version(1).stores({
      exercises: 'id',
      workouts: 'id',
      sessions: 'id',
    })
    /**
     * ADR-0002 added primaryMuscleGroup/otherMuscleGroups/type/isUnilateral/isTimed
     * as required Exercise fields on the assumption there were no users yet to
     * migrate — wrong in practice: the *bundled seed exercises* themselves were
     * seeded before that ADR, so on-device rows only have id/name. Without this,
     * those rows fail to match any muscle-group bucket and silently disappear
     * from the grouped browse view. Backfill each by looking its name up in the
     * current exerciseSeed.json (the real, per-exercise category the app already
     * knows) rather than a single guessed default; only a genuinely custom
     * exercise with no seed match falls back to the neutral core/strength
     * default used elsewhere. Existing (already-categorized) fields are left
     * untouched.
     */
    this.version(2)
      .stores({
        exercises: 'id',
        workouts: 'id',
        sessions: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Exercise, string>('exercises')
          .toCollection()
          .modify((exercise) => {
            if (exercise.primaryMuscleGroup) return
            const seedEntry = SEED_BY_NAME.get(exercise.name)
            exercise.primaryMuscleGroup = (seedEntry?.primaryMuscleGroup as MuscleGroup) ?? 'core'
            exercise.type = seedEntry?.type ?? 'strength'
            exercise.otherMuscleGroups = (seedEntry?.otherMuscleGroups as MuscleGroup[]) ?? []
            exercise.isUnilateral = seedEntry?.isUnilateral ?? false
            exercise.isTimed = seedEntry?.isTimed ?? false
          })
      })
    /**
     * Dexie only runs a version's upgrade once per device, keyed off the
     * version number actually stored there — a device that already opened the
     * app between the original (buggy, blanket core/strength) version(2) and
     * this fix would be stuck on wrong data forever, since it's already "at"
     * version 2 and editing that upgrade function again does nothing for it.
     * This re-derives from the seed data unconditionally for any exercise
     * whose current fields still look like that blanket placeholder (rather
     * than gating on isUnilateral/isTimed matching too — a real placeholder
     * always pairs core+strength) and has a differing seed entry, so both a
     * fresh version-1 device and one already stuck on the bad version-2 data
     * end up correctly categorized.
     */
    this.version(3)
      .stores({
        exercises: 'id',
        workouts: 'id',
        sessions: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Exercise, string>('exercises')
          .toCollection()
          .modify((exercise) => {
            const looksLikePlaceholder = exercise.primaryMuscleGroup === 'core' && exercise.type === 'strength'
            if (!looksLikePlaceholder) return
            const seedEntry = SEED_BY_NAME.get(exercise.name)
            if (!seedEntry) return
            exercise.primaryMuscleGroup = seedEntry.primaryMuscleGroup as MuscleGroup
            exercise.type = seedEntry.type
            exercise.otherMuscleGroups = (seedEntry.otherMuscleGroups as MuscleGroup[]) ?? []
            exercise.isUnilateral = seedEntry.isUnilateral ?? false
            exercise.isTimed = seedEntry.isTimed ?? false
          })
      })
  }
}

export const db = new WorkoutLogsDB()
