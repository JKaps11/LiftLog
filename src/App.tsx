import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataPage } from '@/features/data/DataPage'
import { ExercisesPage } from '@/features/exercises/ExercisesPage'
import { SessionHistoryPage } from '@/features/sessions/SessionHistoryPage'
import { SessionsPage } from '@/features/sessions/SessionsPage'
import { WorkoutsPage } from '@/features/workouts/WorkoutsPage'

type Tab = 'session' | 'history' | 'workouts' | 'exercises' | 'data'

function App() {
  const [tab, setTab] = useState<Tab>('session')

  return (
    <div className="flex min-h-svh flex-col">
      <nav className="flex gap-2 border-b border-border p-2">
        <Button
          variant={tab === 'session' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('session')}
        >
          Session
        </Button>
        <Button
          variant={tab === 'history' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('history')}
        >
          History
        </Button>
        <Button
          variant={tab === 'workouts' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('workouts')}
        >
          Workouts
        </Button>
        <Button
          variant={tab === 'exercises' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('exercises')}
        >
          Exercises
        </Button>
        <Button
          variant={tab === 'data' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('data')}
        >
          Data
        </Button>
      </nav>
      {tab === 'session' && <SessionsPage />}
      {tab === 'history' && <SessionHistoryPage />}
      {tab === 'workouts' && <WorkoutsPage />}
      {tab === 'exercises' && <ExercisesPage />}
      {tab === 'data' && <DataPage />}
    </div>
  )
}

export default App
