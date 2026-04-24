jest.mock('@/services/local-storage/local', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}))

import local from '@/services/local-storage/local'
import { _hydrationReducer, getPersistedState } from '@/store'
import { txHistorySlice } from '../txHistorySlice'
import { historicalRpcSyncSlice } from '../historicalRpcSyncSlice'

const mockedLocal = local as unknown as {
  getItem: jest.Mock
  setItem: jest.Mock
  removeItem: jest.Mock
}

describe('store', () => {
  beforeEach(() => {
    mockedLocal.getItem.mockReset()
    mockedLocal.setItem.mockReset()
    mockedLocal.removeItem.mockReset()
  })

  describe('hydrationReducer', () => {
    it('should merge persisted txHistory and historicalRpcSync without losing initial defaults', () => {
      // @ts-expect-error demo state
      const initialState = _hydrationReducer(undefined, {
        type: '@@INIT',
      })

      const persistedState = {
        [txHistorySlice.name]: {
          loading: false,
          data: {
            persistedTx: {
              txId: 'persistedTx',
              txHash: '0xpersisted',
              safeTxHash: '0xpersisted',
              timestamp: 2,
              executor: '0x0000000000000000000000000000000000000002',
            },
          },
        },
        [historicalRpcSyncSlice.name]: {
          txHistoryBySafe: {
            '1:0x1111111111111111111111111111111111111111': {
              backfillCursor: 5,
            },
          },
        },
      }

      // @ts-expect-error demo state
      const mergedState = _hydrationReducer(initialState, {
        type: '@@HYDRATE',
        payload: persistedState,
      })

      expect(mergedState[txHistorySlice.name]).toStrictEqual({
        ...initialState[txHistorySlice.name],
        loading: false,
        data: {
          persistedTx: {
            txId: 'persistedTx',
            txHash: '0xpersisted',
            safeTxHash: '0xpersisted',
            timestamp: 2,
            executor: '0x0000000000000000000000000000000000000002',
          },
        },
      })

      expect(mergedState[historicalRpcSyncSlice.name].txHistoryBySafe['1:0x1111111111111111111111111111111111111111']).toEqual(
        {
          latestSyncedBlock: 0,
          backfillCursor: 5,
          backfillComplete: false,
        },
      )

      expect(mergedState.settings).toStrictEqual(initialState.settings)
    })
  })

  describe('getPersistedState', () => {
    it('should include persisted txHistory and historicalRpcSync slices', () => {
      mockedLocal.getItem.mockImplementation((key: string) => {
        if (key === txHistorySlice.name) {
          return {
            loading: false,
            data: {
              persistedTx: {
                txId: 'persistedTx',
                txHash: '0xpersisted',
                safeTxHash: '0xpersisted',
                timestamp: 2,
                executor: '0x0000000000000000000000000000000000000002',
              },
            },
          }
        }

        if (key === historicalRpcSyncSlice.name) {
          return {
            txHistoryBySafe: {
              '1:0x1111111111111111111111111111111111111111': {
                backfillCursor: 5,
              },
            },
          }
        }

        return null
      })

      const persistedState = getPersistedState()

      expect(mockedLocal.getItem).toHaveBeenCalledWith(txHistorySlice.name)
      expect(mockedLocal.getItem).toHaveBeenCalledWith(historicalRpcSyncSlice.name)
      expect(persistedState[txHistorySlice.name]).toStrictEqual({
        loading: false,
        data: {
          persistedTx: {
            txId: 'persistedTx',
            txHash: '0xpersisted',
            safeTxHash: '0xpersisted',
            timestamp: 2,
            executor: '0x0000000000000000000000000000000000000002',
          },
        },
      })
      expect(persistedState[historicalRpcSyncSlice.name]).toStrictEqual({
        txHistoryBySafe: {
          '1:0x1111111111111111111111111111111111111111': {
            backfillCursor: 5,
          },
        },
      })
    })
  })
})
