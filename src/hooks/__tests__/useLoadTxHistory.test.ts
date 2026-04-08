import { useEffect } from 'react'
import { JsonRpcProvider } from '@ethersproject/providers'
import useIntervalCounter from '@/hooks/useIntervalCounter'
import useSafeInfo from '@/hooks/useSafeInfo'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import useLoadTxHistory from '@/hooks/loadables/useLoadTxHistory'
import {
  buildTxHistorySyncKey,
  initialState as initialHistoricalRpcSyncState,
  selectTxHistoryCursor,
} from '@/store/historicalRpcSyncSlice'
import { useAppSelector } from '@/store'
import { initialState as initialSettingsState } from '@/store/settingsSlice'
import { selectNotifications } from '@/store/notificationsSlice'
import { selectTxHistorySync } from '@/store/txHistorySyncSlice'
import { CONFIG_SERVICE_CHAINS } from '@/tests/mocks/chains'
import { renderHook, waitFor } from '@/tests/test-utils'
import { getSafeContract } from '@/utils/safe-versions'
import { AppRoutes } from '@/config/routes'
import getChainsConfig from '@/config/supportedChains'
import { buildMultisigTxId } from '@/utils/tx-id'

jest.mock('@/hooks/useSafeInfo', () => jest.fn())
jest.mock('@/hooks/wallets/web3', () => ({
  useMultiWeb3ReadOnly: jest.fn(),
}))
jest.mock('@/hooks/useIntervalCounter', () => jest.fn())
jest.mock('@/utils/safe-versions', () => ({
  getSafeContract: jest.fn(),
}))

describe('useLoadTxHistory', () => {
  const mockUseSafeInfo = useSafeInfo as jest.MockedFunction<typeof useSafeInfo>
  const mockUseMultiWeb3ReadOnly = useMultiWeb3ReadOnly as jest.MockedFunction<typeof useMultiWeb3ReadOnly>
  const mockUseIntervalCounter = useIntervalCounter as jest.MockedFunction<typeof useIntervalCounter>
  const mockGetSafeContract = getSafeContract as jest.MockedFunction<typeof getSafeContract>

  const mainnetPublicRpcUri = CONFIG_SERVICE_CHAINS.find((chain) => chain.chainId === '1')?.publicRpcUri.value
  const sepoliaPublicRpcUri = getChainsConfig().find((chain) => chain.chainId === '11155111')?.publicRpcUri.value

  if (!mainnetPublicRpcUri) {
    throw new Error('Expected a hardcoded mainnet publicRpcUri in test mocks')
  }
  if (!sepoliaPublicRpcUri) {
    throw new Error('Expected a hardcoded sepolia publicRpcUri in supported chain config')
  }

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  const createDeferred = <T>() => {
    let resolve: (value: T) => void = () => undefined
    let reject: (reason?: unknown) => void = () => undefined

    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })

    return { promise, resolve, reject }
  }

  it('backfills historical batches from latest backwards using configured batch window', async () => {
    const provider = new JsonRpcProvider(sepoliaPublicRpcUri)
    const getBlockNumberMock = jest.fn().mockResolvedValue(1_000_000)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = getBlockNumberMock

    const executionSuccessFilter = { id: 'ExecutionSuccess' }
    const queryFilterMock = jest.fn().mockResolvedValue([])

    mockUseSafeInfo.mockReturnValue({
      safeAddress: '0x1234567890123456789012345678901234567890',
      safe: {
        chainId: '1',
        version: '1.4.1',
      },
    } as any)
    mockUseMultiWeb3ReadOnly.mockReturnValue(provider as any)
    mockUseIntervalCounter.mockReturnValue([0, jest.fn()])
    mockGetSafeContract.mockReturnValue({
      filters: {
        ExecutionSuccess: jest.fn(() => executionSuccessFilter),
      },
      queryFilter: queryFilterMock,
      interface: {
        decodeFunctionData: jest.fn(),
      },
    } as any)

    const { result } = renderHook(() => useLoadTxHistory(), {
      initialReduxState: {
        settings: {
          ...initialSettingsState,
          env: {
            ...initialSettingsState.env,
            historicalRpcLogBatchSize: 400_000,
            historicalRpcLogMaxConcurrentRequests: 2,
          },
        },
      } as any,
    })

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    expect(getBlockNumberMock).toHaveBeenCalled()
    expect(queryFilterMock).not.toHaveBeenCalledWith(executionSuccessFilter, 0, 'latest')

    expect(queryFilterMock.mock.calls).toEqual([
      [executionSuccessFilter, 600_001, 1_000_000],
      [executionSuccessFilter, 200_001, 600_000],
    ])
  })

  it('syncs newer head ranges incrementally and continues backfill from persisted cursor', async () => {
    const provider = new JsonRpcProvider(mainnetPublicRpcUri)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = jest
      .fn()
      .mockResolvedValue(1_000_000)

    const executionSuccessFilter = { id: 'ExecutionSuccess' }
    const queryFilterMock = jest.fn().mockResolvedValue([])

    mockUseSafeInfo.mockReturnValue({
      safeAddress: '0x1234567890123456789012345678901234567890',
      safe: {
        chainId: '1',
        version: '1.4.1',
      },
    } as any)
    mockUseMultiWeb3ReadOnly.mockReturnValue(provider as any)
    mockUseIntervalCounter.mockReturnValue([0, jest.fn()])
    mockGetSafeContract.mockReturnValue({
      filters: {
        ExecutionSuccess: jest.fn(() => executionSuccessFilter),
      },
      queryFilter: queryFilterMock,
      interface: {
        decodeFunctionData: jest.fn(),
      },
    } as any)

    const txHistorySyncKey = buildTxHistorySyncKey('1', '0x1234567890123456789012345678901234567890')
    const { result } = renderHook(() => useLoadTxHistory(), {
      initialReduxState: {
        settings: {
          ...initialSettingsState,
          env: {
            ...initialSettingsState.env,
            historicalRpcLogBatchSize: 100_000,
            historicalRpcLogMaxConcurrentRequests: 2,
          },
        },
        historicalRpcSync: {
          ...initialHistoricalRpcSyncState,
          txHistoryBySafe: {
            [txHistorySyncKey]: {
              latestSyncedBlock: 900_000,
              backfillCursor: 500_000,
              backfillComplete: false,
            },
          },
        },
      } as any,
    })

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    expect(queryFilterMock.mock.calls).toEqual([
      [executionSuccessFilter, 900_001, 1_000_000],
      [executionSuccessFilter, 400_001, 500_000],
      [executionSuccessFilter, 300_001, 400_000],
    ])
  })

  it('does not flash syncedToBlock to head-sync ranges while backfilling', async () => {
    const provider = new JsonRpcProvider(mainnetPublicRpcUri)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = jest
      .fn()
      .mockResolvedValue(1_000_000)

    const executionSuccessFilter = { id: 'ExecutionSuccess' }
    const queryFilterMock = jest.fn().mockResolvedValue([])
    const syncedBlocks: number[] = []

    mockUseSafeInfo.mockReturnValue({
      safeAddress: '0x1234567890123456789012345678901234567890',
      safe: {
        chainId: '1',
        version: '1.4.1',
      },
    } as any)
    mockUseMultiWeb3ReadOnly.mockReturnValue(provider as any)
    mockUseIntervalCounter.mockReturnValue([0, jest.fn()])
    mockGetSafeContract.mockReturnValue({
      filters: {
        ExecutionSuccess: jest.fn(() => executionSuccessFilter),
      },
      queryFilter: queryFilterMock,
      interface: {
        decodeFunctionData: jest.fn(),
      },
    } as any)

    const txHistorySyncKey = buildTxHistorySyncKey('1', '0x1234567890123456789012345678901234567890')
    const { result } = renderHook(
      () => {
        const loadResult = useLoadTxHistory()
        const syncState = useAppSelector(selectTxHistorySync)

        useEffect(() => {
          if (syncState.syncedToBlock !== undefined) {
            syncedBlocks.push(syncState.syncedToBlock)
          }
        }, [syncState.syncedToBlock])

        return loadResult
      },
      {
        initialReduxState: {
          settings: {
            ...initialSettingsState,
            env: {
              ...initialSettingsState.env,
              historicalRpcLogBatchSize: 100_000,
              historicalRpcLogMaxConcurrentRequests: 2,
            },
          },
          historicalRpcSync: {
            ...initialHistoricalRpcSyncState,
            txHistoryBySafe: {
              [txHistorySyncKey]: {
                latestSyncedBlock: 900_000,
                backfillCursor: 500_000,
                backfillComplete: false,
              },
            },
          },
        } as any,
      },
    )

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    expect(syncedBlocks).toContain(500_000)
    expect(syncedBlocks).toContain(400_001)
    expect(syncedBlocks).toContain(300_001)
    expect(syncedBlocks).not.toContain(900_001)
  })

  it('parses tx hash from positional log args when named txHash is unavailable', async () => {
    const provider = new JsonRpcProvider(mainnetPublicRpcUri)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = jest
      .fn()
      .mockResolvedValue(1_000_000)
    ;(provider as JsonRpcProvider & { getBlock: jest.Mock }).getBlock = jest.fn().mockResolvedValue({ timestamp: 123 })
    ;(provider as JsonRpcProvider & { getTransaction: jest.Mock }).getTransaction = jest.fn().mockResolvedValue({
      from: '0x1111111111111111111111111111111111111111',
      data: '0x',
    })

    const executionSuccessFilter = { id: 'ExecutionSuccess' }
    const queryFilterMock = jest.fn().mockResolvedValue([
      {
        blockNumber: 1_000_000,
        logIndex: 0,
        transactionHash: `0x${'a'.repeat(64)}`,
        args: [`0x${'b'.repeat(64)}`],
      },
    ])

    mockUseSafeInfo.mockReturnValue({
      safeAddress: '0x1234567890123456789012345678901234567890',
      safe: {
        chainId: '1',
        version: '1.4.1',
      },
    } as any)
    mockUseMultiWeb3ReadOnly.mockReturnValue(provider as any)
    mockUseIntervalCounter.mockReturnValue([0, jest.fn()])
    mockGetSafeContract.mockReturnValue({
      filters: {
        ExecutionSuccess: jest.fn(() => executionSuccessFilter),
      },
      queryFilter: queryFilterMock,
      interface: {
        decodeFunctionData: jest.fn(),
      },
    } as any)

    const { result } = renderHook(() => useLoadTxHistory(), {
      initialReduxState: {
        settings: {
          ...initialSettingsState,
          env: {
            ...initialSettingsState.env,
            historicalRpcLogBatchSize: 1_000_000,
            historicalRpcLogMaxConcurrentRequests: 1,
          },
        },
      } as any,
    })

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    const history = result.current[0] || {}
    expect(Object.values(history)).toHaveLength(1)
    expect(Object.values(history)[0]?.safeTxHash).toEqual(`0x${'b'.repeat(64)}`)
  })

  it('does not cancel in-flight history loads when poll count changes', async () => {
    let pollCount = 0
    const resetPollingMock = jest.fn()
    mockUseIntervalCounter.mockImplementation(() => [pollCount, resetPollingMock])

    const provider = new JsonRpcProvider(mainnetPublicRpcUri)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = jest
      .fn()
      .mockResolvedValue(1_000_000)
    ;(provider as JsonRpcProvider & { getBlock: jest.Mock }).getBlock = jest.fn().mockResolvedValue({ timestamp: 123 })
    ;(provider as JsonRpcProvider & { getTransaction: jest.Mock }).getTransaction = jest.fn().mockResolvedValue({
      from: '0x1111111111111111111111111111111111111111',
      data: '0x',
    })

    const firstBatch = createDeferred<any[]>()
    const executionSuccessFilter = { id: 'ExecutionSuccess' }
    const queryFilterMock = jest.fn().mockImplementation(() => firstBatch.promise)

    mockUseSafeInfo.mockReturnValue({
      safeAddress: '0x1234567890123456789012345678901234567890',
      safe: {
        chainId: '1',
        version: '1.4.1',
      },
    } as any)
    mockUseMultiWeb3ReadOnly.mockReturnValue(provider as any)
    mockGetSafeContract.mockReturnValue({
      filters: {
        ExecutionSuccess: jest.fn(() => executionSuccessFilter),
      },
      queryFilter: queryFilterMock,
      interface: {
        decodeFunctionData: jest.fn(),
      },
    } as any)

    const { result, rerender } = renderHook(() => useLoadTxHistory(), {
      initialReduxState: {
        settings: {
          ...initialSettingsState,
          env: {
            ...initialSettingsState.env,
            historicalRpcLogBatchSize: 1_000_000,
            historicalRpcLogMaxConcurrentRequests: 1,
          },
        },
      } as any,
    })

    await waitFor(() => {
      expect(queryFilterMock).toHaveBeenCalledTimes(1)
    })

    pollCount = 1
    rerender()

    await waitFor(() => {
      expect(queryFilterMock).toHaveBeenCalledTimes(1)
    })

    firstBatch.resolve([
      {
        blockNumber: 1_000_000,
        logIndex: 0,
        transactionHash: `0x${'a'.repeat(64)}`,
        args: { txHash: `0x${'b'.repeat(64)}` },
      },
    ])

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    const history = result.current[0] || {}
    expect(Object.values(history)).toHaveLength(1)
  })

  it('resumes from persisted cursor and preserves persisted history after refresh', async () => {
    const safeAddress = '0x577A0D87f4e6fbdd55d51Ac4a4344EC042C04bb2'
    const txBlock = 5_475_050
    const latestBlock = 2_415_764
    const staleCursorBlock = 2_415_764
    const persistedTxId = buildMultisigTxId(safeAddress, `0x${'b'.repeat(64)}`)
    const persistedTxHistory = {
      [persistedTxId]: {
        txId: persistedTxId,
        txHash: `0x${'a'.repeat(64)}`,
        safeTxHash: `0x${'b'.repeat(64)}`,
        timestamp: txBlock * 1000,
        executor: '0x1111111111111111111111111111111111111111',
      },
    }

    const provider = new JsonRpcProvider(mainnetPublicRpcUri)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = jest
      .fn()
      .mockResolvedValue(latestBlock)
    ;(provider as JsonRpcProvider & { getBlock: jest.Mock }).getBlock = jest
      .fn()
      .mockImplementation(async (blockNumber: number) => ({ timestamp: blockNumber }))
    ;(provider as JsonRpcProvider & { getTransaction: jest.Mock }).getTransaction = jest.fn().mockResolvedValue({
      from: '0x1111111111111111111111111111111111111111',
      data: '0x',
    })

    const executionSuccessFilter = { id: 'ExecutionSuccess' }
    const queryFilterMock = jest
      .fn()
      .mockImplementation(async (_filter: unknown, fromBlock: number, toBlock: number) => {
        if (fromBlock <= txBlock && toBlock >= txBlock) {
          return [
            {
              blockNumber: txBlock,
              logIndex: 0,
              transactionHash: `0x${'a'.repeat(64)}`,
              args: { txHash: `0x${'b'.repeat(64)}` },
            },
          ]
        }
        return []
      })

    mockUseSafeInfo.mockReturnValue({
      safeAddress,
      safe: {
        chainId: '11155111',
        version: '1.4.1',
      },
    } as any)
    mockUseMultiWeb3ReadOnly.mockReturnValue(provider as any)
    mockUseIntervalCounter.mockReturnValue([0, jest.fn()])
    mockGetSafeContract.mockReturnValue({
      filters: {
        ExecutionSuccess: jest.fn(() => executionSuccessFilter),
      },
      queryFilter: queryFilterMock,
      interface: {
        decodeFunctionData: jest.fn(),
      },
    } as any)

    const txHistorySyncKey = buildTxHistorySyncKey('11155111', safeAddress)
    const { result } = renderHook(() => useLoadTxHistory(), {
      initialReduxState: {
        txHistory: {
          data: persistedTxHistory,
          loading: false,
        },
        settings: {
          ...initialSettingsState,
          env: {
            ...initialSettingsState.env,
            historicalRpcLogBatchSize: 100_000,
            historicalRpcLogMaxConcurrentRequests: 1,
          },
        },
        historicalRpcSync: {
          ...initialHistoricalRpcSyncState,
          txHistoryBySafe: {
            [txHistorySyncKey]: {
              latestSyncedBlock: latestBlock,
              backfillCursor: staleCursorBlock,
              backfillComplete: false,
            },
          },
        },
      } as any,
    })

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    const history = result.current[0] || {}
    expect(Object.values(history)).toHaveLength(1)
    expect(history).toHaveProperty(persistedTxId)
    expect(queryFilterMock).toHaveBeenCalledWith(executionSuccessFilter, 2_315_765, 2_415_764)
  })

  it('keeps persisted history when safe address resolves after the first render', async () => {
    const safeAddress = '0x577A0D87f4e6fbdd55d51Ac4a4344EC042C04bb2'
    const latestBlock = 2_415_764
    const persistedTxId = buildMultisigTxId(safeAddress, `0x${'b'.repeat(64)}`)
    let currentSafeAddress: string | undefined

    const persistedTxHistory = {
      [persistedTxId]: {
        txId: persistedTxId,
        txHash: `0x${'a'.repeat(64)}`,
        safeTxHash: `0x${'b'.repeat(64)}`,
        timestamp: latestBlock * 1000,
        executor: '0x1111111111111111111111111111111111111111',
      },
    }

    const provider = new JsonRpcProvider(mainnetPublicRpcUri)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = jest
      .fn()
      .mockResolvedValue(latestBlock)

    const executionSuccessFilter = { id: 'ExecutionSuccess' }
    const queryFilterMock = jest.fn().mockResolvedValue([])

    mockUseSafeInfo.mockImplementation(
      () =>
        ({
          safeAddress: currentSafeAddress,
          safe: {
            chainId: '11155111',
            version: '1.4.1',
          },
        } as any),
    )
    mockUseMultiWeb3ReadOnly.mockReturnValue(provider as any)
    mockUseIntervalCounter.mockReturnValue([0, jest.fn()])
    mockGetSafeContract.mockReturnValue({
      filters: {
        ExecutionSuccess: jest.fn(() => executionSuccessFilter),
      },
      queryFilter: queryFilterMock,
      interface: {
        decodeFunctionData: jest.fn(),
      },
    } as any)

    const txHistorySyncKey = buildTxHistorySyncKey('11155111', safeAddress)
    const { result, rerender } = renderHook(() => useLoadTxHistory(), {
      initialReduxState: {
        txHistory: {
          data: persistedTxHistory,
          loading: false,
        },
        settings: {
          ...initialSettingsState,
          env: {
            ...initialSettingsState.env,
            historicalRpcLogBatchSize: 100_000,
            historicalRpcLogMaxConcurrentRequests: 1,
          },
        },
        historicalRpcSync: {
          ...initialHistoricalRpcSyncState,
          txHistoryBySafe: {
            [txHistorySyncKey]: {
              latestSyncedBlock: latestBlock,
              backfillCursor: latestBlock,
              backfillComplete: false,
            },
          },
        },
      } as any,
    })

    expect(result.current[0]).toHaveProperty(persistedTxId)

    currentSafeAddress = safeAddress
    rerender()

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    const history = result.current[0] || {}
    expect(history).toHaveProperty(persistedTxId)
    expect(queryFilterMock).toHaveBeenCalledWith(executionSuccessFilter, 2_315_765, 2_415_764)
  })

  it('keeps persisted higher-block history when safe version hydrates after refresh', async () => {
    const safeAddress = '0x577A0D87f4e6fbdd55d51Ac4a4344EC042C04bb2'
    const latestBlock = 10_700_000
    const persistedTxBlock = 10_608_581
    const backfillCursor = 8_816_699
    let safeVersion: string | null = null
    const persistedTxId = buildMultisigTxId(safeAddress, `0x${'f'.repeat(64)}`)

    const persistedTxHistory = {
      [persistedTxId]: {
        txId: persistedTxId,
        txHash: `0x${'e'.repeat(64)}`,
        safeTxHash: `0x${'f'.repeat(64)}`,
        timestamp: persistedTxBlock * 1000,
        executor: '0x1111111111111111111111111111111111111111',
      },
    }

    const provider = new JsonRpcProvider(mainnetPublicRpcUri)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = jest
      .fn()
      .mockResolvedValue(latestBlock)

    const executionSuccessFilter = { id: 'ExecutionSuccess' }
    const queryFilterMock = jest.fn().mockResolvedValue([])

    mockUseSafeInfo.mockImplementation(
      () =>
        ({
          safeAddress,
          safe: {
            chainId: '11155111',
            version: safeVersion,
          },
        } as any),
    )
    mockUseMultiWeb3ReadOnly.mockReturnValue(provider as any)
    mockUseIntervalCounter.mockReturnValue([0, jest.fn()])
    mockGetSafeContract.mockImplementation((_safeAddress, version) => {
      if (!version) {
        return undefined as any
      }

      return {
        filters: {
          ExecutionSuccess: jest.fn(() => executionSuccessFilter),
        },
        queryFilter: queryFilterMock,
        interface: {
          decodeFunctionData: jest.fn(),
        },
      } as any
    })

    const txHistorySyncKey = buildTxHistorySyncKey('11155111', safeAddress)
    const { result, rerender } = renderHook(() => useLoadTxHistory(), {
      initialReduxState: {
        txHistory: {
          data: persistedTxHistory,
          loading: false,
        },
        settings: {
          ...initialSettingsState,
          env: {
            ...initialSettingsState.env,
            historicalRpcLogBatchSize: 100_000,
            historicalRpcLogMaxConcurrentRequests: 1,
          },
        },
        historicalRpcSync: {
          ...initialHistoricalRpcSyncState,
          txHistoryBySafe: {
            [txHistorySyncKey]: {
              latestSyncedBlock: latestBlock,
              backfillCursor,
              backfillComplete: false,
            },
          },
        },
      } as any,
    })

    expect(result.current[0]).toHaveProperty(persistedTxId)

    safeVersion = '1.4.1'
    rerender()

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    const history = result.current[0] || {}
    expect(history).toHaveProperty(persistedTxId)
    expect(history[persistedTxId]?.timestamp).toBe(persistedTxBlock * 1000)
  })

  it('persists backfill cursor progress before all concurrent ranges complete', async () => {
    const provider = new JsonRpcProvider(mainnetPublicRpcUri)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = jest
      .fn()
      .mockResolvedValue(1_000_000)

    const executionSuccessFilter = { id: 'ExecutionSuccess' }
    const firstBackfillRange = createDeferred<any[]>()
    const secondBackfillRange = createDeferred<any[]>()
    const queryFilterMock = jest
      .fn()
      .mockImplementation(async (_filter: unknown, fromBlock: number, toBlock: number) => {
        if (fromBlock === 400_001 && toBlock === 500_000) {
          return firstBackfillRange.promise
        }
        if (fromBlock === 300_001 && toBlock === 400_000) {
          return secondBackfillRange.promise
        }
        return []
      })

    mockUseSafeInfo.mockReturnValue({
      safeAddress: '0x1234567890123456789012345678901234567890',
      safe: {
        chainId: '1',
        version: '1.4.1',
      },
    } as any)
    mockUseMultiWeb3ReadOnly.mockReturnValue(provider as any)
    mockUseIntervalCounter.mockReturnValue([0, jest.fn()])
    mockGetSafeContract.mockReturnValue({
      filters: {
        ExecutionSuccess: jest.fn(() => executionSuccessFilter),
      },
      queryFilter: queryFilterMock,
      interface: {
        decodeFunctionData: jest.fn(),
      },
    } as any)

    const txHistorySyncKey = buildTxHistorySyncKey('1', '0x1234567890123456789012345678901234567890')
    const cursorBackfillBlocks: number[] = []
    const { result } = renderHook(
      () => {
        const loadResult = useLoadTxHistory()
        const cursor = useAppSelector((state) => selectTxHistoryCursor(state, txHistorySyncKey))

        useEffect(() => {
          if (cursor?.backfillCursor !== undefined) {
            cursorBackfillBlocks.push(cursor.backfillCursor)
          }
        }, [cursor?.backfillCursor])

        return loadResult
      },
      {
        initialReduxState: {
          settings: {
            ...initialSettingsState,
            env: {
              ...initialSettingsState.env,
              historicalRpcLogBatchSize: 100_000,
              historicalRpcLogMaxConcurrentRequests: 2,
            },
          },
          historicalRpcSync: {
            ...initialHistoricalRpcSyncState,
            txHistoryBySafe: {
              [txHistorySyncKey]: {
                latestSyncedBlock: 1_000_000,
                backfillCursor: 500_000,
                backfillComplete: false,
              },
            },
          },
        } as any,
      },
    )

    await waitFor(() => {
      expect(queryFilterMock).toHaveBeenCalledWith(executionSuccessFilter, 400_001, 500_000)
      expect(queryFilterMock).toHaveBeenCalledWith(executionSuccessFilter, 300_001, 400_000)
    })

    firstBackfillRange.resolve([])

    await waitFor(() => {
      expect(cursorBackfillBlocks).toContain(400_000)
    })

    secondBackfillRange.resolve([])

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    expect(cursorBackfillBlocks).toContain(300_000)
  })

  it('does not overwrite persisted tx timestamps when block lookups fail transiently', async () => {
    const safeAddress = '0x577A0D87f4e6fbdd55d51Ac4a4344EC042C04bb2'
    const latestBlock = 10_700_000
    const txBlock = 10_608_581
    const safeTxHash = `0x${'f'.repeat(64)}`
    const txHash = `0x${'e'.repeat(64)}`
    const persistedTxId = buildMultisigTxId(safeAddress, safeTxHash)
    const persistedTimestamp = 1_713_210_123_000

    const persistedTxHistory = {
      [persistedTxId]: {
        txId: persistedTxId,
        txHash,
        safeTxHash,
        timestamp: persistedTimestamp,
        executor: '0x1111111111111111111111111111111111111111',
      },
    }

    const provider = new JsonRpcProvider(mainnetPublicRpcUri)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = jest
      .fn()
      .mockResolvedValue(latestBlock)
    ;(provider as JsonRpcProvider & { getBlock: jest.Mock }).getBlock = jest.fn().mockRejectedValue(new Error('429'))
    ;(provider as JsonRpcProvider & { getTransaction: jest.Mock }).getTransaction = jest.fn().mockResolvedValue({
      from: '0x1111111111111111111111111111111111111111',
      data: '0x',
    })

    const executionSuccessFilter = { id: 'ExecutionSuccess' }
    const queryFilterMock = jest.fn().mockImplementation(async (_filter: unknown, fromBlock: number, toBlock: number) =>
      fromBlock <= txBlock && toBlock >= txBlock
        ? [
            {
              blockNumber: txBlock,
              logIndex: 0,
              transactionHash: txHash,
              args: { txHash: safeTxHash },
            },
          ]
        : [],
    )

    mockUseSafeInfo.mockReturnValue({
      safeAddress,
      safe: {
        chainId: '11155111',
        version: '1.4.1',
      },
    } as any)
    mockUseMultiWeb3ReadOnly.mockReturnValue(provider as any)
    mockUseIntervalCounter.mockReturnValue([0, jest.fn()])
    mockGetSafeContract.mockReturnValue({
      filters: {
        ExecutionSuccess: jest.fn(() => executionSuccessFilter),
      },
      queryFilter: queryFilterMock,
      interface: {
        decodeFunctionData: jest.fn(),
      },
    } as any)

    const txHistorySyncKey = buildTxHistorySyncKey('11155111', safeAddress)
    const { result } = renderHook(() => useLoadTxHistory(), {
      initialReduxState: {
        txHistory: {
          data: persistedTxHistory,
          loading: false,
        },
        settings: {
          ...initialSettingsState,
          env: {
            ...initialSettingsState.env,
            historicalRpcLogBatchSize: 100_000,
            historicalRpcLogMaxConcurrentRequests: 1,
          },
        },
        historicalRpcSync: {
          ...initialHistoricalRpcSyncState,
          txHistoryBySafe: {
            [txHistorySyncKey]: {
              latestSyncedBlock: latestBlock,
              backfillCursor: txBlock,
              backfillComplete: false,
            },
          },
        },
      } as any,
    })

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    const history = result.current[0] || {}
    expect(history[persistedTxId]?.timestamp).toBe(persistedTimestamp)
  })

  it('shows history fetch errors with an RPC settings link', async () => {
    const provider = new JsonRpcProvider(mainnetPublicRpcUri)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = jest
      .fn()
      .mockResolvedValue(1_000_000)

    const executionSuccessFilter = { id: 'ExecutionSuccess' }
    const queryFilterMock = jest.fn().mockRejectedValue(new Error('history rpc failed'))

    mockUseSafeInfo.mockReturnValue({
      safeAddress: '0x1234567890123456789012345678901234567890',
      safe: {
        chainId: '1',
        version: '1.4.1',
      },
    } as any)
    mockUseMultiWeb3ReadOnly.mockReturnValue(provider as any)
    mockUseIntervalCounter.mockReturnValue([0, jest.fn()])
    mockGetSafeContract.mockReturnValue({
      filters: {
        ExecutionSuccess: jest.fn(() => executionSuccessFilter),
      },
      queryFilter: queryFilterMock,
      interface: {
        decodeFunctionData: jest.fn(),
      },
    } as any)

    const { result } = renderHook(() => {
      const loadResult = useLoadTxHistory()
      const notifications = useAppSelector(selectNotifications)
      return { loadResult, notifications }
    })

    await waitFor(() => {
      expect(result.current.loadResult[2]).toBe(false)
    })

    await waitFor(() => {
      const notification = result.current.notifications.find((item) => item.groupKey === 'fetch-tx-history-error')
      expect(notification?.message).toBe(
        'Error fetching transaction history. If you see this error often, please configure your RPC URL or Chain Queries settings.',
      )
      expect(notification?.link).toEqual({
        href: AppRoutes.settings.environmentVariables,
        title: 'RPC settings',
      })
    })
  })

  it('loads boundary history blocks for safe 0x577A0D87f4e6fbdd55d51Ac4a4344EC042C04bb2 in a single covering batch', async () => {
    const safeAddress = '0x577A0D87f4e6fbdd55d51Ac4a4344EC042C04bb2'
    const upperBoundaryBlock = 5_698_792
    const lowerBoundaryBlock = 5_475_050
    const coveringBatchSize = upperBoundaryBlock - lowerBoundaryBlock + 1

    const provider = new JsonRpcProvider(sepoliaPublicRpcUri)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = jest
      .fn()
      .mockResolvedValue(upperBoundaryBlock)
    ;(provider as JsonRpcProvider & { getBlock: jest.Mock }).getBlock = jest
      .fn()
      .mockImplementation(async (blockNumber: number) => ({ timestamp: blockNumber }))
    ;(provider as JsonRpcProvider & { getTransaction: jest.Mock }).getTransaction = jest.fn().mockResolvedValue({
      from: '0x1111111111111111111111111111111111111111',
      data: '0x',
    })

    const executionSuccessFilter = { id: 'ExecutionSuccess' }
    const boundaryLogs = [
      {
        blockNumber: lowerBoundaryBlock,
        logIndex: 0,
        transactionHash: `0x${'a'.repeat(64)}`,
        args: { txHash: `0x${'b'.repeat(64)}` },
      },
      {
        blockNumber: upperBoundaryBlock,
        logIndex: 1,
        transactionHash: `0x${'c'.repeat(64)}`,
        args: { txHash: `0x${'d'.repeat(64)}` },
      },
    ]
    const queryFilterMock = jest
      .fn()
      .mockImplementation(async (_filter: unknown, fromBlock: number, toBlock: number) =>
        fromBlock === lowerBoundaryBlock && toBlock === upperBoundaryBlock ? boundaryLogs : [],
      )

    mockUseSafeInfo.mockReturnValue({
      safeAddress,
      safe: {
        chainId: '11155111',
        version: '1.4.1',
      },
    } as any)
    mockUseMultiWeb3ReadOnly.mockReturnValue(provider as any)
    mockUseIntervalCounter.mockReturnValue([0, jest.fn()])
    mockGetSafeContract.mockReturnValue({
      filters: {
        ExecutionSuccess: jest.fn(() => executionSuccessFilter),
      },
      queryFilter: queryFilterMock,
      interface: {
        decodeFunctionData: jest.fn(),
      },
    } as any)

    const { result } = renderHook(() => useLoadTxHistory(), {
      initialReduxState: {
        settings: {
          ...initialSettingsState,
          env: {
            ...initialSettingsState.env,
            historicalRpcLogBatchSize: coveringBatchSize,
            historicalRpcLogMaxConcurrentRequests: 1,
          },
        },
      } as any,
    })

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    expect(queryFilterMock).toHaveBeenCalledWith(executionSuccessFilter, lowerBoundaryBlock, upperBoundaryBlock)

    const history = result.current[0] || {}
    const historyItems = Object.values(history)
    expect(historyItems).toHaveLength(2)
    expect(historyItems.map((item) => item.txHash).sort()).toEqual([`0x${'a'.repeat(64)}`, `0x${'c'.repeat(64)}`])
  })
})
