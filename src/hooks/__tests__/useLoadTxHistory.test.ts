import { JsonRpcProvider } from '@ethersproject/providers'
import useIntervalCounter from '@/hooks/useIntervalCounter'
import useSafeInfo from '@/hooks/useSafeInfo'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import useLoadTxHistory from '@/hooks/loadables/useLoadTxHistory'
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
  })

  it('batches ExecutionSuccess log queries from latest block backwards to block 0', async () => {
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

    const { result } = renderHook(() => useLoadTxHistory())

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    expect(getBlockNumberMock).toHaveBeenCalled()
    expect(queryFilterMock).not.toHaveBeenCalledWith(executionSuccessFilter, 0, 'latest')

    const rangeCalls = queryFilterMock.mock.calls
    expect(rangeCalls.length).toBeGreaterThan(1)

    const normalizedRanges = rangeCalls.map(([, fromBlock, toBlock]) => ({
      fromBlock,
      toBlock,
    }))

    expect(normalizedRanges[0]?.toBlock).toBe(1_000_000)
    expect(normalizedRanges[normalizedRanges.length - 1]?.fromBlock).toBe(0)

    normalizedRanges.forEach(({ fromBlock, toBlock }) => {
      expect(typeof fromBlock).toBe('number')
      expect(typeof toBlock).toBe('number')
      expect(fromBlock).toBeLessThanOrEqual(toBlock)
    })

    for (let i = 1; i < normalizedRanges.length; i++) {
      expect(normalizedRanges[i]?.toBlock).toBe((normalizedRanges[i - 1]?.fromBlock as number) - 1)
    }
  })
})
