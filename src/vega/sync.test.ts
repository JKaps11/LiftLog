import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Exercise, ExportedData, Session } from '@/store'
import { payloadForVega } from './payload'
import { createVegaSync, parseVegaSettings, type KeyValueStorage } from './sync'

const SQUAT: Exercise = {
  id: 'ex-squat',
  name: 'Squat',
  isUnilateral: false,
  isTimed: false,
  primaryMuscleGroup: 'quads',
  otherMuscleGroups: ['glutes'],
  type: 'strength',
}

const PLANK: Exercise = { ...SQUAT, id: 'ex-plank', name: 'Plank', isTimed: true, type: 'strength' }

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: 's-1',
    workoutId: 'w-legs',
    workoutNameSnapshot: 'Legs',
    exercises: [{ exerciseId: SQUAT.id, exerciseNameAtLogTime: 'Squat', sets: [{ weight: 225, reps: 5 }] }],
    startTime: '2026-11-07T22:00:00.000Z',
    endTime: '2026-11-07T23:00:00.000Z',
    notes: '',
    date: '2026-11-07T22:00:00.000Z',
    ...overrides,
  }
}

function exportOf(sessions: Session[]): ExportedData {
  return { version: 1, exercises: [SQUAT, PLANK], workouts: [], sessions }
}

function memoryStorage(): KeyValueStorage {
  const items = new Map<string, string>()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  }
}

const SETTINGS = { url: 'https://vega.example.ts.net', token: 'vega_pat_test' }

interface SetupOptions {
  readonly exportData?: () => Promise<ExportedData>
  readonly answer?: () => Promise<Response>
}

function setup({ exportData = async () => exportOf([session()]), answer = ok }: SetupOptions = {}) {
  const storage = memoryStorage()
  const fetch = vi.fn<typeof globalThis.fetch>(answer)
  const sync = createVegaSync({
    storage,
    fetch,
    exportData,
    now: () => new Date('2026-11-08T12:00:00.000Z'),
  })
  return { sync, fetch, storage }
}

function ok(): Promise<Response> {
  return Promise.resolve(accepted())
}

function accepted(): Response {
  return new Response('{"exercises":2,"sessions":1}', { status: 200 })
}

/** A fetch whose answers wait until the test gives them, so a send can be caught under way. */
function heldAnswers() {
  const pending: Array<(response: Response) => void> = []
  return {
    answer: () => new Promise<Response>((resolve) => pending.push(resolve)),
    release: (index: number) => pending[index](accepted()),
  }
}

function sentSessionIds(fetch: ReturnType<typeof setup>['fetch'], call: number): string[] {
  const body: ExportedData = JSON.parse(String(fetch.mock.calls[call][1]?.body))
  return body.sessions.map((sent) => sent.id)
}

describe('payloadForVega', () => {
  it('leaves out the Session still in progress, which reaches Vega once it ends', () => {
    const payload = payloadForVega(
      exportOf([session(), session({ id: 's-open', endTime: null, exercises: [] })])
    )
    expect(payload.sessions.map((s) => s.id)).toEqual(['s-1'])
  })

  it('sends only performed Sets, in the shape their Exercise says they have', () => {
    const payload = payloadForVega(
      exportOf([
        session({
          exercises: [
            {
              exerciseId: SQUAT.id,
              exerciseNameAtLogTime: 'Squat',
              // A Pending Set, and a weight or reps typed alone, sit beside a real one.
              sets: [{}, { weight: 135 }, { reps: 8 }, { weight: 225, reps: 5, side: 'left' }],
            },
            {
              exerciseId: PLANK.id,
              exerciseNameAtLogTime: 'Plank',
              sets: [{ durationSeconds: 60, reps: 1 }],
            },
          ],
        }),
      ])
    )
    expect(payload.sessions[0].exercises.map((entry) => entry.sets)).toEqual([
      [{ reps: 5, weight: 225, side: 'left' }],
      [{ durationSeconds: 60 }],
    ])
  })

  it("reads a deleted Exercise's Set the way the Session screen shows it", () => {
    const payload = payloadForVega(
      exportOf([
        session({
          exercises: [
            {
              exerciseId: 'ex-gone',
              exerciseNameAtLogTime: 'Gone',
              sets: [
                // A duration makes it timed, as on screen, so the stray reps go.
                { durationSeconds: 30, reps: 1 },
                { weight: 0, reps: 10 },
                // Half-entered, as it would be for an Exercise that still exists.
                { reps: 10 },
                { weight: 135 },
                {},
              ],
            },
          ],
        }),
      ])
    )
    expect(payload.sessions[0].exercises[0].sets).toEqual([
      { durationSeconds: 30 },
      { reps: 10, weight: 0 },
    ])
  })

  it('leaves out a Set whose numbers Vega cannot read, keeping the rest', () => {
    const payload = payloadForVega(
      exportOf([
        session({
          exercises: [
            {
              exerciseId: SQUAT.id,
              exerciseNameAtLogTime: 'Squat',
              sets: [
                { weight: 100, reps: 7.5 },
                { weight: -5, reps: 5 },
                { weight: 100, reps: -1 },
                { weight: Number.POSITIVE_INFINITY, reps: 5 },
                { weight: Number.NaN, reps: 5 },
                { weight: 102.5, reps: 0 },
              ],
            },
            {
              exerciseId: PLANK.id,
              exerciseNameAtLogTime: 'Plank',
              sets: [
                { durationSeconds: 45.5 },
                { durationSeconds: Number.POSITIVE_INFINITY },
                { durationSeconds: 0 },
              ],
            },
          ],
        }),
      ])
    )
    expect(payload.sessions[0].exercises.map((entry) => entry.sets)).toEqual([
      [{ reps: 0, weight: 102.5 }],
      [{ durationSeconds: 0 }],
    ])
  })
})

describe('the sync', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends nothing until it has an address and a token', async () => {
    const { sync, fetch } = setup()
    expect(await sync.sync('opened')).toEqual({ kind: 'not-configured' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('posts the payload with its device token and records how many Sessions went', async () => {
    const { sync, fetch } = setup()
    sync.save(SETTINGS)

    const result = await sync.sync('opened')

    const status = { outcome: 'synced', at: '2026-11-08T12:00:00.000Z', sessions: 1 }
    expect(result).toEqual({ kind: 'recorded', status })
    expect(sync.status()).toEqual(status)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://vega.example.ts.net/api/ingest/liftlog')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({
      authorization: 'Bearer vega_pat_test',
      'content-type': 'application/json',
    })
    expect(sentSessionIds(fetch, 0)).toEqual(['s-1'])
  })

  it('skips an export Vega already has, unless asked by hand', async () => {
    const { sync, fetch } = setup()
    sync.save(SETTINGS)
    await sync.sync('opened')

    expect(await sync.sync('opened')).toEqual({ kind: 'unchanged' })
    expect(fetch).toHaveBeenCalledTimes(1)

    await sync.sync('manual')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('sends a change made during a send once that send is done, and only once', async () => {
    let sessions = [session({ id: 's-open', endTime: null, exercises: [] })]
    const held = heldAnswers()
    const { sync, fetch } = setup({ exportData: async () => exportOf(sessions), answer: held.answer })
    sync.save(SETTINGS)

    const opened = sync.sync('opened')
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    // The Session ends while the open's send, which read the export before, is still out.
    sessions = [session({ id: 's-open' })]
    const ended = sync.sync('session-ended')
    const reopened = sync.sync('opened')
    expect(reopened).toBe(ended)

    held.release(0)
    await opened
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    held.release(1)

    expect(await ended).toEqual({
      kind: 'recorded',
      status: { outcome: 'synced', at: '2026-11-08T12:00:00.000Z', sessions: 1 },
    })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(sentSessionIds(fetch, 0)).toEqual([])
    expect(sentSessionIds(fetch, 1)).toEqual(['s-open'])
  })

  it('skips the follow-up when nothing changed during the send', async () => {
    const held = heldAnswers()
    const { sync, fetch } = setup({ answer: held.answer })
    sync.save(SETTINGS)

    const opened = sync.sync('opened')
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const again = sync.sync('opened')
    held.release(0)

    await opened
    expect(await again).toEqual({ kind: 'unchanged' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('still sends a hand-asked sync that lands during a send', async () => {
    const held = heldAnswers()
    const { sync, fetch } = setup({ answer: held.answer })
    sync.save(SETTINGS)

    const opened = sync.sync('opened')
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const manual = sync.sync('manual')
    expect(sync.sync('opened')).toBe(manual)
    held.release(0)

    await opened
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    held.release(1)
    expect(await manual).toMatchObject({ kind: 'recorded', status: { outcome: 'synced' } })
  })

  it('tries again after a failure, since nothing reached Vega', async () => {
    const { sync, fetch } = setup({ answer: () => Promise.reject(new TypeError('Failed to fetch')) })
    sync.save(SETTINGS)

    expect(await sync.sync('opened')).toEqual({
      kind: 'recorded',
      status: {
        outcome: 'failed',
        at: '2026-11-08T12:00:00.000Z',
        message: "Couldn't reach Vega. Is Tailscale on?",
      },
    })
    await sync.sync('opened')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("records a failure when LiftLog's own data cannot be read", async () => {
    const { sync, fetch } = setup({ exportData: () => Promise.reject(new Error('IndexedDB closed')) })
    sync.save(SETTINGS)

    const failed = {
      outcome: 'failed',
      at: '2026-11-08T12:00:00.000Z',
      message: "Couldn't read LiftLog's data to send it.",
    }
    expect(await sync.sync('opened')).toEqual({ kind: 'recorded', status: failed })
    expect(sync.status()).toEqual(failed)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('records a failure when the page is not secure enough to fingerprint the export', async () => {
    // Over plain http, as on a LAN dev server, the browser gives no crypto.subtle.
    vi.stubGlobal('crypto', {})
    const { sync, fetch } = setup()
    sync.save(SETTINGS)

    const result = await sync.sync('opened')

    expect(result.kind === 'recorded' && result.status).toMatchObject({
      outcome: 'failed',
      message: 'This page cannot fingerprint the export. Open LiftLog over https.',
    })
    expect(sync.status()).toEqual(result.kind === 'recorded' ? result.status : null)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('says a refused token is a token problem', async () => {
    const { sync } = setup({ answer: () => Promise.resolve(new Response(null, { status: 401 })) })
    sync.save(SETTINGS)
    const result = await sync.sync('opened')
    expect(result.kind === 'recorded' && result.status.outcome === 'failed' && result.status.message).toMatch(
      /refused the token/
    )
  })

  it("passes on Vega's reason when it cannot read the export", async () => {
    const { sync } = setup({
      answer: () =>
        Promise.resolve(
          new Response('{"error":"sessions[0] should have a startTime."}', { status: 400 })
        ),
    })
    sync.save(SETTINGS)
    const result = await sync.sync('opened')
    expect(result.kind === 'recorded' && result.status.outcome === 'failed' && result.status.message).toBe(
      'Vega could not read the export: sessions[0] should have a startTime.'
    )
  })

  it('reads a stored status only when every field it needs is there', () => {
    const { sync, storage } = setup()
    const stored = (status: unknown) => {
      storage.setItem('liftlog:vega-status', JSON.stringify(status))
      return sync.status()
    }

    expect(stored({ outcome: 'synced', at: '2026-11-08T12:00:00.000Z', sessions: 3 })).toEqual({
      outcome: 'synced',
      at: '2026-11-08T12:00:00.000Z',
      sessions: 3,
    })
    expect(stored({ outcome: 'synced', at: '2026-11-08T12:00:00.000Z' })).toBeNull()
    expect(stored({ outcome: 'failed', at: '2026-11-08T12:00:00.000Z', sessions: 3 })).toBeNull()
    expect(stored({ outcome: 'failed', message: 'Vega answered 500.' })).toBeNull()
    expect(stored({ outcome: 'pending', at: '2026-11-08T12:00:00.000Z' })).toBeNull()
  })

  it('forgets the token on disconnect, and stops sending', async () => {
    const { sync, fetch } = setup()
    sync.save(SETTINGS)
    sync.disconnect()
    expect(sync.settings()).toBeNull()
    expect(await sync.sync('manual')).toEqual({ kind: 'not-configured' })
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('parseVegaSettings', () => {
  it('takes an https address, dropping a trailing slash', () => {
    expect(parseVegaSettings(' https://vega.example.ts.net/ ', ' vega_pat_new ', null)).toEqual({
      kind: 'valid',
      settings: { url: 'https://vega.example.ts.net', token: 'vega_pat_new' },
    })
  })

  it('keeps the saved token when the field is left blank', () => {
    expect(parseVegaSettings('https://other.example.ts.net', '  ', SETTINGS)).toEqual({
      kind: 'valid',
      settings: { url: 'https://other.example.ts.net', token: 'vega_pat_test' },
    })
  })

  it('takes a new token over the saved one', () => {
    expect(parseVegaSettings(SETTINGS.url, 'vega_pat_new', SETTINGS)).toEqual({
      kind: 'valid',
      settings: { url: SETTINGS.url, token: 'vega_pat_new' },
    })
  })

  it('asks for a token when none is typed or saved', () => {
    expect(parseVegaSettings(SETTINGS.url, '', null)).toEqual({
      kind: 'invalid',
      message: 'Enter the vega_pat_… token minted for LiftLog.',
    })
  })

  it('refuses http, which a browser blocks from an https page', () => {
    const parsed = parseVegaSettings('http://debianvega:8787', 'vega_pat_new', null)
    expect(parsed.kind === 'invalid' && parsed.message).toMatch(/https/)
  })

  it('refuses something that is not an address', () => {
    const parsed = parseVegaSettings('debianvega', 'vega_pat_new', null)
    expect(parsed.kind === 'invalid' && parsed.message).toMatch(/not an address/)
  })
})
