import { useEffect, useState } from 'react'
import { applyTheme } from './applyTheme'
import { THEMES } from './themes'

const STORAGE_KEY = 'liftlog:theme'

function readStoredThemeId(): string {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored && THEMES.some((theme) => theme.id === stored) ? stored : THEMES[0].id
}

/** Applies the persisted theme on mount and whenever it changes; the choice is a device preference, not app data, so it lives in localStorage rather than the Store. */
export function useTheme() {
  const [themeId, setThemeId] = useState(readStoredThemeId)

  useEffect(() => {
    const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0]
    applyTheme(theme)
    localStorage.setItem(STORAGE_KEY, theme.id)
  }, [themeId])

  return { themeId, setThemeId, themes: THEMES }
}
