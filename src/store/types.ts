export interface Exercise {
  id: string
  name: string
}

/** exerciseIds is an ordered list — order is significant and must be preserved. */
export interface Workout {
  id: string
  name: string
  exerciseIds: string[]
}
