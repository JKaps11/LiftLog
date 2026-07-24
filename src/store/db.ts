import Dexie, { type Table } from 'dexie'
import type { Exercise, Session, Workout } from './types'

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
     * migrate — wrong in practice: exercises created before that ADR only have
     * id/name. Without this, those legacy rows fail to match any muscle-group
     * bucket and silently disappear from the grouped browse view. Backfill them
     * with the same neutral defaults used elsewhere (core/strength); existing
     * fields are left untouched.
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
            exercise.primaryMuscleGroup ??= 'core'
            exercise.type ??= 'strength'
            exercise.isUnilateral ??= false
            exercise.isTimed ??= false
            exercise.otherMuscleGroups ??= []
          })
      })
  }
}

export const db = new WorkoutLogsDB()
