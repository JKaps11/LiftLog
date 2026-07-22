/**
 * The persistence shape the Store needs for a single-entity table. Deliberately
 * narrower than Dexie's Table type so the Store stays independent of Dexie's
 * API — a Dexie Table satisfies this structurally, and tests can pass an
 * in-memory fake instead.
 */
export interface EntityTable<T> {
  count(): Promise<number>
  toArray(): Promise<T[]>
  get(id: string): Promise<T | undefined>
  add(entity: T): Promise<unknown>
  put(entity: T): Promise<unknown>
  delete(id: string): Promise<void>
  bulkAdd(entities: T[]): Promise<unknown>
}
