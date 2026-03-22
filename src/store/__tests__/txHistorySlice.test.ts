import { createListenerMiddleware } from '@reduxjs/toolkit'
import { LabelValue, TransactionListItemType } from '@safe-global/safe-gateway-typescript-sdk'
import type { TransactionListItem, Label, ConflictHeader, DateLabel } from '@safe-global/safe-gateway-typescript-sdk'

import * as txEvents from '@/services/tx/txEvents'
import { selectTxFromHistory, txHistoryListener, txHistorySlice } from '../txHistorySlice'
import type { PendingTxsState } from '../pendingTxsSlice'
import { PendingStatus } from '../pendingTxsSlice'
import type { RootState } from '..'

describe('txHistorySlice', () => {
  describe('selectTxFromHistory', () => {
    it('should match tx ids regardless of address casing', () => {
      const txIdLower = 'multisig_0xa710c854ede0eeaf84ea272363083cfa547dd552_0xabc'
      const txIdChecksum = 'multisig_0xa710c854edE0eEaF84eA272363083cfA547dd552_0xabc'

      const state = {
        txHistory: {
          loading: false,
          data: {
            [txIdLower]: {
              txId: txIdLower,
              txHash: '0x123',
              safeTxHash: '0xabc',
              timestamp: 0,
              executor: '0x0000000000000000000000000000000000000001',
            },
          },
        },
      } as RootState

      expect(selectTxFromHistory(state, txIdChecksum)).toEqual(state.txHistory.data[txIdLower])
    })
  })

  describe('txHistoryListener', () => {
    const listenerMiddlewareInstance = createListenerMiddleware<RootState>()

    const txDispatchSpy = jest.spyOn(txEvents, 'txDispatch')

    beforeEach(() => {
      listenerMiddlewareInstance.clearListeners()
      txHistoryListener(listenerMiddlewareInstance)

      jest.clearAllMocks()
    })

    it('should dispatch SUCCESS event if tx is pending', () => {
      const state = {
        pendingTxs: {
          '0x123': {
            chainId: '5',
            safeAddress: '0x0000000000000000000000000000000000000000',
            status: PendingStatus.INDEXING,
            groupKey: 'groupKey',
          },
        } as PendingTxsState,
      } as RootState

      const listenerApi = {
        getState: jest.fn(() => state),
        dispatch: jest.fn(),
      }

      const action = txHistorySlice.actions.set({
        loading: false,
        data: [{ txId: '0x123', txHash: '0x456', timestamp: 0, executor: '0x789' }],
      })

      listenerMiddlewareInstance.middleware(listenerApi)(jest.fn())(action)

      expect(txDispatchSpy).toHaveBeenCalledWith(txEvents.TxEvent.SUCCESS, {
        txId: '0x123',
        groupKey: 'groupKey',
        txHash: '0x456',
        timestamp: 0,
        executor: '0x789',
      })
    })

    it('should not dispatch an event if the history slice is cleared', () => {
      const state = {
        pendingTxs: {
          '0x123': {
            chainId: '5',
            safeAddress: '0x0000000000000000000000000000000000000000',
            status: PendingStatus.INDEXING,
            groupKey: 'groupKey',
          },
        } as PendingTxsState,
      } as RootState

      const listenerApi = {
        getState: jest.fn(() => state),
        dispatch: jest.fn(),
      }

      const transaction = {
        type: TransactionListItemType.TRANSACTION,
        transaction: {
          id: '0x123',
        },
      } as TransactionListItem

      const action = txHistorySlice.actions.set({
        loading: false,
        data: undefined, // Cleared
      })

      listenerMiddlewareInstance.middleware(listenerApi)(jest.fn())(action)

      expect(txDispatchSpy).not.toHaveBeenCalled()
    })

    it('should not dispatch an event for date labels, labels or conflict headers', () => {
      const state = {
        pendingTxs: {
          '0x123': {
            chainId: '5',
            safeAddress: '0x0000000000000000000000000000000000000000',
            status: PendingStatus.INDEXING,
            groupKey: '',
          },
        } as PendingTxsState,
      } as RootState

      const listenerApi = {
        getState: jest.fn(() => state),
        dispatch: jest.fn(),
      }

      const dateLabel: DateLabel = {
        type: TransactionListItemType.DATE_LABEL,
        timestamp: 0,
      }

      const label: Label = {
        label: LabelValue.Queued,
        type: TransactionListItemType.LABEL,
      }

      const conflictHeader: ConflictHeader = {
        nonce: 0,
        type: TransactionListItemType.CONFLICT_HEADER,
      }

      const action = txHistorySlice.actions.set({
        loading: false,
        data: {
          results: [dateLabel, label, conflictHeader],
        },
      })

      listenerMiddlewareInstance.middleware(listenerApi)(jest.fn())(action)

      expect(txDispatchSpy).not.toHaveBeenCalled()
    })

    it('should not dispatch an event if tx is not pending', () => {
      const state = {
        pendingTxs: {
          '0x123': {
            chainId: '5',
            safeAddress: '0x0000000000000000000000000000000000000000',
            status: PendingStatus.INDEXING,
            groupKey: '',
          },
        } as PendingTxsState,
      } as RootState

      const listenerApi = {
        getState: jest.fn(() => state),
        dispatch: jest.fn(),
      }

      const transaction = {
        type: TransactionListItemType.TRANSACTION,
        transaction: {
          id: '0x456',
        },
      } as TransactionListItem

      const action = txHistorySlice.actions.set({
        loading: false,
        data: {
          results: [transaction],
        },
      })

      listenerMiddlewareInstance.middleware(listenerApi)(jest.fn())(action)

      expect(txDispatchSpy).not.toHaveBeenCalled()
    })
  })
})
