import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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

  const selectedIds = new Set(exerciseIds)

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Workout name"
        aria-label="Workout name"
      />

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Exercises in order</h2>
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

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Add exercises</h2>
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {allExercises.map((exercise) => (
            <li key={exercise.id} className="flex items-center gap-2 px-2.5 py-1">
              <Checkbox
                id={`exercise-${exercise.id}`}
                checked={selectedIds.has(exercise.id)}
                onCheckedChange={(checked) => toggleExercise(exercise.id, checked === true)}
              />
              <label htmlFor={`exercise-${exercise.id}`} className="flex-1 text-sm">
                {exercise.name}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        <Button type="submit">Save</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
