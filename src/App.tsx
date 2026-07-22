import { Button } from '@/components/ui/button'

function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-4 text-foreground">
      <h1 className="text-2xl font-semibold">Workout Logs</h1>
      <Button>Get started</Button>
    </main>
  )
}

export default App
