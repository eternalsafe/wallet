import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from '@/store'
import { type TokenInfo } from '@uniswap/token-lists'

// chainId -> tokens
export type CustomTokensState = Record<string, Array<TokenInfo>>

const initialState: CustomTokensState = {}

export const customTokensSlice = createSlice({
  name: 'customTokens',
  initialState,
  reducers: {
    add: (state, action: PayloadAction<[string, TokenInfo]>) => {
      const [chainId, token] = action.payload

      if (!state[chainId]) {
        state[chainId] = []
      }
      const chainState = state[chainId]

      const existingIndex = chainState.findIndex((t) => t.address === token.address)
      if (existingIndex !== -1) {
        chainState[existingIndex] = { ...token, extensions: { custom: true } }
      } else {
        chainState.push({ ...token, extensions: { custom: true } })
      }
    },
    remove: (state, action: PayloadAction<[string, string]>) => {
      const [chainId, address] = action.payload

      if (!state[chainId]) {
        return
      }
      const chainState = state[chainId]

      const index = chainState.findIndex((t) => t.address === address)
      if (index !== -1) {
        chainState.splice(index, 1)
      }
    },
  },
})

export const { add, remove } = customTokensSlice.actions

export const selectCustomTokens = (state: RootState): CustomTokensState => {
  return state[customTokensSlice.name]
}

export const selectCustomTokensByChain = createSelector(
  [selectCustomTokens, (_, chainId: string | undefined) => chainId],
  (customTokens, chainId): Array<TokenInfo> => {
    return chainId ? customTokens[chainId] ?? [] : []
  },
)
