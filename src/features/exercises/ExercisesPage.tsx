import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { PageHeading } from '@/components/ui/page-heading'
import { store } from '@/store/instance'
import { EXERCISE_TYPES, MUSCLE_GROUPS, type Exercise, type ExerciseType, type MuscleGroup } from '@/store'
import { filterExercisesByName } from '@/features/workouts/exerciseLookup'

const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  neck: 'Neck',
}

const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  strength: 'Strength',
  stretch: 'Stretch',
  mobility: 'Mobility',
}

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm'

function toggleMuscleGroup(current: MuscleGroup[], group: MuscleGroup, checked: boolean): MuscleGroup[] {
  return checked ? [...current, group] : current.filter((g) => g !== group)
}

function LabeledSelect<T extends string>({
  ariaLabel,
  value,
  options,
  labels,
  onChange,
}: {
  ariaLabel: string
  value: T
  options: readonly T[]
  labels: Record<T, string>
  onChange: (value: T) => void
}) {
  return (
    <select
      className={selectClassName}
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </select>
  )
}

function OtherMuscleGroupsFieldset({
  idPrefix,
  primaryMuscleGroup,
  selected,
  onChange,
}: {
  idPrefix: string
  primaryMuscleGroup: MuscleGroup
  selected: MuscleGroup[]
  onChange: (next: MuscleGroup[]) => void
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm text-muted-foreground">Other Muscle Groups</legend>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {MUSCLE_GROUPS.filter((group) => group !== primaryMuscleGroup).map((group) => (
          <div key={group} className="flex items-center gap-1.5">
            <Checkbox
              id={`${idPrefix}-other-${group}`}
              checked={selected.includes(group)}
              onCheckedChange={(checked) => onChange(toggleMuscleGroup(selected, group, checked === true))}
            />
            <label htmlFor={`${idPrefix}-other-${group}`} className="text-sm text-muted-foreground">
              {MUSCLE_GROUP_LABELS[group]}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  )
}

export function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newIsUnilateral, setNewIsUnilateral] = useState(false)
  const [newIsTimed, setNewIsTimed] = useState(false)
  const [newPrimaryMuscleGroup, setNewPrimaryMuscleGroup] = useState<MuscleGroup>(MUSCLE_GROUPS[0])
  const [newType, setNewType] = useState<ExerciseType>('strength')
  const [newOtherMuscleGroups, setNewOtherMuscleGroups] = useState<MuscleGroup[]>([])
  // Tracks whether the Stretch/Mobility -> Timed convenience default has already
  // fired once for this create-form session, so it doesn't re-clobber a manual uncheck.
  const [newTimedAutoDefaulted, setNewTimedAutoDefaulted] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingIsUnilateral, setEditingIsUnilateral] = useState(false)
  const [editingIsTimed, setEditingIsTimed] = useState(false)
  const [editingPrimaryMuscleGroup, setEditingPrimaryMuscleGroup] = useState<MuscleGroup>(MUSCLE_GROUPS[0])
  const [editingType, setEditingType] = useState<ExerciseType>('strength')
  const [editingOtherMuscleGroups, setEditingOtherMuscleGroups] = useState<MuscleGroup[]>([])
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

  function handleNewPrimaryMuscleGroupChange(group: MuscleGroup) {
    setNewPrimaryMuscleGroup(group)
    setNewOtherMuscleGroups((current) => current.filter((g) => g !== group))
  }

  function handleNewTypeChange(type: ExerciseType) {
    setNewType(type)
    if ((type === 'stretch' || type === 'mobility') && !newTimedAutoDefaulted) {
      setNewIsTimed(true)
      setNewTimedAutoDefaulted(true)
    }
  }

  function handleEditingPrimaryMuscleGroupChange(group: MuscleGroup) {
    setEditingPrimaryMuscleGroup(group)
    setEditingOtherMuscleGroups((current) => current.filter((g) => g !== group))
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!newName.trim()) return
    await store.createExercise(newName, {
      isUnilateral: newIsUnilateral,
      isTimed: newIsTimed,
      primaryMuscleGroup: newPrimaryMuscleGroup,
      type: newType,
      otherMuscleGroups: newOtherMuscleGroups,
    })
    setNewName('')
    setNewIsUnilateral(false)
    setNewIsTimed(false)
    setNewPrimaryMuscleGroup(MUSCLE_GROUPS[0])
    setNewType('strength')
    setNewOtherMuscleGroups([])
    setNewTimedAutoDefaulted(false)
    await refresh()
  }

  function startEditing(exercise: Exercise) {
    setEditingId(exercise.id)
    setEditingName(exercise.name)
    setEditingIsUnilateral(exercise.isUnilateral)
    setEditingIsTimed(exercise.isTimed)
    setEditingPrimaryMuscleGroup(exercise.primaryMuscleGroup)
    setEditingType(exercise.type)
    setEditingOtherMuscleGroups(exercise.otherMuscleGroups)
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault()
    if (!editingId || !editingName.trim()) return
    await store.updateExercise(editingId, {
      name: editingName,
      isUnilateral: editingIsUnilateral,
      isTimed: editingIsTimed,
      primaryMuscleGroup: editingPrimaryMuscleGroup,
      type: editingType,
      otherMuscleGroups: editingOtherMuscleGroups,
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
        <LabeledSelect
          ariaLabel="New exercise primary muscle group"
          value={newPrimaryMuscleGroup}
          options={MUSCLE_GROUPS}
          labels={MUSCLE_GROUP_LABELS}
          onChange={handleNewPrimaryMuscleGroupChange}
        />
        <LabeledSelect
          ariaLabel="New exercise type"
          value={newType}
          options={EXERCISE_TYPES}
          labels={EXERCISE_TYPE_LABELS}
          onChange={handleNewTypeChange}
        />
        <OtherMuscleGroupsFieldset
          idPrefix="new-exercise"
          primaryMuscleGroup={newPrimaryMuscleGroup}
          selected={newOtherMuscleGroups}
          onChange={setNewOtherMuscleGroups}
        />
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
                  <LabeledSelect
                    ariaLabel={`${exercise.name} primary muscle group`}
                    value={editingPrimaryMuscleGroup}
                    options={MUSCLE_GROUPS}
                    labels={MUSCLE_GROUP_LABELS}
                    onChange={handleEditingPrimaryMuscleGroupChange}
                  />
                  <LabeledSelect
                    ariaLabel={`${exercise.name} type`}
                    value={editingType}
                    options={EXERCISE_TYPES}
                    labels={EXERCISE_TYPE_LABELS}
                    onChange={setEditingType}
                  />
                  <OtherMuscleGroupsFieldset
                    idPrefix={`edit-${exercise.id}`}
                    primaryMuscleGroup={editingPrimaryMuscleGroup}
                    selected={editingOtherMuscleGroups}
                    onChange={setEditingOtherMuscleGroups}
                  />
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
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({MUSCLE_GROUP_LABELS[exercise.primaryMuscleGroup]} · {EXERCISE_TYPE_LABELS[exercise.type]})
                    </span>
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
