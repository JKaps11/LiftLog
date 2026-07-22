import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { store } from '@/store/instance'
import { isSamePermutation, type Exercise, type Workout } from '@/store'
import { exerciseNameById } from './exerciseLookup'
import { WorkoutForm } from './WorkoutForm'

type View = { mode: 'list' } | { mode: 'new' } | { mode: 'edit'; workout: Workout }

export function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<View>({ mode: 'list' })

  async function refresh() {
    const [allWorkouts, allExercises] = await Promise.all([
      store.listWorkouts(),
      store.listExercises(),
    ])
    setWorkouts(allWorkouts)
    setExercises(allExercises)
  }

  useEffect(() => {
    void (async () => {
      await refresh()
      setIsLoading(false)
    })()
  }, [])

  async function handleDelete(id: string) {
    await store.deleteWorkout(id)
    await refresh()
  }

  if (isLoading) {
    return <p className="p-4 text-muted-foreground">Loading workouts…</p>
  }

  if (view.mode === 'new') {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
        <h1 className="text-2xl font-semibold">New Workout</h1>
        <WorkoutForm
          allExercises={exercises}
          onSave={async (name, exerciseIds) => {
            await store.createWorkout(name, exerciseIds)
            await refresh()
            setView({ mode: 'list' })
          }}
          onCancel={() => setView({ mode: 'list' })}
        />
      </main>
    )
  }

  if (view.mode === 'edit') {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
        <h1 className="text-2xl font-semibold">Edit Workout</h1>
        <WorkoutForm
          allExercises={exercises}
          workout={view.workout}
          onSave={async (name, exerciseIds) => {
            const original = view.workout
            const isPureReorder =
              name.trim() === original.name && isSamePermutation(original.exerciseIds, exerciseIds)

            if (isPureReorder) {
              await store.reorderWorkoutExercises(original.id, exerciseIds)
            } else {
              await store.updateWorkout(original.id, { name, exerciseIds })
            }
            await refresh()
            setView({ mode: 'list' })
          }}
          onCancel={() => setView({ mode: 'list' })}
        />
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Workouts</h1>
        <Button onClick={() => setView({ mode: 'new' })}>New Workout</Button>
      </div>

      {workouts.length === 0 ? (
        <p className="text-muted-foreground">No workouts yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {workouts.map((workout) => (
            <li key={workout.id} className="rounded-lg border border-border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{workout.name}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setView({ mode: 'edit', workout })}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(workout.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {workout.exerciseIds.length > 0 && (
                <ol className="mt-1.5 list-decimal pl-5 text-sm text-muted-foreground">
                  {workout.exerciseIds.map((id) => (
                    <li key={id}>{exerciseNameById(exercises, id)}</li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
