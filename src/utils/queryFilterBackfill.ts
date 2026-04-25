export type BlockRange = {
  fromBlock: number
  toBlock: number
}

export const getBackwardBlockRanges = (
  latestBlock: number,
  batchSize: number,
  stopAtBlock = 0,
): BlockRange[] => {
  const ranges: BlockRange[] = []

  for (let toBlock = latestBlock; toBlock >= stopAtBlock; toBlock -= batchSize) {
    ranges.push({
      fromBlock: Math.max(stopAtBlock, toBlock - batchSize + 1),
      toBlock,
    })
  }

  return ranges
}

type QueryFilterBackwardsParams<T> = {
  latestBlock: number
  batchSize: number
  stopAtBlock?: number
  maxConcurrentRequests: number
  maxBatches?: number
  queryRange: (range: BlockRange) => Promise<T[]>
  onBatch: (logs: T[], range: BlockRange) => Promise<void> | void
}

export async function queryFilterBackwards<T>({
  latestBlock,
  batchSize,
  stopAtBlock = 0,
  maxConcurrentRequests,
  maxBatches = Number.POSITIVE_INFINITY,
  queryRange,
  onBatch,
}: QueryFilterBackwardsParams<T>): Promise<T[]> {
  const ranges = getBackwardBlockRanges(latestBlock, batchSize, stopAtBlock)
  const collectedLogs: T[] = []

  for (let index = 0; index < ranges.length && collectedLogs.length < maxBatches; index += maxConcurrentRequests) {
    const group = ranges.slice(index, index + maxConcurrentRequests)
    const results = await Promise.all(
      group.map(async (range) => ({
        range,
        logs: await queryRange(range),
      })),
    )

    results.sort((a, b) => a.range.fromBlock - b.range.fromBlock)

    for (const result of results) {
      if (collectedLogs.length >= maxBatches) {
        break
      }

      await onBatch(result.logs, result.range)
      collectedLogs.push(...result.logs)
    }
  }

  return collectedLogs
}
