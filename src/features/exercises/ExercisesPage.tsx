import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { store } from '@/store/instance'
import type { Exercise } from '@/store'

export function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  async function refresh() {
    setExercises(await store.listExercises())
  }

  useEffect(() => {
    void (async () => {
      await store.seedExercisesIfEmpty()
      await refresh()
      setIsLoading(false)
    })()
  }, [])

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!newName.trim()) return
    await store.createExercise(newName)
    setNewName('')
    await refresh()
  }

  function startEditing(exercise: Exercise) {
    setEditingId(exercise.id)
    setEditingName(exercise.name)
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault()
    if (!editingId || !editingName.trim()) return
    await store.renameExercise(editingId, editingName)
    setEditingId(null)
    await refresh()
  }

  async function handleDelete(id: string) {
    await store.deleteExercise(id)
    await refresh()
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Exercises</h1>

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Add an exercise"
          aria-label="New exercise name"
        />
        <Button type="submit">Add</Button>
      </form>

      {isLoading ? (
        <p className="text-muted-foreground">Loading exercises…</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {exercises.map((exercise) => (
            <li
              key={exercise.id}
              className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5"
            >
              {editingId === exercise.id ? (
                <form onSubmit={handleRename} className="flex flex-1 gap-2">
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    aria-label={`Rename ${exercise.name}`}
                  />
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <span className="flex-1">{exercise.name}</span>
                  <Button variant="outline" size="sm" onClick={() => startEditing(exercise)}>
                    Rename
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(exercise.id)}
                  >
                    Delete
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
