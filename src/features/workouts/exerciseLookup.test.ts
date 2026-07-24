import { describe, expect, it } from 'vitest'
import { filterExercisesByName, groupExercisesByMuscleGroup } from './exerciseLookup'
import type { Exercise, MuscleGroup } from '@/store'

function exercise(id: string, name: string, primaryMuscleGroup: MuscleGroup = 'core'): Exercise {
  return {
    id,
    name,
    isUnilateral: false,
    isTimed: false,
    primaryMuscleGroup,
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

describe('groupExercisesByMuscleGroup', () => {
  it('buckets exercises by primaryMuscleGroup in the fixed declared order, not alphabetical', () => {
    const core = exercise('1', 'Plank', 'core')
    const chest = exercise('2', 'Bench Press', 'chest')
    const back = exercise('3', 'Barbell Row', 'back')

    const groups = groupExercisesByMuscleGroup([core, chest, back])

    // Declared order is chest, back, ..., core — not alphabetical (back < chest < core).
    expect(groups.map((g) => g.muscleGroup)).toEqual(['chest', 'back', 'core'])
    expect(groups.map((g) => g.exercises)).toEqual([[chest], [back], [core]])
  })

  it('groups multiple exercises with the same primaryMuscleGroup together, regardless of type', () => {
    const lift = exercise('1', 'Romanian Deadlift', 'hamstrings')
    const stretch: Exercise = { ...exercise('2', 'Hamstring Stretch', 'hamstrings'), type: 'stretch' }

    const groups = groupExercisesByMuscleGroup([lift, stretch])

    expect(groups).toEqual([{ muscleGroup: 'hamstrings', exercises: [lift, stretch] }])
  })

  it('omits a muscle group with zero matches rather than producing an empty section', () => {
    const chest = exercise('1', 'Bench Press', 'chest')

    const groups = groupExercisesByMuscleGroup([chest])

    expect(groups).toEqual([{ muscleGroup: 'chest', exercises: [chest] }])
  })

  it('returns an empty list when there are no exercises', () => {
    expect(groupExercisesByMuscleGroup([])).toEqual([])
  })

  it('composes with name search: search narrows first, then grouping applies to the narrowed result', () => {
    const bench = exercise('1', 'Bench Press', 'chest')
    const flye = exercise('2', 'Cable Fly', 'chest')
    const row = exercise('3', 'Barbell Row', 'back')

    const narrowed = filterExercisesByName([bench, flye, row], 'press')
    const groups = groupExercisesByMuscleGroup(narrowed)

    expect(groups).toEqual([{ muscleGroup: 'chest', exercises: [bench] }])
  })
})
