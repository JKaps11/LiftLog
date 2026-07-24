import Dexie, { type Table } from 'dexie'
import EXERCISE_SEED from '@/data/exerciseSeed.json'
import type { Exercise, ExerciseType, MuscleGroup, Session, Workout } from './types'

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
            exercise.type = (seedEntry?.type as ExerciseType) ?? 'strength'
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
            exercise.type = seedEntry.type as ExerciseType
            exercise.otherMuscleGroups = (seedEntry.otherMuscleGroups as MuscleGroup[]) ?? []
            exercise.isUnilateral = seedEntry.isUnilateral ?? false
            exercise.isTimed = seedEntry.isTimed ?? false
          })
      })
    /**
     * seedExercisesIfEmpty only ever runs against an empty table, so any device
     * that had already logged data before a given seed exercise existed (e.g.
     * the Stretch/Mobility drills added by ADR-0002, or any bundled exercise
     * added since) never receives it — the exercise silently never appears,
     * which looks identical to a category having zero exercises. Add any seed
     * entry whose name isn't already present, so bundled additions reach
     * every device, not just fresh installs. A user-renamed exercise that
     * happens to collide with a seed name is not a concern here: this only
     * ever adds rows, never touches existing ones.
     */
    this.version(4)
      .stores({
        exercises: 'id',
        workouts: 'id',
        sessions: 'id',
      })
      .upgrade(async (tx) => {
        const table = tx.table<Exercise, string>('exercises')
        const existingNames = new Set((await table.toArray()).map((exercise) => exercise.name))
        const missing: Exercise[] = EXERCISE_SEED.filter((entry) => !existingNames.has(entry.name)).map(
          (entry) => ({
            id: crypto.randomUUID(),
            name: entry.name,
            isUnilateral: entry.isUnilateral ?? false,
            isTimed: entry.isTimed ?? false,
            primaryMuscleGroup: entry.primaryMuscleGroup as MuscleGroup,
            otherMuscleGroups: (entry.otherMuscleGroups as MuscleGroup[]) ?? [],
            type: entry.type as ExerciseType,
          })
        )
        if (missing.length > 0) {
          await table.bulkAdd(missing)
        }
      })
  }
}

export const db = new WorkoutLogsDB()
