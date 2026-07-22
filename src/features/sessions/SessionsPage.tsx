import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageHeading } from '@/components/ui/page-heading'
import { store } from '@/store/instance'
import type { Exercise, Session, Workout } from '@/store'
import { ActiveSession } from './ActiveSession'

type View = { mode: 'pick' } | { mode: 'active'; session: Session }

export function SessionsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<View>({ mode: 'pick' })

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

  async function handleStart(workoutId: string) {
    const session = await store.startSession(workoutId)
    setView({ mode: 'active', session })
  }

  async function handleEnd(session: Session) {
    await store.endSession(session.id)
    setView({ mode: 'pick' })
  }

  if (isLoading) {
    return <p className="p-4 text-muted-foreground">Loading…</p>
  }

  if (view.mode === 'active') {
    return (
      <ActiveSession
        session={view.session}
        exercises={exercises}
        onChange={(session) => setView({ mode: 'active', session })}
        onEnd={() => handleEnd(view.session)}
      />
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <PageHeading>Start a Session</PageHeading>

      {workouts.length === 0 ? (
        <p className="text-muted-foreground">No Workouts yet — create one first.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {workouts.map((workout) => (
            <li
              key={workout.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3"
            >
              <span className="font-medium">{workout.name}</span>
              <Button onClick={() => handleStart(workout.id)}>Start</Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
