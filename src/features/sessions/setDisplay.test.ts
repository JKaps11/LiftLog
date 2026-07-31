import { describe, expect, it } from 'vitest'
import type { Exercise } from '@/store'
import { acceptGhostValues, resolveGhostSets, resolveSetLayout, resolveSetRow } from './setDisplay'

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'ex-1',
    name: 'Bench Press',
    isUnilateral: false,
    isTimed: false,
    primaryMuscleGroup: 'chest',
    otherMuscleGroups: [],
    type: 'strength',
    ...overrides,
  }
}

describe('resolveSetLayout', () => {
  it('lays out a Set against a timed Exercise as a duration field', () => {
    expect(resolveSetLayout(exercise({ isTimed: true }), { durationSeconds: 60 })).toBe('timed')
  })

  it('lays out a Set against a weighted Exercise as weight x reps', () => {
    expect(resolveSetLayout(exercise(), { weight: 135, reps: 8 })).toBe('weighted')
  })

  it('lays out a Pending Set, which carries no measurements, from the Exercise alone', () => {
    expect(resolveSetLayout(exercise({ isTimed: true }), {})).toBe('timed')
    expect(resolveSetLayout(exercise(), {})).toBe('weighted')
  })

  it('lays out a Set carrying a duration as weighted once its Exercise is flagged weighted (ADR-0005)', () => {
    expect(resolveSetLayout(exercise({ isTimed: false }), { durationSeconds: 60 })).toBe('weighted')
  })

  it('lays out a Set carrying weight/reps as timed once its Exercise is flagged timed (ADR-0005)', () => {
    expect(resolveSetLayout(exercise({ isTimed: true }), { weight: 135, reps: 8 })).toBe('timed')
  })

  it('falls back to the Set’s own measurements when the Exercise has been deleted', () => {
    expect(resolveSetLayout(undefined, { durationSeconds: 60 })).toBe('timed')
    expect(resolveSetLayout(undefined, { weight: 135, reps: 8 })).toBe('weighted')
  })

  it('falls back to weighted for a Pending Set whose Exercise has been deleted', () => {
    expect(resolveSetLayout(undefined, {})).toBe('weighted')
  })
})

describe('resolveGhostSets', () => {
  it('offers no Ghost Values when every Set is already Logged', () => {
    const sets = [
      { weight: 135, reps: 8 },
      { weight: 135, reps: 8 },
    ]
    expect(resolveGhostSets(sets, exercise())).toEqual([undefined, undefined])
  })

  it('ghosts a Pending Set from the Logged Set before it', () => {
    const sets = [{ weight: 135, reps: 8 }, {}]
    expect(resolveGhostSets(sets, exercise())).toEqual([undefined, { weight: 135, reps: 8 }])
  })

  it('ghosts from the most recent Logged Set, not the first', () => {
    const sets = [{ weight: 135, reps: 8 }, { weight: 145, reps: 6 }, {}]
    expect(resolveGhostSets(sets, exercise())[2]).toEqual({ weight: 145, reps: 6 })
  })

  it('offers no Ghost Value when nothing has been Logged yet', () => {
    expect(resolveGhostSets([{}, {}], exercise())).toEqual([undefined, undefined])
  })

  it('ghosts a Pending Set from the Logged Set before it, not one logged after it', () => {
    const sets = [{ weight: 135, reps: 8 }, {}, { weight: 155, reps: 4 }]
    expect(resolveGhostSets(sets, exercise())[1]).toEqual({ weight: 135, reps: 8 })
  })

  it('matches left to left and right to right across unilateral pairs', () => {
    const unilateral = exercise({ isUnilateral: true })
    const sets = [
      { weight: 40, reps: 10, side: 'left' as const },
      { weight: 35, reps: 10, side: 'right' as const },
      { side: 'left' as const },
      { side: 'right' as const },
    ]
    const ghosts = resolveGhostSets(sets, unilateral)
    expect(ghosts[2]).toEqual({ weight: 40, reps: 10, side: 'left' })
    expect(ghosts[3]).toEqual({ weight: 35, reps: 10, side: 'right' })
  })

  it('ghosts both sides of a Pending pair from a solo Logged Set predating the Exercise becoming unilateral', () => {
    const unilateral = exercise({ isUnilateral: true })
    const sets = [
      { weight: 30, reps: 10 },
      { side: 'left' as const },
      { side: 'right' as const },
    ]
    const ghosts = resolveGhostSets(sets, unilateral)
    expect(ghosts[1]).toEqual({ weight: 30, reps: 10 })
    expect(ghosts[2]).toEqual({ weight: 30, reps: 10 })
  })

  it('ghosts a duration for a timed Exercise', () => {
    const plank = exercise({ isTimed: true })
    expect(resolveGhostSets([{ durationSeconds: 60 }, {}], plank)[1]).toEqual({
      durationSeconds: 60,
    })
  })

  it('treats a partially-entered Set as not a Ghost Value source', () => {
    const sets = [{ weight: 135, reps: 8 }, { weight: 145 }, {}]
    expect(resolveGhostSets(sets, exercise())[2]).toEqual({ weight: 135, reps: 8 })
  })
})

describe('resolveSetRow', () => {
  it('shows a Pending Set’s Ghost Values with no solid values', () => {
    const row = resolveSetRow(exercise(), {}, { weight: 135, reps: 8 })
    expect(row.layout).toBe('weighted')
    expect(row.isLogged).toBe(false)
    expect(row.weight).toEqual({ value: undefined, ghost: 135 })
    expect(row.reps).toEqual({ value: undefined, ghost: 8 })
  })

  it('shows a Logged Set’s solid values', () => {
    const row = resolveSetRow(exercise(), { weight: 145, reps: 6 }, { weight: 135, reps: 8 })
    expect(row.isLogged).toBe(true)
    expect(row.weight?.value).toBe(145)
    expect(row.reps?.value).toBe(6)
  })

  it('keeps the Ghost Value on the still-empty field of a partially-entered Set', () => {
    const row = resolveSetRow(exercise(), { weight: 145 }, { weight: 135, reps: 8 })
    expect(row.isLogged).toBe(false)
    expect(row.weight).toEqual({ value: 145, ghost: 135 })
    expect(row.reps).toEqual({ value: undefined, ghost: 8 })
  })

  it('offers neither value nor Ghost Value for a Pending Set with no history', () => {
    const row = resolveSetRow(exercise(), {}, undefined)
    expect(row.weight).toEqual({ value: undefined, ghost: undefined })
    expect(row.reps).toEqual({ value: undefined, ghost: undefined })
  })

  it('exposes only a duration field for a timed Exercise', () => {
    const row = resolveSetRow(exercise({ isTimed: true }), {}, { durationSeconds: 60 })
    expect(row.layout).toBe('timed')
    expect(row.duration).toEqual({ value: undefined, ghost: 60 })
    expect(row.weight).toBeUndefined()
    expect(row.reps).toBeUndefined()
  })
})

describe('acceptGhostValues', () => {
  it('offers every measurement of a Pending Set from its Ghost Values in one go', () => {
    expect(acceptGhostValues(exercise(), {}, { weight: 135, reps: 8 })).toEqual({
      weight: 135,
      reps: 8,
    })
  })

  it('still offers a measurement the Set appears to carry, leaving it to the Store to decline', () => {
    // Which measurements are missing is decided at write time, not from this
    // one-render-old Set — see Store.fillSetMeasurements.
    expect(acceptGhostValues(exercise(), { weight: 145 }, { weight: 135, reps: 8 })).toEqual({
      weight: 135,
      reps: 8,
    })
  })

  it('leaves side alone — Ghost Values are measurements only', () => {
    expect(
      acceptGhostValues(exercise({ isUnilateral: true }), { side: 'left' }, { weight: 40, reps: 10 })
    ).toEqual({ weight: 40, reps: 10 })
  })

  it('fills only a duration for a timed Exercise, ignoring stray weight/reps in the Ghost', () => {
    expect(
      acceptGhostValues(exercise({ isTimed: true }), {}, { durationSeconds: 60, weight: 99 })
    ).toEqual({ durationSeconds: 60 })
  })

  it('declines to write when there are no Ghost Values to accept', () => {
    expect(acceptGhostValues(exercise(), {}, undefined)).toBeUndefined()
  })

  it('declines to write when the Set is already Logged', () => {
    expect(acceptGhostValues(exercise(), { weight: 145, reps: 6 }, { weight: 135, reps: 8 })).toBeUndefined()
  })

  it('declines to write when the Ghost has nothing the Set is missing', () => {
    expect(acceptGhostValues(exercise(), {}, { reps: undefined, weight: undefined })).toBeUndefined()
  })

  it('fills what it can when the Ghost covers only one measurement, leaving the Set Pending', () => {
    expect(acceptGhostValues(exercise(), {}, { weight: 135 })).toEqual({ weight: 135 })
  })
})

describe('resolveGhostSets (carried over from a previous Session)', () => {
  it('ghosts each Set group from the matching group of the previous Session', () => {
    const carried = [
      { weight: 135, reps: 8 },
      { weight: 135, reps: 6 },
    ]
    const ghosts = resolveGhostSets([{}, {}], exercise(), carried)
    expect(ghosts[0]).toEqual({ weight: 135, reps: 8 })
    expect(ghosts[1]).toEqual({ weight: 135, reps: 6 })
  })

  it('matches left to left and right to right against a carried pair', () => {
    const unilateral = exercise({ isUnilateral: true })
    const carried = [
      { weight: 40, reps: 10, side: 'left' as const },
      { weight: 35, reps: 10, side: 'right' as const },
    ]
    const ghosts = resolveGhostSets(
      [{ side: 'left' as const }, { side: 'right' as const }],
      unilateral,
      carried
    )
    expect(ghosts[0]).toEqual({ weight: 40, reps: 10, side: 'left' })
    expect(ghosts[1]).toEqual({ weight: 35, reps: 10, side: 'right' })
  })

  it('ghosts both sides of a Pending pair from a carried solo Set', () => {
    const unilateral = exercise({ isUnilateral: true })
    const ghosts = resolveGhostSets(
      [{ side: 'left' as const }, { side: 'right' as const }],
      unilateral,
      [{ weight: 30, reps: 10 }]
    )
    expect(ghosts[0]).toEqual({ weight: 30, reps: 10 })
    expect(ghosts[1]).toEqual({ weight: 30, reps: 10 })
  })

  it('falls back to this Session’s last Logged Set for a Set added beyond the carried count', () => {
    const sets = [{ weight: 145, reps: 8 }, {}]
    const ghosts = resolveGhostSets(sets, exercise(), [{ weight: 135, reps: 8 }])
    expect(ghosts[1]).toEqual({ weight: 145, reps: 8 })
  })

  it('prefers the carried counterpart over this Session’s last Logged Set', () => {
    const sets = [{ weight: 145, reps: 8 }, {}]
    const carried = [
      { weight: 135, reps: 8 },
      { weight: 135, reps: 6 },
    ]
    expect(resolveGhostSets(sets, exercise(), carried)[1]).toEqual({ weight: 135, reps: 6 })
  })

  it('offers no Ghost Value where neither a carried counterpart nor a Logged Set exists', () => {
    expect(resolveGhostSets([{}, {}], exercise(), [])).toEqual([undefined, undefined])
  })

  it('ghosts a carried duration for a timed Exercise', () => {
    const ghosts = resolveGhostSets([{}], exercise({ isTimed: true }), [{ durationSeconds: 60 }])
    expect(ghosts[0]).toEqual({ durationSeconds: 60 })
  })
})
