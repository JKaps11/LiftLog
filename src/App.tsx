import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExercisesPage } from '@/features/exercises/ExercisesPage'
import { SessionsPage } from '@/features/sessions/SessionsPage'
import { WorkoutsPage } from '@/features/workouts/WorkoutsPage'

type Tab = 'session' | 'workouts' | 'exercises'

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
      </nav>
      {tab === 'session' && <SessionsPage />}
      {tab === 'workouts' && <WorkoutsPage />}
      {tab === 'exercises' && <ExercisesPage />}
    </div>
  )
}

export default App
