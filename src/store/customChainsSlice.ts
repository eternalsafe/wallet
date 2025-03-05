import { type ChainInfo as ChainInfoSDK } from '@safe-global/safe-gateway-typescript-sdk'
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
  initialState,
  reducers: {
    addChain: (state, action: { payload: ChainInfo }) => {
      const exists = state.find((chain) => chain.chainId === action.payload.chainId)
      if (!exists) {
        state.push(action.payload)
      }
    },
  },
})

export const { addChain } = customChainsSlice.actions

export const selectCustomChainsAsLoadable = (state: RootState): Loadable<ChainInfo[]> => {
  const customChains = state[customChainsSlice.name] || initialState
  return { data: customChains, loading: false, error: undefined }
}
