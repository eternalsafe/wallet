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

const initialBackfillCursor: TxHistoryBackfillCursor = {
  latestSyncedBlock: 0,
  backfillCursor: 0,
  backfillComplete: false,
}

const mergeTxHistoryBackfillCursor = (
  current: TxHistoryBackfillCursor | undefined,
  next: TxHistoryBackfillCursor,
): TxHistoryBackfillCursor => {
  if (!current) {
    return next
  }

  const backfillComplete = current.backfillComplete || next.backfillComplete

  return {
    latestSyncedBlock: Math.max(current.latestSyncedBlock, next.latestSyncedBlock),
    backfillCursor: backfillComplete ? 0 : Math.min(current.backfillCursor, next.backfillCursor),
    backfillComplete,
  }
}

export const buildTxHistorySyncKey = (chainId: string, safeAddress: string) => {
  return `${chainId}:${safeAddress.toLowerCase()}`
}

export const normalizeTxHistoryBackfillCursor = (
  cursor: Partial<TxHistoryBackfillCursor> | undefined,
): TxHistoryBackfillCursor => {
  return {
    latestSyncedBlock: cursor?.latestSyncedBlock ?? initialBackfillCursor.latestSyncedBlock,
    backfillCursor: cursor?.backfillCursor ?? initialBackfillCursor.backfillCursor,
    backfillComplete: cursor?.backfillComplete ?? initialBackfillCursor.backfillComplete,
  }
}

export const normalizeHistoricalRpcSyncState = (
  state: HistoricalRpcSyncState | undefined,
): HistoricalRpcSyncState => {
  return {
    txHistoryBySafe: Object.fromEntries(
      Object.entries(state?.txHistoryBySafe ?? {}).map(([key, cursor]) => [
        key,
        normalizeTxHistoryBackfillCursor(cursor),
      ]),
    ),
  }
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
      const key = buildTxHistorySyncKey(payload.chainId, payload.safeAddress)
      state.txHistoryBySafe[key] = mergeTxHistoryBackfillCursor(state.txHistoryBySafe[key], payload.cursor)
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
