import { getBackwardBlockRanges, queryFilterBackwards } from '../queryFilterBackfill'

describe('getBackwardBlockRanges', () => {
  it('builds backward ranges from latest to stop block', () => {
    expect(getBackwardBlockRanges(25, 10, 0)).toEqual([
      { fromBlock: 16, toBlock: 25 },
      { fromBlock: 6, toBlock: 15 },
      { fromBlock: 0, toBlock: 5 },
    ])
  })

  it('normalizes fractional and non-positive inputs safely', () => {
    expect(getBackwardBlockRanges(3.9, 0.5, -1.2)).toEqual([
      { fromBlock: 3, toBlock: 3 },
      { fromBlock: 2, toBlock: 2 },
      { fromBlock: 1, toBlock: 1 },
      { fromBlock: 0, toBlock: 0 },
    ])
  })
})

describe('queryFilterBackwards', () => {
  it('applies batches in ascending order within a parallel group', async () => {
    const applied: string[] = []

    await queryFilterBackwards({
      latestBlock: 25,
      stopAtBlock: 0,
      batchSize: 10,
      maxConcurrentRequests: 2,
      queryRange: async ({ fromBlock, toBlock }) => [`${fromBlock}-${toBlock}`],
      onBatch: async (logs) => {
        applied.push(logs[0])
      },
    })

    expect(applied).toEqual(['6-15', '16-25', '0-5'])
  })

  it('stops after the requested number of batches', async () => {
    const queriedRanges: string[] = []
    const appliedRanges: string[] = []
    const collectedLogs: string[] = []

    const result = await queryFilterBackwards({
      latestBlock: 49,
      stopAtBlock: 0,
      batchSize: 10,
      maxConcurrentRequests: 3,
      maxBatches: 2,
      queryRange: async ({ fromBlock, toBlock }) => {
        queriedRanges.push(`${fromBlock}-${toBlock}`)
        return [`${fromBlock}-${toBlock}-a`, `${fromBlock}-${toBlock}-b`]
      },
      onBatch: async (logs, range) => {
        appliedRanges.push(`${range.fromBlock}-${range.toBlock}`)
        collectedLogs.push(...logs)
      },
    })

    expect(queriedRanges).toEqual(['40-49', '30-39'])
    expect(appliedRanges).toEqual(['30-39', '40-49'])
    expect(collectedLogs).toEqual(['30-39-a', '30-39-b', '40-49-a', '40-49-b'])
    expect(result).toEqual(collectedLogs)
  })

  it('normalizes non-positive concurrency and allows omitting onBatch', async () => {
    const queriedRanges: string[] = []

    const result = await queryFilterBackwards({
      latestBlock: 2,
      stopAtBlock: 0,
      batchSize: 0,
      maxConcurrentRequests: 0,
      maxBatches: 2,
      queryRange: async ({ fromBlock, toBlock }) => {
        queriedRanges.push(`${fromBlock}-${toBlock}`)
        return [`${fromBlock}-${toBlock}`]
      },
    })

    expect(queriedRanges).toEqual(['2-2', '1-1'])
    expect(result).toEqual(['2-2', '1-1'])
  })
})
