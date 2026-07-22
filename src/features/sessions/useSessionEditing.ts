import { useState } from 'react'
import { store } from '@/store/instance'
import type { Session } from '@/store'

/** Set/notes editing behavior shared between logging an active Session and editing a past one. */
export function useSessionEditing(session: Session, onChange: (session: Session) => void) {
  const [notes, setNotes] = useState(session.notes)

  async function handleAddSet(exerciseId: string) {
    const updated = await store.logSet(session.id, exerciseId, { weight: 0, reps: 0 })
    onChange(updated)
  }

  async function handleSetChange(
    exerciseId: string,
    setIndex: number,
    field: 'weight' | 'reps',
    value: number
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

  async function handleDeleteSet(exerciseId: string, setIndex: number) {
    const updated = await store.deleteSet(session.id, exerciseId, setIndex)
    onChange(updated)
  }

  async function handleNotesBlur() {
    const updated = await store.updateSessionNotes(session.id, notes)
    onChange(updated)
  }

  return { notes, setNotes, handleAddSet, handleSetChange, handleDeleteSet, handleNotesBlur }
}
