/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import {
  withoutAbsentMeasurements,
  MEASUREMENT_FIELDS,
  type Exercise,
  type SessionExerciseEntry,
  type SessionSet,
  type SetMeasurements,
} from '@/store'
import { SessionExerciseCard } from './SessionExerciseCard'

const BENCH: Exercise = {
  id: 'ex-bench',
  name: 'Bench Press',
  isUnilateral: false,
  isTimed: false,
  primaryMuscleGroup: 'chest',
  otherMuscleGroups: [],
  type: 'strength',
}

/**
 * Stands in for a Session being edited, with writes that land a tick later the way
 * persisting to IndexedDB does. The two write paths mirror Store.updateSet (merge the
 * named measurements) and Store.fillSetMeasurements (fill only what is missing);
 * those semantics are pinned down against the real Store in store.test.ts, and are
 * reproduced here only so the round-trip has something faithful to be late from.
 */
function Harness({
  initialSets,
  carriedSets,
  writeDelayMs = 0,
}: {
  initialSets: SessionSet[]
  carriedSets?: SessionSet[]
  writeDelayMs?: number
}) {
  const [sets, setSets] = useState(initialSets)

  function write(setIndex: number, update: (stored: SessionSet) => SessionSet) {
    const apply = () =>
      setSets((previous) =>
        previous.map((stored, i) => (i === setIndex ? withoutAbsentMeasurements(update(stored)) : stored))
      )
    if (writeDelayMs === 0) void Promise.resolve().then(apply)
    else setTimeout(apply, writeDelayMs)
  }

  const entry: SessionExerciseEntry = {
    exerciseId: BENCH.id,
    exerciseNameAtLogTime: BENCH.name,
    sets,
  }

  return (
    <ul>
      <SessionExerciseCard
        entry={entry}
        exercises={[BENCH]}
        carriedSets={carriedSets}
        onAddSet={() => {}}
        onSetPatch={(_exerciseId, setIndex, patch) => {
          write(setIndex, (stored) => ({ ...stored, ...patch }))
        }}
        onAcceptGhostValues={(_exerciseId, setIndex, values: SetMeasurements) => {
          write(setIndex, (stored) => {
            const filled = { ...stored }
            for (const field of MEASUREMENT_FIELDS) {
              if (filled[field] === undefined && values[field] !== undefined) {
                filled[field] = values[field]
              }
            }
            return filled
          })
        }}
        onDeleteSet={() => {}}
      />
    </ul>
  )
}

function weightField() {
  return screen.getByLabelText('Set 1 weight (lbs) for Bench Press') as HTMLInputElement
}

function repsField() {
  return screen.getByLabelText('Set 1 reps for Bench Press') as HTMLInputElement
}

const WRITE_DELAY_MS = 50

/**
 * Waits for every write in flight to land. A `waitFor` alone would happily succeed on
 * a moment mid-flight, so an assertion about what a field ends up holding has to be
 * made after the last late write has had its say.
 */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, WRITE_DELAY_MS * 3))
  })
}

/**
 * Selection is asserted through a spy on the DOM call rather than through
 * selectionStart, because a number input exposes no selection range to read back —
 * the call itself is the only observable in jsdom. It is stubbed rather than called
 * through for the same reason: jsdom rejects setting a selection on a number input.
 */
let select: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  select = vi.spyOn(HTMLInputElement.prototype, 'select').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SessionExerciseCard set fields', () => {
  it('lets a number be typed a digit at a time when the Set has no Ghost Value to accept', async () => {
    render(<Harness initialSets={[{}]} />)

    await userEvent.type(weightField(), '135')

    // The bug this guards: with nothing to accept, the field still waited for an
    // accepted value, and the lifter's own first digit satisfied the wait — selecting
    // it, so the second digit replaced the first instead of following it.
    expect(select).not.toHaveBeenCalled()
    expect(weightField().value).toBe('135')
  })

  it('keeps every digit typed while writes are still in flight', async () => {
    render(<Harness initialSets={[{}]} writeDelayMs={WRITE_DELAY_MS} />)

    await userEvent.type(weightField(), '225')

    // Both while the writes are outstanding, and once the lagging values have all
    // landed back on the field.
    expect(weightField().value).toBe('225')
    await settle()
    expect(weightField().value).toBe('225')
  })

  it('does not select a value the lifter is editing by hand', async () => {
    render(<Harness initialSets={[{ weight: 135, reps: 8 }]} />)

    await userEvent.type(weightField(), '4')

    expect(select).not.toHaveBeenCalled()
  })

  it('accepts the whole row from its Ghost Values on one touch, and selects what arrives', async () => {
    render(<Harness initialSets={[{}]} carriedSets={[{ weight: 135, reps: 8 }]} />)
    expect(weightField().placeholder).toBe('135')

    await userEvent.click(weightField())

    await waitFor(() => expect(weightField().value).toBe('135'))
    expect(repsField().value).toBe('8')
    expect(select).toHaveBeenCalled()
  })

  it('leaves a measurement typed moments earlier alone when the accept lands after it', async () => {
    render(
      <Harness
        initialSets={[{}]}
        carriedSets={[{ weight: 135, reps: 8 }]}
        writeDelayMs={WRITE_DELAY_MS}
      />
    )

    // Type a weight and tap into reps before that write has landed, so the accept is
    // still working from a row that looks empty and offers a weight of its own.
    await userEvent.type(weightField(), '145')
    await userEvent.click(repsField())
    await settle()

    expect(weightField().value).toBe('145')
    expect(repsField().value).toBe('8')
  })

  it('stops waiting to select once the field is left, so a later edit is not selected', async () => {
    render(<Harness initialSets={[{}]} />)

    await userEvent.click(weightField())
    await userEvent.tab()
    await userEvent.type(weightField(), '135')

    expect(select).not.toHaveBeenCalled()
    expect(weightField().value).toBe('135')
  })
})
