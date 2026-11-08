import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { PageHeading } from '@/components/ui/page-heading'
import { SectionLabel } from '@/components/ui/section-label'
import { ExerciseBadges } from '@/features/exercises/ExerciseBrowser'
import type { Exercise } from '@/store'

interface SessionWrapUpProps {
  workoutName: string
  /** The Added Exercises worth keeping, already filtered by the Store. */
  offered: Exercise[]
  onKeep: (exerciseIds: string[]) => void
  onSkip: () => void
}

/**
 * Shown after a Session has ended and been saved, when it used Exercises the
 * Workout didn't list. Nothing starts ticked: a one-off is the common case, and
 * changing the template is the consequential direction. Skipping — or saving with
 * nothing ticked — changes nothing.
 */
export function SessionWrapUp({ workoutName, offered, onKeep, onSkip }: SessionWrapUpProps) {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())

  function toggle(exerciseId: string, checked: boolean) {
    setChosen((current) => {
      const next = new Set(current)
      if (checked) next.add(exerciseId)
      else next.delete(exerciseId)
      return next
    })
  }

  function handleSave() {
    if (chosen.size === 0) onSkip()
    else onKeep(offered.filter((exercise) => chosen.has(exercise.id)).map((exercise) => exercise.id))
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <PageHeading>Session saved</PageHeading>

      <div>
        <SectionLabel>Keep in {workoutName}?</SectionLabel>
        <p className="mb-2 text-sm text-muted-foreground">
          You added these today. Tick any you want in {workoutName} from now on.
        </p>
        <ul className="flex flex-col gap-1">
          {offered.map((exercise) => (
            <li
              key={exercise.id}
              className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5"
            >
              <Checkbox
                id={`keep-${exercise.id}`}
                checked={chosen.has(exercise.id)}
                onCheckedChange={(checked) => toggle(exercise.id, checked === true)}
              />
              <label htmlFor={`keep-${exercise.id}`} className="flex-1 text-sm">
                {exercise.name}
                <ExerciseBadges exercise={exercise} />
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={handleSave}>
          Save
        </Button>
        <Button type="button" variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </main>
  )
}
