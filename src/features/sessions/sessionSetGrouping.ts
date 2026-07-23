import type { SessionSet } from '@/store'

/** One logical Set: a single plain Set, or a left+right unilateral pair, each with its index into the original array. */
export interface SessionSetGroup {
  sets: Array<{ index: number; set: SessionSet }>
}

/**
 * Groups a flat SessionSet[] into logical Sets for display — a left Set
 * immediately followed by a right Set forms one pair group, everything else
 * is its own solo group. Pairing is inferred from `side` + adjacency, the
 * same invariant Store.logSet/deleteSet rely on (see ADR for unilateral Sets).
 */
export function groupSessionSets(sets: SessionSet[]): SessionSetGroup[] {
  const groups: SessionSetGroup[] = []
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i]
    const next = sets[i + 1]
    if (set.side === 'left' && next?.side === 'right') {
      groups.push({
        sets: [
          { index: i, set },
          { index: i + 1, set: next },
        ],
      })
      i++
    } else {
      groups.push({ sets: [{ index: i, set }] })
    }
  }
  return groups
}
