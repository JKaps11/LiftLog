/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Exercise, SessionExerciseEntry } from '@/store'
import { SessionExerciseCard } from './SessionExerciseCard'

const FACE_PULL: Exercise = {
  id: 'ex-face-pull',
  name: 'Face Pull',
  isUnilateral: false,
  isTimed: false,
  primaryMuscleGroup: 'shoulders',
  otherMuscleGroups: [],
  type: 'strength',
}

afterEach(() => {
  cleanup()
})

function renderCard(entry: SessionExerciseEntry, onRemoveExercise?: (exerciseId: string) => void) {
  render(
    <ul>
      <SessionExerciseCard
        entry={entry}
        exercises={[FACE_PULL]}
        onAddSet={() => {}}
        onSetPatch={() => {}}
        onAcceptGhostValues={() => {}}
        onDeleteSet={() => {}}
        onRemoveExercise={onRemoveExercise}
      />
    </ul>
  )
}

function entryOf(overrides: Partial<SessionExerciseEntry>): SessionExerciseEntry {
  return {
    exerciseId: FACE_PULL.id,
    exerciseNameAtLogTime: FACE_PULL.name,
    sets: [{}],
    ...overrides,
  }
}

describe('SessionExerciseCard for an Added Exercise', () => {
  it('tags an Added Exercise, and does not tag one the Workout listed', () => {
    renderCard(entryOf({ addedMidSession: true }))
    expect(screen.getByText('Added')).toBeTruthy()

    cleanup()
    renderCard(entryOf({}))
    expect(screen.queryByText('Added')).toBeNull()
  })

  it('offers Remove while nothing has been entered, and removes by Exercise', async () => {
    const onRemoveExercise = vi.fn()
    renderCard(entryOf({ addedMidSession: true }), onRemoveExercise)

    await userEvent.click(screen.getByRole('button', { name: 'Remove Face Pull' }))

    expect(onRemoveExercise).toHaveBeenCalledWith(FACE_PULL.id)
  })

  it('stops offering Remove once any measurement is entered, even a half-entered Set', () => {
    renderCard(entryOf({ addedMidSession: true, sets: [{ weight: 30 }] }), () => {})

    expect(screen.queryByRole('button', { name: 'Remove Face Pull' })).toBeNull()
  })

  it('never offers Remove for an Exercise the Workout listed', () => {
    renderCard(entryOf({}), () => {})

    expect(screen.queryByRole('button', { name: 'Remove Face Pull' })).toBeNull()
  })

  it('offers no Remove where the screen gives no way to handle it, such as a past Session', () => {
    renderCard(entryOf({ addedMidSession: true }))

    expect(screen.queryByRole('button', { name: 'Remove Face Pull' })).toBeNull()
  })
})
