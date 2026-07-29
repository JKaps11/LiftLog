import type { Exercise, SessionSet } from '@/store'

/** Which measurement fields a Set row shows: a single duration, or weight x reps. */
export type SetLayout = 'timed' | 'weighted'

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
