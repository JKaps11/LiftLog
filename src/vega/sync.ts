import { isRecord } from '@/lib/isRecord'
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

/** Where LiftLog sends its export, as saved on the Data page. */
export interface VegaSettings {
  /** Vega's https address, e.g. `https://debianvega.tail1234.ts.net`, no trailing slash. */
  readonly url: string
  /** A `vega_pat_…` device token minted for LiftLog alone. */
  readonly token: string
}

/** How the last send went, kept in localStorage so the Data page can show it after a restart. */
export type VegaSyncStatus =
  | {
      readonly outcome: 'synced'
      /** When the send went out, as an ISO instant. */
      readonly at: string
      /** How many finished Sessions Vega now has. */
      readonly sessions: number
    }
  | {
      readonly outcome: 'failed'
      /** When the sync was tried, as an ISO instant. */
      readonly at: string
      /** What went wrong, in words for the Data page. */
      readonly message: string
    }

/**
 * What one call to {@link VegaSync.sync} came to. `not-configured` and
 * `unchanged` sent nothing and recorded nothing; `recorded` tried, and carries
 * the status it left behind, which may be a failure.
 */
export type VegaSyncResult =
  | { readonly kind: 'not-configured' }
  | { readonly kind: 'unchanged' }
  | { readonly kind: 'recorded'; readonly status: VegaSyncStatus }

/** What {@link parseVegaSettings} made of the Data page's fields. */
export type ParsedVegaSettings =
  | { readonly kind: 'valid'; readonly settings: VegaSettings }
  | { readonly kind: 'invalid'; readonly message: string }

/** Why a sync was asked for. Only `manual` sends an export Vega already has. */
export type SyncReason = 'opened' | 'session-ended' | 'manual'

/** The slice of `localStorage` the sync uses, so a test can hand it a Map. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** What the sync needs from the outside, so a test can supply each one. */
export interface VegaSyncDeps {
  /** Where the settings, the last status, and the last sent fingerprint are kept. */
  readonly storage: KeyValueStorage
  /** Posts the export to Vega. */
  readonly fetch: typeof fetch
  /** Reads the full export, read afresh for every send. */
  readonly exportData: () => Promise<ExportedData>
  /** The clock a status is stamped with. Defaults to the system clock. */
  readonly now?: () => Date
}

/** LiftLog's connection to Vega: its saved settings, its last status, and the send itself. */
export interface VegaSync {
  /** The saved address and token, or null when LiftLog is not connected to Vega. */
  settings(): VegaSettings | null
  /** Saves the address and token, and forgets what was last sent so the next sync goes through. */
  save(settings: VegaSettings): void
  /** Stops syncing and forgets the token. */
  disconnect(): void
  /** How the last send went, or null when there has been none since connecting. */
  status(): VegaSyncStatus | null
  /**
   * Sends the export if one is due. Asked while a send is under way, it queues
   * one more send for after that one, since the send under way read the export
   * before whatever prompted this request (a Session ending, say). Every request
   * that lands meanwhile shares that one follow-up, which still skips an export
   * Vega already has unless one of them was `manual`.
   *
   * Never rejects: every failure, including one before anything is sent, is
   * recorded as a failed status and returned.
   */
  sync(reason: SyncReason): Promise<VegaSyncResult>
}

const SETTINGS_KEY = 'liftlog:vega'
const STATUS_KEY = 'liftlog:vega-status'
const SENT_KEY = 'liftlog:vega-sent'
const INGEST_PATH = '/api/ingest/liftlog'
/** Long enough for 100 KB over a slow tailnet, short enough that a dead link gives up. */
const TIMEOUT_MS = 20_000

/**
 * Builds LiftLog's connection to Vega over the given storage, network, and data.
 *
 * @param deps - Where settings are kept, how to post, and where the export comes from.
 * @returns The sync, holding no state of its own beyond the send under way.
 */
export function createVegaSync(deps: VegaSyncDeps): VegaSync {
  const { storage } = deps
  const now = deps.now ?? (() => new Date())
  let running: Promise<VegaSyncResult> | null = null
  let followUp: Promise<VegaSyncResult> | null = null
  let followUpReason: SyncReason = 'opened'

  function settings(): VegaSettings | null {
    const parsed = readJson(storage, SETTINGS_KEY)
    if (!isRecord(parsed) || typeof parsed.url !== 'string' || typeof parsed.token !== 'string') {
      return null
    }
    return { url: parsed.url, token: parsed.token }
  }

  function record(status: VegaSyncStatus): VegaSyncResult {
    try {
      storage.setItem(STATUS_KEY, JSON.stringify(status))
    } catch {
      // The status is for the Data page to show. Storage that refuses it must
      // not turn a send that went through into a failed sync.
    }
    return { kind: 'recorded', status }
  }

  function fail(message: string): VegaSyncResult {
    return record({ outcome: 'failed', at: now().toISOString(), message })
  }

  async function attempt(reason: SyncReason): Promise<VegaSyncResult> {
    const target = settings()
    if (target === null) return { kind: 'not-configured' }

    let data: ExportedData
    try {
      data = await deps.exportData()
    } catch {
      return fail("Couldn't read LiftLog's data to send it.")
    }
    const payload = payloadForVega(data)
    const body = JSON.stringify(payload)
    let fingerprint: string
    try {
      fingerprint = await sha256(body)
    } catch {
      // crypto.subtle exists only in a secure context, so plain http lands here.
      return fail('This page cannot fingerprint the export. Open LiftLog over https.')
    }
    if (reason !== 'manual' && storage.getItem(SENT_KEY) === fingerprint) {
      return { kind: 'unchanged' }
    }

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
      return record({ outcome: 'failed', at, message: "Couldn't reach Vega. Is Tailscale on?" })
    }

    if (response.ok) {
      storage.setItem(SENT_KEY, fingerprint)
      return record({ outcome: 'synced', at, sessions: payload.sessions.length })
    }
    return record({ outcome: 'failed', at, message: await failureMessage(response) })
  }

  function begin(reason: SyncReason): Promise<VegaSyncResult> {
    const run = attempt(reason)
      .catch((defect: unknown) => fail(`Sync stopped unexpectedly: ${messageOf(defect)}`))
      .then((result) => {
        // With a follow-up queued, `running` stays set until it starts, so a
        // request landing in between joins it instead of sending alongside it.
        if (followUp === null) running = null
        return result
      })
    running = run
    return run
  }

  function queueBehind(current: Promise<VegaSyncResult>, reason: SyncReason): Promise<VegaSyncResult> {
    // Only `manual` changes what a send does, so the follow-up is manual if any
    // request it stands for was.
    if (followUp === null || reason === 'manual') followUpReason = reason
    followUp ??= current.then(() => {
      followUp = null
      return begin(followUpReason)
    })
    return followUp
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
      return parseStatus(readJson(storage, STATUS_KEY))
    },
    sync(reason) {
      return running === null ? begin(reason) : queueBehind(running, reason)
    },
  }
}

/**
 * Reads the Data page's address and token fields into settings, or says what is
 * wrong with them. A blank token keeps the saved one, so the token never has to
 * be shown again; with nothing saved, a token is required.
 *
 * LiftLog is served over https, and a browser blocks an https page from calling
 * a plain http address, so that is refused here with a reason rather than
 * failing later as an unreachable Vega.
 *
 * @param url - The address as typed.
 * @param token - The token as typed, blank to keep the saved one.
 * @param saved - The settings already saved, or null when not connected.
 * @returns The settings to save, or a message for the Data page.
 */
export function parseVegaSettings(
  url: string,
  token: string,
  saved: VegaSettings | null
): ParsedVegaSettings {
  let address: URL
  try {
    address = new URL(url.trim())
  } catch {
    return invalid('That is not an address. It should look like https://your-box.ts.net')
  }
  if (address.protocol !== 'https:') return invalid("Vega's address has to start with https://")

  const nextToken = token.trim() || saved?.token
  if (!nextToken) return invalid('Enter the vega_pat_… token minted for LiftLog.')

  return {
    kind: 'valid',
    settings: { url: `${address.origin}${address.pathname}`.replace(/\/+$/, ''), token: nextToken },
  }
}

function invalid(message: string): ParsedVegaSettings {
  return { kind: 'invalid', message }
}

/** A stored status, field by field; anything else (an older shape, a hand edit) reads as none. */
function parseStatus(value: unknown): VegaSyncStatus | null {
  if (!isRecord(value) || typeof value.at !== 'string') return null
  if (value.outcome === 'synced' && typeof value.sessions === 'number') {
    return { outcome: 'synced', at: value.at, sessions: value.sessions }
  }
  if (value.outcome === 'failed' && typeof value.message === 'string') {
    return { outcome: 'failed', at: value.at, message: value.message }
  }
  return null
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

function messageOf(defect: unknown): string {
  return defect instanceof Error ? defect.message : String(defect)
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
