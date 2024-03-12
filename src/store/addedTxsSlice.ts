import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '.'
import { transactionKey, type TransactionMagicLink } from '@/services/tx/txMagicLink'

export type AddedTxs = {
  [txKey: string]: TransactionMagicLink
}

export type AddedTxsBySafe = {
  [safeAddress: string]: AddedTxs
}

export type AddedTxsState = {
  [chainId: string]: AddedTxsBySafe
}

const initialState: AddedTxsState = {}

export const addedTxsSlice = createSlice({
  name: 'addedTxs',
  initialState,
  reducers: {
    addOrUpdateTx: (
      state,
      { payload }: PayloadAction<{ chainId: string; safeAddress: string; tx: TransactionMagicLink }>,
    ) => {
      const { chainId, safeAddress, tx } = payload

      const txKey = transactionKey(tx)

      state[chainId] ??= {}
      state[chainId][safeAddress] ??= {}

      // Merge the new tx with the existing one in state if present, taking the new tx as precedence
      const combinedTx: TransactionMagicLink = {
        ...(state[chainId][safeAddress][txKey] ?? {}),
        ...tx,
        signatures: {
          ...(state[chainId][safeAddress][txKey]?.signatures ?? {}),
          ...tx.signatures,
        },
      }

      state[chainId][safeAddress][txKey] = combinedTx
    },
  },
})

export const { addOrUpdateTx } = addedTxsSlice.actions

export const selectAllAddedTxs = (state: RootState): AddedTxsState => {
  return state[addedTxsSlice.name]
}

export const selectTotalAddedTxs = (state: RootState): number => {
  return Object.values(state[addedTxsSlice.name])
    .map((item) => Object.keys(item))
    .flat().length
}

export const selectAddedTxs = createSelector(
  [selectAllAddedTxs, (_: RootState, chainId: string, safeAddress: string) => [chainId, safeAddress]],
  (allAddedTxs, [chainId, safeAddress]): AddedTxs | undefined => {
    return allAddedTxs?.[chainId]?.[safeAddress]
  },
)
