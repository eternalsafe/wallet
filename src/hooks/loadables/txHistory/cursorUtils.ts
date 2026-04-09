import type { TxHistoryBackfillCursor } from '@/store/historicalRpcSyncSlice'

export const normalizeTxHistoryCursor = (
  currentCursor: TxHistoryBackfillCursor | undefined,
): TxHistoryBackfillCursor | undefined => {
  if (!currentCursor) {
    return
  }

  return {
    ...currentCursor,
    historyRecoveryApplied: currentCursor.historyRecoveryApplied ?? false,
  }
}

export const initializeTxHistoryCursor = ({
  currentCursor,
  latestBlock,
  historyIsEmpty,
}: {
  currentCursor: TxHistoryBackfillCursor | undefined
  latestBlock: number
  historyIsEmpty: boolean
}): {
  cursor: TxHistoryBackfillCursor
  shouldPersistImmediately: boolean
} => {
  const normalizedCurrentCursor = normalizeTxHistoryCursor(currentCursor)
  const shouldRecoverMissingHistory =
    !!normalizedCurrentCursor &&
    historyIsEmpty &&
    !normalizedCurrentCursor.backfillComplete &&
    normalizedCurrentCursor.latestSyncedBlock >= latestBlock &&
    normalizedCurrentCursor.backfillCursor < latestBlock &&
    !normalizedCurrentCursor.historyRecoveryApplied

  const initializedCursor: TxHistoryBackfillCursor = shouldRecoverMissingHistory
    ? {
        latestSyncedBlock: latestBlock,
        backfillCursor: latestBlock,
        backfillComplete: false,
        historyRecoveryApplied: true,
      }
    : normalizedCurrentCursor || {
        latestSyncedBlock: latestBlock,
        backfillCursor: latestBlock,
        backfillComplete: false,
        historyRecoveryApplied: false,
      }

  return {
    cursor: initializedCursor,
    shouldPersistImmediately: !normalizedCurrentCursor || shouldRecoverMissingHistory,
  }
}
