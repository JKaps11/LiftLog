import Dexie, { type Table } from 'dexie'
import type { Exercise, Session, Workout } from './types'

export class WorkoutLogsDB extends Dexie {
  exercises!: Table<Exercise, string>
  workouts!: Table<Workout, string>
  sessions!: Table<Session, string>

  constructor() {
    super('workout-logs')
    this.version(1).stores({
      exercises: 'id',
      workouts: 'id',
      sessions: 'id',
    })
  }
}

export const db = new WorkoutLogsDB()
