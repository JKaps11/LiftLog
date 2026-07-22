import { Button } from '@/components/ui/button'
import { PageHeading } from '@/components/ui/page-heading'
import { SectionLabel } from '@/components/ui/section-label'
import type { Exercise, Session } from '@/store'
import { SessionExerciseCard } from './SessionExerciseCard'
import { useSessionEditing } from './useSessionEditing'

interface ActiveSessionProps {
  session: Session
  exercises: Exercise[]
  onChange: (session: Session) => void
  onEnd: () => void
}

export function ActiveSession({ session, exercises, onChange, onEnd }: ActiveSessionProps) {
  const { notes, setNotes, handleAddSet, handleSetChange, handleDeleteSet, handleNotesBlur } =
    useSessionEditing(session, onChange)

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
              onAddSet={handleAddSet}
              onSetChange={handleSetChange}
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
