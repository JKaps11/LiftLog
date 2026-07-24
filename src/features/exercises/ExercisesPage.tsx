import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { PageHeading } from '@/components/ui/page-heading'
import { store } from '@/store/instance'
import type { Exercise } from '@/store'
import { filterExercisesByName } from '@/features/workouts/exerciseLookup'

export function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newIsUnilateral, setNewIsUnilateral] = useState(false)
  const [newIsTimed, setNewIsTimed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingIsUnilateral, setEditingIsUnilateral] = useState(false)
  const [editingIsTimed, setEditingIsTimed] = useState(false)
  const [search, setSearch] = useState('')

  const visibleExercises = filterExercisesByName(exercises, search)

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
    await store.createExercise(newName, newIsUnilateral, newIsTimed)
    setNewName('')
    setNewIsUnilateral(false)
    setNewIsTimed(false)
    await refresh()
  }

  function startEditing(exercise: Exercise) {
    setEditingId(exercise.id)
    setEditingName(exercise.name)
    setEditingIsUnilateral(exercise.isUnilateral)
    setEditingIsTimed(exercise.isTimed)
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault()
    if (!editingId || !editingName.trim()) return
    await store.updateExercise(editingId, {
      name: editingName,
      isUnilateral: editingIsUnilateral,
      isTimed: editingIsTimed,
    })
    setEditingId(null)
    await refresh()
  }

  async function handleDelete(id: string) {
    await store.deleteExercise(id)
    await refresh()
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <PageHeading>Exercises</PageHeading>

      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Add an exercise"
            aria-label="New exercise name"
          />
          <Button type="submit">Add</Button>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="new-exercise-unilateral"
            checked={newIsUnilateral}
            onCheckedChange={(checked) => setNewIsUnilateral(checked === true)}
          />
          <label htmlFor="new-exercise-unilateral" className="text-sm text-muted-foreground">
            Unilateral
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="new-exercise-timed"
            checked={newIsTimed}
            onCheckedChange={(checked) => setNewIsTimed(checked === true)}
          />
          <label htmlFor="new-exercise-timed" className="text-sm text-muted-foreground">
            Timed
          </label>
        </div>
      </form>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search exercises"
        aria-label="Search exercises"
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading exercises…</p>
      ) : visibleExercises.length === 0 ? (
        <p className="text-muted-foreground">No exercises match "{search.trim()}".</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {visibleExercises.map((exercise) => (
            <li
              key={exercise.id}
              className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5"
            >
              {editingId === exercise.id ? (
                <form onSubmit={handleRename} className="flex flex-1 flex-col gap-2">
                  <div className="flex gap-2">
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
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-unilateral-${exercise.id}`}
                      checked={editingIsUnilateral}
                      onCheckedChange={(checked) => setEditingIsUnilateral(checked === true)}
                    />
                    <label
                      htmlFor={`edit-unilateral-${exercise.id}`}
                      className="text-sm text-muted-foreground"
                    >
                      Unilateral
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-timed-${exercise.id}`}
                      checked={editingIsTimed}
                      onCheckedChange={(checked) => setEditingIsTimed(checked === true)}
                    />
                    <label
                      htmlFor={`edit-timed-${exercise.id}`}
                      className="text-sm text-muted-foreground"
                    >
                      Timed
                    </label>
                  </div>
                </form>
              ) : (
                <>
                  <span className="flex-1">
                    {exercise.name}
                    {exercise.isUnilateral && (
                      <span className="ml-2 text-xs text-muted-foreground">(unilateral)</span>
                    )}
                    {exercise.isTimed && (
                      <span className="ml-2 text-xs text-muted-foreground">(timed)</span>
                    )}
                  </span>
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
