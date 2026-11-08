/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { Session } from '@/store'

const getCarriedOverSets = vi.fn()
vi.mock('@/store/instance', () => ({ store: { getCarriedOverSets } }))

const { useSessionEditing } = await import('./useSessionEditing')

afterEach(() => {
  cleanup()
  getCarriedOverSets.mockReset()
})

function sessionWith(...exerciseIds: string[]): Session {
  return {
    id: 'session-1',
    workoutId: 'workout-1',
    workoutNameSnapshot: 'Push Day',
    exercises: exerciseIds.map((exerciseId) => ({
      exerciseId,
      exerciseNameAtLogTime: exerciseId,
      sets: [{}],
    })),
    startTime: '2026-01-01T00:00:00.000Z',
    endTime: null,
    notes: '',
    date: '2026-01-01T00:00:00.000Z',
  }
}

describe('useSessionEditing Ghost Value sources', () => {
  it('fetches them again once an Exercise has been added, so its card gets hints', async () => {
    getCarriedOverSets
      .mockResolvedValueOnce({ bench: [{ weight: 135, reps: 8 }] })
      .mockResolvedValueOnce({
        bench: [{ weight: 135, reps: 8 }],
        'face-pull': [{ weight: 30, reps: 15 }],
      })
    const { result, rerender } = renderHook(({ session }) => useSessionEditing(session, () => {}), {
      initialProps: { session: sessionWith('bench') },
    })
    await waitFor(() => expect(result.current.carriedSets.bench).toBeDefined())

    rerender({ session: sessionWith('bench', 'face-pull') })

    await waitFor(() =>
      expect(result.current.carriedSets['face-pull']).toEqual([{ weight: 30, reps: 15 }])
    )
  })

  it('does not fetch again for an edit that leaves the Exercises as they were', async () => {
    getCarriedOverSets.mockResolvedValue({})
    const { rerender } = renderHook(({ session }) => useSessionEditing(session, () => {}), {
      initialProps: { session: sessionWith('bench') },
    })
    await waitFor(() => expect(getCarriedOverSets).toHaveBeenCalledOnce())

    rerender({ session: { ...sessionWith('bench'), notes: 'felt strong' } })

    expect(getCarriedOverSets).toHaveBeenCalledOnce()
  })
})
