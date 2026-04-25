import type { listenerMiddlewareInstance, RootState } from '@/store'
import { txDispatch, TxEvent } from '@/services/tx/txEvents'
import { selectPendingTxs } from './pendingTxsSlice'
import { makeLoadableSlice } from './common'
import type { TxHistory, TxHistoryItem } from '@/hooks/loadables/txHistory/types'
import { createSelector } from '@reduxjs/toolkit'
import { normalizeTxId } from '@/utils/tx-id'

const { slice, selector } = makeLoadableSlice('txHistory', undefined as TxHistory | undefined)

export const txHistorySlice = slice
export const selectTxHistory = selector

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
        if (!item?.txId) {
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
