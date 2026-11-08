import { store } from '@/store/instance'
import { createVegaSync } from './sync'

export const vegaSync = createVegaSync({
  storage: localStorage,
  fetch: (input, init) => fetch(input, init),
  exportData: () => store.exportData(),
})
