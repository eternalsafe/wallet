import { type ChainInfo as ChainInfoSDK } from '@safe-global/safe-gateway-typescript-sdk'
import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { RootState } from '.'
import type { Loadable } from '@/store/common'

export type ChainInfo = ChainInfoSDK & {
  isTestnet?: boolean
  custom?: boolean
}
const initialState: ChainInfo[] = []

export const customChainsSlice = createSlice({
  name: 'customChains',
  initialState: [] as ChainInfo[],
  reducers: {
    setCustomChains: (state, action: PayloadAction<ChainInfo[]>) => {
      return action.payload
    },
    addChain: (state, action: PayloadAction<ChainInfo>) => {
      // Check if chain already exists
      const exists = state.some((chain) => chain.chainId === action.payload.chainId)
      if (!exists) {
        state.push(action.payload)
      }
    },
    removeChain: (state, action: PayloadAction<string>) => {
      return state.filter((chain) => chain.chainId !== action.payload)
    },
  },
})

export const { addChain, removeChain } = customChainsSlice.actions

export const selectAllCustomChains = (state: RootState): ChainInfo[] => {
  return state[customChainsSlice.name] || initialState
}

export const selectCustomChainsAsLoadable = (state: RootState): Loadable<ChainInfo[]> => {
  const customChains = state[customChainsSlice.name] || initialState
  return { data: customChains, loading: false, error: undefined }
}
