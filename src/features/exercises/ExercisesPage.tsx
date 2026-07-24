import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { PageHeading } from '@/components/ui/page-heading'
import { SectionLabel } from '@/components/ui/section-label'
import { store } from '@/store/instance'
import { EXERCISE_TYPES, MUSCLE_GROUPS, type Exercise, type ExerciseType, type MuscleGroup } from '@/store'
import {
  EXERCISE_TYPE_LABELS,
  filterExercisesByName,
  filterExercisesByType,
  groupExercisesByMuscleGroup,
  MUSCLE_GROUP_LABELS,
  type ExerciseTypeFilter,
} from '@/features/workouts/exerciseLookup'
import { cn } from '@/lib/utils'

const TYPE_FILTERS: readonly ExerciseTypeFilter[] = ['all', ...EXERCISE_TYPES]
const TYPE_FILTER_LABELS: Record<ExerciseTypeFilter, string> = {
  all: 'All',
  ...EXERCISE_TYPE_LABELS,
}

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm'

/** Categorization + flags shared by the create and edit forms. */
interface ExerciseDraft {
  name: string
  isUnilateral: boolean
  isTimed: boolean
  primaryMuscleGroup: MuscleGroup
  type: ExerciseType
  otherMuscleGroups: MuscleGroup[]
}

function draftFromExercise(exercise: Exercise): ExerciseDraft {
  return {
    name: exercise.name,
    isUnilateral: exercise.isUnilateral,
    isTimed: exercise.isTimed,
    primaryMuscleGroup: exercise.primaryMuscleGroup,
    type: exercise.type,
    otherMuscleGroups: exercise.otherMuscleGroups,
  }
}

function emptyDraft(): ExerciseDraft {
  return {
    name: '',
    isUnilateral: false,
    isTimed: false,
    primaryMuscleGroup: MUSCLE_GROUPS[0],
    type: 'strength',
    otherMuscleGroups: [],
  }
}

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

/**
 * The categorization + flag fields shared by the create and edit forms
 * (everything but the name row). idPrefix must be DOM-id-safe and unique per
 * form instance (e.g. an exercise id, not its display name, which may repeat
 * or contain characters unsafe for id/htmlFor pairing); label is the
 * human-readable text used in aria-labels.
 */
function ExerciseCategoryFields({
  idPrefix,
  label,
  draft,
  onChange,
}: {
  idPrefix: string
  label: string
  draft: ExerciseDraft
  onChange: (next: ExerciseDraft) => void
}) {
  return (
    <>
      <LabeledSelect
        ariaLabel={`${label} primary muscle group`}
        value={draft.primaryMuscleGroup}
        options={MUSCLE_GROUPS}
        labels={MUSCLE_GROUP_LABELS}
        onChange={(primaryMuscleGroup) =>
          onChange({
            ...draft,
            primaryMuscleGroup,
            otherMuscleGroups: draft.otherMuscleGroups.filter((g) => g !== primaryMuscleGroup),
          })
        }
      />
      <LabeledSelect
        ariaLabel={`${label} type`}
        value={draft.type}
        options={EXERCISE_TYPES}
        labels={EXERCISE_TYPE_LABELS}
        onChange={(type) => onChange({ ...draft, type })}
      />
      <OtherMuscleGroupsFieldset
        idPrefix={idPrefix}
        primaryMuscleGroup={draft.primaryMuscleGroup}
        selected={draft.otherMuscleGroups}
        onChange={(otherMuscleGroups) => onChange({ ...draft, otherMuscleGroups })}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${idPrefix}-unilateral`}
          checked={draft.isUnilateral}
          onCheckedChange={(checked) => onChange({ ...draft, isUnilateral: checked === true })}
        />
        <label htmlFor={`${idPrefix}-unilateral`} className="text-sm text-muted-foreground">
          Unilateral
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${idPrefix}-timed`}
          checked={draft.isTimed}
          onCheckedChange={(checked) => onChange({ ...draft, isTimed: checked === true })}
        />
        <label htmlFor={`${idPrefix}-timed`} className="text-sm text-muted-foreground">
          Timed
        </label>
      </div>
    </>
  )
}

/** Single-select scope filter: each exercise has exactly one type, so this is a segmented control, not a toggle group. */
function TypeFilterControl({
  value,
  onChange,
}: {
  value: ExerciseTypeFilter
  onChange: (next: ExerciseTypeFilter) => void
}) {
  return (
    <div role="group" aria-label="Filter by type" className="flex rounded-lg border border-border">
      {TYPE_FILTERS.map((type, index) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          aria-pressed={value === type}
          className={cn(
            'flex-1 px-1 py-1.5 text-[0.8125rem] text-muted-foreground',
            index !== TYPE_FILTERS.length - 1 && 'border-r border-border',
            value === type && 'bg-accent-foreground font-semibold text-background'
          )}
        >
          {TYPE_FILTER_LABELS[type]}
        </button>
      ))}
    </div>
  )
}

/**
 * Sticky jump-to-group strip (Apple HIG's alphabet-index pattern, generalized
 * to muscle-group category) so a long grouped list is reachable in one tap
 * instead of scroll-only. Highlights the group nearest the top of the
 * viewport as the user scrolls.
 */
function JumpRail({ groups }: { groups: MuscleGroup[] }) {
  const [active, setActive] = useState<MuscleGroup | null>(null)
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function updateActive() {
      const railBottom = railRef.current?.getBoundingClientRect().bottom ?? 0
      let current: MuscleGroup | null = null
      for (const group of groups) {
        const section = document.getElementById(`exercise-group-${group}`)
        if (section && section.getBoundingClientRect().top - railBottom < 40) current = group
      }
      setActive(current)
    }
    updateActive()
    window.addEventListener('scroll', updateActive, { passive: true })
    return () => window.removeEventListener('scroll', updateActive)
  }, [groups])

  if (groups.length === 0) return null

  return (
    <nav
      ref={railRef}
      aria-label="Jump to muscle group"
      className="sticky top-0 z-10 flex gap-1.5 overflow-x-auto bg-gradient-to-b from-background from-75% to-transparent py-1 [scrollbar-width:none]"
    >
      {groups.map((group) => (
        <button
          key={group}
          type="button"
          onClick={() =>
            document
              .getElementById(`exercise-group-${group}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          className={cn(
            'shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-xs whitespace-nowrap text-muted-foreground',
            active === group && 'border-accent-foreground bg-accent-foreground text-background'
          )}
        >
          {MUSCLE_GROUP_LABELS[group]}
        </button>
      ))}
    </nav>
  )
}

export function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newDraft, setNewDraft] = useState<ExerciseDraft>(emptyDraft())
  // Tracks whether the Stretch/Mobility -> Timed convenience default has already
  // fired once for this create-form session, so it doesn't re-clobber a manual uncheck.
  const [newTimedAutoDefaulted, setNewTimedAutoDefaulted] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<ExerciseDraft>(emptyDraft())
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ExerciseTypeFilter>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const visibleExercises = filterExercisesByType(filterExercisesByName(exercises, search), typeFilter)
  const groups = groupExercisesByMuscleGroup(visibleExercises)

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

  function handleNewDraftChange(next: ExerciseDraft) {
    const shouldAutoDefaultTimed =
      (next.type === 'stretch' || next.type === 'mobility') && !newTimedAutoDefaulted
    setNewDraft(shouldAutoDefaultTimed ? { ...next, isTimed: true } : next)
    if (shouldAutoDefaultTimed) setNewTimedAutoDefaulted(true)
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!newDraft.name.trim()) return
    await store.createExercise(newDraft.name, newDraft)
    setNewDraft(emptyDraft())
    setNewTimedAutoDefaulted(false)
    await refresh()
  }

  function startEditing(exercise: Exercise) {
    setEditingId(exercise.id)
    setEditingDraft(draftFromExercise(exercise))
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault()
    if (!editingId || !editingDraft.name.trim()) return
    await store.updateExercise(editingId, editingDraft)
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

      <Button
        type="button"
        variant="outline"
        onClick={() => setIsCreateOpen(!isCreateOpen)}
        aria-expanded={isCreateOpen}
        className="justify-between border-dashed text-muted-foreground"
      >
        <span>+ New exercise</span>
        <span>{isCreateOpen ? '▲' : '▼'}</span>
      </Button>
      {isCreateOpen && (
        <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <div className="flex gap-2">
            <Input
              value={newDraft.name}
              onChange={(event) => setNewDraft({ ...newDraft, name: event.target.value })}
              placeholder="Add an exercise"
              aria-label="New exercise name"
            />
            <Button type="submit">Add</Button>
          </div>
          <ExerciseCategoryFields
            idPrefix="new-exercise"
            label="New exercise"
            draft={newDraft}
            onChange={handleNewDraftChange}
          />
        </form>
      )}

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search exercises"
        aria-label="Search exercises"
      />

      <TypeFilterControl value={typeFilter} onChange={setTypeFilter} />

      <JumpRail groups={groups.map((g) => g.muscleGroup)} />

      {isLoading ? (
        <p className="text-muted-foreground">Loading exercises…</p>
      ) : visibleExercises.length === 0 ? (
        <p className="text-muted-foreground">
          {search.trim() ? `No exercises match "${search.trim()}".` : 'No exercises match this filter.'}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ muscleGroup, exercises: groupExercises }) => (
            <div key={muscleGroup} id={`exercise-group-${muscleGroup}`} className="flex flex-col gap-1">
              <SectionLabel className="mb-0">{MUSCLE_GROUP_LABELS[muscleGroup]}</SectionLabel>
              <ul className="flex flex-col gap-1">
                {groupExercises.map((exercise) => (
                  <li
                    key={exercise.id}
                    className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5"
                  >
                    {editingId === exercise.id ? (
                      <form onSubmit={handleRename} className="flex flex-1 flex-col gap-2">
                        <div className="flex gap-2">
                          <Input
                            autoFocus
                            value={editingDraft.name}
                            onChange={(event) =>
                              setEditingDraft({ ...editingDraft, name: event.target.value })
                            }
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
                        <ExerciseCategoryFields
                          idPrefix={`edit-${exercise.id}`}
                          label={exercise.name}
                          draft={editingDraft}
                          onChange={setEditingDraft}
                        />
                      </form>
                    ) : (
                      <>
                        <span className="flex-1">
                          {exercise.name}
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({EXERCISE_TYPE_LABELS[exercise.type]})
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
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
