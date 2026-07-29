import { isSetLogged, withoutAbsentMeasurements, type Exercise, type SessionSet } from '@/store'
import { groupSessionSets } from './sessionSetGrouping'

/** Which measurement fields a Set row shows: a single duration, or weight x reps. */
export type SetLayout = 'timed' | 'weighted'

/** One measurement field: the value actually performed, and the Ghost Value hinted behind it while absent. */
export interface SetField {
  value: number | undefined
  ghost: number | undefined
}

/** Everything a Set row needs to render. Only the fields its layout calls for are present. */
export interface SetRowDisplay {
  layout: SetLayout
  isLogged: boolean
  duration?: SetField
  weight?: SetField
  reps?: SetField
}

/**
 * Resolves a Set row's layout from the *live* Exercise rather than from which
 * measurement fields the Set happens to carry (ADR-0005) — a Pending Set
 * carries none, so field presence can't distinguish a pending hold from a
 * pending lift. Falls back to the Set's own measurements when the Exercise has
 * been deleted, mirroring resolveExerciseDisplayName; that fallback is exact for
 * every Logged Set, and a Pending Set of a deleted Exercise lands on weighted.
 */
export function resolveSetLayout(exercise: Exercise | undefined, set: SessionSet): SetLayout {
  if (exercise) return exercise.isTimed ? 'timed' : 'weighted'
  return set.durationSeconds !== undefined ? 'timed' : 'weighted'
}

/**
 * The Ghost Value source for each Set in an Exercise's list, indexed in step
 * with `sets`. Within a Session, a Pending Set is hinted by the last Set the
 * lifter actually Logged *before* it — not after, so a Set logged later out of
 * order never suggests itself backwards.
 *
 * Sides are matched across pairs so the left hand hints the left hand. When the
 * source is a solo Set and the target a pair (Sets logged before the Exercise
 * became unilateral), both sides fall back to that solo Set: an approximate hint
 * beats none, and a Ghost Value is never stored, so a wrong guess costs nothing.
 */
export function resolveGhostSets(
  sets: SessionSet[],
  exercise: Exercise | undefined
): Array<SessionSet | undefined> {
  const groups = groupSessionSets(sets)
  const ghosts = new Array<SessionSet | undefined>(sets.length).fill(undefined)

  let lastLogged: { sets: Array<{ index: number; set: SessionSet }> } | undefined
  for (const group of groups) {
    const allLogged = group.sets.every(({ set }) => isSetLogged(exercise, set))
    if (allLogged) {
      lastLogged = group
      continue
    }
    if (!lastLogged) continue

    for (const { index, set } of group.sets) {
      if (isSetLogged(exercise, set)) continue
      const bySide = set.side
        ? lastLogged.sets.find((candidate) => candidate.set.side === set.side)
        : undefined
      ghosts[index] = (bySide ?? lastLogged.sets[0]).set
    }
  }
  return ghosts
}

/** Resolves one Set row's layout, done-ness, and per-field value/Ghost Value pairs. */
export function resolveSetRow(
  exercise: Exercise | undefined,
  set: SessionSet,
  ghost: SessionSet | undefined
): SetRowDisplay {
  const layout = resolveSetLayout(exercise, set)
  const isLogged = isSetLogged(exercise, set)
  if (layout === 'timed') {
    return {
      layout,
      isLogged,
      duration: { value: set.durationSeconds, ghost: ghost?.durationSeconds },
    }
  }
  return {
    layout,
    isLogged,
    weight: { value: set.weight, ghost: ghost?.weight },
    reps: { value: set.reps, ghost: ghost?.reps },
  }
}

/**
 * Accepting a Pending Set's Ghost Values: fills every measurement the row is
 * still missing, in one act, so touching the weight field logs the whole Set
 * rather than leaving the reps behind for a second tap.
 *
 * Returns `undefined` when there is nothing to write — no Ghost Values, or the
 * Set is already Logged — so the caller can skip the round-trip entirely rather
 * than persisting a no-op and re-rendering.
 */
export function acceptGhostValues(
  exercise: Exercise | undefined,
  set: SessionSet,
  ghost: SessionSet | undefined
): SessionSet | undefined {
  if (!ghost || isSetLogged(exercise, set)) return undefined

  const accepted: SessionSet = { ...set }
  if (resolveSetLayout(exercise, set) === 'timed') {
    accepted.durationSeconds = set.durationSeconds ?? ghost.durationSeconds
  } else {
    accepted.weight = set.weight ?? ghost.weight
    accepted.reps = set.reps ?? ghost.reps
  }

  const cleaned = withoutAbsentMeasurements(accepted)
  const unchanged = JSON.stringify(cleaned) === JSON.stringify(withoutAbsentMeasurements(set))
  return unchanged ? undefined : cleaned
}
