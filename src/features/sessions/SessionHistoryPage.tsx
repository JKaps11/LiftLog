import { useEffect, useState } from 'react'
import { store } from '@/store/instance'
import type { Exercise, Session } from '@/store'
import { formatSessionTimeRange } from './dateTime'
import { SessionDetail } from './SessionDetail'

type View = { mode: 'list' } | { mode: 'detail'; session: Session }

export function SessionHistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<View>({ mode: 'list' })

  async function refresh() {
    const [allSessions, allExercises] = await Promise.all([
      store.listSessions(),
      store.listExercises(),
    ])
    setSessions(allSessions)
    setExercises(allExercises)
    return allSessions
  }

  useEffect(() => {
    void (async () => {
      await refresh()
      setIsLoading(false)
    })()
  }, [])

  if (isLoading) {
    return <p className="p-4 text-muted-foreground">Loading history…</p>
  }

  if (view.mode === 'detail') {
    return (
      <SessionDetail
        session={view.session}
        exercises={exercises}
        onChange={(session) => setView({ mode: 'detail', session })}
        onDelete={async () => {
          await refresh()
          setView({ mode: 'list' })
        }}
        onBack={async () => {
          await refresh()
          setView({ mode: 'list' })
        }}
      />
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">History</h1>

      {sessions.length === 0 ? (
        <p className="text-muted-foreground">No Sessions logged yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <button
                type="button"
                onClick={() => setView({ mode: 'detail', session })}
                className="flex w-full flex-col gap-0.5 rounded-lg border border-border p-2.5 text-left transition-colors hover:bg-muted"
              >
                <span className="font-medium">{session.workoutNameSnapshot}</span>
                <span className="text-sm text-muted-foreground">
                  {formatSessionTimeRange(session.startTime, session.endTime)}
                </span>
                {session.notes && (
                  <span className="mt-1 text-sm text-muted-foreground italic">
                    {session.notes}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
