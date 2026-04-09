import { useEffect, useMemo, useRef, useState } from 'react'
import { type AsyncResult } from '../useAsync'
import { POLLING_INTERVAL } from '@/config/constants'
import useIntervalCounter from '@/hooks/useIntervalCounter'
import useSafeInfo from '../useSafeInfo'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import { Errors, logError } from '@/services/exceptions'
import { asError } from '@/services/exceptions/utils'
import { useAppDispatch, useAppSelector } from '@/store'
import { AppRoutes } from '@/config/routes'
import {
  buildTxHistorySyncKey,
  selectTxHistoryCursor,
  setTxHistoryCursor,
  type TxHistoryBackfillCursor,
} from '@/store/historicalRpcSyncSlice'
import { showNotification } from '@/store/notificationsSlice'
import { selectHistoricalRpcLogBatchSize, selectHistoricalRpcLogMaxConcurrentRequests } from '@/store/settingsSlice'
import { resetTxHistorySync, setTxHistorySync } from '@/store/txHistorySyncSlice'
import { selectTxHistory } from '@/store/txHistorySlice'
import { getSafeContract } from '@/utils/safe-versions'
import { mapWithConcurrencyLimit } from '@/utils/mapWithConcurrencyLimit'
import { scheduleRpcRequest, setRpcSchedulerMaxConcurrency } from '@/utils/rpcRequestScheduler'
import { syncHistoricalLogsWindow } from '@/utils/syncHistoricalLogsWindow'
import { initializeTxHistoryCursor } from './txHistory/cursorUtils'
import { mergeParsedLogsIntoHistory, getTxHistoryForSafe } from './txHistory/historyMerging'
import { parseExecutionSuccessLog } from './txHistory/logParsing'
import type { ParsedExecutionLog, TxHistory } from './txHistory/types'
import type { Event } from '@ethersproject/contracts'
import type { Result } from 'ethers/lib/utils'

const HISTORY_PARSE_CONCURRENCY = 5
export { extractSafeTxHashFromExecutionSuccessLog } from './txHistory/logParsing'
export type { TxHistory, TxHistoryItem } from './txHistory/types'

export const useLoadTxHistory = (): AsyncResult<TxHistory> => {
  const dispatch = useAppDispatch()
  const provider = useMultiWeb3ReadOnly()
  const { safe, safeAddress } = useSafeInfo()
  const historicalRpcLogBatchSize = useAppSelector(selectHistoricalRpcLogBatchSize)
  const historicalRpcLogMaxConcurrentRequests = useAppSelector(selectHistoricalRpcLogMaxConcurrentRequests)
  const { chainId } = safe
  const txHistorySyncKey = useMemo(() => {
    return safeAddress ? buildTxHistorySyncKey(chainId, safeAddress) : undefined
  }, [chainId, safeAddress])
  const txHistoryCursor = useAppSelector((state) =>
    txHistorySyncKey ? selectTxHistoryCursor(state, txHistorySyncKey) : undefined,
  )
  const persistedTxHistory = useAppSelector((state) => selectTxHistory(state).data)
  const initialPersistedHistory = useMemo(() => {
    if (!persistedTxHistory) {
      return
    }

    if (!safeAddress) {
      return persistedTxHistory
    }

    return getTxHistoryForSafe(persistedTxHistory, safeAddress)
  }, [persistedTxHistory, safeAddress])
  const [pollCount, resetPolling] = useIntervalCounter(POLLING_INTERVAL)

  const [data, setData] = useState<TxHistory | undefined>(initialPersistedHistory)
  const [error, setError] = useState<Error>()
  const [loading, setLoading] = useState<boolean>(false)
  const txHistoryCursorRef = useRef<TxHistoryBackfillCursor>()
  const dataRef = useRef<TxHistory>(initialPersistedHistory ?? {})
  const loadRef = useRef<(() => Promise<void>) | undefined>()
  const isLoadInFlightRef = useRef(false)
  const hasQueuedLoadRef = useRef(false)
  const hasInitializedDataRef = useRef(Boolean(initialPersistedHistory))
  const hasMountedRef = useRef(false)
  const previousSafeKeyRef = useRef<string | undefined>(
    safeAddress ? `${chainId}:${safeAddress.toLowerCase()}` : undefined,
  )
  const blockTimestampCacheRef = useRef(new Map<number, Promise<number>>())
  const txDataCacheRef = useRef(new Map<string, Promise<{ executor: string; decodedTxData?: Result }>>())

  useEffect(() => {
    txHistoryCursorRef.current = txHistoryCursor
  }, [txHistoryCursor])

  useEffect(() => {
    dataRef.current = data ?? {}
  }, [data])

  useEffect(() => {
    if (hasInitializedDataRef.current || !initialPersistedHistory) {
      return
    }

    dataRef.current = initialPersistedHistory
    setData(initialPersistedHistory)
    hasInitializedDataRef.current = true
  }, [initialPersistedHistory])

  useEffect(() => {
    if (!safeAddress) {
      return
    }

    const currentHistory = dataRef.current
    const currentKeys = Object.keys(currentHistory)
    if (!currentKeys.length) {
      return
    }

    const scopedHistory = getTxHistoryForSafe(currentHistory, safeAddress)
    const scopedKeys = Object.keys(scopedHistory ?? {})
    if (scopedKeys.length === currentKeys.length) {
      return
    }

    dataRef.current = scopedHistory ?? {}
    setData(scopedHistory)
  }, [safeAddress])

  useEffect(() => {
    let isCurrent = true

    const load = async () => {
      if (isLoadInFlightRef.current) {
        hasQueuedLoadRef.current = true
        return
      }

      isLoadInFlightRef.current = true

      if (typeof document !== 'undefined' && document.hidden) {
        isLoadInFlightRef.current = false
        return
      }

      if (!safeAddress || !provider) {
        setError(undefined)
        setLoading(false)
        if (!Object.keys(dataRef.current).length) {
          setData(undefined)
          dispatch(resetTxHistorySync())
        }
        isLoadInFlightRef.current = false
        return
      }

      const safeContract = getSafeContract(safeAddress, safe.version, provider)
      if (!safeContract) {
        setError(undefined)
        setLoading(false)
        if (!Object.keys(dataRef.current).length) {
          setData(undefined)
          dispatch(resetTxHistorySync())
        }
        isLoadInFlightRef.current = false
        return
      }

      setError(undefined)
      setLoading(true)
      setRpcSchedulerMaxConcurrency(historicalRpcLogMaxConcurrentRequests)
      if (!hasInitializedDataRef.current) {
        const initialHistory = Object.keys(dataRef.current).length ? dataRef.current : {}
        dataRef.current = initialHistory
        setData(initialHistory)
        hasInitializedDataRef.current = true
      }

      try {
        const executionFilter = safeContract.filters.ExecutionSuccess()
        const latestBlock = await scheduleRpcRequest(() => provider.getBlockNumber())
        const { cursor: initializedCursor, shouldPersistImmediately } = initializeTxHistoryCursor({
          currentCursor: txHistoryCursorRef.current,
          latestBlock,
          historyIsEmpty: !Object.keys(dataRef.current).length,
        })

        const persistCursor = (cursor: TxHistoryBackfillCursor) => {
          txHistoryCursorRef.current = cursor
          if (!txHistorySyncKey || !isCurrent) {
            return
          }
          dispatch(setTxHistoryCursor({ key: txHistorySyncKey, value: cursor }))
        }

        if (shouldPersistImmediately) {
          persistCursor(initializedCursor)
        } else {
          txHistoryCursorRef.current = initializedCursor
        }

        dispatch(
          setTxHistorySync({
            loading: true,
            latestBlock,
            syncedToBlock: initializedCursor.backfillComplete ? 0 : Math.max(0, initializedCursor.backfillCursor),
          }),
        )

        let nextCursor = initializedCursor
        let workingHistory = {
          ...dataRef.current,
        }

        const applyBatchLogs = async (batchLogs: Event[], range: { fromBlock: number }, updateProgress = true) => {
          if (!isCurrent) {
            return
          }

          let parsedBatch: Array<ParsedExecutionLog | undefined> = []
          if (batchLogs.length) {
            parsedBatch = await mapWithConcurrencyLimit(batchLogs, HISTORY_PARSE_CONCURRENCY, (log) =>
              parseExecutionSuccessLog({
                log,
                provider,
                safeContract,
                blockTimestampCache: blockTimestampCacheRef.current,
                txDataCache: txDataCacheRef.current,
                scheduleRequest: scheduleRpcRequest,
              }),
            )
          }

          if (!isCurrent) {
            return
          }

          const parsedLogs = parsedBatch.filter(Boolean) as ParsedExecutionLog[]
          if (parsedLogs.length) {
            workingHistory = mergeParsedLogsIntoHistory(safeAddress, safe.nonce, workingHistory, parsedLogs)
            dataRef.current = workingHistory
            setData(workingHistory)
            if (nextCursor.historyRecoveryApplied) {
              nextCursor = {
                ...nextCursor,
                historyRecoveryApplied: false,
              }
              persistCursor(nextCursor)
            }
          }
          if (updateProgress) {
            dispatch(setTxHistorySync({ loading: true, latestBlock, syncedToBlock: range.fromBlock }))
          }
        }

        nextCursor = (await syncHistoricalLogsWindow<Event>({
          latestBlock,
          cursor: nextCursor,
          batchSize: historicalRpcLogBatchSize,
          maxConcurrentRequests: historicalRpcLogMaxConcurrentRequests,
          scheduleRequest: scheduleRpcRequest,
          queryRange: ({ fromBlock, toBlock }) => safeContract.queryFilter(executionFilter, fromBlock, toBlock),
          onHeadBatch: async (logs, range) => {
            await applyBatchLogs(logs, range, false)
          },
          onBackfillBatch: async (logs, range) => {
            await applyBatchLogs(logs, range)
          },
          onCursorUpdate: (cursor) => {
            nextCursor = {
              ...nextCursor,
              ...cursor,
              historyRecoveryApplied: nextCursor.historyRecoveryApplied,
            }
            persistCursor(nextCursor)
          },
          shouldContinue: () => isCurrent,
        })) as TxHistoryBackfillCursor

        if (isCurrent && txHistorySyncKey) {
          dispatch(setTxHistoryCursor({ key: txHistorySyncKey, value: nextCursor }))
          dispatch(
            setTxHistorySync({
              loading: !nextCursor.backfillComplete,
              latestBlock,
              syncedToBlock: nextCursor.backfillComplete ? 0 : Math.max(0, nextCursor.backfillCursor + 1),
            }),
          )
        }
      } catch (err) {
        if (isCurrent) {
          setError(asError(err))
          dispatch(setTxHistorySync({ loading: false }))
        }
      } finally {
        if (isCurrent) {
          setLoading(false)
        }
        isLoadInFlightRef.current = false
        if (isCurrent && hasQueuedLoadRef.current) {
          hasQueuedLoadRef.current = false
          void load()
        }
      }
    }

    loadRef.current = load
    void load()

    return () => {
      isCurrent = false
      hasQueuedLoadRef.current = false
      isLoadInFlightRef.current = false
      loadRef.current = undefined
    }
  }, [
    dispatch,
    txHistorySyncKey,
    historicalRpcLogBatchSize,
    historicalRpcLogMaxConcurrentRequests,
    provider,
    safe.nonce,
    safe.version,
    safeAddress,
  ])

  useEffect(() => {
    if (!pollCount) {
      return
    }

    const runLoad = loadRef.current
    if (!runLoad) {
      return
    }

    void runLoad()
  }, [pollCount])

  // Log errors
  useEffect(() => {
    if (!error) return
    dispatch(
      showNotification({
        message:
          'Error fetching transaction history. If you see this error often, please configure your RPC URL or Chain Queries settings.',
        groupKey: 'fetch-tx-history-error',
        variant: 'error',
        detailedMessage: error.message,
        link: {
          href: AppRoutes.settings.environmentVariables,
          title: 'RPC settings',
        },
      }),
    )
    logError(Errors._602, error.message)
  }, [error, dispatch])

  // Reset the counter when safe address/chainId changes
  useEffect(() => {
    const nextSafeKey = safeAddress ? `${chainId}:${safeAddress.toLowerCase()}` : undefined

    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      previousSafeKeyRef.current = nextSafeKey
      return
    }

    const previousSafeKey = previousSafeKeyRef.current
    previousSafeKeyRef.current = nextSafeKey

    if (!previousSafeKey) {
      return
    }

    if (previousSafeKey === nextSafeKey) {
      return
    }

    resetPolling()
    dataRef.current = {}
    hasInitializedDataRef.current = false
    blockTimestampCacheRef.current.clear()
    txDataCacheRef.current.clear()
    setData(undefined)
  }, [resetPolling, safeAddress, chainId])

  return [data, error, loading]
}

export default useLoadTxHistory
