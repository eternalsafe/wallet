import { getBackwardBlockRanges, queryFilterBackwards } from '../queryFilterBackfill'

describe('getBackwardBlockRanges', () => {
  it('builds backward ranges from latest to stop block', () => {
    expect(getBackwardBlockRanges(25, 10, 0)).toEqual([
      { fromBlock: 16, toBlock: 25 },
      { fromBlock: 6, toBlock: 15 },
      { fromBlock: 0, toBlock: 5 },
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
    const appliedRanges: string[] = []
    const collectedLogs: string[] = []

    const result = await queryFilterBackwards({
      latestBlock: 49,
      stopAtBlock: 0,
      batchSize: 10,
      maxConcurrentRequests: 3,
      maxBatches: 2,
      queryRange: async ({ fromBlock, toBlock }) => [
        `${fromBlock}-${toBlock}-a`,
        `${fromBlock}-${toBlock}-b`,
      ],
      onBatch: async (logs, range) => {
        appliedRanges.push(`${range.fromBlock}-${range.toBlock}`)
        collectedLogs.push(...logs)
      },
    })

    expect(appliedRanges).toEqual(['20-29', '30-39'])
    expect(collectedLogs).toEqual([
      '20-29-a',
      '20-29-b',
      '30-39-a',
      '30-39-b',
    ])
    expect(result).toEqual(collectedLogs)
  })
})
