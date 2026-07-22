import { describe, expect, it } from 'vitest'
import { Store } from './index'

describe('Store', () => {
  it('is constructible in isolation, with no DOM or browser APIs required', () => {
    const store = new Store()
    expect(store).toBeInstanceOf(Store)
  })
})
