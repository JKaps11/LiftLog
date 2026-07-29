import EXERCISE_SEED from '@/data/exerciseSeed.json'
import type { EntityTable } from './table'
import { pendingSet, withoutAbsentMeasurements, EXERCISE_TYPES, MUSCLE_GROUPS } from './types'
import type {
  Exercise,
  ExerciseType,
  ExportedData,
  MuscleGroup,
  Session,
  SessionExerciseEntry,
  SessionSet,
  Workout,
} from './types'

/** Fails fast on a typo'd seed entry rather than silently persisting an invalid Exercise. */
function parseMuscleGroup(value: string): MuscleGroup {
  if (!MUSCLE_GROUPS.includes(value as MuscleGroup)) {
    throw new Error(`Invalid seed primaryMuscleGroup: ${value}`)
  }
  return value as MuscleGroup
}

function parseExerciseType(value: string): ExerciseType {
  if (!EXERCISE_TYPES.includes(value as ExerciseType)) {
    throw new Error(`Invalid seed type: ${value}`)
  }
  return value as ExerciseType
}

export { pendingSet, withoutAbsentMeasurements, EXERCISE_TYPES, MUSCLE_GROUPS } from './types'
export type {
  Exercise,
  ExerciseType,
  ExportedData,
  MuscleGroup,
  Session,
  SessionExerciseEntry,
  SessionSet,
  Workout,
} from './types'
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

function sortByStartTimeDescending(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.startTime.localeCompare(a.startTime))
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

/**
 * Whether a Set records work actually performed, as opposed to a Pending Set
 * awaiting its numbers (ADR-0004). Which measurements are required follows from
 * the Exercise, never from which fields happen to be present (ADR-0005): a timed
 * Exercise needs a duration, anything else needs both weight and reps. Zero is a
 * real measurement — bodyweight work is `weight: 0`, and a failed Set is
 * `reps: 0` — so absence, not falsiness, is the test.
 *
 * Falls back to "carries any measurement" when the Exercise has been deleted,
 * mirroring resolveExerciseDisplayName.
 */
export function isSetLogged(exercise: Exercise | undefined, set: SessionSet): boolean {
  if (!exercise) {
    return set.weight !== undefined || set.reps !== undefined || set.durationSeconds !== undefined
  }
  return exercise.isTimed
    ? set.durationSeconds !== undefined
    : set.weight !== undefined && set.reps !== undefined
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
    const seeded: Exercise[] = EXERCISE_SEED.map((entry) => ({
      id: crypto.randomUUID(),
      name: entry.name,
      isUnilateral: entry.isUnilateral ?? false,
      isTimed: entry.isTimed ?? false,
      primaryMuscleGroup: parseMuscleGroup(entry.primaryMuscleGroup),
      otherMuscleGroups: (entry.otherMuscleGroups ?? []).map(parseMuscleGroup),
      type: parseExerciseType(entry.type),
    }))
    await this.exercises.bulkAdd(seeded)
  }

  async listExercises(): Promise<Exercise[]> {
    const all = await this.exercises.toArray()
    return all.sort((a, b) => a.name.localeCompare(b.name))
  }

  async createExercise(
    name: string,
    options: {
      isUnilateral?: boolean
      isTimed?: boolean
      primaryMuscleGroup: MuscleGroup
      type: ExerciseType
      otherMuscleGroups?: MuscleGroup[]
    }
  ): Promise<Exercise> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Exercise name cannot be empty')
    const exercise: Exercise = {
      id: crypto.randomUUID(),
      name: trimmed,
      isUnilateral: options.isUnilateral ?? false,
      isTimed: options.isTimed ?? false,
      primaryMuscleGroup: options.primaryMuscleGroup,
      otherMuscleGroups: options.otherMuscleGroups ?? [],
      type: options.type,
    }
    await this.exercises.add(exercise)
    return exercise
  }

  async updateExercise(
    id: string,
    updates: {
      name?: string
      isUnilateral?: boolean
      isTimed?: boolean
      primaryMuscleGroup?: MuscleGroup
      otherMuscleGroups?: MuscleGroup[]
      type?: ExerciseType
    }
  ): Promise<Exercise> {
    const existing = await this.exercises.get(id)
    if (!existing) throw new Error(`Exercise not found: ${id}`)

    const name = updates.name !== undefined ? updates.name.trim() : existing.name
    if (!name) throw new Error('Exercise name cannot be empty')

    const isUnilateral = updates.isUnilateral !== undefined ? updates.isUnilateral : existing.isUnilateral
    const isTimed = updates.isTimed !== undefined ? updates.isTimed : existing.isTimed
    const primaryMuscleGroup = updates.primaryMuscleGroup ?? existing.primaryMuscleGroup
    const otherMuscleGroups = updates.otherMuscleGroups ?? existing.otherMuscleGroups
    const type = updates.type ?? existing.type

    const updated: Exercise = {
      ...existing,
      name,
      isUnilateral,
      isTimed,
      primaryMuscleGroup,
      otherMuscleGroups,
      type,
    }
    await this.exercises.put(updated)
    return updated
  }

  /**
   * Cascades into Workouts, which hold live references — a Workout must never
   * keep an exerciseId with no Exercise behind it, or the UI has nothing to
   * render but the raw id. Sessions are deliberately left alone: they are
   * snapshots (ADR-0001) and already carry exerciseNameAtLogTime for exactly
   * this case.
   */
  async deleteExercise(id: string): Promise<void> {
    await this.exercises.delete(id)

    const affected = (await this.workouts.toArray()).filter((workout) =>
      workout.exerciseIds.includes(id)
    )
    await Promise.all(
      affected.map((workout) =>
        this.workouts.put({
          ...workout,
          exerciseIds: workout.exerciseIds.filter((exerciseId) => exerciseId !== id),
        })
      )
    )
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
   * start with a single empty set if there is none.
   *
   * An exerciseId with no Exercise behind it is skipped rather than snapshotted
   * — the denormalized name would be the raw uuid, and a Session is permanent,
   * so the bad name could never be repaired afterward.
   */
  async startSession(workoutId: string): Promise<Session> {
    const workout = await this.workouts.get(workoutId)
    if (!workout) throw new Error(`Workout not found: ${workoutId}`)

    const lastSession = await this.getLastSessionForWorkout(workoutId)

    const resolved = await Promise.all(
      workout.exerciseIds.map(async (exerciseId) => {
        const exercise = await this.exercises.get(exerciseId)
        if (!exercise) return null
        const priorSets = lastSession?.exercises.find((entry) => entry.exerciseId === exerciseId)
          ?.sets ?? [pendingSet()]
        return {
          exerciseId,
          exerciseNameAtLogTime: exercise.name,
          sets: priorSets.map((set) => ({ ...set })),
        }
      })
    )
    const exercises: SessionExerciseEntry[] = resolved.filter((entry) => entry !== null)

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

  /**
   * Against a unilateral Exercise (checked live by exerciseId), appends a
   * left+right pair of Sets in one call instead of a single Set. When `set` is
   * omitted (the "Add set" path) the new Set is Pending — no measurements at all
   * — so an added Set never reads as already performed.
   *
   * Nothing is carried forward into it. This supersedes the previous
   * carry-the-weight-forward behavior, which existed to avoid retyping the load
   * but deliberately withheld reps because "a prefilled count you forget to
   * correct silently records a lift that never happened". Ghost Values solve that
   * properly: last Session's numbers are shown as placeholders and can be
   * accepted in one tap, without any of them being stored until they are.
   */
  async logSet(sessionId: string, exerciseId: string, set?: SessionSet): Promise<Session> {
    const session = await this.requireSession(sessionId)
    const entry = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!entry) {
      throw new Error(`Exercise ${exerciseId} is not part of session ${sessionId}`)
    }

    const exercise = await this.exercises.get(exerciseId)
    const isUnilateral = exercise?.isUnilateral ?? false

    function build(side?: 'left' | 'right'): SessionSet {
      const base = set ?? pendingSet()
      return withoutAbsentMeasurements(side ? { ...base, side } : { ...base })
    }
    const newSets: SessionSet[] = isUnilateral ? [build('left'), build('right')] : [build()]

    const exercises = session.exercises.map((e) =>
      e.exerciseId === exerciseId ? { ...e, sets: [...e.sets, ...newSets] } : e
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
        ? {
            ...e,
            sets: e.sets.map((s, i) => (i === setIndex ? withoutAbsentMeasurements(set) : s)),
          }
        : e
    )
    const updated: Session = { ...session, exercises }
    await this.sessions.put(updated)
    return updated
  }

  /**
   * Prunes Sets that were never touched, so a finished Session stores only work
   * actually performed (ADR-0004) — otherwise a skipped Exercise's untouched Sets
   * would be recorded as lifts and go on to seed the next Session's Ghost Values.
   *
   * The rule here is deliberately looser than isSetLogged: only a Set carrying no
   * measurement at all is dropped. A half-entered Set survives, because silently
   * discarding a number the lifter typed is worse than keeping one odd row, even
   * though that row still reads as not-done in the UI.
   *
   * An Exercise left with nothing keeps its entry with an empty Set list. The
   * entry is the ADR-0001 snapshot of what the Workout contained that day, so
   * dropping it would erase the fact that the Exercise was skipped.
   */
  async endSession(sessionId: string, endTime: string = new Date().toISOString()): Promise<Session> {
    const session = await this.requireSession(sessionId)
    const exercises = session.exercises.map((entry) => ({
      ...entry,
      sets: entry.sets.filter(
        (set) =>
          set.weight !== undefined || set.reps !== undefined || set.durationSeconds !== undefined
      ),
    }))
    const updated: Session = { ...session, exercises, endTime }
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
    return sortByStartTimeDescending(forWorkout)[0]
  }

  /**
   * A Set with a `side` is one half of a left+right pair (see logSet) —
   * pairs are always adjacent in the array, so deleting either half removes
   * both. A plain Set (no `side`) is removed alone, as today.
   */
  async deleteSet(sessionId: string, exerciseId: string, setIndex: number): Promise<Session> {
    const session = await this.requireSession(sessionId)
    const entry = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!entry) throw new Error(`Exercise ${exerciseId} is not part of session ${sessionId}`)
    if (setIndex < 0 || setIndex >= entry.sets.length) {
      throw new Error(`Set index out of range: ${setIndex}`)
    }

    const target = entry.sets[setIndex]
    const indicesToRemove =
      target.side === 'left'
        ? [setIndex, setIndex + 1]
        : target.side === 'right'
          ? [setIndex - 1, setIndex]
          : [setIndex]

    const exercises = session.exercises.map((e) =>
      e.exerciseId === exerciseId
        ? { ...e, sets: e.sets.filter((_, i) => !indicesToRemove.includes(i)) }
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
    const startTime = updates.startTime ?? session.startTime
    const updated: Session = {
      ...session,
      startTime,
      endTime: updates.endTime ?? session.endTime,
      // date tracks startTime's day — keep them in sync when startTime moves.
      date: startTime,
    }
    await this.sessions.put(updated)
    return updated
  }

  async listSessions(): Promise<Session[]> {
    const all = await this.sessions.toArray()
    return sortByStartTimeDescending(all)
  }

  /** The in-progress Session (if any) to resume into after a refresh or app relaunch. */
  async getActiveSession(): Promise<Session | undefined> {
    const all = await this.sessions.toArray()
    return sortByStartTimeDescending(all.filter((session) => session.endTime === null))[0]
  }

  async deleteSession(id: string): Promise<void> {
    await this.sessions.delete(id)
  }

  async exportData(): Promise<ExportedData> {
    const [exercises, workouts, sessions] = await Promise.all([
      this.exercises.toArray(),
      this.workouts.toArray(),
      this.sessions.toArray(),
    ])
    return { version: 1, exercises, workouts, sessions }
  }

  /** Replaces all local data with the given export — this is a full restore, not a merge. */
  async importData(data: ExportedData): Promise<void> {
    await Promise.all([this.exercises.clear(), this.workouts.clear(), this.sessions.clear()])
    await Promise.all([
      data.exercises.length > 0 ? this.exercises.bulkAdd(data.exercises) : undefined,
      data.workouts.length > 0 ? this.workouts.bulkAdd(data.workouts) : undefined,
      data.sessions.length > 0 ? this.sessions.bulkAdd(data.sessions) : undefined,
    ])
  }

  private async requireSession(id: string): Promise<Session> {
    const session = await this.sessions.get(id)
    if (!session) throw new Error(`Session not found: ${id}`)
    return session
  }
}
