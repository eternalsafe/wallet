import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from '@/store'

export type TxHistoryBackfillCursor = {
  latestSyncedBlock: number
  backfillCursor: number
  backfillComplete: boolean
}

export type HistoricalRpcSyncState = {
  txHistoryBySafe: Record<string, TxHistoryBackfillCursor>
}

export const buildTxHistorySyncKey = (chainId: string, safeAddress: string) => {
  return `${chainId}:${safeAddress.toLowerCase()}`
}

const initialState: HistoricalRpcSyncState = {
  txHistoryBySafe: {},
}

type SetTxHistoryCursorPayload = {
  chainId: string
  safeAddress: string
  cursor: TxHistoryBackfillCursor
}

type ClearTxHistoryCursorPayload = {
  chainId: string
  safeAddress: string
}

export const historicalRpcSyncSlice = createSlice({
  name: 'historicalRpcSync',
  initialState,
  reducers: {
    setTxHistoryCursor: (state, { payload }: PayloadAction<SetTxHistoryCursorPayload>) => {
      state.txHistoryBySafe[buildTxHistorySyncKey(payload.chainId, payload.safeAddress)] = payload.cursor
    },
    clearTxHistoryCursor: (state, { payload }: PayloadAction<ClearTxHistoryCursorPayload>) => {
      delete state.txHistoryBySafe[buildTxHistorySyncKey(payload.chainId, payload.safeAddress)]
    },
  },
})

export const { setTxHistoryCursor, clearTxHistoryCursor } = historicalRpcSyncSlice.actions

export const selectTxHistoryCursor = (state: RootState, key: string) => {
  return state[historicalRpcSyncSlice.name].txHistoryBySafe[key]
}
