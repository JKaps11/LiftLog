import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SectionLabel } from '@/components/ui/section-label'
import { vegaSync } from '@/vega/instance'
import { parseVegaSettings, type VegaSyncStatus } from '@/vega/sync'

function describeStatus(status: VegaSyncStatus | null): string | null {
  if (status === null) return null
  const at = new Date(status.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  return status.outcome === 'synced'
    ? `Synced ${String(status.sessions)} sessions · ${at}`
    : `${status.message} · ${at}`
}

/**
 * Where LiftLog is pointed at Vega. Once it has an address and a token it sends
 * the export by itself whenever the app opens; this card is for setting that up
 * and for seeing whether the last send went through. The saved token is never
 * shown again, and leaving the field blank keeps it.
 */
export function VegaSyncCard() {
  const [saved, setSaved] = useState(vegaSync.settings)
  const [url, setUrl] = useState(saved?.url ?? '')
  const [token, setToken] = useState('')
  const [status, setStatus] = useState(vegaSync.status)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const isConnected = saved !== null

  async function syncNow() {
    setIsSyncing(true)
    try {
      const result = await vegaSync.sync('manual')
      if (result.kind === 'recorded') setStatus(result.status)
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleSave() {
    const parsed = parseVegaSettings(url, token, saved)
    if (parsed.kind === 'invalid') {
      setError(parsed.message)
      return
    }
    setError(null)
    vegaSync.save(parsed.settings)
    setSaved(parsed.settings)
    setUrl(parsed.settings.url)
    setToken('')
    await syncNow()
  }

  function handleDisconnect() {
    vegaSync.disconnect()
    setSaved(null)
    setUrl('')
    setToken('')
    setStatus(null)
    setError(null)
  }

  const statusLine = describeStatus(status)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <SectionLabel className="mb-0">Sync to Vega</SectionLabel>
      <p className="text-sm text-muted-foreground">
        Send your Sessions to Vega each time LiftLog opens. Your phone needs to be on Tailscale.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Address
        <Input
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://your-box.ts.net"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Token
        <Input
          type="password"
          autoComplete="off"
          placeholder={isConnected ? 'Saved. Leave blank to keep it.' : 'vega_pat_…'}
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="mt-1 flex gap-2">
        <Button onClick={handleSave} disabled={isSyncing}>
          {isConnected ? 'Save' : 'Connect'}
        </Button>
        {isConnected && (
          <>
            <Button variant="outline" onClick={syncNow} disabled={isSyncing}>
              {isSyncing ? 'Syncing…' : 'Sync now'}
            </Button>
            <Button variant="ghost" onClick={handleDisconnect} disabled={isSyncing}>
              Disconnect
            </Button>
          </>
        )}
      </div>
      {statusLine && <p className="text-sm text-muted-foreground">{statusLine}</p>}
    </div>
  )
}
