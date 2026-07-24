import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { SectionLabel } from '@/components/ui/section-label'
import type { Exercise, Workout } from '@/store'
import {
  exerciseNameById,
  filterExercisesByName,
  groupExercisesByMuscleGroup,
  MUSCLE_GROUP_LABELS,
} from './exerciseLookup'

interface WorkoutFormProps {
  allExercises: Exercise[]
  workout?: Workout
  onSave: (name: string, exerciseIds: string[]) => Promise<void>
  onCancel: () => void
}

export function WorkoutForm({ allExercises, workout, onSave, onCancel }: WorkoutFormProps) {
  const [name, setName] = useState(workout?.name ?? '')
  const [exerciseIds, setExerciseIds] = useState<string[]>(workout?.exerciseIds ?? [])
  const [exerciseSearch, setExerciseSearch] = useState('')

  const selectedIds = new Set(exerciseIds)
  const visibleExercises = filterExercisesByName(allExercises, exerciseSearch)
  const groupedExercises = groupExercisesByMuscleGroup(visibleExercises)

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

      <div>
        <SectionLabel>Add exercises</SectionLabel>
        <Input
          value={exerciseSearch}
          onChange={(event) => setExerciseSearch(event.target.value)}
          placeholder="Search exercises"
          aria-label="Search exercises"
          className="mb-2"
        />
        {visibleExercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No exercises match "{exerciseSearch.trim()}".
          </p>
        ) : (
          <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
            {groupedExercises.map(({ muscleGroup, exercises: groupExercises }) => (
              <div key={muscleGroup} className="flex flex-col gap-1">
                <SectionLabel className="mb-0">{MUSCLE_GROUP_LABELS[muscleGroup]}</SectionLabel>
                <ul className="flex flex-col gap-1">
                  {groupExercises.map((exercise) => (
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
            ))}
          </div>
        )}
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
