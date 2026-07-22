import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExercisesPage } from '@/features/exercises/ExercisesPage'
import { WorkoutsPage } from '@/features/workouts/WorkoutsPage'

type Tab = 'exercises' | 'workouts'

function App() {
  const [tab, setTab] = useState<Tab>('workouts')

  return (
    <div className="flex min-h-svh flex-col">
      <nav className="flex gap-2 border-b border-border p-2">
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
      {tab === 'workouts' ? <WorkoutsPage /> : <ExercisesPage />}
    </div>
  )
}

export default App
