import { useEffect, useRef } from 'react'

/**
 * For a full-screen step that is a view swap rather than a route: the app has no
 * router, so Android's back button would otherwise close the whole PWA from it.
 * Pushes a history entry while `isOpen` and treats popping it as a dismissal;
 * closing any other way consumes that entry so repeated opens don't stack up dead
 * back presses.
 */
export function useDismissOnBack(isOpen: boolean, onDismiss: () => void) {
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  })

  useEffect(() => {
    if (!isOpen) return
    window.history.pushState(null, '')
    let closedByBackButton = false
    function handlePopState() {
      closedByBackButton = true
      onDismissRef.current()
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (!closedByBackButton) window.history.back()
    }
  }, [isOpen])
}
