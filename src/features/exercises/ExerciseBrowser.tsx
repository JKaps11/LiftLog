import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { SectionLabel } from '@/components/ui/section-label'
import { EXERCISE_TYPES, type Exercise, type MuscleGroup } from '@/store'
import {
  EXERCISE_TYPE_LABELS,
  filterExercisesByName,
  filterExercisesByType,
  groupExercisesByMuscleGroup,
  MUSCLE_GROUP_LABELS,
  type ExerciseTypeFilter,
} from '@/features/workouts/exerciseLookup'
import { cn } from '@/lib/utils'

/** Must match the sticky header's `top-3` class (0.75rem) in BrowseControls below. */
const STICKY_TOP_PX = 12

const TYPE_FILTERS: readonly ExerciseTypeFilter[] = ['all', ...EXERCISE_TYPES]
const TYPE_FILTER_LABELS: Record<ExerciseTypeFilter, string> = {
  all: 'All',
  ...EXERCISE_TYPE_LABELS,
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
    <div
      role="group"
      aria-label="Filter by type"
      className="flex overflow-hidden rounded-lg border border-border"
    >
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
 * Sticky header block: search + type filter + jump-to-group strip (Apple
 * HIG's alphabet-index pattern, generalized to muscle-group category) all
 * stick together as one unit so a long grouped list is reachable in one tap
 * instead of scroll-only. Highlights the group nearest the top of the
 * viewport as the user scrolls.
 */
function BrowseControls({
  className,
  header,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  groups,
}: {
  className?: string
  header?: ReactNode
  search: string
  onSearchChange: (value: string) => void
  typeFilter: ExerciseTypeFilter
  onTypeFilterChange: (next: ExerciseTypeFilter) => void
  groups: MuscleGroup[]
}) {
  const [active, setActive] = useState<MuscleGroup | null>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function updateActive() {
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0
      let current: MuscleGroup | null = null
      for (const group of groups) {
        const section = document.getElementById(`exercise-group-${group}`)
        if (section && section.getBoundingClientRect().top - headerBottom < 40) current = group
      }
      setActive(current)
    }
    updateActive()
    window.addEventListener('scroll', updateActive, { passive: true })
    return () => window.removeEventListener('scroll', updateActive)
  }, [groups])

  function jumpTo(group: MuscleGroup) {
    const target = document.getElementById(`exercise-group-${group}`)
    if (!target) return
    // scrollIntoView's block:'start' aligns the section header with the
    // viewport top, but this whole block is sticky (offset by STICKY_TOP_PX,
    // see className below) and then sits on top of that same position —
    // offset by its own rendered height plus that gap so it doesn't cover
    // the header it just scrolled to.
    const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0
    const targetTop = target.getBoundingClientRect().top + window.scrollY - (headerHeight + STICKY_TOP_PX)
    window.scrollTo({ top: targetTop, behavior: 'smooth' })
  }

  return (
    // top-3 (not top-0) so scrolling only opens a gap above the header once it's
    // actually stuck — padding inside the box instead would also push it down
    // in its normal, unstuck resting position, widening the gap below whatever
    // sits above it.
    <div ref={headerRef} className={cn('sticky top-3 z-10 flex flex-col gap-2 bg-background pb-2', className)}>
      {header}
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search exercises"
        aria-label="Search exercises"
      />
      <TypeFilterControl value={typeFilter} onChange={onTypeFilterChange} />
      {groups.length > 0 && (
        <nav aria-label="Jump to muscle group" className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {groups.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => jumpTo(group)}
              className={cn(
                'shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-xs whitespace-nowrap text-muted-foreground',
                active === group && 'border-accent-foreground bg-accent-foreground text-background'
              )}
            >
              {MUSCLE_GROUP_LABELS[group]}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

/** The type/unilateral/timed annotations shown after an exercise's name, on every browsing surface. */
export function ExerciseBadges({ exercise }: { exercise: Exercise }) {
  return (
    <>
      <span className="ml-2 text-xs text-muted-foreground">
        ({EXERCISE_TYPE_LABELS[exercise.type]})
      </span>
      {exercise.isUnilateral && <span className="ml-2 text-xs text-muted-foreground">(unilateral)</span>}
      {exercise.isTimed && <span className="ml-2 text-xs text-muted-foreground">(timed)</span>}
    </>
  )
}

interface ExerciseBrowserProps {
  exercises: Exercise[]
  /** Contents of one exercise row; the browser owns the row wrapper itself. */
  renderRow: (exercise: Exercise) => ReactNode
  /**
   * Rendered at the top of the sticky header block, above the search box —
   * for a title/action bar that should stay reachable while scrolling.
   */
  header?: ReactNode
  /** Lands on the sticky header block, for callers needing to tune its spacing. */
  controlsClassName?: string
  /** Replaces the built-in no-matches message, e.g. while exercises are still loading. */
  emptyMessage?: ReactNode
}

/**
 * The one exercise-browsing surface, shared by the Exercises page and the
 * Workout builder's picker: search, type filter, jump-to-group rail and
 * grouping by Primary Muscle Group. Callers differ only in what a row
 * contains (manage actions vs. a selection checkbox), passed via renderRow —
 * anything else added here reaches both surfaces at once, which is the point:
 * the two used to be separate implementations and silently drifted apart.
 *
 * Renders as a fragment rather than a wrapper element so the sticky header
 * stays a direct child of the caller's own scrolling column. Search and filter
 * state is per-mount, so remounting (e.g. reopening the picker) starts fresh.
 */
export function ExerciseBrowser({
  exercises,
  renderRow,
  header,
  controlsClassName,
  emptyMessage,
}: ExerciseBrowserProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ExerciseTypeFilter>('all')

  const visibleExercises = filterExercisesByType(filterExercisesByName(exercises, search), typeFilter)
  const groups = groupExercisesByMuscleGroup(visibleExercises)

  return (
    <>
      <BrowseControls
        className={controlsClassName}
        header={header}
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        groups={groups.map((group) => group.muscleGroup)}
      />

      {visibleExercises.length === 0 ? (
        emptyMessage ?? (
          <p className="text-muted-foreground">
            {search.trim() ? `No exercises match "${search.trim()}".` : 'No exercises match this filter.'}
          </p>
        )
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
                    {renderRow(exercise)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
