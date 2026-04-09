import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/store'

export type TxHistorySyncState = {
  syncedToBlock?: number
  latestBlock?: number
  loading: boolean
}

const initialState: TxHistorySyncState = {
  syncedToBlock: undefined,
  latestBlock: undefined,
  loading: false,
}

export const txHistorySyncSlice = createSlice({
  name: 'txHistorySync',
  initialState,
  reducers: {
    setTxHistorySync: (state, { payload }: PayloadAction<Partial<TxHistorySyncState>>) => {
      if ('syncedToBlock' in payload) {
        state.syncedToBlock = payload.syncedToBlock
      }
      if ('latestBlock' in payload) {
        state.latestBlock = payload.latestBlock
      }
      if ('loading' in payload) {
        state.loading = payload.loading ?? state.loading
      }
    },
    resetTxHistorySync: () => initialState,
  },
})

export const { setTxHistorySync, resetTxHistorySync } = txHistorySyncSlice.actions

export const selectTxHistorySync = (state: RootState): TxHistorySyncState => state[txHistorySyncSlice.name]
