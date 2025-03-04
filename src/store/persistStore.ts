import type { Middleware, PreloadedState } from '@reduxjs/toolkit'

import local from '@/services/local-storage/local'
import type { RootState } from '@/store'

type PreloadedRootState = PreloadedState<RootState>

interface PartialPersist {
  [key: string]: {
    toPersist: (state: any) => any
    toHydrate: (state: any) => any
  }
}

export const getPreloadedState = <K extends keyof PreloadedRootState>(
  sliceNames: K[],
  partialPersist?: PartialPersist,
): PreloadedRootState => {
  return sliceNames.reduce<PreloadedRootState>((preloadedState, sliceName) => {
    const sliceState = local.getItem<PreloadedRootState[K]>(sliceName)

    if (sliceState) {
      if (partialPersist?.[sliceName]) {
        preloadedState[sliceName] = partialPersist[sliceName].toHydrate(sliceState)
      } else {
        preloadedState[sliceName] = sliceState
      }
    }

    return preloadedState
  }, {})
}

export const persistState = <K extends keyof PreloadedRootState>(
  sliceNames: K[],
  partialPersist?: PartialPersist,
): Middleware<{}, RootState> => {
  return (store) => (next) => (action) => {
    const result = next(action)

    const state = store.getState()

    for (const sliceName of sliceNames) {
      let sliceState = state[sliceName]
      if (partialPersist?.[sliceName]) {
        sliceState = partialPersist[sliceName].toPersist(sliceState)
      }

      if (sliceState) {
        local.setItem(sliceName, sliceState)
      } else {
        local.removeItem(sliceName)
      }
    }

    return result
  }
}
