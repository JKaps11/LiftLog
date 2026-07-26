import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { SectionLabel } from '@/components/ui/section-label'
import { ExerciseBadges, ExerciseBrowser } from '@/features/exercises/ExerciseBrowser'
import type { Exercise, Workout } from '@/store'
import { exerciseNameById } from './exerciseLookup'

interface WorkoutFormProps {
  allExercises: Exercise[]
  workout?: Workout
  onSave: (name: string, exerciseIds: string[]) => Promise<void>
  onCancel: () => void
}

export function WorkoutForm({ allExercises, workout, onSave, onCancel }: WorkoutFormProps) {
  const [name, setName] = useState(workout?.name ?? '')
  const [exerciseIds, setExerciseIds] = useState<string[]>(workout?.exerciseIds ?? [])
  const [isPicking, setIsPicking] = useState(false)

  const selectedIds = new Set(exerciseIds)

  /**
   * The picker is a view swap rather than a route, so Android's back button
   * would otherwise close the whole PWA from it. Push a history entry on open
   * and treat popping it as Done; closing any other way consumes that entry so
   * repeated opens don't stack up dead back presses.
   */
  useEffect(() => {
    if (!isPicking) return
    window.history.pushState(null, '')
    let closedByBackButton = false
    function handlePopState() {
      closedByBackButton = true
      setIsPicking(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (!closedByBackButton) window.history.back()
    }
  }, [isPicking])

  function toggleExercise(id: string, checked: boolean) {
    setExerciseIds((current) =>
      checked ? [...current, id] : current.filter((exerciseId) => exerciseId !== id)
    )
  }

  function moveExercise(index: number, direction: -1 | 1) {
    setExerciseIds((current) => {
      const next = [...current]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function removeExercise(id: string) {
    setExerciseIds((current) => current.filter((exerciseId) => exerciseId !== id))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    await onSave(name, exerciseIds)
  }

  /**
   * The name field lives inside the form that holds the Save button, so Enter
   * — the "Go" key on an Android soft keyboard — would otherwise fire implicit
   * form submission and save-and-exit the Workout mid-build. Saving is a
   * deliberate Save tap only; Enter just dismisses the keyboard.
   */
  function dismissKeyboardOnEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    event.currentTarget.blur()
  }

  // Full-screen picker: the same browsing surface as the Exercises tab, and
  // deliberately outside the form element above — a search box inside a form
  // with a submit button gets submitted by the Android keyboard's "Go" key.
  if (isPicking) {
    return (
      <div className="flex flex-col gap-4">
        <ExerciseBrowser
          exercises={allExercises}
          header={
            <div className="flex items-center justify-between gap-2">
              <SectionLabel className="mb-0">Add exercises</SectionLabel>
              <Button type="button" size="sm" onClick={() => setIsPicking(false)}>
                Done · {exerciseIds.length}
              </Button>
            </div>
          }
          renderRow={(exercise) => (
            <>
              <Checkbox
                id={`pick-${exercise.id}`}
                checked={selectedIds.has(exercise.id)}
                onCheckedChange={(checked) => toggleExercise(exercise.id, checked === true)}
              />
              <label htmlFor={`pick-${exercise.id}`} className="flex-1 text-sm">
                {exercise.name}
                <ExerciseBadges exercise={exercise} />
              </label>
            </>
          )}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={dismissKeyboardOnEnter}
        placeholder="Workout name"
        aria-label="Workout name"
      />

      <div>
        <SectionLabel>Exercises in order</SectionLabel>
        {exerciseIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exercises selected yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {exerciseIds.map((id, index) => (
              <li
                key={id}
                className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5"
              >
                <span className="flex-1">{exerciseNameById(allExercises, id)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${exerciseNameById(allExercises, id)} up`}
                  disabled={index === 0}
                  onClick={() => moveExercise(index, -1)}
                >
                  <ChevronUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${exerciseNameById(allExercises, id)} down`}
                  disabled={index === exerciseIds.length - 1}
                  onClick={() => moveExercise(index, 1)}
                >
                  <ChevronDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${exerciseNameById(allExercises, id)}`}
                  onClick={() => removeExercise(id)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => setIsPicking(true)}
        className="justify-between border-dashed text-muted-foreground"
      >
        <span>+ Add exercises</span>
        <span>›</span>
      </Button>

      <div className="flex gap-2">
        <Button type="submit">Save</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
