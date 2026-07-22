import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageHeading } from '@/components/ui/page-heading'
import { SectionLabel } from '@/components/ui/section-label'
import { store } from '@/store/instance'
import type { ExportedData } from '@/store'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isExercise(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string'
}

function isWorkout(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(value.exerciseIds) &&
    value.exerciseIds.every((id) => typeof id === 'string')
  )
}

function isSessionSet(value: unknown): boolean {
  return isRecord(value) && typeof value.weight === 'number' && typeof value.reps === 'number'
}

function isSessionExerciseEntry(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.exerciseId === 'string' &&
    typeof value.exerciseNameAtLogTime === 'string' &&
    Array.isArray(value.sets) &&
    value.sets.every(isSessionSet)
  )
}

function isSession(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.workoutId === 'string' &&
    typeof value.workoutNameSnapshot === 'string' &&
    Array.isArray(value.exercises) &&
    value.exercises.every(isSessionExerciseEntry) &&
    typeof value.startTime === 'string' &&
    (value.endTime === null || typeof value.endTime === 'string') &&
    typeof value.notes === 'string' &&
    typeof value.date === 'string'
  )
}

function isExportedData(value: unknown): value is ExportedData {
  if (!isRecord(value)) return false
  return (
    value.version === 1 &&
    Array.isArray(value.exercises) &&
    value.exercises.every(isExercise) &&
    Array.isArray(value.workouts) &&
    value.workouts.every(isWorkout) &&
    Array.isArray(value.sessions) &&
    value.sessions.every(isSession)
  )
}

export function DataPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function handleExport() {
    const data = await store.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `liftlog-export-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setStatus('Exported.')
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setStatus('That file is not valid JSON.')
      return
    }

    if (!isExportedData(parsed)) {
      setStatus('That file is not a LiftLog export.')
      return
    }

    const confirmed = window.confirm(
      'Importing will replace all Exercises, Workouts, and Sessions currently on this device. Continue?'
    )
    if (!confirmed) return

    await store.importData(parsed)
    window.location.reload()
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <PageHeading>Data</PageHeading>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
        <SectionLabel className="mb-0">Export</SectionLabel>
        <p className="text-sm text-muted-foreground">
          Save all your Exercises, Workouts, and Sessions to a JSON file.
        </p>
        <Button className="mt-1 self-start" onClick={handleExport}>
          Export data
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
        <SectionLabel className="mb-0">Import</SectionLabel>
        <p className="text-sm text-muted-foreground">
          Restore from a previously exported file. This replaces all data currently on this
          device.
        </p>
        <Button className="mt-1 self-start" variant="outline" onClick={handleImportClick}>
          Import data
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </main>
  )
}
