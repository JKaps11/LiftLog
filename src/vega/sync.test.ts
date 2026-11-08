import { describe, expect, it, vi } from 'vitest'
import type { Exercise, ExportedData, Session } from '@/store'
import { payloadForVega } from './payload'
import { createVegaSync, readVegaUrl, type KeyValueStorage } from './sync'

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

function setup(data: ExportedData = exportOf([session()]), answer: () => Promise<Response> = ok) {
  const fetch = vi.fn<typeof globalThis.fetch>(answer)
  const sync = createVegaSync({
    storage: memoryStorage(),
    fetch,
    exportData: async () => data,
    now: () => new Date('2026-11-08T12:00:00.000Z'),
  })
  return { sync, fetch }
}

function ok(): Promise<Response> {
  return Promise.resolve(new Response('{"exercises":2,"sessions":1}', { status: 200 }))
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
              // A Pending Set, and a weight typed with no reps, sit beside a real one.
              sets: [{}, { weight: 135 }, { weight: 225, reps: 5, side: 'left' }],
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

  it('reads a deleted Exercise\'s Set by what it carries', () => {
    const payload = payloadForVega(
      exportOf([
        session({
          exercises: [
            {
              exerciseId: 'ex-gone',
              exerciseNameAtLogTime: 'Gone',
              sets: [{ durationSeconds: 30 }, { reps: 10 }, {}],
            },
          ],
        }),
      ])
    )
    expect(payload.sessions[0].exercises[0].sets).toEqual([{ durationSeconds: 30 }, { reps: 10 }])
  })
})

describe('the sync', () => {
  it('sends nothing until it has an address and a token', async () => {
    const { sync, fetch } = setup()
    expect(await sync.sync('opened')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('posts the payload with its device token and records how many Sessions went', async () => {
    const { sync, fetch } = setup()
    sync.save(SETTINGS)

    const status = await sync.sync('opened')

    expect(status).toEqual({ outcome: 'synced', at: '2026-11-08T12:00:00.000Z', sessions: 1 })
    expect(sync.status()).toEqual(status)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://vega.example.ts.net/api/ingest/liftlog')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({
      authorization: 'Bearer vega_pat_test',
      'content-type': 'application/json',
    })
    expect(JSON.parse(String(init?.body)).sessions).toHaveLength(1)
  })

  it('skips an export Vega already has, unless asked by hand', async () => {
    const { sync, fetch } = setup()
    sync.save(SETTINGS)
    await sync.sync('opened')

    expect(await sync.sync('opened')).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)

    await sync.sync('manual')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('sends once when the app opens and a Session ends together', async () => {
    const { sync, fetch } = setup()
    sync.save(SETTINGS)
    await Promise.all([sync.sync('opened'), sync.sync('session-ended')])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('tries again after a failure, since nothing reached Vega', async () => {
    const { sync, fetch } = setup(undefined, () => Promise.reject(new TypeError('Failed to fetch')))
    sync.save(SETTINGS)

    expect(await sync.sync('opened')).toEqual({
      outcome: 'failed',
      at: '2026-11-08T12:00:00.000Z',
      message: "Couldn't reach Vega. Is Tailscale on?",
    })
    await sync.sync('opened')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('says a refused token is a token problem', async () => {
    const { sync } = setup(undefined, () => Promise.resolve(new Response(null, { status: 401 })))
    sync.save(SETTINGS)
    const status = await sync.sync('opened')
    expect(status?.outcome === 'failed' && status.message).toMatch(/refused the token/)
  })

  it("passes on Vega's reason when it cannot read the export", async () => {
    const { sync } = setup(undefined, () =>
      Promise.resolve(
        new Response('{"error":"sessions[0] should have a startTime."}', { status: 400 })
      )
    )
    sync.save(SETTINGS)
    const status = await sync.sync('opened')
    expect(status?.outcome === 'failed' && status.message).toBe(
      'Vega could not read the export: sessions[0] should have a startTime.'
    )
  })

  it('forgets the token on disconnect, and stops sending', async () => {
    const { sync, fetch } = setup()
    sync.save(SETTINGS)
    sync.disconnect()
    expect(sync.settings()).toBeNull()
    expect(await sync.sync('manual')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('readVegaUrl', () => {
  it('takes an https address, dropping a trailing slash', () => {
    expect(readVegaUrl(' https://vega.example.ts.net/ ')).toBe('https://vega.example.ts.net')
  })

  it('refuses http, which a browser blocks from an https page', () => {
    expect(() => readVegaUrl('http://debianvega:8787')).toThrow(/https/)
  })

  it('refuses something that is not an address', () => {
    expect(() => readVegaUrl('debianvega')).toThrow(/not an address/)
  })
})
