import { useEffect, useState } from 'react'
import { store } from '@/store/instance'
import type { Session, SessionSet } from '@/store'

/** Set/notes editing behavior shared between logging an active Session and editing a past one. */
export function useSessionEditing(session: Session, onChange: (session: Session) => void) {
  const [notes, setNotes] = useState(session.notes)

  /**
   * Ghost Value sources for the whole Workout, keyed by exerciseId, fetched once
   * per Session rather than per Set. Keyed on the Session's identity alone — not
   * on the Sets being logged into it, which would refetch on every keystroke.
   *
   * Editing a past Session needs these too: an Exercise pruned to no Sets at End
   * Session has nothing within the Session to hint from, so a Set added while
   * correcting history would otherwise get no Ghost Values at all.
   */
  const [carriedSets, setCarriedSets] = useState<Record<string, SessionSet[]>>({})

  useEffect(() => {
    let stale = false
    void store.getCarriedOverSets(session.id).then((carried) => {
      if (!stale) setCarriedSets(carried)
    })
    return () => {
      stale = true
    }
  }, [session.id])

  async function handleAddSet(exerciseId: string) {
    const updated = await store.logSet(session.id, exerciseId)
    onChange(updated)
  }

  async function handleSetChange(
    exerciseId: string,
    setIndex: number,
    field: 'weight' | 'reps' | 'durationSeconds',
    value: number | undefined
  ) {
    const entry = session.exercises.find((e) => e.exerciseId === exerciseId)
    const current = entry?.sets[setIndex]
    if (!current) return
    const updated = await store.updateSet(session.id, exerciseId, setIndex, {
      ...current,
      [field]: value,
    })
    onChange(updated)
  }

  /** Writes a whole Set at once — used when accepting a Pending Set's Ghost Values, which fills every measurement in one act. */
  async function handleSetReplace(exerciseId: string, setIndex: number, set: SessionSet) {
    const updated = await store.updateSet(session.id, exerciseId, setIndex, set)
    onChange(updated)
  }

  async function handleDeleteSet(exerciseId: string, setIndex: number) {
    const updated = await store.deleteSet(session.id, exerciseId, setIndex)
    onChange(updated)
  }

  async function handleNotesBlur() {
    const updated = await store.updateSessionNotes(session.id, notes)
    onChange(updated)
  }

  return {
    notes,
    setNotes,
    carriedSets,
    handleAddSet,
    handleSetChange,
    handleSetReplace,
    handleDeleteSet,
    handleNotesBlur,
  }
}
