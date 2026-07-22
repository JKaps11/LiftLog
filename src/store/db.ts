import Dexie, { type Table } from 'dexie'
import type { Exercise, Workout } from './types'

export class WorkoutLogsDB extends Dexie {
  exercises!: Table<Exercise, string>
  workouts!: Table<Workout, string>

  constructor() {
    super('workout-logs')
    this.version(1).stores({
      exercises: 'id',
      workouts: 'id',
    })
  }
}

export const db = new WorkoutLogsDB()
