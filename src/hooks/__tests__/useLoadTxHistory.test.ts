import { JsonRpcProvider } from '@ethersproject/providers'
import useIntervalCounter from '@/hooks/useIntervalCounter'
import useSafeInfo from '@/hooks/useSafeInfo'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import useLoadTxHistory from '@/hooks/loadables/useLoadTxHistory'
import { buildTxHistorySyncKey, initialState as initialHistoricalRpcSyncState } from '@/store/historicalRpcSyncSlice'
import { initialState as initialSettingsState } from '@/store/settingsSlice'
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

  it('backfills one historical batch per poll from latest backwards', async () => {
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
      [executionSuccessFilter, 950_001, 1_000_000],
      [executionSuccessFilter, 900_001, 950_000],
    ])
  })

  it('uses cursor state to only fetch new head blocks and one additional backfill batch', async () => {
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
      [executionSuccessFilter, 950_001, 1_000_000],
      [executionSuccessFilter, 900_001, 950_000],
      [executionSuccessFilter, 450_001, 500_000],
      [executionSuccessFilter, 400_001, 450_000],
    ])
  })
})
