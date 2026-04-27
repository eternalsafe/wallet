import type { listenerMiddlewareInstance, RootState } from '@/store'
import { txDispatch, TxEvent } from '@/services/tx/txEvents'
import { selectPendingTxs } from './pendingTxsSlice'
import type { Loadable } from './common'
import { isTxHistoryItem, type TxHistory, type TxHistoryItem } from '@/hooks/loadables/txHistory/types'
import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { normalizeTxId } from '@/utils/tx-id'

export type TxHistoryState = Loadable<TxHistory | undefined> & {
  syncKey?: string
}

const initialState: TxHistoryState = {
  data: undefined,
  loading: false,
}

export const txHistorySlice = createSlice({
  name: 'txHistory',
  initialState,
  reducers: {
    set: (_, { payload }: PayloadAction<TxHistoryState>) => ({
      ...payload,
      data: payload.data ?? initialState.data,
      syncKey: payload.syncKey,
    }),
  },
})

export const selectTxHistory = (state: RootState): TxHistoryState => state[txHistorySlice.name]

export const selectTxFromHistory = createSelector(
  [selectTxHistory, (_: RootState, txId: string | undefined) => [txId]],
  (txHistory, [txId]): TxHistoryItem | undefined => {
    if (!txId) {
      return undefined
    }

    const normalizedTxId = normalizeTxId(txId)
    const exactMatch = txHistory?.data?.[normalizedTxId] ?? txHistory?.data?.[txId]
    if (exactMatch) {
      return exactMatch
    }

    // Backwards compatibility for persisted transaction history keys that were not normalized.
    return Object.entries(txHistory?.data ?? {}).find(([key]) => normalizeTxId(key) === normalizedTxId)?.[1]
  },
)

export const txHistoryListener = (listenerMiddleware: typeof listenerMiddlewareInstance) => {
  listenerMiddleware.startListening({
    actionCreator: txHistorySlice.actions.set,
    effect: (action, listenerApi) => {
      if (!action.payload.data) {
        return
      }

      const pendingTxs = selectPendingTxs(listenerApi.getState())

      for (const item of Object.values(action.payload.data)) {
        if (!isTxHistoryItem(item)) {
          continue
        }

        const normalizedTxId = normalizeTxId(item.txId)
        const pendingTx = pendingTxs[normalizedTxId] ?? pendingTxs[item.txId]

        if (pendingTx) {
          txDispatch(TxEvent.SUCCESS, {
            ...item,
            groupKey: pendingTx.groupKey,
          })
        }
      }
    },
  })
}
