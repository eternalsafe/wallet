export type BlockRange = {
  fromBlock: number
  toBlock: number
}

type QueryFilterBackfillParams<TLog> = {
  latestBlock: number
  batchSize: number
  queryRange: (range: BlockRange) => Promise<TLog[]>
  onBatch?: (logs: TLog[], range: BlockRange) => void | Promise<void>
  shouldContinue?: () => boolean
}

export const getBackwardBlockRanges = (latestBlock: number, batchSize: number): BlockRange[] => {
  const normalizedLatestBlock = Math.max(0, Math.floor(latestBlock))
  const parsedBatchSize = Number(batchSize)
  const normalizedBatchSize =
    Number.isFinite(parsedBatchSize) && parsedBatchSize > 0 ? Math.floor(parsedBatchSize) : 1

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
  queryRange,
  onBatch,
  shouldContinue,
}: QueryFilterBackfillParams<TLog>): Promise<TLog[]> => {
  const ranges = getBackwardBlockRanges(latestBlock, batchSize)
  const collectedLogs: TLog[] = []

  for (const range of ranges) {
    if (shouldContinue && !shouldContinue()) {
      break
    }

    const logs = await queryRange(range)
    collectedLogs.push(...logs)

    if (onBatch) {
      await onBatch(logs, range)
    }
  }

  return collectedLogs
}
