import { JsonRpcProvider } from '@ethersproject/providers'
import { ERC721__factory } from '@/types/contracts'
import { CONFIG_SERVICE_CHAINS } from '@/tests/mocks/chains'
import { getERC721TokenIds } from '@/utils/tokens'

describe('getERC721TokenIds', () => {
  const mainnetPublicRpcUri = CONFIG_SERVICE_CHAINS.find((chain) => chain.chainId === '1')?.publicRpcUri.value

  if (!mainnetPublicRpcUri) {
    throw new Error('Expected a hardcoded mainnet publicRpcUri in test mocks')
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('batches transfer log queries from latest block backwards to block 0', async () => {
    const provider = new JsonRpcProvider(mainnetPublicRpcUri)
    const getBlockNumberMock = jest.fn().mockResolvedValue(1_000_000)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = getBlockNumberMock

    const fromTransferFilter = { id: 'fromTransfer' }
    const toTransferFilter = { id: 'toTransfer' }

    const queryFilterMock = jest.fn().mockResolvedValue([])

    jest.spyOn(ERC721__factory, 'connect').mockReturnValue({
      filters: {
        'Transfer(address,address,uint256)': jest.fn((from) => {
          return from ? fromTransferFilter : toTransferFilter
        }),
      },
      queryFilter: queryFilterMock,
    } as any)

    const result = await getERC721TokenIds(
      provider,
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
    )

    expect(result).toEqual([])
    expect(getBlockNumberMock).toHaveBeenCalled()

    expect(queryFilterMock).not.toHaveBeenCalledWith(fromTransferFilter, 0, 'latest')
    expect(queryFilterMock).not.toHaveBeenCalledWith(toTransferFilter, 0, 'latest')

    const fromRangeCalls = queryFilterMock.mock.calls.filter(([filter]) => filter === fromTransferFilter)
    const toRangeCalls = queryFilterMock.mock.calls.filter(([filter]) => filter === toTransferFilter)

    expect(fromRangeCalls.length).toBeGreaterThan(1)
    expect(toRangeCalls.length).toBeGreaterThan(1)

    const assertBackfillRanges = (calls: Array<[unknown, number, number]>) => {
      const ranges = calls.map(([, fromBlock, toBlock]) => ({ fromBlock, toBlock }))

      expect(ranges[0]?.toBlock).toBe(1_000_000)
      expect(ranges[ranges.length - 1]?.fromBlock).toBe(0)

      ranges.forEach(({ fromBlock, toBlock }) => {
        expect(typeof fromBlock).toBe('number')
        expect(typeof toBlock).toBe('number')
        expect(fromBlock).toBeLessThanOrEqual(toBlock)
      })

      for (let i = 1; i < ranges.length; i++) {
        expect(ranges[i]?.toBlock).toBe((ranges[i - 1]?.fromBlock as number) - 1)
      }
    }

    assertBackfillRanges(fromRangeCalls as Array<[unknown, number, number]>)
    assertBackfillRanges(toRangeCalls as Array<[unknown, number, number]>)
  })

  it('uses caller-provided batch size and max concurrent requests', async () => {
    const provider = new JsonRpcProvider(mainnetPublicRpcUri)
    ;(provider as JsonRpcProvider & { getBlockNumber: jest.Mock }).getBlockNumber = jest
      .fn()
      .mockResolvedValue(1_000_000)

    const fromTransferFilter = { id: 'fromTransfer' }
    const toTransferFilter = { id: 'toTransfer' }

    let inFlightRequests = 0
    let peakInFlightRequests = 0

    const queryFilterMock = jest.fn(
      async (_filter: unknown, _fromBlock: number, _toBlock: number): Promise<unknown[]> => {
        inFlightRequests += 1
        peakInFlightRequests = Math.max(peakInFlightRequests, inFlightRequests)
        await new Promise((resolve) => setTimeout(resolve, 10))
        inFlightRequests -= 1
        return []
      },
    )

    jest.spyOn(ERC721__factory, 'connect').mockReturnValue({
      filters: {
        'Transfer(address,address,uint256)': jest.fn((from) => {
          return from ? fromTransferFilter : toTransferFilter
        }),
      },
      queryFilter: queryFilterMock,
    } as any)

    await getERC721TokenIds(
      provider,
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      400_000,
      2,
    )

    expect(peakInFlightRequests).toBeLessThanOrEqual(2)
    expect(queryFilterMock.mock.calls).toEqual([
      [fromTransferFilter, 600_001, 1_000_000],
      [fromTransferFilter, 200_001, 600_000],
      [fromTransferFilter, 0, 200_000],
      [toTransferFilter, 600_001, 1_000_000],
      [toTransferFilter, 200_001, 600_000],
      [toTransferFilter, 0, 200_000],
    ])
  })
})
