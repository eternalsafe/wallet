import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from '@/store'
import type { TokenInfo } from '@safe-global/safe-apps-sdk'

export type CustomTokensState = Array<TokenInfo>

const initialState: CustomTokensState = []

export const customTokensSlice = createSlice({
  name: 'customTokens',
  initialState,
  reducers: {
    add: (state, action: PayloadAction<TokenInfo>) => {
      const token = action.payload
      const existingIndex = state.findIndex((t) => t.address === token.address)
      if (existingIndex !== -1) {
        state[existingIndex] = token
      } else {
        state.push(token)
      }
    },
    remove: (state, action: PayloadAction<string>) => {
      const address = action.payload
      const index = state.findIndex((t) => t.address === address)
      if (index !== -1) {
        state.splice(index, 1)
      }
    },
  },
})

export const { add, remove } = customTokensSlice.actions

export const selectCustomTokens = (state: RootState): CustomTokensState => {
  return state[customTokensSlice.name]
}
