import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageHeading } from '@/components/ui/page-heading'
import { SectionLabel } from '@/components/ui/section-label'
import type { Exercise, Session } from '@/store'
import { AddExercisePicker } from './AddExercisePicker'
import { SessionExerciseCard } from './SessionExerciseCard'
import { sessionExerciseDomId } from './sessionExerciseDomId'
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
    carriedSets,
    handleAddSet,
    handleSetPatch,
    handleAcceptGhostValues,
    handleDeleteSet,
    handleAddExercise,
    handleRemoveExercise,
    handleNotesBlur,
  } =
    useSessionEditing(session, onChange)

  // The picker is a view swap inside this component rather than a route, so the
  // Notes draft and every field below stay mounted while an Exercise is chosen.
  const [isPicking, setIsPicking] = useState(false)
  const [justAddedId, setJustAddedId] = useState<string | null>(null)

  async function handlePick(exerciseId: string) {
    await handleAddExercise(exerciseId)
    setJustAddedId(exerciseId)
    setIsPicking(false)
  }

  // Waits for the list to be back on screen: the new card does not exist in the DOM
  // while the picker is showing, and appears at the very end, below the fold.
  useEffect(() => {
    if (isPicking || justAddedId === null) return
    document.getElementById(sessionExerciseDomId(justAddedId))?.scrollIntoView({ block: 'center' })
    setJustAddedId(null)
  }, [isPicking, justAddedId, session.exercises])

  if (isPicking) {
    return (
      <AddExercisePicker
        exercises={exercises}
        inSessionIds={new Set(session.exercises.map((entry) => entry.exerciseId))}
        onPick={(exerciseId) => void handlePick(exerciseId)}
        onCancel={() => setIsPicking(false)}
      />
    )
  }

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
              onSetPatch={handleSetPatch}
              onAcceptGhostValues={handleAcceptGhostValues}
              onDeleteSet={handleDeleteSet}
              onRemoveExercise={(exerciseId) => void handleRemoveExercise(exerciseId)}
            />
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => setIsPicking(true)}
        className="justify-between border-dashed text-muted-foreground"
      >
        <span>+ Add exercise</span>
        <span>›</span>
      </Button>

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
