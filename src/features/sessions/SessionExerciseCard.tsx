import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { resolveExerciseDisplayName, type Exercise, type SessionExerciseEntry } from '@/store'
import { groupSessionSets } from './sessionSetGrouping'
import { resolveSetLayout } from './setDisplay'

interface SessionExerciseCardProps {
  entry: SessionExerciseEntry
  exercises: Exercise[]
  onAddSet: (exerciseId: string) => void
  onSetChange: (
    exerciseId: string,
    setIndex: number,
    field: 'weight' | 'reps' | 'durationSeconds',
    value: number
  ) => void
  onDeleteSet: (exerciseId: string, setIndex: number) => void
}

/** A single numeric Set field (weight, reps, or duration) with its unit label. */
function SetValueField({
  inputMode,
  value,
  onChange,
  ariaLabel,
  unit,
}: {
  inputMode: 'decimal' | 'numeric'
  value: number | undefined
  onChange: (value: number) => void
  ariaLabel: string
  unit: string
}) {
  return (
    <>
      <Input
        type="number"
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={ariaLabel}
        className="h-11 flex-1 text-center font-mono text-lg font-semibold tabular-nums"
      />
      <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
        {unit}
      </span>
    </>
  )
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
  const liveExercise = exercises.find((exercise) => exercise.id === entry.exerciseId)
  const groups = groupSessionSets(entry.sets)

  function sideLetter(side: 'left' | 'right') {
    return side === 'left' ? 'L' : 'R'
  }

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <h2 className="mb-3 text-base font-semibold tracking-tight">{displayName}</h2>
      {entry.sets.length > 0 && (
        <ul className="flex flex-col gap-2">
          {groups.map((group, groupIndex) =>
            group.sets.map(({ index, set }, memberIndex) => {
              const label = set.side
                ? `Set ${groupIndex + 1} (${sideLetter(set.side)})`
                : `Set ${groupIndex + 1}`
              return (
                <li
                  key={index}
                  className={cn(
                    'flex items-center gap-2',
                    groupIndex > 0 && memberIndex === 0 && 'mt-1 border-t border-border pt-3'
                  )}
                >
                  <span className="flex size-8 shrink-0 flex-col items-center justify-center rounded-md bg-muted font-mono text-sm text-muted-foreground tabular-nums">
                    {groupIndex + 1}
                    {set.side && (
                      <span className="text-[9px] leading-none font-semibold tracking-widest uppercase">
                        {sideLetter(set.side)}
                      </span>
                    )}
                  </span>
                  {resolveSetLayout(liveExercise, set) === 'timed' ? (
                    <SetValueField
                      inputMode="numeric"
                      value={set.durationSeconds}
                      onChange={(value) => onSetChange(entry.exerciseId, index, 'durationSeconds', value)}
                      ariaLabel={`${label} duration (seconds) for ${displayName}`}
                      unit="sec"
                    />
                  ) : (
                    <>
                      <SetValueField
                        inputMode="decimal"
                        value={set.weight}
                        onChange={(value) => onSetChange(entry.exerciseId, index, 'weight', value)}
                        ariaLabel={`${label} weight (lbs) for ${displayName}`}
                        unit="lbs"
                      />
                      <span className="text-muted-foreground">×</span>
                      <SetValueField
                        inputMode="numeric"
                        value={set.reps}
                        onChange={(value) => onSetChange(entry.exerciseId, index, 'reps', value)}
                        ariaLabel={`${label} reps for ${displayName}`}
                        unit="reps"
                      />
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${label} for ${displayName}`}
                    onClick={() => onDeleteSet(entry.exerciseId, index)}
                  >
                    <X />
                  </Button>
                </li>
              )
            })
          )}
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
