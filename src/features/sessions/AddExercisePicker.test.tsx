/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Exercise } from '@/store'
import { AddExercisePicker } from './AddExercisePicker'

function exercise(id: string, name: string): Exercise {
  return {
    id,
    name,
    isUnilateral: false,
    isTimed: false,
    primaryMuscleGroup: 'chest',
    otherMuscleGroups: [],
    type: 'strength',
  }
}

const BENCH = exercise('ex-bench', 'Bench Press')
const FACE_PULL = exercise('ex-face-pull', 'Face Pull')

afterEach(() => {
  cleanup()
})

function renderPicker(props: { inSessionIds?: string[]; onPick?: (id: string) => void; onCancel?: () => void }) {
  render(
    <AddExercisePicker
      exercises={[BENCH, FACE_PULL]}
      inSessionIds={new Set(props.inSessionIds ?? [])}
      onPick={props.onPick ?? (() => {})}
      onCancel={props.onCancel ?? (() => {})}
    />
  )
}

describe('AddExercisePicker', () => {
  it('adds an Exercise with a single tap on its row', async () => {
    const onPick = vi.fn()
    renderPicker({ onPick })

    await userEvent.click(screen.getByRole('button', { name: /Face Pull/ }))

    expect(onPick).toHaveBeenCalledOnce()
    expect(onPick).toHaveBeenCalledWith(FACE_PULL.id)
  })

  it('shows an Exercise already in the Session as unavailable, and does not pick it', async () => {
    const onPick = vi.fn()
    renderPicker({ inSessionIds: [BENCH.id], onPick })

    const row = screen.getByRole('button', { name: /Bench Press/ }) as HTMLButtonElement
    expect(row.disabled).toBe(true)
    expect(screen.getByText('In session')).toBeTruthy()
    await userEvent.click(row)

    expect(onPick).not.toHaveBeenCalled()
  })

  it('closes from Cancel', async () => {
    const onCancel = vi.fn()
    renderPicker({ onCancel })

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('closes when Android’s back button pops the history entry it pushed', async () => {
    const onCancel = vi.fn()
    renderPicker({ onCancel })

    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(onCancel).toHaveBeenCalledOnce()
  })
})
