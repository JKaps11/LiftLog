import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resolveExerciseDisplayName, type Exercise, type SessionExerciseEntry } from '@/store'

interface SessionExerciseCardProps {
  entry: SessionExerciseEntry
  exercises: Exercise[]
  onAddSet: (exerciseId: string) => void
  onSetChange: (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: number) => void
  onDeleteSet: (exerciseId: string, setIndex: number) => void
}

/** The Set list + editing controls for a single Exercise within a Session — shared between logging an active Session and editing a past one. */
export function SessionExerciseCard({
  entry,
  exercises,
  onAddSet,
  onSetChange,
  onDeleteSet,
}: SessionExerciseCardProps) {
  const displayName = resolveExerciseDisplayName(exercises, entry)

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <h2 className="mb-3 text-base font-semibold tracking-tight">{displayName}</h2>
      {entry.sets.length > 0 && (
        <ul className="flex flex-col gap-2">
          {entry.sets.map((set, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-sm text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <Input
                type="number"
                inputMode="decimal"
                value={set.weight}
                onChange={(event) =>
                  onSetChange(entry.exerciseId, index, 'weight', Number(event.target.value))
                }
                aria-label={`Set ${index + 1} weight (lbs) for ${displayName}`}
                className="h-11 flex-1 text-center font-mono text-lg font-semibold tabular-nums"
              />
              <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                lbs
              </span>
              <span className="text-muted-foreground">×</span>
              <Input
                type="number"
                inputMode="numeric"
                value={set.reps}
                onChange={(event) =>
                  onSetChange(entry.exerciseId, index, 'reps', Number(event.target.value))
                }
                aria-label={`Set ${index + 1} reps for ${displayName}`}
                className="h-11 flex-1 text-center font-mono text-lg font-semibold tabular-nums"
              />
              <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                reps
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete set ${index + 1} for ${displayName}`}
                onClick={() => onDeleteSet(entry.exerciseId, index)}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => onAddSet(entry.exerciseId)}
      >
        Add set
      </Button>
    </li>
  )
}
