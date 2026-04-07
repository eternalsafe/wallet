export type BlockRange = {
  fromBlock: number
  toBlock: number
}

type QueryFilterBackfillParams<TLog> = {
  latestBlock: number
  batchSize: number
  stopAtBlock?: number
  maxConcurrentRequests?: number
  maxBatches?: number
  collectLogs?: boolean
  maxRetryAttempts?: number
  retryBaseDelayMs?: number
  retryMaxDelayMs?: number
  scheduleRequest?: <T>(request: () => Promise<T>) => Promise<T>
  queryRange: (range: BlockRange) => Promise<TLog[]>
  onBatch?: (logs: TLog[], range: BlockRange) => void | Promise<void>
  shouldContinue?: () => boolean
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

const toErrorString = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`.toLowerCase()
  }

  return String(error).toLowerCase()
}

const getErrorCode = (error: unknown): string | number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  const candidate = error as { code?: string | number; status?: string | number; response?: { status?: number } }
  return candidate.code ?? candidate.status ?? candidate.response?.status
}

const isRetryableRpcError = (error: unknown): boolean => {
  const errorCode = getErrorCode(error)
  if (errorCode === 429 || errorCode === '429' || errorCode === 'SERVER_ERROR' || errorCode === 'TIMEOUT') {
    return true
  }

  const text = toErrorString(error)
  return (
    text.includes('429') ||
    text.includes('too many requests') ||
    text.includes('rate limit') ||
    text.includes('timeout') ||
    text.includes('timed out') ||
    text.includes('econnreset') ||
    text.includes('temporarily unavailable')
  )
}

const getJitteredBackoffMs = (attempt: number, baseDelayMs: number, maxDelayMs: number): number => {
  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1))
  const jitterMultiplier = 0.75 + Math.random() * 0.5
  return Math.max(1, Math.floor(exponentialDelay * jitterMultiplier))
}

export const getBackwardBlockRanges = (latestBlock: number, batchSize: number, stopAtBlock = 0): BlockRange[] => {
  const normalizedLatestBlock = Math.max(0, Math.floor(latestBlock))
  const normalizedStopAtBlock = Math.max(0, Math.floor(stopAtBlock))
  const parsedBatchSize = Number(batchSize)
  const normalizedBatchSize = Number.isFinite(parsedBatchSize) && parsedBatchSize > 0 ? Math.floor(parsedBatchSize) : 1

  if (normalizedLatestBlock < normalizedStopAtBlock) {
    return []
  }

  const ranges: BlockRange[] = []
  let toBlock = normalizedLatestBlock

  while (toBlock >= normalizedStopAtBlock) {
    const fromBlock = Math.max(normalizedStopAtBlock, toBlock - normalizedBatchSize + 1)
    ranges.push({ fromBlock, toBlock })

    if (fromBlock === normalizedStopAtBlock) {
      break
    }

    toBlock = fromBlock - 1
  }

  return ranges
}

export const queryFilterBackwards = async <TLog>({
  latestBlock,
  batchSize,
  stopAtBlock = 0,
  maxConcurrentRequests = 1,
  maxBatches,
  collectLogs = true,
  maxRetryAttempts = 4,
  retryBaseDelayMs = 250,
  retryMaxDelayMs = 5_000,
  scheduleRequest = async <T>(request: () => Promise<T>) => request(),
  queryRange,
  onBatch,
  shouldContinue,
}: QueryFilterBackfillParams<TLog>): Promise<TLog[]> => {
  const ranges = getBackwardBlockRanges(latestBlock, batchSize, stopAtBlock)
  const collectedLogs: TLog[] = []
  const parsedMaxConcurrentRequests = Number(maxConcurrentRequests)
  const normalizedMaxConcurrentRequests =
    Number.isFinite(parsedMaxConcurrentRequests) && parsedMaxConcurrentRequests > 0
      ? Math.floor(parsedMaxConcurrentRequests)
      : 1
  const parsedMaxBatches = Number(maxBatches)
  const normalizedMaxBatches =
    maxBatches === undefined
      ? Number.POSITIVE_INFINITY
      : Number.isFinite(parsedMaxBatches) && parsedMaxBatches > 0
      ? Math.floor(parsedMaxBatches)
      : 1
  const normalizedMaxRetryAttempts = Math.max(0, Math.floor(Number(maxRetryAttempts) || 0))
  const normalizedRetryBaseDelayMs = Math.max(1, Math.floor(Number(retryBaseDelayMs) || 250))
  const normalizedRetryMaxDelayMs = Math.max(normalizedRetryBaseDelayMs, Math.floor(Number(retryMaxDelayMs) || 5_000))
  let processedBatches = 0

  const queryRangeWithRetry = async (range: BlockRange): Promise<TLog[]> => {
    let attempt = 0

    while (true) {
      if (shouldContinue && !shouldContinue()) {
        return []
      }

      try {
        return await scheduleRequest(() => queryRange(range))
      } catch (error) {
        const canRetry = attempt < normalizedMaxRetryAttempts && isRetryableRpcError(error)
        if (!canRetry) {
          throw error
        }

        attempt += 1
        const backoffMs = getJitteredBackoffMs(attempt, normalizedRetryBaseDelayMs, normalizedRetryMaxDelayMs)
        await sleep(backoffMs)
      }
    }
  }

  for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex += normalizedMaxConcurrentRequests) {
    if (processedBatches >= normalizedMaxBatches) {
      break
    }

    if (shouldContinue && !shouldContinue()) {
      break
    }

    const concurrentRanges = ranges.slice(rangeIndex, rangeIndex + normalizedMaxConcurrentRequests)
    const logsByRange = await Promise.all(
      concurrentRanges.map(async (range) => ({
        range,
        logs: await queryRangeWithRetry(range),
      })),
    )

    for (const { range, logs } of logsByRange) {
      if (processedBatches >= normalizedMaxBatches) {
        break
      }

      if (shouldContinue && !shouldContinue()) {
        break
      }

      if (collectLogs) {
        collectedLogs.push(...logs)
      }

      if (onBatch) {
        await onBatch(logs, range)
      }

      processedBatches += 1
    }
  }

  return collectedLogs
}
