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
    <li className="rounded-lg border border-border p-2.5">
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
                  onSetChange(entry.exerciseId, index, 'weight', Number(event.target.value))
                }
                aria-label={`Set ${index + 1} weight (lbs) for ${displayName}`}
              />
              <span className="text-sm text-muted-foreground">lbs ×</span>
              <Input
                type="number"
                inputMode="numeric"
                value={set.reps}
                onChange={(event) =>
                  onSetChange(entry.exerciseId, index, 'reps', Number(event.target.value))
                }
                aria-label={`Set ${index + 1} reps for ${displayName}`}
              />
              <span className="text-sm text-muted-foreground">reps</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete set ${index + 1} for ${displayName}`}
                onClick={() => onDeleteSet(entry.exerciseId, index)}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => onAddSet(entry.exerciseId)}
      >
        Add set
      </Button>
    </li>
  )
}
