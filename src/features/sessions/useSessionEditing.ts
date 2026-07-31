import { useEffect, useState } from 'react'
import { store } from '@/store/instance'
import type { Session, SessionSet, SetMeasurements } from '@/store'

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

  /**
   * Writes the measurement a field was just edited to, and only that one.
   *
   * Deliberately does *not* read the current Set out of `session` to build a whole
   * replacement Set from. That snapshot is one render old, so a weight keystroke and
   * a reps keystroke landing close together would each rebuild the Set from the same
   * stale copy and the later write would erase the earlier one.
   */
  async function handleSetPatch(exerciseId: string, setIndex: number, patch: SetMeasurements) {
    if (!setExists(exerciseId, setIndex)) return
    const updated = await store.updateSet(session.id, exerciseId, setIndex, patch)
    onChange(updated)
  }

  /**
   * Accepting a Pending Set's Ghost Values. Offers them to the Store, which fills in
   * only what the Set is still missing — so a hint can never land on top of a
   * measurement the lifter typed while the accept was in flight.
   */
  async function handleAcceptGhostValues(
    exerciseId: string,
    setIndex: number,
    values: SetMeasurements
  ) {
    if (!setExists(exerciseId, setIndex)) return
    const updated = await store.fillSetMeasurements(session.id, exerciseId, setIndex, values)
    onChange(updated)
  }

  /** Guards against writing to a Set deleted between render and this handler firing, which the Store would reject. */
  function setExists(exerciseId: string, setIndex: number): boolean {
    const entry = session.exercises.find((e) => e.exerciseId === exerciseId)
    return entry?.sets[setIndex] !== undefined
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
    handleSetPatch,
    handleAcceptGhostValues,
    handleDeleteSet,
    handleNotesBlur,
  }
}
