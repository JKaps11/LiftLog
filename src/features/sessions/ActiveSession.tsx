import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageHeading } from '@/components/ui/page-heading'
import { SectionLabel } from '@/components/ui/section-label'
import { store } from '@/store/instance'
import type { Exercise, Session, SessionSet } from '@/store'
import { SessionExerciseCard } from './SessionExerciseCard'
import { useSessionEditing } from './useSessionEditing'

interface ActiveSessionProps {
  session: Session
  exercises: Exercise[]
  onChange: (session: Session) => void
  onEnd: () => void
}

export function ActiveSession({ session, exercises, onChange, onEnd }: ActiveSessionProps) {
  const {
    notes,
    setNotes,
    handleAddSet,
    handleSetChange,
    handleSetReplace,
    handleDeleteSet,
    handleNotesBlur,
  } =
    useSessionEditing(session, onChange)

  /**
   * Ghost Values for the whole Workout, fetched once per Session rather than per
   * Set. Keyed by exerciseId and read live from history (ADR-0004), so it depends
   * only on the Session's identity — not on the Sets being logged into it, which
   * would refetch on every keystroke.
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <PageHeading>{session.workoutNameSnapshot}</PageHeading>

      {session.exercises.length === 0 ? (
        <p className="text-muted-foreground">This Workout has no Exercises yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {session.exercises.map((entry) => (
            <SessionExerciseCard
              key={entry.exerciseId}
              entry={entry}
              exercises={exercises}
              carriedSets={carriedSets[entry.exerciseId]}
              onAddSet={handleAddSet}
              onSetChange={handleSetChange}
              onSetReplace={handleSetReplace}
              onDeleteSet={handleDeleteSet}
            />
          ))}
        </ul>
      )}

      <div>
        <SectionLabel>Notes</SectionLabel>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={handleNotesBlur}
          placeholder="How did it feel?"
          rows={3}
          className="w-full rounded-lg border border-input bg-transparent p-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <Button size="lg" className="h-12 text-base" onClick={onEnd}>
        End Session
      </Button>
    </main>
  )
}
