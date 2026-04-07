import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/store'

export type TxHistoryBackfillCursor = {
  latestSyncedBlock: number
  backfillCursor: number
  backfillComplete: boolean
}

export type ERC721OwnershipCursor = {
  latestSyncedBlock: number
  tokenIds: string[]
}

type HistoricalRpcSyncState = {
  txHistoryBySafe: Record<string, TxHistoryBackfillCursor>
  erc721ByToken: Record<string, ERC721OwnershipCursor>
}

export const initialState: HistoricalRpcSyncState = {
  txHistoryBySafe: {},
  erc721ByToken: {},
}

export const buildTxHistorySyncKey = (chainId: string, safeAddress: string): string => {
  return `${chainId}:${safeAddress.toLowerCase()}`
}

export const buildCollectibleSyncKey = (chainId: string, safeAddress: string, tokenAddress: string): string => {
  return `${chainId}:${safeAddress.toLowerCase()}:${tokenAddress.toLowerCase()}`
}

export const historicalRpcSyncSlice = createSlice({
  name: 'historicalRpcSync',
  initialState,
  reducers: {
    setTxHistoryCursor: (state, { payload }: PayloadAction<{ key: string; value: TxHistoryBackfillCursor }>) => {
      state.txHistoryBySafe[payload.key] = payload.value
    },
    clearTxHistoryCursor: (state, { payload }: PayloadAction<{ key: string }>) => {
      delete state.txHistoryBySafe[payload.key]
    },
    setERC721Cursor: (state, { payload }: PayloadAction<{ key: string; value: ERC721OwnershipCursor }>) => {
      state.erc721ByToken[payload.key] = payload.value
    },
    clearERC721Cursor: (state, { payload }: PayloadAction<{ key: string }>) => {
      delete state.erc721ByToken[payload.key]
    },
    clearSyncStateForSafe: (state, { payload }: PayloadAction<{ chainId: string; safeAddress: string }>) => {
      const prefix = `${payload.chainId}:${payload.safeAddress.toLowerCase()}`
      Object.keys(state.txHistoryBySafe).forEach((key) => {
        if (key.startsWith(prefix)) {
          delete state.txHistoryBySafe[key]
        }
      })
      Object.keys(state.erc721ByToken).forEach((key) => {
        if (key.startsWith(prefix)) {
          delete state.erc721ByToken[key]
        }
      })
    },
  },
})

export const { setTxHistoryCursor, clearTxHistoryCursor, setERC721Cursor, clearERC721Cursor, clearSyncStateForSafe } =
  historicalRpcSyncSlice.actions

export const selectHistoricalRpcSyncState = (state: RootState): HistoricalRpcSyncState =>
  state[historicalRpcSyncSlice.name]

export const selectTxHistoryCursor = (state: RootState, key: string): TxHistoryBackfillCursor | undefined => {
  return state[historicalRpcSyncSlice.name].txHistoryBySafe[key]
}

export const selectERC721Cursor = (state: RootState, key: string): ERC721OwnershipCursor | undefined => {
  return state[historicalRpcSyncSlice.name].erc721ByToken[key]
}
