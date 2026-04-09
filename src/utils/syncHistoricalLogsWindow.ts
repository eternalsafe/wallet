import { queryFilterBackwards } from '@/utils/queryFilterBackfill'

export type HistoricalBackfillCursor = {
  latestSyncedBlock: number
  backfillCursor: number
  backfillComplete: boolean
}

type SyncHistoricalLogsWindowParams<TLog> = {
  latestBlock: number
  cursor: HistoricalBackfillCursor
  batchSize: number
  maxConcurrentRequests: number
  scheduleRequest: <T>(request: () => Promise<T>) => Promise<T>
  queryRange: (range: { fromBlock: number; toBlock: number }) => Promise<TLog[]>
  onHeadBatch: (logs: TLog[], range: { fromBlock: number; toBlock: number }) => Promise<void>
  onBackfillBatch: (logs: TLog[], range: { fromBlock: number; toBlock: number }) => Promise<void>
  onCursorUpdate: (cursor: HistoricalBackfillCursor) => void
  shouldContinue?: () => boolean
}

const getForwardSyncRanges = (
  fromBlock: number,
  toBlock: number,
  batchSize: number,
  maxRanges: number,
): Array<{ fromBlock: number; toBlock: number }> => {
  const normalizedFromBlock = Math.max(0, Math.floor(fromBlock))
  const normalizedToBlock = Math.max(0, Math.floor(toBlock))
  const normalizedBatchSize = Math.max(1, Math.floor(batchSize))
  const normalizedMaxRanges = Math.max(1, Math.floor(maxRanges))
  const ranges: Array<{ fromBlock: number; toBlock: number }> = []

  if (normalizedFromBlock > normalizedToBlock) {
    return ranges
  }

  let currentFrom = normalizedFromBlock

  while (currentFrom <= normalizedToBlock && ranges.length < normalizedMaxRanges) {
    const currentTo = Math.min(normalizedToBlock, currentFrom + normalizedBatchSize - 1)
    ranges.push({ fromBlock: currentFrom, toBlock: currentTo })
    currentFrom = currentTo + 1
  }

  return ranges
}

export const syncHistoricalLogsWindow = async <TLog>({
  latestBlock,
  cursor,
  batchSize,
  maxConcurrentRequests,
  scheduleRequest,
  queryRange,
  onHeadBatch,
  onBackfillBatch,
  onCursorUpdate,
  shouldContinue,
}: SyncHistoricalLogsWindowParams<TLog>): Promise<HistoricalBackfillCursor> => {
  let nextCursor = {
    ...cursor,
  }

  if (latestBlock > nextCursor.latestSyncedBlock) {
    const headSyncRanges = getForwardSyncRanges(
      nextCursor.latestSyncedBlock + 1,
      latestBlock,
      batchSize,
      maxConcurrentRequests,
    )
    const logsByRange = await Promise.all(
      headSyncRanges.map(async (range) => ({
        range,
        logs: await scheduleRequest(() => queryRange(range)),
      })),
    )

    for (const { range, logs } of logsByRange) {
      if (shouldContinue && !shouldContinue()) {
        break
      }

      await onHeadBatch(logs, range)
      nextCursor = {
        ...nextCursor,
        latestSyncedBlock: Math.max(nextCursor.latestSyncedBlock, range.toBlock),
      }
      onCursorUpdate(nextCursor)
    }
  }

  if (!nextCursor.backfillComplete) {
    const backfillWindowSize = batchSize * maxConcurrentRequests
    const backfillStopAtBlock = Math.max(0, nextCursor.backfillCursor - backfillWindowSize + 1)
    await queryFilterBackwards<TLog>({
      latestBlock: nextCursor.backfillCursor,
      stopAtBlock: backfillStopAtBlock,
      batchSize,
      maxConcurrentRequests,
      maxBatches: maxConcurrentRequests,
      collectLogs: false,
      shouldContinue,
      scheduleRequest,
      queryRange,
      onBatch: async (batchLogs, range) => {
        await onBackfillBatch(batchLogs, range)
        const nextBackfillCursor = range.fromBlock - 1
        nextCursor = {
          ...nextCursor,
          backfillCursor: Math.max(0, nextBackfillCursor),
          backfillComplete: range.fromBlock === 0,
        }
        onCursorUpdate(nextCursor)
      },
    })
  }

  return nextCursor
}
