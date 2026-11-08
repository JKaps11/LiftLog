import type { ExportedData } from '@/store'
import { payloadForVega } from './payload'

/**
 * Sending the export to Vega, the personal agent, so its Workouts page stays
 * current without a manual export (Vega's ADR-0037).
 *
 * Vega's address and device token are entered on the Data page and kept in
 * localStorage. This repository is public, so neither one may appear in the
 * code. Like the theme, they are a device preference, not app data, so they
 * are kept out of the Store and out of the export.
 *
 * Vega replaces its whole copy on every import, so there is no cursor to keep.
 * The one saving is to skip a send when the payload is byte-for-byte the one
 * Vega last accepted. Switching apps during a workout would otherwise post the
 * same export every time.
 */

export interface VegaSettings {
  /** Vega's https address, e.g. `https://debianvega.tail1234.ts.net`, no trailing slash. */
  readonly url: string
  /** A `vega_pat_…` device token minted for LiftLog alone. */
  readonly token: string
}

export type VegaSyncStatus =
  | { readonly outcome: 'synced'; readonly at: string; readonly sessions: number }
  | { readonly outcome: 'failed'; readonly at: string; readonly message: string }

/** Why a sync was asked for. Only `manual` sends an export Vega already has. */
export type SyncReason = 'opened' | 'session-ended' | 'manual'

/** The slice of `localStorage` the sync uses, so a test can hand it a Map. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface VegaSyncDeps {
  readonly storage: KeyValueStorage
  readonly fetch: typeof fetch
  readonly exportData: () => Promise<ExportedData>
  readonly now?: () => Date
}

export interface VegaSync {
  settings(): VegaSettings | null
  /** Saves the address and token, and forgets what was last sent so the next sync goes through. */
  save(settings: VegaSettings): void
  /** Stops syncing and forgets the token. */
  disconnect(): void
  status(): VegaSyncStatus | null
  /** Sends the export if one is due. Resolves with the new status, or null if nothing was sent. */
  sync(reason: SyncReason): Promise<VegaSyncStatus | null>
}

const SETTINGS_KEY = 'liftlog:vega'
const STATUS_KEY = 'liftlog:vega-status'
const SENT_KEY = 'liftlog:vega-sent'
const INGEST_PATH = '/api/ingest/liftlog'
/** Long enough for 100 KB over a slow tailnet, short enough that a dead link gives up. */
const TIMEOUT_MS = 20_000

export function createVegaSync(deps: VegaSyncDeps): VegaSync {
  const { storage } = deps
  const now = deps.now ?? (() => new Date())
  let inFlight: Promise<VegaSyncStatus | null> | null = null

  function settings(): VegaSettings | null {
    const parsed = readJson(storage, SETTINGS_KEY)
    if (!isRecord(parsed) || typeof parsed.url !== 'string' || typeof parsed.token !== 'string') {
      return null
    }
    return { url: parsed.url, token: parsed.token }
  }

  function record(status: VegaSyncStatus): VegaSyncStatus {
    storage.setItem(STATUS_KEY, JSON.stringify(status))
    return status
  }

  async function send(target: VegaSettings, reason: SyncReason): Promise<VegaSyncStatus | null> {
    const payload = payloadForVega(await deps.exportData())
    const body = JSON.stringify(payload)
    const fingerprint = await sha256(body)
    if (reason !== 'manual' && storage.getItem(SENT_KEY) === fingerprint) return null

    const at = now().toISOString()
    let response: Response
    try {
      response = await deps.fetch(`${target.url}${INGEST_PATH}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${target.token}`, 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch {
      return record({
        outcome: 'failed',
        at,
        message: "Couldn't reach Vega. Is Tailscale on?",
      })
    }

    if (response.ok) {
      storage.setItem(SENT_KEY, fingerprint)
      return record({ outcome: 'synced', at, sessions: payload.sessions.length })
    }
    return record({ outcome: 'failed', at, message: await failureMessage(response) })
  }

  return {
    settings,
    save(next) {
      storage.setItem(SETTINGS_KEY, JSON.stringify(next))
      storage.removeItem(SENT_KEY)
      storage.removeItem(STATUS_KEY)
    },
    disconnect() {
      storage.removeItem(SETTINGS_KEY)
      storage.removeItem(SENT_KEY)
      storage.removeItem(STATUS_KEY)
    },
    status() {
      const parsed = readJson(storage, STATUS_KEY)
      return isRecord(parsed) && (parsed.outcome === 'synced' || parsed.outcome === 'failed')
        ? (parsed as unknown as VegaSyncStatus)
        : null
    },
    sync(reason) {
      const target = settings()
      if (target === null) return Promise.resolve(null)
      // Opening the app and ending a Session can land together; one send covers both.
      if (inFlight !== null) return inFlight
      inFlight = send(target, reason).finally(() => {
        inFlight = null
      })
      return inFlight
    },
  }
}

/**
 * The address as typed, made into the one to post to, or an error naming what
 * is wrong. LiftLog is served over https, and a browser blocks an https page
 * from calling a plain http address, so that is refused here with a reason
 * rather than failing later as an unreachable Vega.
 */
export function readVegaUrl(raw: string): string {
  let parsed: URL
  try {
    parsed = new URL(raw.trim())
  } catch {
    throw new Error('That is not an address. It should look like https://your-box.ts.net')
  }
  if (parsed.protocol !== 'https:') {
    throw new Error("Vega's address has to start with https://")
  }
  return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '')
}

async function failureMessage(response: Response): Promise<string> {
  if (response.status === 401) {
    return 'Vega refused the token. Mint a new one and enter it here.'
  }
  if (response.status === 400) {
    const error = await response
      .json()
      .then((body: unknown) => (isRecord(body) && typeof body.error === 'string' ? body.error : null))
      .catch(() => null)
    return error === null ? 'Vega could not read the export.' : `Vega could not read the export: ${error}`
  }
  return `Vega answered ${String(response.status)}.`
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function readJson(storage: KeyValueStorage, key: string): unknown {
  const raw = storage.getItem(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
