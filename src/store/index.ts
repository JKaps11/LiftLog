import EXERCISE_SEED from '@/data/exerciseSeed.json'
import type { EntityTable } from './table'
import {
  pendingSet,
  withoutAbsentMeasurements,
  EXERCISE_TYPES,
  MEASUREMENT_FIELDS,
  MUSCLE_GROUPS,
} from './types'
import type {
  Exercise,
  ExerciseType,
  ExportedData,
  MuscleGroup,
  Session,
  SessionExerciseEntry,
  SessionSet,
  SetMeasurements,
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

export {
  pendingSet,
  withoutAbsentMeasurements,
  EXERCISE_TYPES,
  MEASUREMENT_FIELDS,
  MUSCLE_GROUPS,
} from './types'
export type {
  Exercise,
  ExerciseType,
  ExportedData,
  MuscleGroup,
  Session,
  SessionExerciseEntry,
  SessionSet,
  SetMeasurements,
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

/** Whether a Set carries any measurement at all — the weakest sense of "was performed", used where the Exercise isn't at hand. */
export function carriesMeasurement(set: SessionSet): boolean {
  return set.weight !== undefined || set.reps !== undefined || set.durationSeconds !== undefined
}

/**
 * The Sets most recently performed for one Exercise, looked back through a
 * Workout's Sessions newest-first. Per-Exercise rather than per-Session because
 * untouched Sets are pruned at End Session: an Exercise skipped last week has no
 * Sets there to take a shape from, and the week before is the honest answer.
 *
 * Only fully Logged Sets qualify. A half-entered Set survives End Session, but it
 * is not performance to aim at: taking it as the source would shape today's
 * Session from an abandoned row and hint one measurement while leaving the other
 * blank, so a tap that reads as accepting would leave the Set Pending.
 */
function lastLoggedSetsForExercise(
  newestFirst: Session[],
  exerciseId: string,
  exercise: Exercise | undefined
): SessionSet[] | undefined {
  for (const session of newestFirst) {
    const sets = session.exercises
      .find((entry) => entry.exerciseId === exerciseId)
      ?.sets.filter((set) => isSetLogged(exercise, set))
    if (sets?.length) return sets
  }
  return undefined
}

/** How many Logical Sets a list represents — a left+right pair counts once, as the lifter counts it. */
function countLogicalSets(sets: SessionSet[] | undefined): number {
  if (!sets?.length) return 1

  let logicalSets = 0
  for (let i = 0; i < sets.length; i++) {
    if (sets[i].side === 'left' && sets[i + 1]?.side === 'right') i++
    logicalSets++
  }
  return logicalSets
}

/**
 * Builds `logicalSets` Logical Sets, all Pending. The count comes from history but
 * solo-vs-pair comes from the Exercise as it is configured now, consistent with
 * ADR-0005 — flipping an Exercise to unilateral should change how today's Sets
 * materialize rather than carrying a stale pattern forward.
 */
function materializePendingSets(logicalSets: number, isUnilateral: boolean): SessionSet[] {
  return Array.from({ length: logicalSets }, () =>
    isUnilateral
      ? [
          { ...pendingSet(), side: 'left' as const },
          { ...pendingSet(), side: 'right' as const },
        ]
      : [pendingSet()]
  ).flat()
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
  if (!exercise) return carriesMeasurement(set)
  return exercise.isTimed
    ? set.durationSeconds !== undefined
    : set.weight !== undefined && set.reps !== undefined
}

export class Store {
  private readonly exercises: EntityTable<Exercise>
  private readonly workouts: EntityTable<Workout>
  private readonly sessions: EntityTable<Session>
  private seedPromise: Promise<void> | null = null

  private sessionWrites: Promise<unknown> = Promise.resolve()

  constructor(deps: StoreDeps) {
    this.exercises = deps.exercises
    this.workouts = deps.workouts
    this.sessions = deps.sessions
  }

  /**
   * Runs Session read-modify-writes one at a time, so two mutations fired before
   * either lands can't both build from the same pre-mutation snapshot and write
   * each other's change away. Every Session mutator reads the whole Session and
   * puts it back, which makes any overlap a lost update: a digit typed into a
   * weight field at the same moment a Ghost Value is accepted used to keep
   * whichever write happened to finish last.
   *
   * The ordering lives here rather than in a database transaction because the
   * EntityTable port is deliberately storage-agnostic — Dexie in the app, a Map in
   * tests — and has no transaction to borrow. Reads stay unqueued. A queued method
   * must never call another queued method, which would wait on itself forever.
   *
   * A rejected write doesn't poison the queue: the next one runs either way.
   */
  private queueSessionWrite<T>(work: () => Promise<T>): Promise<T> {
    const result = this.sessionWrites.then(work, work)
    this.sessionWrites = result.then(
      () => undefined,
      () => undefined
    )
    return result
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
   * defensive display in case the Exercise is later deleted.
   *
   * Each Exercise opens as Pending Sets carrying no measurements (ADR-0004): the
   * *shape* of last time's work is carried over — how many Sets, and solo or
   * left/right pair — while the numbers are not, so nothing on screen claims to
   * have been performed. Last time's numbers surface separately as Ghost Values,
   * see getCarriedOverSets.
   *
   * An exerciseId with no Exercise behind it is skipped rather than snapshotted
   * — the denormalized name would be the raw uuid, and a Session is permanent,
   * so the bad name could never be repaired afterward.
   */
  async startSession(workoutId: string): Promise<Session> {
    const workout = await this.workouts.get(workoutId)
    if (!workout) throw new Error(`Workout not found: ${workoutId}`)

    const history = await this.sessionsForWorkout(workoutId)

    const resolved = await Promise.all(
      workout.exerciseIds.map(async (exerciseId) => {
        const exercise = await this.exercises.get(exerciseId)
        if (!exercise) return null
        const carried = lastLoggedSetsForExercise(history, exerciseId, exercise)
        return {
          exerciseId,
          exerciseNameAtLogTime: exercise.name,
          sets: materializePendingSets(countLogicalSets(carried), exercise.isUnilateral),
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
    return this.queueSessionWrite(async () => {
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
    })
  }

  /**
   * Merges a patch of measurements into a stored Set rather than replacing the
   * whole Set, so a write only claims the fields it actually names. Two writes
   * aimed at the same Set — the digit being typed into weight, and the reps a
   * Ghost Value accept is filling in — then compose instead of clobbering,
   * whichever order they land in.
   *
   * A key present with the value `undefined` clears that measurement, which is how
   * emptying a field returns a Logged Set to Pending; a key merely absent from the
   * patch leaves the stored measurement alone. `side` is per-Set data rather than a
   * measurement and is never patched in practice, but survives either way.
   */
  async updateSet(
    sessionId: string,
    exerciseId: string,
    setIndex: number,
    patch: Partial<SessionSet>
  ): Promise<Session> {
    return this.queueSessionWrite(async () => {
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
              sets: e.sets.map((s, i) =>
                i === setIndex ? withoutAbsentMeasurements({ ...s, ...patch }) : s
              ),
            }
          : e
      )
      const updated: Session = { ...session, exercises }
      await this.sessions.put(updated)
      return updated
    })
  }

  /**
   * Fills in measurements the stored Set is missing, and only those — the write
   * behind accepting Ghost Values.
   *
   * What counts as missing is decided here, against the Set as stored, rather than
   * taken from the caller's snapshot of it. That is what makes it safe to fire this
   * while a keystroke is still in flight: a measurement the lifter typed a moment
   * ago is already present by the time this runs, so it survives instead of being
   * overwritten by the hint it was replacing. A caller can only ever add to a Set
   * this way, never change it.
   *
   * Writes nothing when the Set already carries everything offered, so a redundant
   * accept costs no round-trip.
   */
  async fillSetMeasurements(
    sessionId: string,
    exerciseId: string,
    setIndex: number,
    values: SetMeasurements
  ): Promise<Session> {
    return this.queueSessionWrite(async () => {
      const session = await this.requireSession(sessionId)
      const entry = session.exercises.find((e) => e.exerciseId === exerciseId)
      if (!entry) throw new Error(`Exercise ${exerciseId} is not part of session ${sessionId}`)
      const stored = entry.sets[setIndex]
      if (!stored) throw new Error(`Set index out of range: ${setIndex}`)

      const filled: SessionSet = { ...stored }
      let changed = false
      for (const field of MEASUREMENT_FIELDS) {
        if (stored[field] === undefined && values[field] !== undefined) {
          filled[field] = values[field]
          changed = true
        }
      }
      if (!changed) return session

      const exercises = session.exercises.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, sets: e.sets.map((s, i) => (i === setIndex ? filled : s)) }
          : e
      )
      const updated: Session = { ...session, exercises }
      await this.sessions.put(updated)
      return updated
    })
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
    return this.queueSessionWrite(async () => {
      const session = await this.requireSession(sessionId)
      const exercises = session.exercises.map((entry) => ({
        ...entry,
        sets: entry.sets.filter(carriesMeasurement),
      }))
      const updated: Session = { ...session, exercises, endTime }
      await this.sessions.put(updated)
      return updated
    })
  }

  async updateSessionNotes(sessionId: string, notes: string): Promise<Session> {
    return this.queueSessionWrite(async () => {
      const session = await this.requireSession(sessionId)
      const updated: Session = { ...session, notes }
      await this.sessions.put(updated)
      return updated
    })
  }

  /** This Workout's Sessions, newest first, optionally excluding one — used to look back for Carried-Over Shape and Ghost Values. */
  private async sessionsForWorkout(workoutId: string, excludeId?: string): Promise<Session[]> {
    const all = await this.sessions.toArray()
    const forWorkout = all.filter(
      (session) => session.workoutId === workoutId && session.id !== excludeId
    )
    return sortByStartTimeDescending(forWorkout)
  }

  /**
   * The Ghost Value source for each Exercise in a Session, keyed by exerciseId:
   * the Sets most recently performed for that Exercise in this Workout, looked
   * back per-Exercise so one skipped week doesn't erase the reference numbers.
   *
   * Excludes the given Session so an in-progress Session never ghosts from
   * itself. Scoped to the same Workout deliberately — Exercise history spans
   * every Workout for progress-tracking, but a hint must be contextual, and a
   * heavy Bench Press on Push Day shouldn't suggest itself during Full Body.
   *
   * Read live while the Session is open rather than snapshotted, which does not
   * conflict with ADR-0001: a Ghost Value is a transient hint and is never
   * persisted. Editing an old Session mid-workout does shift today's hints.
   */
  async getCarriedOverSets(sessionId: string): Promise<Record<string, SessionSet[]>> {
    const session = await this.requireSession(sessionId)
    const history = await this.sessionsForWorkout(session.workoutId, sessionId)

    const carried: Record<string, SessionSet[]> = {}
    for (const entry of session.exercises) {
      const exercise = await this.exercises.get(entry.exerciseId)
      const sets = lastLoggedSetsForExercise(history, entry.exerciseId, exercise)
      if (sets) carried[entry.exerciseId] = sets
    }
    return carried
  }

  /**
   * A Set with a `side` is one half of a left+right pair (see logSet) —
   * pairs are always adjacent in the array, so deleting either half removes
   * both. A plain Set (no `side`) is removed alone, as today.
   */
  async deleteSet(sessionId: string, exerciseId: string, setIndex: number): Promise<Session> {
    return this.queueSessionWrite(async () => {
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
    })
  }

  async updateSessionTimes(
    sessionId: string,
    updates: { startTime?: string; endTime?: string }
  ): Promise<Session> {
    return this.queueSessionWrite(async () => {
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
    })
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
