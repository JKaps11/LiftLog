import { isSetLogged, type Exercise, type SessionSet, type SetMeasurements } from '@/store'
import { groupSessionSets, type SessionSetGroup } from './sessionSetGrouping'

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

/** Picks the Set within a source group that should hint `set` — the same side where both are pairs, otherwise the group's first. */
function hintFor(
  source: SessionSetGroup | undefined,
  set: SessionSet
): SessionSet | undefined {
  if (!source) return undefined
  const bySide = set.side
    ? source.sets.find((candidate) => candidate.set.side === set.side)
    : undefined
  return (bySide ?? source.sets[0]).set
}

/**
 * The Ghost Value source for each Set in an Exercise's list, indexed in step
 * with `sets`.
 *
 * A Pending Set's hint is its counterpart in `carriedSets` — the Sets performed
 * the last time this Exercise was Logged in this Workout. A Set added beyond that
 * count has no counterpart, so it falls back to the last Set Logged *earlier in
 * this Session*; not later, so a Set logged out of order never suggests itself
 * backwards.
 *
 * Sides are matched across pairs so the left hand hints the left hand. Where the
 * source is a solo Set and the target a pair (history predating the Exercise
 * becoming unilateral), both sides fall back to that solo Set: an approximate
 * hint beats none, and a Ghost Value is never stored, so a wrong guess costs
 * nothing but a glance.
 */
export function resolveGhostSets(
  sets: SessionSet[],
  exercise: Exercise | undefined,
  carriedSets: SessionSet[] = []
): Array<SessionSet | undefined> {
  const groups = groupSessionSets(sets)
  const carriedGroups = groupSessionSets(carriedSets)
  const ghosts = new Array<SessionSet | undefined>(sets.length).fill(undefined)

  let lastLogged: SessionSetGroup | undefined
  groups.forEach((group, groupIndex) => {
    if (group.sets.every(({ set }) => isSetLogged(exercise, set))) {
      lastLogged = group
      return
    }
    for (const { index, set } of group.sets) {
      if (isSetLogged(exercise, set)) continue
      ghosts[index] = hintFor(carriedGroups[groupIndex], set) ?? hintFor(lastLogged, set)
    }
  })
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
 * The Ghost Values on offer when a Pending Set is touched: every measurement the
 * row's layout calls for that the hint can supply, so touching the weight field
 * logs the whole Set rather than leaving the reps behind for a second tap.
 *
 * These are *offered*, not imposed — Store.fillSetMeasurements writes only the ones
 * the Set is still missing when the write actually runs. Which measurements are
 * missing is deliberately not decided here: `set` is a render old, so a weight the
 * lifter typed a moment ago can still look absent, and a value chosen on that basis
 * would overwrite the digit that replaced it.
 *
 * Returns `undefined` when the row plainly has nothing to gain — already Logged, or
 * no Ghost Value it is missing — so the caller can skip the round-trip rather than
 * persisting a no-op and re-rendering. That check reads the same stale snapshot, but
 * being wrong now costs a write the Store will decline, not a lost measurement.
 */
export function acceptGhostValues(
  exercise: Exercise | undefined,
  set: SessionSet,
  ghost: SessionSet | undefined
): SetMeasurements | undefined {
  if (!ghost || isSetLogged(exercise, set)) return undefined

  const fields =
    resolveSetLayout(exercise, set) === 'timed' ? (['durationSeconds'] as const) : (['weight', 'reps'] as const)
  const offered: SetMeasurements = {}
  for (const field of fields) {
    if (ghost[field] !== undefined) offered[field] = ghost[field]
  }

  const fillsSomething = fields.some(
    (field) => offered[field] !== undefined && set[field] === undefined
  )
  return fillsSomething ? offered : undefined
}
