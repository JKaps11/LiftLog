import Dexie, { type Table } from 'dexie'
import type { Exercise } from './types'

export class WorkoutLogsDB extends Dexie {
  exercises!: Table<Exercise, string>

  constructor() {
    super('workout-logs')
    this.version(1).stores({
      exercises: 'id',
    })
  }
}

export const db = new WorkoutLogsDB()
