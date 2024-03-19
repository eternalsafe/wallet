import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '.'
import type { SafeTransactionData, SafeTransaction } from '@safe-global/safe-core-sdk-types'
import EthSafeTransaction from '@safe-global/safe-core-sdk/dist/src/utils/transactions/SafeTransaction'
import EthSignSignature from '@safe-global/safe-core-sdk/dist/src/utils/signatures/SafeSignature'

export type StoredSafeTransaction = {
  data: SafeTransactionData
  signatures: Record<string, string>
}

export type AddedTxs = {
  [txKey: string]: StoredSafeTransaction
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
      { payload }: PayloadAction<{ chainId: string; safeAddress: string; tx: SafeTransaction; txKey: string }>,
    ) => {
      const { chainId, safeAddress, tx, txKey } = payload

      state[chainId] ??= {}
      state[chainId][safeAddress] ??= {}

      // Merge the new tx data with the existing one in state if present, taking the new tx as precedence
      const data = {
        ...(state[chainId][safeAddress][txKey]?.data ?? {}),
        ...tx.data,
      }

      // Merge the new signatures with the existing ones in state if present, taking the new signatures as precedence
      // Also turn them into a record for storing
      const signatures: Record<string, string> = state[chainId][safeAddress][txKey]?.signatures ?? {}
      for (const [signer, signature] of tx.signatures.entries()) {
        signatures[signer] = signature.data
      }

      const storedTx: StoredSafeTransaction = {
        data,
        signatures,
      }

      state[chainId][safeAddress][txKey] = storedTx
    },
  },
})

export const { addOrUpdateTx } = addedTxsSlice.actions

// Note, this does not return SafeTransaction objects, but the raw data
// the other selectors will convert this into SafeTransaction objects
export const selectAllAddedTxs = (state: RootState): AddedTxsState => {
  return state[addedTxsSlice.name]
}

export const selectTotalAddedTxs = (state: RootState): number => {
  return Object.values(state[addedTxsSlice.name])
    .map((item) => Object.values(item))
    .map((item) => Object.keys(item))
    .flat().length
}

export const selectAddedTxs = createSelector(
  [selectAllAddedTxs, (_: RootState, chainId: string, safeAddress: string) => [chainId, safeAddress]],
  (
    allAddedTxs,
    [chainId, safeAddress],
  ):
    | {
        [txKey: string]: SafeTransaction
      }
    | undefined => {
    const loaded = allAddedTxs?.[chainId]?.[safeAddress]
    if (!loaded) {
      return
    }
    const result: {
      [txKey: string]: SafeTransaction
    } = {}
    Object.keys(loaded).forEach((key) => {
      const safeTx = new EthSafeTransaction(loaded[key].data)
      Object.entries(loaded[key].signatures).forEach(([signer, data]) => {
        safeTx.addSignature(new EthSignSignature(signer, data))
      })
      result[key] = safeTx
    })
    return result
  },
)

export const selectAddedTx = createSelector(
  [
    selectAllAddedTxs,
    (_: RootState, chainId: string, safeAddress: string, txKey: string) => [chainId, safeAddress, txKey],
  ],
  (allAddedTxs, [chainId, safeAddress, txKey]): SafeTransaction | undefined => {
    const loaded = allAddedTxs?.[chainId]?.[safeAddress]?.[txKey]
    if (!loaded) {
      return
    }
    const safeTx = new EthSafeTransaction(loaded.data)
    Object.entries(loaded.signatures).forEach(([signer, data]) => {
      safeTx.addSignature(new EthSignSignature(signer, data))
    })

    return safeTx
  },
)
