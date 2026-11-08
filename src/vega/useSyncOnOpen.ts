import { useEffect } from 'react'
import { vegaSync } from './instance'

/**
 * Sends the export to Vega when LiftLog opens and each time it comes back to
 * the foreground, which is when a PWA on a phone is "opened" more often than
 * not. A failure is recorded for the Data page and otherwise ignored: a sync
 * that missed is retried the next time the app is opened.
 */
export function useSyncOnOpen(): void {
  useEffect(() => {
    void vegaSync.sync('opened')
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void vegaSync.sync('opened')
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])
}
