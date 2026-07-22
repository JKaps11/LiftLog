import { db } from './db'
import { Store } from './index'

export const store = new Store({ exercises: db.exercises, workouts: db.workouts, sessions: db.sessions })
