import { describe, expect, it } from 'vitest'
import { groupSessionSets } from './sessionSetGrouping'
import type { SessionSet } from '@/store'

describe('groupSessionSets', () => {
  it('groups each plain Set (no side) into its own solo group', () => {
    const sets: SessionSet[] = [
      { weight: 100, reps: 5 },
      { weight: 105, reps: 5 },
    ]

    expect(groupSessionSets(sets)).toEqual([
      { sets: [{ index: 0, set: sets[0] }] },
      { sets: [{ index: 1, set: sets[1] }] },
    ])
  })

  it('groups a left Set immediately followed by a right Set into one pair', () => {
    const sets: SessionSet[] = [
      { weight: 40, reps: 10, side: 'left' },
      { weight: 40, reps: 10, side: 'right' },
    ]

    expect(groupSessionSets(sets)).toEqual([
      {
        sets: [
          { index: 0, set: sets[0] },
          { index: 1, set: sets[1] },
        ],
      },
    ])
  })

  it('groups plain Sets and unilateral pairs together in order', () => {
    const sets: SessionSet[] = [
      { weight: 100, reps: 5 },
      { weight: 40, reps: 10, side: 'left' },
      { weight: 40, reps: 10, side: 'right' },
      { weight: 105, reps: 5 },
    ]

    expect(groupSessionSets(sets)).toEqual([
      { sets: [{ index: 0, set: sets[0] }] },
      {
        sets: [
          { index: 1, set: sets[1] },
          { index: 2, set: sets[2] },
        ],
      },
      { sets: [{ index: 3, set: sets[3] }] },
    ])
  })

  it('treats an orphaned right Set (no preceding left) as its own solo group', () => {
    const sets: SessionSet[] = [{ weight: 40, reps: 10, side: 'right' }]

    expect(groupSessionSets(sets)).toEqual([{ sets: [{ index: 0, set: sets[0] }] }])
  })

  it('returns an empty list for an empty Set array', () => {
    expect(groupSessionSets([])).toEqual([])
  })
})
