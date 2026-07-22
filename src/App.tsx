import { useState } from 'react'
import { Activity, Database, Dumbbell, History, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataPage } from '@/features/data/DataPage'
import { ExercisesPage } from '@/features/exercises/ExercisesPage'
import { SessionHistoryPage } from '@/features/sessions/SessionHistoryPage'
import { SessionsPage } from '@/features/sessions/SessionsPage'
import { WorkoutsPage } from '@/features/workouts/WorkoutsPage'

type Tab = 'session' | 'history' | 'workouts' | 'exercises' | 'data'

const TABS: { id: Tab; label: string; icon: typeof Dumbbell }[] = [
  { id: 'session', label: 'Session', icon: Dumbbell },
  { id: 'history', label: 'History', icon: History },
  { id: 'workouts', label: 'Workouts', icon: ListChecks },
  { id: 'exercises', label: 'Exercises', icon: Activity },
  { id: 'data', label: 'Data', icon: Database },
]

function App() {
  const [tab, setTab] = useState<Tab>('session')

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="flex-1 pb-20">
        {tab === 'session' && <SessionsPage />}
        {tab === 'history' && <SessionHistoryPage />}
        {tab === 'workouts' && <WorkoutsPage />}
        {tab === 'exercises' && <ExercisesPage />}
        {tab === 'data' && <DataPage />}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        aria-label="Primary"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.65rem] font-semibold tracking-wide uppercase transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default App
