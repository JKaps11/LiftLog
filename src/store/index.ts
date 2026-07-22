import EXERCISE_SEED from '@/data/exerciseSeed.json'
import type { EntityTable } from './table'
import type { Exercise, Session, SessionExerciseEntry, SessionSet, Workout } from './types'

export type { Exercise, Session, SessionExerciseEntry, SessionSet, Workout } from './types'
export type { EntityTable } from './table'

export interface StoreDeps {
  exercises: EntityTable<Exercise>
  workouts: EntityTable<Workout>
  sessions: EntityTable<Session>
}

export function isSamePermutation(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((value, i) => value === sortedB[i])
}

/**
 * Prefers a live lookup by exerciseId (so renames follow through to past
 * Sessions); falls back to the name denormalized at log time when the
 * Exercise has since been deleted.
 */
export function resolveExerciseDisplayName(
  exercises: Exercise[],
  entry: SessionExerciseEntry
): string {
  const live = exercises.find((exercise) => exercise.id === entry.exerciseId)
  return live?.name ?? entry.exerciseNameAtLogTime
}

export class Store {
  private readonly exercises: EntityTable<Exercise>
  private readonly workouts: EntityTable<Workout>
  private readonly sessions: EntityTable<Session>
  private seedPromise: Promise<void> | null = null

  constructor(deps: StoreDeps) {
    this.exercises = deps.exercises
    this.workouts = deps.workouts
    this.sessions = deps.sessions
  }

  /**
   * Seeds the bundled common-exercise list, but only if the table is currently
   * empty. Concurrent calls (e.g. React StrictMode double-invoking an effect)
   * share a single in-flight seed instead of racing each other's empty-check.
   */
  async seedExercisesIfEmpty(): Promise<void> {
    if (!this.seedPromise) {
      this.seedPromise = this.performSeedIfEmpty().catch((error: unknown) => {
        this.seedPromise = null
        throw error
      })
    }
    return this.seedPromise
  }

  private async performSeedIfEmpty(): Promise<void> {
    const count = await this.exercises.count()
    if (count > 0) return
    const seeded: Exercise[] = EXERCISE_SEED.map((name) => ({
      id: crypto.randomUUID(),
      name,
    }))
    await this.exercises.bulkAdd(seeded)
  }

  async listExercises(): Promise<Exercise[]> {
    const all = await this.exercises.toArray()
    return all.sort((a, b) => a.name.localeCompare(b.name))
  }

  async createExercise(name: string): Promise<Exercise> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Exercise name cannot be empty')
    const exercise: Exercise = { id: crypto.randomUUID(), name: trimmed }
    await this.exercises.add(exercise)
    return exercise
  }

  async renameExercise(id: string, name: string): Promise<Exercise> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Exercise name cannot be empty')
    const existing = await this.exercises.get(id)
    if (!existing) throw new Error(`Exercise not found: ${id}`)
    const updated: Exercise = { ...existing, name: trimmed }
    await this.exercises.put(updated)
    return updated
  }

  async deleteExercise(id: string): Promise<void> {
    await this.exercises.delete(id)
  }

  async listWorkouts(): Promise<Workout[]> {
    const all = await this.workouts.toArray()
    return all.sort((a, b) => a.name.localeCompare(b.name))
  }

  async createWorkout(name: string, exerciseIds: string[]): Promise<Workout> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Workout name cannot be empty')
    const workout: Workout = { id: crypto.randomUUID(), name: trimmed, exerciseIds: [...exerciseIds] }
    await this.workouts.add(workout)
    return workout
  }

  async updateWorkout(
    id: string,
    updates: { name?: string; exerciseIds?: string[] }
  ): Promise<Workout> {
    const existing = await this.workouts.get(id)
    if (!existing) throw new Error(`Workout not found: ${id}`)

    const name = updates.name !== undefined ? updates.name.trim() : existing.name
    if (!name) throw new Error('Workout name cannot be empty')

    const exerciseIds =
      updates.exerciseIds !== undefined ? [...updates.exerciseIds] : existing.exerciseIds

    const updated: Workout = { ...existing, name, exerciseIds }
    await this.workouts.put(updated)
    return updated
  }

  async deleteWorkout(id: string): Promise<void> {
    await this.workouts.delete(id)
  }

  async reorderWorkoutExercises(id: string, exerciseIds: string[]): Promise<Workout> {
    const existing = await this.workouts.get(id)
    if (!existing) throw new Error(`Workout not found: ${id}`)

    if (!isSamePermutation(existing.exerciseIds, exerciseIds)) {
      throw new Error(
        'reorderWorkoutExercises must be given the same set of Exercise ids, only reordered'
      )
    }

    const updated: Workout = { ...existing, exerciseIds: [...exerciseIds] }
    await this.workouts.put(updated)
    return updated
  }

  /**
   * Snapshots the Workout's current name and Exercise list into the new
   * Session (ADR-0001) and denormalizes each Exercise's current name for
   * defensive display in case the Exercise is later deleted. Each Exercise's
   * Sets pre-fill from the most recent prior Session for this Workout, or
   * start empty if there is none.
   */
  async startSession(workoutId: string): Promise<Session> {
    const workout = await this.workouts.get(workoutId)
    if (!workout) throw new Error(`Workout not found: ${workoutId}`)

    const lastSession = await this.getLastSessionForWorkout(workoutId)

    const exercises: SessionExerciseEntry[] = await Promise.all(
      workout.exerciseIds.map(async (exerciseId) => {
        const exercise = await this.exercises.get(exerciseId)
        const priorSets =
          lastSession?.exercises.find((entry) => entry.exerciseId === exerciseId)?.sets ?? []
        return {
          exerciseId,
          exerciseNameAtLogTime: exercise?.name ?? exerciseId,
          sets: priorSets.map((set) => ({ ...set })),
        }
      })
    )

    const now = new Date().toISOString()
    const session: Session = {
      id: crypto.randomUUID(),
      workoutId: workout.id,
      workoutNameSnapshot: workout.name,
      exercises,
      startTime: now,
      endTime: null,
      notes: '',
      date: now,
    }
    await this.sessions.add(session)
    return session
  }

  async logSet(sessionId: string, exerciseId: string, set: SessionSet): Promise<Session> {
    const session = await this.requireSession(sessionId)
    if (!session.exercises.some((entry) => entry.exerciseId === exerciseId)) {
      throw new Error(`Exercise ${exerciseId} is not part of session ${sessionId}`)
    }

    const exercises = session.exercises.map((entry) =>
      entry.exerciseId === exerciseId ? { ...entry, sets: [...entry.sets, { ...set }] } : entry
    )
    const updated: Session = { ...session, exercises }
    await this.sessions.put(updated)
    return updated
  }

  async updateSet(
    sessionId: string,
    exerciseId: string,
    setIndex: number,
    set: SessionSet
  ): Promise<Session> {
    const session = await this.requireSession(sessionId)
    const entry = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!entry) throw new Error(`Exercise ${exerciseId} is not part of session ${sessionId}`)
    if (setIndex < 0 || setIndex >= entry.sets.length) {
      throw new Error(`Set index out of range: ${setIndex}`)
    }

    const exercises = session.exercises.map((e) =>
      e.exerciseId === exerciseId
        ? { ...e, sets: e.sets.map((s, i) => (i === setIndex ? { ...set } : s)) }
        : e
    )
    const updated: Session = { ...session, exercises }
    await this.sessions.put(updated)
    return updated
  }

  async endSession(sessionId: string, endTime: string = new Date().toISOString()): Promise<Session> {
    const session = await this.requireSession(sessionId)
    const updated: Session = { ...session, endTime }
    await this.sessions.put(updated)
    return updated
  }

  async updateSessionNotes(sessionId: string, notes: string): Promise<Session> {
    const session = await this.requireSession(sessionId)
    const updated: Session = { ...session, notes }
    await this.sessions.put(updated)
    return updated
  }

  async getLastSessionForWorkout(workoutId: string): Promise<Session | undefined> {
    const all = await this.sessions.toArray()
    const forWorkout = all.filter((session) => session.workoutId === workoutId)
    if (forWorkout.length === 0) return undefined
    return forWorkout.reduce((latest, session) =>
      session.startTime >= latest.startTime ? session : latest
    )
  }

  async deleteSet(sessionId: string, exerciseId: string, setIndex: number): Promise<Session> {
    const session = await this.requireSession(sessionId)
    const entry = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!entry) throw new Error(`Exercise ${exerciseId} is not part of session ${sessionId}`)
    if (setIndex < 0 || setIndex >= entry.sets.length) {
      throw new Error(`Set index out of range: ${setIndex}`)
    }

    const exercises = session.exercises.map((e) =>
      e.exerciseId === exerciseId
        ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
        : e
    )
    const updated: Session = { ...session, exercises }
    await this.sessions.put(updated)
    return updated
  }

  async updateSessionTimes(
    sessionId: string,
    updates: { startTime?: string; endTime?: string }
  ): Promise<Session> {
    const session = await this.requireSession(sessionId)
    const updated: Session = {
      ...session,
      startTime: updates.startTime ?? session.startTime,
      endTime: updates.endTime ?? session.endTime,
    }
    await this.sessions.put(updated)
    return updated
  }

  async listSessions(): Promise<Session[]> {
    const all = await this.sessions.toArray()
    // Ties on startTime break toward insertion order (later logged first) by
    // reversing before a stable sort, rather than toward array/table order,
    // which storage doesn't guarantee.
    return [...all].reverse().sort((a, b) => b.startTime.localeCompare(a.startTime))
  }

  async deleteSession(id: string): Promise<void> {
    await this.sessions.delete(id)
  }

  private async requireSession(id: string): Promise<Session> {
    const session = await this.sessions.get(id)
    if (!session) throw new Error(`Session not found: ${id}`)
    return session
  }
}
