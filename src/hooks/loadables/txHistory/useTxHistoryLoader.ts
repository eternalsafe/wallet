import { useEffect, useMemo, useRef, useState } from 'react'
import isEqual from 'lodash/isEqual'
import type { SafeTransactionData } from '@safe-global/safe-core-sdk-types'
import type { Result } from 'ethers/lib/utils'

import useSafeInfo from '@/hooks/useSafeInfo'
import useIntervalCounter from '@/hooks/useIntervalCounter'
import { POLLING_INTERVAL } from '@/config/constants'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  buildTxHistorySyncKey,
  type TxHistoryBackfillCursor,
  selectTxHistoryCursor,
  setTxHistoryCursor,
} from '@/store/historicalRpcSyncSlice'
import {
  selectHistoricalRpcLogBatchSize,
  selectHistoricalRpcLogMaxConcurrentRequests,
} from '@/store/settingsSlice'
import { selectTxHistory } from '@/store/txHistorySlice'
import { asError } from '@/services/exceptions/utils'
import { getSafeContract } from '@/utils/safe-versions'
import { buildMultisigTxId } from '@/utils/tx-id'
import { queryFilterBackwards, type BlockRange } from '@/utils/queryFilterBackfill'

import type { TxHistory, TxHistoryItem } from './types'

type UseTxHistoryLoaderResult = {
  data: TxHistory | undefined
  error: Error | undefined
  loading: boolean
}

type ExecutionSuccessLog = {
  blockNumber: number
  transactionHash: string
  args: {
    txHash: string
  }
}

const INITIAL_CURSOR: TxHistoryBackfillCursor = {
  latestSyncedBlock: 0,
  backfillCursor: 0,
  backfillComplete: false,
}

const parseDecodedTxData = (decodedTxData: Result, nonce: number): SafeTransactionData => {
  const [to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver] = decodedTxData
  return {
    to,
    value,
    data,
    operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    nonce,
  }
}

const getSafeAddressFromTxId = (txId: string): string | undefined => {
  const [, safeAddress] = txId.split('_')
  return safeAddress?.toLowerCase()
}

const filterHistoryForSafe = (history: TxHistory | undefined, safeAddress: string): TxHistory | undefined => {
  const normalizedSafeAddress = safeAddress.toLowerCase()
  const entries = Object.entries(history ?? {}).filter(([txId]) => {
    return getSafeAddressFromTxId(txId) === normalizedSafeAddress
  })

  if (!entries.length) {
    return undefined
  }

  return Object.fromEntries(entries)
}

const getOrderedHistoryItems = (history: TxHistory | undefined): TxHistoryItem[] => {
  return Object.values(history ?? {})
}

const mergeTxHistoryItem = (current: TxHistoryItem | undefined, next: TxHistoryItem): TxHistoryItem => {
  return {
    ...current,
    ...next,
    decodedTxData: next.decodedTxData ?? current?.decodedTxData,
  }
}

const rebuildHistoryFromOrder = (orderedItems: TxHistoryItem[]): TxHistory | undefined => {
  if (!orderedItems.length) {
    return undefined
  }

  return orderedItems.reduce<TxHistory>((acc, item, index) => {
    acc[item.txId] = item.decodedTxData
      ? {
          ...item,
          decodedTxData: {
            ...item.decodedTxData,
            nonce: index,
          },
        }
      : item

    return acc
  }, {})
}

const insertRangeIntoOrderedHistory = (
  currentOrderedHistory: TxHistoryItem[],
  nextItems: TxHistoryItem[],
  insertionIndex: number,
) => {
  const currentById = new Map(currentOrderedHistory.map((item) => [item.txId, item]))
  const nextTxIds = new Set(nextItems.map((item) => item.txId))
  const removedBeforeIndex = currentOrderedHistory
    .slice(0, insertionIndex)
    .filter((item) => nextTxIds.has(item.txId)).length
  const remainingItems = currentOrderedHistory.filter((item) => !nextTxIds.has(item.txId))
  const normalizedInsertionIndex = Math.max(
    0,
    Math.min(remainingItems.length, insertionIndex - removedBeforeIndex),
  )
  const mergedItems = nextItems.map((item) => mergeTxHistoryItem(currentById.get(item.txId), item))

  return {
    orderedHistory: [
      ...remainingItems.slice(0, normalizedInsertionIndex),
      ...mergedItems,
      ...remainingItems.slice(normalizedInsertionIndex),
    ],
    nextInsertionIndex: normalizedInsertionIndex + mergedItems.length,
  }
}

const mergePersistedHistorySnapshot = (
  currentOrderedHistory: TxHistoryItem[],
  persistedHistory: TxHistory | undefined,
): TxHistoryItem[] => {
  const persistedOrderedHistory = getOrderedHistoryItems(persistedHistory)
  if (!persistedOrderedHistory.length) {
    return currentOrderedHistory
  }

  if (!currentOrderedHistory.length) {
    return persistedOrderedHistory
  }

  const nextOrderedHistory = currentOrderedHistory.slice()

  for (const [snapshotIndex, snapshotItem] of persistedOrderedHistory.entries()) {
    const currentIndex = nextOrderedHistory.findIndex((item) => item.txId === snapshotItem.txId)

    if (currentIndex >= 0) {
      nextOrderedHistory[currentIndex] = mergeTxHistoryItem(nextOrderedHistory[currentIndex], snapshotItem)
      continue
    }

    let insertAt = nextOrderedHistory.length

    for (let lookAheadIndex = snapshotIndex + 1; lookAheadIndex < persistedOrderedHistory.length; lookAheadIndex += 1) {
      const futureIndex = nextOrderedHistory.findIndex((item) => item.txId === persistedOrderedHistory[lookAheadIndex].txId)
      if (futureIndex >= 0) {
        insertAt = futureIndex
        break
      }
    }

    if (insertAt === nextOrderedHistory.length) {
      for (let lookBackIndex = snapshotIndex - 1; lookBackIndex >= 0; lookBackIndex -= 1) {
        const previousIndex = nextOrderedHistory.findIndex(
          (item) => item.txId === persistedOrderedHistory[lookBackIndex].txId,
        )
        if (previousIndex >= 0) {
          insertAt = previousIndex + 1
          break
        }
      }
    }

    nextOrderedHistory.splice(insertAt, 0, snapshotItem)
  }

  return nextOrderedHistory
}

const mergeCursor = (
  current: TxHistoryBackfillCursor | undefined,
  next: TxHistoryBackfillCursor,
): TxHistoryBackfillCursor => {
  if (!current) {
    return next
  }

  const backfillComplete = current.backfillComplete || next.backfillComplete

  return {
    latestSyncedBlock: Math.max(current.latestSyncedBlock, next.latestSyncedBlock),
    backfillCursor: backfillComplete ? 0 : Math.min(current.backfillCursor, next.backfillCursor),
    backfillComplete,
  }
}

const buildCursorAfterRange = (
  current: TxHistoryBackfillCursor | undefined,
  latestSyncedBlock: number,
  range: BlockRange,
): TxHistoryBackfillCursor => {
  const candidate = {
    latestSyncedBlock,
    backfillCursor: Math.max(0, range.fromBlock - 1),
    backfillComplete: range.fromBlock === 0,
  }

  return mergeCursor(current, candidate)
}

const createInitialCursor = (latestBlock: number): TxHistoryBackfillCursor => ({
  latestSyncedBlock: latestBlock,
  backfillCursor: latestBlock,
  backfillComplete: false,
})

export const useTxHistoryLoader = (): UseTxHistoryLoaderResult => {
  const dispatch = useAppDispatch()
  const provider = useMultiWeb3ReadOnly()
  const { safe, safeAddress } = useSafeInfo()
  const { chainId } = safe
  const [pollCount, resetPolling] = useIntervalCounter(POLLING_INTERVAL)
  const syncKey = useMemo(() => {
    return safeAddress ? buildTxHistorySyncKey(chainId, safeAddress) : undefined
  }, [chainId, safeAddress])

  const batchSize = useAppSelector(selectHistoricalRpcLogBatchSize)
  const maxConcurrentRequests = useAppSelector(selectHistoricalRpcLogMaxConcurrentRequests)
  const persistedCursor = useAppSelector(
    (state) => (syncKey ? selectTxHistoryCursor(state, syncKey) : undefined),
    isEqual,
  )
  const persistedTxHistory = useAppSelector(
    (state) => {
      if (!safeAddress || !syncKey || !selectTxHistoryCursor(state, syncKey)) {
        return undefined
      }

      return filterHistoryForSafe(selectTxHistory(state).data, safeAddress)
    },
    isEqual,
  )

  const [data, setData] = useState<TxHistory | undefined>(persistedTxHistory)
  const [error, setError] = useState<Error>()
  const [loading, setLoading] = useState(false)
  const dataRef = useRef<TxHistory | undefined>(persistedTxHistory)
  const orderedHistoryRef = useRef<TxHistoryItem[]>(getOrderedHistoryItems(persistedTxHistory))
  const cursorRef = useRef<TxHistoryBackfillCursor | undefined>(persistedCursor)
  const previousSyncKeyRef = useRef(syncKey)

  useEffect(() => {
    cursorRef.current = persistedCursor
  }, [persistedCursor])

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    if (previousSyncKeyRef.current !== syncKey) {
      previousSyncKeyRef.current = syncKey
      const nextOrderedHistory = getOrderedHistoryItems(persistedTxHistory)
      orderedHistoryRef.current = nextOrderedHistory
      const nextHistory = rebuildHistoryFromOrder(nextOrderedHistory)
      dataRef.current = nextHistory
      setData(nextHistory)
      return
    }

    if (!persistedTxHistory) {
      return
    }

    const nextOrderedHistory = mergePersistedHistorySnapshot(orderedHistoryRef.current, persistedTxHistory)
    orderedHistoryRef.current = nextOrderedHistory
    const nextHistory = rebuildHistoryFromOrder(nextOrderedHistory)
    dataRef.current = nextHistory
    setData(nextHistory)
  }, [persistedTxHistory, syncKey])

  useEffect(() => {
    resetPolling()
  }, [chainId, resetPolling, safeAddress])

  useEffect(() => {
    if (!safeAddress || !provider || !syncKey) {
      setLoading(false)
      setError(undefined)
      dataRef.current = undefined
      orderedHistoryRef.current = []
      setData(undefined)
      return
    }

    const safeContract = getSafeContract(safeAddress, safe.version, provider)

    if (!safeContract) {
      setLoading(false)
      return
    }

    const executionSuccessFilter = safeContract.filters.ExecutionSuccess()
    let cancelled = false

    const setOrderedHistory = (nextOrderedHistory: TxHistoryItem[]) => {
      orderedHistoryRef.current = nextOrderedHistory
      const nextHistory = rebuildHistoryFromOrder(nextOrderedHistory)
      dataRef.current = nextHistory
      setData(nextHistory)
    }

    const updateCursor = (nextCursor: TxHistoryBackfillCursor) => {
      const mergedCursor = mergeCursor(cursorRef.current, nextCursor)
      cursorRef.current = mergedCursor

      dispatch(
        setTxHistoryCursor({
          chainId,
          safeAddress,
          cursor: mergedCursor,
        }),
      )
    }

    const parseLogs = async (logs: ExecutionSuccessLog[]) => {
      const parsed = await Promise.all(
        logs.map(async (log) => {
          const [block, tx] = await Promise.all([provider.getBlock(log.blockNumber), provider.getTransaction(log.transactionHash)])

          let decodedTxData: Result | undefined
          try {
            decodedTxData = safeContract.interface.decodeFunctionData('execTransaction', tx.data)
          } catch {
            decodedTxData = undefined
          }

          return {
            txId: buildMultisigTxId(safeAddress, log.args.txHash),
            txHash: log.transactionHash,
            safeTxHash: log.args.txHash,
            timestamp: block.timestamp * 1000,
            executor: tx.from,
            decodedTxData: decodedTxData ? parseDecodedTxData(decodedTxData, 0) : undefined,
          }
        }),
      )

      return parsed
    }

    const syncLogsInRanges = async ({
      latestBlock,
      stopAtBlock,
      mode,
      onRangeApplied,
    }: {
      latestBlock: number
      stopAtBlock: number
      mode: 'backfill' | 'forward'
      onRangeApplied?: (range: BlockRange) => void
    }) => {
      if (latestBlock < stopAtBlock) {
        return
      }

      const baseInsertionIndex = mode === 'forward' ? orderedHistoryRef.current.length : 0
      let insertionIndex = baseInsertionIndex
      let previousAppliedRange: BlockRange | undefined

      await queryFilterBackwards({
        latestBlock,
        stopAtBlock,
        batchSize,
        maxConcurrentRequests,
        queryRange: (range) => safeContract.queryFilter(executionSuccessFilter, range.fromBlock, range.toBlock),
        onBatch: async (logs, range) => {
          if (cancelled) {
            return
          }

          const parsed = await parseLogs(logs as ExecutionSuccessLog[])
          if (cancelled) {
            return
          }

          const isNewOlderGroup =
            previousAppliedRange !== undefined && range.toBlock < previousAppliedRange.fromBlock

          if (isNewOlderGroup) {
            insertionIndex = baseInsertionIndex
          }

          const insertionResult = insertRangeIntoOrderedHistory(orderedHistoryRef.current, parsed, insertionIndex)
          insertionIndex = insertionResult.nextInsertionIndex
          previousAppliedRange = range

          setOrderedHistory(insertionResult.orderedHistory)
          onRangeApplied?.(range)
        },
      })
    }

    const run = async () => {
      setLoading(true)
      setError(undefined)

      try {
        const latestBlock = await provider.getBlockNumber()
        if (cancelled) {
          return
        }

        let activeCursor = cursorRef.current

        if (!activeCursor) {
          activeCursor = createInitialCursor(latestBlock)
          updateCursor(activeCursor)
        }

        if (latestBlock > activeCursor.latestSyncedBlock) {
          await syncLogsInRanges({
            latestBlock,
            stopAtBlock: activeCursor.latestSyncedBlock + 1,
            mode: 'forward',
          })

          if (cancelled) {
            return
          }

          updateCursor({
            ...(cursorRef.current ?? INITIAL_CURSOR),
            latestSyncedBlock: latestBlock,
          })
        }

        const backfillCursor = (cursorRef.current ?? activeCursor).backfillCursor
        const backfillComplete = (cursorRef.current ?? activeCursor).backfillComplete

        if (!backfillComplete && backfillCursor > 0) {
          await syncLogsInRanges({
            latestBlock: backfillCursor,
            stopAtBlock: 0,
            mode: 'backfill',
            onRangeApplied: (range) => {
              updateCursor(buildCursorAfterRange(cursorRef.current ?? activeCursor, latestBlock, range))
            },
          })
        } else if (!backfillComplete && backfillCursor === 0) {
          updateCursor({
            ...(cursorRef.current ?? activeCursor),
            latestSyncedBlock: Math.max((cursorRef.current ?? activeCursor).latestSyncedBlock, latestBlock),
            backfillCursor: 0,
            backfillComplete: true,
          })
        }
      } catch (err) {
        if (cancelled) {
          return
        }

        setError(asError(err))
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [batchSize, chainId, maxConcurrentRequests, pollCount, provider, safe.version, safeAddress, syncKey, dispatch])

  return {
    data,
    error,
    loading,
  }
}
