import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { resolveExerciseDisplayName, type Exercise, type SessionExerciseEntry, type SessionSet } from '@/store'
import { groupSessionSets } from './sessionSetGrouping'
import { acceptGhostValues, resolveGhostSets, resolveSetRow, type SetField } from './setDisplay'

interface SessionExerciseCardProps {
  entry: SessionExerciseEntry
  exercises: Exercise[]
  /** The Sets performed the last time this Exercise was Logged in this Workout — the Ghost Value source. */
  carriedSets?: SessionSet[]
  onAddSet: (exerciseId: string) => void
  onSetChange: (
    exerciseId: string,
    setIndex: number,
    field: 'weight' | 'reps' | 'durationSeconds',
    value: number | undefined
  ) => void
  onSetReplace: (exerciseId: string, setIndex: number, set: SessionSet) => void
  onDeleteSet: (exerciseId: string, setIndex: number) => void
}

/**
 * A single numeric Set field (weight, reps, or duration) with its unit label.
 *
 * An absent measurement renders as a genuinely empty input showing its Ghost
 * Value as placeholder text — that emptiness is what marks the Set as not yet
 * performed (ADR-0004). Clearing the field reports `undefined` rather than
 * `Number('') === 0`, returning the Set to Pending.
 *
 * Focusing an empty field accepts the whole row's Ghost Values, then selects the
 * text once it arrives so the next keystroke replaces it. The selection waits on
 * the value because accepting is a persisted round-trip: at focus time the input
 * is still empty, and selecting nothing would leave the caret appending to a
 * number the lifter meant to overwrite.
 *
 * Waiting on the value alone can't tell an accepted Ghost Value from a digit the
 * lifter typed, so the wait is armed only when an accept was actually issued and
 * is disarmed by the first keystroke or blur. Without that, a Pending Set with no
 * Ghost Value armed a wait nothing would ever satisfy, and the lifter's own first
 * digit tripped it — selecting what they had just typed so the second digit
 * replaced it instead of following it.
 */
function SetValueField({
  inputMode,
  field,
  onChange,
  onFocus,
  ariaLabel,
  unit,
}: {
  inputMode: 'decimal' | 'numeric'
  field: SetField
  onChange: (value: number | undefined) => void
  /** Accepts the row's Ghost Values; returns whether an accepted value is on its way to this row. */
  onFocus: () => boolean
  ariaLabel: string
  unit: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const awaitingAcceptedValue = useRef(false)

  useEffect(() => {
    if (!awaitingAcceptedValue.current) return
    if (field.value === undefined) return
    awaitingAcceptedValue.current = false
    if (inputRef.current && inputRef.current === document.activeElement) {
      inputRef.current.select()
    }
  }, [field.value])

  return (
    <>
      <Input
        ref={inputRef}
        type="number"
        inputMode={inputMode}
        value={field.value ?? ''}
        placeholder={field.ghost === undefined ? undefined : String(field.ghost)}
        onFocus={() => {
          const accepting = onFocus()
          awaitingAcceptedValue.current = accepting && field.value === undefined
        }}
        onBlur={() => {
          awaitingAcceptedValue.current = false
        }}
        onChange={(event) => {
          awaitingAcceptedValue.current = false
          onChange(event.target.value === '' ? undefined : Number(event.target.value))
        }}
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
  carriedSets,
  onAddSet,
  onSetChange,
  onSetReplace,
  onDeleteSet,
}: SessionExerciseCardProps) {
  const displayName = resolveExerciseDisplayName(exercises, entry)
  const liveExercise = exercises.find((exercise) => exercise.id === entry.exerciseId)
  const groups = groupSessionSets(entry.sets)
  const ghosts = resolveGhostSets(entry.sets, liveExercise, carriedSets)

  function sideLetter(side: 'left' | 'right') {
    return side === 'left' ? 'L' : 'R'
  }

  /**
   * Touching any field of a Pending Set logs the whole row from its Ghost Values —
   * one tap, not one per field. Returns whether anything was actually written, so a
   * field only waits to select a value that is genuinely coming.
   */
  function acceptRow(setIndex: number, set: SessionSet): boolean {
    const accepted = acceptGhostValues(liveExercise, set, ghosts[setIndex])
    if (!accepted) return false
    onSetReplace(entry.exerciseId, setIndex, accepted)
    return true
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
              const row = resolveSetRow(liveExercise, set, ghosts[index])
              return (
                <li
                  key={index}
                  className={cn(
                    'flex items-center gap-2',
                    groupIndex > 0 && memberIndex === 0 && 'mt-1 border-t border-border pt-3'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 min-w-8 shrink-0 items-center justify-center gap-px rounded-md border px-1 font-mono text-sm tabular-nums',
                      row.isLogged
                        ? 'border-transparent bg-muted text-foreground'
                        : 'border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground/70'
                    )}
                  >
                    {groupIndex + 1}
                    {set.side && (
                      <span className="text-xs font-semibold uppercase">{sideLetter(set.side)}</span>
                    )}
                  </span>
                  {row.duration ? (
                    <SetValueField
                      inputMode="numeric"
                      field={row.duration}
                      onChange={(value) => onSetChange(entry.exerciseId, index, 'durationSeconds', value)}
                      onFocus={() => acceptRow(index, set)}
                      ariaLabel={`${label} duration (seconds) for ${displayName}`}
                      unit="sec"
                    />
                  ) : (
                    <>
                      <SetValueField
                        inputMode="decimal"
                        field={row.weight ?? { value: undefined, ghost: undefined }}
                        onChange={(value) => onSetChange(entry.exerciseId, index, 'weight', value)}
                        onFocus={() => acceptRow(index, set)}
                        ariaLabel={`${label} weight (lbs) for ${displayName}`}
                        unit="lbs"
                      />
                      <span className="text-muted-foreground">×</span>
                      <SetValueField
                        inputMode="numeric"
                        field={row.reps ?? { value: undefined, ghost: undefined }}
                        onChange={(value) => onSetChange(entry.exerciseId, index, 'reps', value)}
                        onFocus={() => acceptRow(index, set)}
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
