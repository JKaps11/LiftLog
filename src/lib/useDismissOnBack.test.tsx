/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useDismissOnBack } from './useDismissOnBack'

afterEach(() => {
  cleanup()
})

function settle() {
  return act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
}

function renderOpenable(onDismiss: () => void) {
  return renderHook(({ isOpen }) => useDismissOnBack(isOpen, onDismiss), {
    initialProps: { isOpen: false },
    wrapper: StrictMode,
  })
}

describe('useDismissOnBack', () => {
  it('dismisses when the back button pops the entry pushed on open', async () => {
    const onDismiss = vi.fn()
    const { rerender } = renderOpenable(onDismiss)

    rerender({ isOpen: true })
    await act(async () => {
      window.history.back()
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('does not dismiss when the step is closed some other way', async () => {
    const onDismiss = vi.fn()
    const { rerender } = renderOpenable(onDismiss)

    rerender({ isOpen: true })
    rerender({ isOpen: false })
    await settle()

    expect(onDismiss).not.toHaveBeenCalled()
  })
})
