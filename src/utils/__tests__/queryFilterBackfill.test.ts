import { getBackwardBlockRanges, queryFilterBackwards } from '@/utils/queryFilterBackfill'

describe('queryFilterBackfill', () => {
  it('builds backward block ranges from latest block to block 0', () => {
    expect(getBackwardBlockRanges(25, 10)).toEqual([
      { fromBlock: 16, toBlock: 25 },
      { fromBlock: 6, toBlock: 15 },
      { fromBlock: 0, toBlock: 5 },
    ])
  })

  it('limits in-flight requests with maxConcurrentRequests', async () => {
    let inFlightRequests = 0
    let peakInFlightRequests = 0

    const queryRange = jest.fn(async () => {
      inFlightRequests += 1
      peakInFlightRequests = Math.max(peakInFlightRequests, inFlightRequests)
      await new Promise((resolve) => setTimeout(resolve, 10))
      inFlightRequests -= 1
      return [] as string[]
    })

    await queryFilterBackwards({
      latestBlock: 99,
      batchSize: 10,
      maxConcurrentRequests: 3,
      queryRange,
    })

    expect(queryRange).toHaveBeenCalledTimes(10)
    expect(peakInFlightRequests).toBeLessThanOrEqual(3)
  })
})
