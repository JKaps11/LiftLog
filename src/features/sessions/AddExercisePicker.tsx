import { Button } from '@/components/ui/button'
import { SectionLabel } from '@/components/ui/section-label'
import { ExerciseBadges, ExerciseBrowser } from '@/features/exercises/ExerciseBrowser'
import type { Exercise } from '@/store'

interface AddExercisePickerProps {
  exercises: Exercise[]
  /** Exercises the Session already holds. They are shown but cannot be picked again. */
  inSessionIds: ReadonlySet<string>
  onPick: (exerciseId: string) => void
  onCancel: () => void
}

/**
 * The full-screen step for adding an Exercise to a running Session. The same
 * browsing surface as the Workout builder's picker (ADR-0003), but single-select:
 * the lifter wants one Exercise now, so a row tap adds it and leaves, with no
 * checkbox and no Done button between Sets.
 *
 * An Exercise already in the Session is shown disabled rather than hidden, so the
 * reason it can't be added is visible before the lifter goes looking for it. Every
 * Session operation identifies an entry by its Exercise, so a second one could
 * never be logged against.
 *
 * Android's back button is handled by whoever swaps this in, not here: the history
 * entry has to be pushed when the step opens rather than when this mounts open,
 * which StrictMode's double-run of effects would otherwise dismiss at once.
 */
export function AddExercisePicker({ exercises, inSessionIds, onPick, onCancel }: AddExercisePickerProps) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <ExerciseBrowser
        exercises={exercises}
        header={
          <div className="flex items-center justify-between gap-2">
            <SectionLabel className="mb-0">Add exercise</SectionLabel>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        }
        renderRow={(exercise) => {
          const isInSession = inSessionIds.has(exercise.id)
          return (
            <button
              type="button"
              disabled={isInSession}
              onClick={() => onPick(exercise.id)}
              className="flex flex-1 items-center py-1 text-left text-sm disabled:text-muted-foreground"
            >
              <span className="flex-1">
                {exercise.name}
                <ExerciseBadges exercise={exercise} />
              </span>
              {isInSession && <span className="text-xs text-muted-foreground">In session</span>}
            </button>
          )
        }}
      />
    </main>
  )
}
