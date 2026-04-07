import { useEffect } from 'react'
import { JsonRpcProvider } from '@ethersproject/providers'
import useIntervalCounter from '@/hooks/useIntervalCounter'
import useSafeInfo from '@/hooks/useSafeInfo'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import useLoadTxHistory from '@/hooks/loadables/useLoadTxHistory'
import { buildTxHistorySyncKey, initialState as initialHistoricalRpcSyncState } from '@/store/historicalRpcSyncSlice'
import { useAppSelector } from '@/store'
import { initialState as initialSettingsState } from '@/store/settingsSlice'
import { selectTxHistorySync } from '@/store/txHistorySyncSlice'
import { CONFIG_SERVICE_CHAINS } from '@/tests/mocks/chains'
import { renderHook, waitFor } from '@/tests/test-utils'
import { getSafeContract } from '@/utils/safe-versions'

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

  if (!mainnetPublicRpcUri) {
    throw new Error('Expected a hardcoded mainnet publicRpcUri in test mocks')
  }

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('backfills historical batches from latest backwards using configured batch window', async () => {
    const provider = new JsonRpcProvider(mainnetPublicRpcUri)
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

  it('uses cursor state to only fetch new head blocks and backfills within the configured window', async () => {
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
    expect(syncedBlocks).not.toContain(950_001)
    expect(syncedBlocks).not.toContain(900_001)
  })

  it('loads boundary history blocks for safe 0x577A0D87f4e6fbdd55d51Ac4a4344EC042C04bb2 in a single covering batch', async () => {
    const safeAddress = '0x577A0D87f4e6fbdd55d51Ac4a4344EC042C04bb2'
    const upperBoundaryBlock = 5_698_792
    const lowerBoundaryBlock = 5_475_050
    const coveringBatchSize = upperBoundaryBlock - lowerBoundaryBlock + 1
    const gnosisPublicRpcUri = CONFIG_SERVICE_CHAINS.find((chain) => chain.chainId === '100')?.publicRpcUri.value

    if (!gnosisPublicRpcUri) {
      throw new Error('Expected a hardcoded gnosis publicRpcUri in test mocks')
    }

    const provider = new JsonRpcProvider(gnosisPublicRpcUri)
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
        chainId: '100',
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
