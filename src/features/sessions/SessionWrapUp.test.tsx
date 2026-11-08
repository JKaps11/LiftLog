/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Exercise } from '@/store'
import { SessionWrapUp } from './SessionWrapUp'

function exercise(id: string, name: string): Exercise {
  return {
    id,
    name,
    isUnilateral: false,
    isTimed: false,
    primaryMuscleGroup: 'shoulders',
    otherMuscleGroups: [],
    type: 'strength',
  }
}

const FACE_PULL = exercise('ex-face-pull', 'Face Pull')
const CURL = exercise('ex-curl', 'Curl')

afterEach(() => {
  cleanup()
})

function renderWrapUp(onKeep = vi.fn(), onSkip = vi.fn()) {
  render(
    <SessionWrapUp workoutName="Push Day" offered={[FACE_PULL, CURL]} onKeep={onKeep} onSkip={onSkip} />
  )
  return { onKeep, onSkip }
}

describe('SessionWrapUp', () => {
  it('names the Workout and lists every offered Exercise, none chosen to begin with', () => {
    renderWrapUp()

    expect(screen.getByText('Keep in Push Day?')).toBeTruthy()
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(2)
    expect(boxes.every((box) => box.getAttribute('aria-checked') === 'false')).toBe(true)
  })

  it('keeps exactly the Exercises that were ticked', async () => {
    const { onKeep, onSkip } = renderWrapUp()

    await userEvent.click(screen.getByRole('checkbox', { name: /Curl/ }))
    await userEvent.click(screen.getByRole('button', { name: /Save/ }))

    expect(onKeep).toHaveBeenCalledOnce()
    expect(onKeep).toHaveBeenCalledWith([CURL.id])
    expect(onSkip).not.toHaveBeenCalled()
  })

  it('treats Save with nothing ticked as a skip, so the Workout is not written to', async () => {
    const { onKeep, onSkip } = renderWrapUp()

    await userEvent.click(screen.getByRole('button', { name: /Save/ }))

    expect(onSkip).toHaveBeenCalledOnce()
    expect(onKeep).not.toHaveBeenCalled()
  })

  it('skips in one tap without keeping anything, even with rows ticked', async () => {
    const { onKeep, onSkip } = renderWrapUp()

    await userEvent.click(screen.getByRole('checkbox', { name: /Face Pull/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }))

    expect(onSkip).toHaveBeenCalledOnce()
    expect(onKeep).not.toHaveBeenCalled()
  })
})
