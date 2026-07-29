import { describe, expect, it } from 'vitest'
import type { Exercise } from '@/store'
import { resolveSetLayout } from './setDisplay'

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
