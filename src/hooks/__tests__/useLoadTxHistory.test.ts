import { Provider } from 'react-redux'
import { act, renderHook, waitFor } from '@testing-library/react'
import { BigNumber, constants } from 'ethers'
import React from 'react'

import { makeStore } from '@/store'
import { historicalRpcSyncSlice, buildTxHistorySyncKey } from '@/store/historicalRpcSyncSlice'
import { settingsSlice } from '@/store/settingsSlice'
import { txHistorySlice } from '@/store/txHistorySlice'
import { getSafeContract } from '@/utils/safe-versions'
import { buildMultisigTxId } from '@/utils/tx-id'

import useLoadTxHistory from '../loadables/useLoadTxHistory'
import * as safeInfo from '../useSafeInfo'
import * as web3 from '../wallets/web3'

jest.mock('@/utils/safe-versions', () => ({
  getSafeContract: jest.fn(),
}))

jest.mock('@/hooks/useIntervalCounter', () => ({
  __esModule: true,
  default: jest.fn(() => [0, jest.fn()]),
}))

const SAFE_ADDRESS = '0x0000000000000000000000000000000000000afe'
const CHAIN_ID = '1'
const SAFE_VERSION = '1.4.1'

const createWrapper = (initialReduxState?: Record<string, unknown>) => {
  const store = makeStore(initialReduxState)

  return {
    store,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, {
        store,
        children,
      }),
  }
}

const createLog = (blockNumber: number, transactionHash: string, safeTxHash: string) => ({
  blockNumber,
  transactionHash,
  args: {
    txHash: safeTxHash,
  },
})

const createDecodedTxData = () => [
  constants.AddressZero,
  BigNumber.from(0),
  '0x',
  0,
  BigNumber.from(0),
  BigNumber.from(0),
  BigNumber.from(0),
  constants.AddressZero,
  constants.AddressZero,
]

describe('useLoadTxHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(safeInfo, 'default').mockReturnValue({
      safeAddress: SAFE_ADDRESS,
      safe: { chainId: CHAIN_ID, nonce: 3, version: SAFE_VERSION },
    } as any)
  })

  it('does not query execution logs from block 0 to latest', async () => {
    const queryFilter = jest.fn().mockResolvedValue([])

    ;(getSafeContract as jest.Mock).mockReturnValue({
      filters: { ExecutionSuccess: jest.fn(() => 'execution-filter') },
      queryFilter,
      interface: { decodeFunctionData: jest.fn() },
    })

    jest.spyOn(web3, 'useMultiWeb3ReadOnly').mockReturnValue({
      getBlockNumber: jest.fn().mockResolvedValue(25_000),
      getBlock: jest.fn(),
      getTransaction: jest.fn(),
    } as any)

    const { wrapper } = createWrapper()

    renderHook(() => useLoadTxHistory(), { wrapper })

    await waitFor(() => expect(queryFilter).toHaveBeenCalled())

    expect(queryFilter).not.toHaveBeenCalledWith('execution-filter', 0, 'latest')
    expect(queryFilter).toHaveBeenCalledWith('execution-filter', 15_001, 25_000)
  })

  it('uses persisted history immediately and merges resumed backfill batches incrementally', async () => {
    const persistedTxId = buildMultisigTxId(SAFE_ADDRESS, '0x111')
    const existingHistory = {
      [persistedTxId]: {
        txId: persistedTxId,
        txHash: '0xaaaa',
        safeTxHash: '0x111',
        timestamp: 5_000,
        executor: constants.AddressZero,
      },
    }
    const syncKey = buildTxHistorySyncKey(CHAIN_ID, SAFE_ADDRESS)

    let resolveSecondRange: ((logs: Array<ReturnType<typeof createLog>>) => void) | undefined
    let resolveFinalRange: ((logs: Array<ReturnType<typeof createLog>>) => void) | undefined
    const secondRangePromise = new Promise<Array<ReturnType<typeof createLog>>>((resolve) => {
      resolveSecondRange = resolve
    })
    const finalRangePromise = new Promise<Array<ReturnType<typeof createLog>>>((resolve) => {
      resolveFinalRange = resolve
    })

    const queryFilter = jest.fn((filter, fromBlock: number, toBlock: number) => {
      if (filter !== 'execution-filter') {
        return Promise.resolve([])
      }

      if (fromBlock === 6 && toBlock === 10) {
        return Promise.resolve([createLog(8, '0xbbbb', '0x222')])
      }

      if (fromBlock === 1 && toBlock === 5) {
        return secondRangePromise
      }

      if (fromBlock === 0 && toBlock === 0) {
        return finalRangePromise
      }

      return Promise.resolve([])
    })

    ;(getSafeContract as jest.Mock).mockReturnValue({
      filters: { ExecutionSuccess: jest.fn(() => 'execution-filter') },
      queryFilter,
      interface: { decodeFunctionData: jest.fn(() => createDecodedTxData()) },
    })

    jest.spyOn(web3, 'useMultiWeb3ReadOnly').mockReturnValue({
      getBlockNumber: jest.fn().mockResolvedValue(30),
      getBlock: jest.fn((blockNumber: number) =>
        Promise.resolve({
          timestamp: blockNumber <= 8 ? 8 : blockNumber,
        }),
      ),
      getTransaction: jest.fn((transactionHash: string) =>
        Promise.resolve({
          from: constants.AddressZero,
          data: transactionHash === '0xcccc' ? '0xabcdef01' : '0xabcdef00',
        }),
      ),
    } as any)

    const initialReduxState = {
      [settingsSlice.name]: {
        ...settingsSlice.getInitialState(),
        env: {
          ...settingsSlice.getInitialState().env,
          historicalRpcLogBatchSize: 5,
          historicalRpcLogMaxConcurrentRequests: 1,
        },
      },
      [txHistorySlice.name]: {
        data: existingHistory,
        loading: false,
      },
      [historicalRpcSyncSlice.name]: {
        txHistoryBySafe: {
          [syncKey]: {
            latestSyncedBlock: 30,
            backfillCursor: 10,
            backfillComplete: false,
          },
        },
      },
    }

    const { store, wrapper } = createWrapper(initialReduxState)
    const { result } = renderHook(() => useLoadTxHistory(), { wrapper })

    expect(result.current[0]).toEqual(existingHistory)

    const firstMergedTxId = buildMultisigTxId(SAFE_ADDRESS, '0x222')
    await waitFor(() =>
      expect(result.current[0]).toEqual(
        expect.objectContaining({
          [persistedTxId]: existingHistory[persistedTxId],
          [firstMergedTxId]: expect.objectContaining({
            txId: firstMergedTxId,
            safeTxHash: '0x222',
          }),
        }),
      ),
    )

    expect(queryFilter).toHaveBeenCalledWith('execution-filter', 6, 10)
    expect(queryFilter).toHaveBeenCalledWith('execution-filter', 1, 5)
    expect(queryFilter).not.toHaveBeenCalledWith('execution-filter', 0, 'latest')

    resolveSecondRange?.([createLog(3, '0xcccc', '0x333'), createLog(3, '0xdddd', '0x000')])

    const secondMergedTxId = buildMultisigTxId(SAFE_ADDRESS, '0x333')
    const thirdMergedTxId = buildMultisigTxId(SAFE_ADDRESS, '0x000')
    await waitFor(() =>
      expect(result.current[0]).toEqual(
        expect.objectContaining({
          [persistedTxId]: existingHistory[persistedTxId],
          [firstMergedTxId]: expect.any(Object),
          [secondMergedTxId]: expect.objectContaining({
            txId: secondMergedTxId,
            safeTxHash: '0x333',
          }),
          [thirdMergedTxId]: expect.objectContaining({
            txId: thirdMergedTxId,
            safeTxHash: '0x000',
          }),
        }),
      ),
    )

    expect(Object.keys(result.current[0] || {})).toEqual([persistedTxId, firstMergedTxId, secondMergedTxId, thirdMergedTxId])
    expect(result.current[0]?.[secondMergedTxId]?.decodedTxData?.nonce).toBe(1)
    expect(result.current[0]?.[thirdMergedTxId]?.decodedTxData?.nonce).toBe(2)

    await waitFor(() =>
      expect(store.getState()[historicalRpcSyncSlice.name].txHistoryBySafe[syncKey]).toEqual({
        latestSyncedBlock: 30,
        backfillCursor: 0,
        backfillComplete: false,
      }),
    )

    expect(queryFilter).toHaveBeenCalledWith('execution-filter', 0, 0)

    resolveFinalRange?.([])

    await waitFor(() =>
      expect(store.getState()[historicalRpcSyncSlice.name].txHistoryBySafe[syncKey]).toEqual({
        latestSyncedBlock: 30,
        backfillCursor: 0,
        backfillComplete: true,
      }),
    )
  })

  it('merges persisted snapshots for the same safe without dropping local history', async () => {
    const syncKey = buildTxHistorySyncKey(CHAIN_ID, SAFE_ADDRESS)
    const localTxId = buildMultisigTxId(SAFE_ADDRESS, '0xaaa')
    const persistedTxId = buildMultisigTxId(SAFE_ADDRESS, '0xbbb')

    const queryFilter = jest.fn().mockImplementation((_filter, fromBlock: number, toBlock: number) => {
      if (fromBlock === 0 && toBlock === 4) {
        return Promise.resolve([createLog(4, '0xaaaa', '0xaaa')])
      }

      return Promise.resolve([])
    })

    ;(getSafeContract as jest.Mock).mockReturnValue({
      filters: { ExecutionSuccess: jest.fn(() => 'execution-filter') },
      queryFilter,
      interface: { decodeFunctionData: jest.fn(() => createDecodedTxData()) },
    })

    jest.spyOn(web3, 'useMultiWeb3ReadOnly').mockReturnValue({
      getBlockNumber: jest.fn().mockResolvedValue(4),
      getBlock: jest.fn((blockNumber: number) => Promise.resolve({ timestamp: blockNumber })),
      getTransaction: jest.fn(() => Promise.resolve({ from: constants.AddressZero, data: '0xabcdef00' })),
    } as any)

    const initialReduxState = {
      [settingsSlice.name]: {
        ...settingsSlice.getInitialState(),
        env: {
          ...settingsSlice.getInitialState().env,
          historicalRpcLogBatchSize: 5,
          historicalRpcLogMaxConcurrentRequests: 1,
        },
      },
      [historicalRpcSyncSlice.name]: {
        txHistoryBySafe: {
          [syncKey]: {
            latestSyncedBlock: 4,
            backfillCursor: 4,
            backfillComplete: false,
          },
        },
      },
    }

    const { store, wrapper } = createWrapper(initialReduxState)
    const { result } = renderHook(() => useLoadTxHistory(), { wrapper })

    await waitFor(() =>
      expect(result.current[0]).toEqual(
        expect.objectContaining({
          [localTxId]: expect.objectContaining({
            txId: localTxId,
          }),
        }),
      ),
    )

    act(() => {
      store.dispatch(
        txHistorySlice.actions.set({
          data: {
            [persistedTxId]: {
              txId: persistedTxId,
              txHash: '0xbbbb',
              safeTxHash: '0xbbb',
              timestamp: 2_000,
              executor: constants.AddressZero,
            },
          },
          loading: false,
          error: undefined,
        }),
      )
    })

    await waitFor(() =>
      expect(result.current[0]).toEqual(
        expect.objectContaining({
          [localTxId]: expect.any(Object),
          [persistedTxId]: expect.objectContaining({
            txId: persistedTxId,
          }),
        }),
      ),
    )
  })

  it('does not bootstrap persisted tx history from the same safe address on another chain', () => {
    jest.spyOn(safeInfo, 'default').mockReturnValue({
      safeAddress: SAFE_ADDRESS,
      safe: { chainId: '2', nonce: 3, version: SAFE_VERSION },
    } as any)

    ;(getSafeContract as jest.Mock).mockReturnValue({
      filters: { ExecutionSuccess: jest.fn(() => 'execution-filter') },
      queryFilter: jest.fn().mockResolvedValue([]),
      interface: { decodeFunctionData: jest.fn() },
    })

    jest.spyOn(web3, 'useMultiWeb3ReadOnly').mockReturnValue({
      getBlockNumber: jest.fn().mockResolvedValue(0),
      getBlock: jest.fn(),
      getTransaction: jest.fn(),
    } as any)

    const chainOneSyncKey = buildTxHistorySyncKey(CHAIN_ID, SAFE_ADDRESS)
    const persistedTxId = buildMultisigTxId(SAFE_ADDRESS, '0xabc')
    const { wrapper } = createWrapper({
      [txHistorySlice.name]: {
        data: {
          [persistedTxId]: {
            txId: persistedTxId,
            txHash: '0xhash',
            safeTxHash: '0xabc',
            timestamp: 1_000,
            executor: constants.AddressZero,
          },
        },
        loading: false,
      },
      [historicalRpcSyncSlice.name]: {
        txHistoryBySafe: {
          [chainOneSyncKey]: {
            latestSyncedBlock: 10,
            backfillCursor: 0,
            backfillComplete: true,
          },
        },
      },
    })

    const { result } = renderHook(() => useLoadTxHistory(), { wrapper })

    expect(result.current[0]).toBeUndefined()
  })
})
