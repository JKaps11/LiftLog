import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { store } from '@/store/instance'
import type { ExportedData } from '@/store'

function isExportedData(value: unknown): value is ExportedData {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Record<string, unknown>
  return (
    data.version === 1 &&
    Array.isArray(data.exercises) &&
    Array.isArray(data.workouts) &&
    Array.isArray(data.sessions)
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
    link.download = `workout-logs-export-${new Date().toISOString().slice(0, 10)}.json`
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
      setStatus('That file is not a Workout Logs export.')
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
      <h1 className="text-2xl font-semibold">Data</h1>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
        <h2 className="font-medium">Export</h2>
        <p className="text-sm text-muted-foreground">
          Save all your Exercises, Workouts, and Sessions to a JSON file.
        </p>
        <Button className="self-start" onClick={handleExport}>
          Export data
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
        <h2 className="font-medium">Import</h2>
        <p className="text-sm text-muted-foreground">
          Restore from a previously exported file. This replaces all data currently on this
          device.
        </p>
        <Button className="self-start" variant="outline" onClick={handleImportClick}>
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
