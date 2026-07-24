import { describe, expect, it } from 'vitest'
import { filterExercisesByName } from './exerciseLookup'
import type { Exercise } from '@/store'

function exercise(id: string, name: string): Exercise {
  return {
    id,
    name,
    isUnilateral: false,
    isTimed: false,
    primaryMuscleGroup: 'core',
    otherMuscleGroups: [],
    type: 'strength',
  }
}

describe('filterExercisesByName', () => {
  const exercises = [
    exercise('1', 'Bench Press'),
    exercise('2', 'Overhead Press'),
    exercise('3', 'Deadlift'),
  ]

  it('returns all exercises when the query is empty', () => {
    expect(filterExercisesByName(exercises, '')).toEqual(exercises)
  })

  it('filters by case-insensitive substring match', () => {
    expect(filterExercisesByName(exercises, 'press')).toEqual([
      exercise('1', 'Bench Press'),
      exercise('2', 'Overhead Press'),
    ])
  })

  it('ignores leading/trailing whitespace in the query', () => {
    expect(filterExercisesByName(exercises, '  deadlift  ')).toEqual([exercise('3', 'Deadlift')])
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterExercisesByName(exercises, 'squat')).toEqual([])
  })
})
