import Dexie from 'dexie'

export class WorkoutLogsDB extends Dexie {
  constructor() {
    super('workout-logs')
  }
}

export const db = new WorkoutLogsDB()
