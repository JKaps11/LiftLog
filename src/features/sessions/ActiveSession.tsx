import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { store } from '@/store/instance'
import { resolveExerciseDisplayName, type Exercise, type Session } from '@/store'

interface ActiveSessionProps {
  session: Session
  exercises: Exercise[]
  onChange: (session: Session) => void
  onEnd: () => void
}

export function ActiveSession({ session, exercises, onChange, onEnd }: ActiveSessionProps) {
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

  async function handleNotesBlur() {
    const updated = await store.updateSessionNotes(session.id, notes)
    onChange(updated)
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">{session.workoutNameSnapshot}</h1>

      {session.exercises.length === 0 ? (
        <p className="text-muted-foreground">This Workout has no Exercises yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {session.exercises.map((entry) => {
            const displayName = resolveExerciseDisplayName(exercises, entry)
            return (
              <li key={entry.exerciseId} className="rounded-lg border border-border p-2.5">
                <h2 className="mb-2 font-medium">{displayName}</h2>
                {entry.sets.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {entry.sets.map((set, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="w-4 text-sm text-muted-foreground">{index + 1}</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={set.weight}
                          onChange={(event) =>
                            handleSetChange(
                              entry.exerciseId,
                              index,
                              'weight',
                              Number(event.target.value)
                            )
                          }
                          aria-label={`Set ${index + 1} weight (lbs) for ${displayName}`}
                        />
                        <span className="text-sm text-muted-foreground">lbs ×</span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={set.reps}
                          onChange={(event) =>
                            handleSetChange(
                              entry.exerciseId,
                              index,
                              'reps',
                              Number(event.target.value)
                            )
                          }
                          aria-label={`Set ${index + 1} reps for ${displayName}`}
                        />
                        <span className="text-sm text-muted-foreground">reps</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleAddSet(entry.exerciseId)}
                >
                  Add set
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Notes</h2>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={handleNotesBlur}
          placeholder="How did it feel?"
          rows={3}
          className="w-full rounded-lg border border-input bg-transparent p-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <Button onClick={onEnd}>End Session</Button>
    </main>
  )
}
