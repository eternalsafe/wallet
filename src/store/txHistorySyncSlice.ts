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
      state.syncedToBlock = payload.syncedToBlock
      state.latestBlock = payload.latestBlock
      state.loading = payload.loading ?? state.loading
    },
    resetTxHistorySync: () => initialState,
  },
})

export const { setTxHistorySync, resetTxHistorySync } = txHistorySyncSlice.actions

export const selectTxHistorySync = (state: RootState): TxHistorySyncState => state[txHistorySyncSlice.name]
