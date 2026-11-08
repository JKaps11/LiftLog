import { store } from '@/store/instance'
import { createVegaSync } from './sync'

/** The app's one connection to Vega, over this device's localStorage and the app's Store. */
export const vegaSync = createVegaSync({
  storage: localStorage,
  fetch: (input, init) => fetch(input, init),
  exportData: () => store.exportData(),
})
