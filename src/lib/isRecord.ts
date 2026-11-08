/**
 * Whether a value parsed from outside the app (an imported file, localStorage, a
 * response body) is an object whose fields can be read one by one. Arrays pass
 * too, which is fine for every caller: each goes on to check the fields it needs.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
