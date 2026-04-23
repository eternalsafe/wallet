import { createListenerMiddleware } from '@reduxjs/toolkit'
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
      } as unknown as RootState

      expect(selectTxFromHistory(state, txIdChecksum)).toEqual(state.txHistory.data?.[txIdLower])
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
        data: {
          '0x123': { txId: '0x123', txHash: '0x456', safeTxHash: '0x123', timestamp: 0, executor: '0x789' },
        },
      })

      listenerMiddlewareInstance.middleware(listenerApi)(jest.fn())(action)

      expect(txDispatchSpy).toHaveBeenCalledWith(txEvents.TxEvent.SUCCESS, {
        txId: '0x123',
        groupKey: 'groupKey',
        txHash: '0x456',
        safeTxHash: '0x123',
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

      const action = txHistorySlice.actions.set({
        loading: false,
        data: {},
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

      const action = txHistorySlice.actions.set({
        loading: false,
        data: {
          '0x456': { txId: '0x456', txHash: '0x456', safeTxHash: '0x456', timestamp: 0, executor: '0x789' },
        },
      })

      listenerMiddlewareInstance.middleware(listenerApi)(jest.fn())(action)

      expect(txDispatchSpy).not.toHaveBeenCalled()
    })
  })
})
