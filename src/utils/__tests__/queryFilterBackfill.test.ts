import { getBackwardBlockRanges, queryFilterBackwards } from '@/utils/queryFilterBackfill'

describe('queryFilterBackfill', () => {
  const createDeferred = <T>() => {
    let resolve: (value: T) => void = () => undefined
    let reject: (reason?: unknown) => void = () => undefined

    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })

    return { promise, resolve, reject }
  }

  it('builds backward block ranges from latest block to block 0', () => {
    expect(getBackwardBlockRanges(25, 10)).toEqual([
      { fromBlock: 16, toBlock: 25 },
      { fromBlock: 6, toBlock: 15 },
      { fromBlock: 0, toBlock: 5 },
    ])
  })

  it('builds backward block ranges down to a stop block', () => {
    expect(getBackwardBlockRanges(25, 10, 6)).toEqual([
      { fromBlock: 16, toBlock: 25 },
      { fromBlock: 6, toBlock: 15 },
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

  it('limits processed batches with maxBatches', async () => {
    const queryRange = jest.fn(async () => [] as string[])

    await queryFilterBackwards({
      latestBlock: 100,
      batchSize: 10,
      maxConcurrentRequests: 1,
      maxBatches: 2,
      queryRange,
    })

    expect(queryRange).toHaveBeenCalledTimes(2)
  })

  it('retries on rate-limited errors', async () => {
    const queryRange = jest
      .fn()
      .mockRejectedValueOnce({ code: 429, message: 'Too many requests' })
      .mockRejectedValueOnce({ code: 'TIMEOUT', message: 'timed out' })
      .mockResolvedValueOnce([])

    await queryFilterBackwards({
      latestBlock: 9,
      batchSize: 10,
      maxConcurrentRequests: 1,
      maxRetryAttempts: 3,
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 2,
      queryRange,
    })

    expect(queryRange).toHaveBeenCalledTimes(3)
  })

  it('does not retain logs when collectLogs is false', async () => {
    const result = await queryFilterBackwards({
      latestBlock: 9,
      batchSize: 10,
      collectLogs: false,
      queryRange: async () => ['a'],
    })

    expect(result).toEqual([])
  })

  it('processes completed ranges without waiting for all in-flight requests', async () => {
    const firstRange = createDeferred<string[]>()
    const secondRange = createDeferred<string[]>()
    const onBatch = jest.fn()
    const queryRange = jest
      .fn()
      .mockImplementationOnce(async () => firstRange.promise)
      .mockImplementationOnce(async () => secondRange.promise)

    const runBackfill = queryFilterBackwards({
      latestBlock: 19,
      batchSize: 10,
      maxConcurrentRequests: 2,
      maxBatches: 2,
      queryRange,
      onBatch,
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    firstRange.resolve([])

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onBatch).toHaveBeenCalledTimes(1)
    expect(onBatch).toHaveBeenLastCalledWith([], { fromBlock: 10, toBlock: 19 })

    secondRange.resolve([])
    await runBackfill

    expect(onBatch).toHaveBeenCalledTimes(2)
    expect(onBatch).toHaveBeenLastCalledWith([], { fromBlock: 0, toBlock: 9 })
  })
})
