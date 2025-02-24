import { type ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { createSelector, createSlice } from '@reduxjs/toolkit'
import { getChainsConfig } from '@/config/supportedChains'
import type { RootState } from '.'
import { makeLoadableSlice } from './common'

const initialState: ChainInfo[] = []

const { slice: baseSlice, selector } = makeLoadableSlice('chains', initialState)

const customSlice = createSlice({
  name: 'chains',
  initialState: baseSlice.getInitialState(),
  reducers: {
    addChain: (state, action: { payload: ChainInfo }) => {
      const exists = state.data.find((chain) => chain.chainId === action.payload.chainId)
      if (!exists) {
        state.data.push(action.payload)
      }
    },
  },
})

export const chainsSlice = {
  ...baseSlice,
  reducer: (state: any, action: any) => {
    state = baseSlice.reducer(state, action)
    return customSlice.reducer(state, action)
  },
  actions: {
    ...baseSlice.actions,
    ...customSlice.actions,
  },
}

// Export all actions including the base loading actions
export const { addChain } = chainsSlice.actions
export const selectChains = selector
export const partialPersistChains = {
  toPersist: (state: any) => {
    return {
      ...state,
      // @ts-expect-error - custom is not a valid property in ChainInfo
      data: state.data.filter((chain: ChainInfo) => Boolean(chain?.custom)),
    }
  },
  toHydrate: (state: any) => {
    return {
      ...state,
      data: [...getChainsConfig(), ...state.data],
    }
  },
}

export const selectChainById = createSelector(
  [selectChains, (_: RootState, chainId: string) => chainId],
  (chains, chainId) => {
    return chains.data.find((item: ChainInfo) => item.chainId === chainId)
  },
)
