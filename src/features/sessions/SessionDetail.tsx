import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeading } from '@/components/ui/page-heading'
import { SectionLabel } from '@/components/ui/section-label'
import { store } from '@/store/instance'
import type { Exercise, Session } from '@/store'
import { fromDatetimeLocalValue, toDatetimeLocalValue } from './dateTime'
import { SessionExerciseCard } from './SessionExerciseCard'
import { useSessionEditing } from './useSessionEditing'

interface SessionDetailProps {
  session: Session
  exercises: Exercise[]
  onChange: (session: Session) => void
  onDelete: () => void
  onBack: () => void
}

export function SessionDetail({ session, exercises, onChange, onDelete, onBack }: SessionDetailProps) {
  const { notes, setNotes, handleAddSet, handleSetChange, handleDeleteSet, handleNotesBlur } =
    useSessionEditing(session, onChange)

  async function handleStartTimeChange(value: string) {
    if (!value) return
    const updated = await store.updateSessionTimes(session.id, {
      startTime: fromDatetimeLocalValue(value),
    })
    onChange(updated)
  }

  async function handleEndTimeChange(value: string) {
    if (!value) return
    const updated = await store.updateSessionTimes(session.id, {
      endTime: fromDatetimeLocalValue(value),
    })
    onChange(updated)
  }

  async function handleDelete() {
    await store.deleteSession(session.id)
    onDelete()
  }

  const dateLabel = new Date(session.date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
          Delete Session
        </Button>
      </div>

      <div>
        <PageHeading>{session.workoutNameSnapshot}</PageHeading>
        <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Start time
          <Input
            type="datetime-local"
            value={toDatetimeLocalValue(session.startTime)}
            onChange={(event) => handleStartTimeChange(event.target.value)}
            className="font-mono text-sm normal-case tracking-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
          End time
          <Input
            type="datetime-local"
            value={session.endTime ? toDatetimeLocalValue(session.endTime) : ''}
            onChange={(event) => handleEndTimeChange(event.target.value)}
            className="font-mono text-sm normal-case tracking-normal"
          />
        </label>
      </div>

      {session.exercises.length === 0 ? (
        <p className="text-muted-foreground">This Session has no Exercises.</p>
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
    </main>
  )
}
