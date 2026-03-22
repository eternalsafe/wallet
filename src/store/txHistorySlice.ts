import type { listenerMiddlewareInstance, RootState } from '@/store'
import { txDispatch, TxEvent } from '@/services/tx/txEvents'
import { selectPendingTxs } from './pendingTxsSlice'
import { makeLoadableSlice } from './common'
import type { TxHistory, TxHistoryItem } from '@/hooks/loadables/useLoadTxHistory'
import { createSelector } from '@reduxjs/toolkit'

const { slice, selector } = makeLoadableSlice('txHistory', undefined as TxHistory | undefined)

export const txHistorySlice = slice
export const selectTxHistory = selector

export const selectTxFromHistory = createSelector(
  [selectTxHistory, (_: RootState, txId: string | undefined) => [txId]],
  (txHistory, [txId]): TxHistoryItem | undefined => {
    if (!txId) {
      return undefined
    }

    const exactMatch = txHistory?.data?.[txId]
    if (exactMatch) {
      return exactMatch
    }

    // Tx ids can differ only by checksum casing in the embedded Safe address.
    const normalizedTxId = txId.toLowerCase()

    return Object.entries(txHistory?.data ?? {}).find(([key]) => key.toLowerCase() === normalizedTxId)?.[1]
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
        if (pendingTxs[item.txId]) {
          txDispatch(TxEvent.SUCCESS, {
            ...item,
            groupKey: pendingTxs[item.txId].groupKey,
          })
        }
      }
    },
  })
}
