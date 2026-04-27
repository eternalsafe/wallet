export type BlockRange = {
  fromBlock: number
  toBlock: number
}

const positiveIntegerOrOne = (value: number) => {
  return Math.max(1, Math.floor(Number.isFinite(value) ? value : 0))
}

const nonNegativeIntegerOrZero = (value: number) => {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0))
}

export const getBackwardBlockRanges = (latestBlock: number, batchSize: number, stopAtBlock = 0): BlockRange[] => {
  const normalizedBatchSize = positiveIntegerOrOne(batchSize)
  const normalizedLatestBlock = nonNegativeIntegerOrZero(latestBlock)
  const normalizedStopAtBlock = nonNegativeIntegerOrZero(stopAtBlock)
  const ranges: BlockRange[] = []

  for (let toBlock = normalizedLatestBlock; toBlock >= normalizedStopAtBlock; toBlock -= normalizedBatchSize) {
    ranges.push({
      fromBlock: Math.max(normalizedStopAtBlock, toBlock - normalizedBatchSize + 1),
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
  onBatch?: (logs: T[], range: BlockRange) => Promise<void> | void
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
  const normalizedMaxConcurrentRequests = positiveIntegerOrOne(maxConcurrentRequests)
  const collectedLogs: T[] = []
  let processedBatches = 0

  for (
    let index = 0;
    index < ranges.length && processedBatches < maxBatches;
    index += normalizedMaxConcurrentRequests
  ) {
    const remainingBatches = maxBatches - processedBatches
    const group = ranges.slice(index, index + Math.min(normalizedMaxConcurrentRequests, remainingBatches))
    const results = await Promise.all(
      group.map(async (range) => ({
        range,
        logs: await queryRange(range),
      })),
    )

    results.sort((a, b) => a.range.fromBlock - b.range.fromBlock)

    for (const result of results) {
      if (processedBatches >= maxBatches) {
        break
      }

      await onBatch?.(result.logs, result.range)
      processedBatches += 1
      collectedLogs.push(...result.logs)
    }
  }

  return collectedLogs
}
