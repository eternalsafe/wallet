export type BlockRange = {
  fromBlock: number
  toBlock: number
}

type QueryFilterBackfillParams<TLog> = {
  latestBlock: number
  batchSize: number
  maxConcurrentRequests?: number
  queryRange: (range: BlockRange) => Promise<TLog[]>
  onBatch?: (logs: TLog[], range: BlockRange) => void | Promise<void>
  shouldContinue?: () => boolean
}

export const getBackwardBlockRanges = (latestBlock: number, batchSize: number): BlockRange[] => {
  const normalizedLatestBlock = Math.max(0, Math.floor(latestBlock))
  const parsedBatchSize = Number(batchSize)
  const normalizedBatchSize = Number.isFinite(parsedBatchSize) && parsedBatchSize > 0 ? Math.floor(parsedBatchSize) : 1

  const ranges: BlockRange[] = []
  let toBlock = normalizedLatestBlock

  while (toBlock >= 0) {
    const fromBlock = Math.max(0, toBlock - normalizedBatchSize + 1)
    ranges.push({ fromBlock, toBlock })

    if (fromBlock === 0) {
      break
    }

    toBlock = fromBlock - 1
  }

  return ranges
}

export const queryFilterBackwards = async <TLog>({
  latestBlock,
  batchSize,
  maxConcurrentRequests = 1,
  queryRange,
  onBatch,
  shouldContinue,
}: QueryFilterBackfillParams<TLog>): Promise<TLog[]> => {
  const ranges = getBackwardBlockRanges(latestBlock, batchSize)
  const collectedLogs: TLog[] = []
  const parsedMaxConcurrentRequests = Number(maxConcurrentRequests)
  const normalizedMaxConcurrentRequests =
    Number.isFinite(parsedMaxConcurrentRequests) && parsedMaxConcurrentRequests > 0
      ? Math.floor(parsedMaxConcurrentRequests)
      : 1

  for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex += normalizedMaxConcurrentRequests) {
    if (shouldContinue && !shouldContinue()) {
      break
    }

    const concurrentRanges = ranges.slice(rangeIndex, rangeIndex + normalizedMaxConcurrentRequests)
    const logsByRange = await Promise.all(
      concurrentRanges.map(async (range) => ({
        range,
        logs: await queryRange(range),
      })),
    )

    for (const { range, logs } of logsByRange) {
      if (shouldContinue && !shouldContinue()) {
        break
      }

      collectedLogs.push(...logs)

      if (onBatch) {
        await onBatch(logs, range)
      }
    }
  }

  return collectedLogs
}
