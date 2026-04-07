import { useEffect, useMemo, useRef, useState } from 'react'
import { type AsyncResult } from '../useAsync'
import { POLLING_INTERVAL } from '@/config/constants'
import useIntervalCounter from '@/hooks/useIntervalCounter'
import useSafeInfo from '../useSafeInfo'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import { Errors, logError } from '@/services/exceptions'
import { asError } from '@/services/exceptions/utils'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  buildTxHistorySyncKey,
  selectTxHistoryCursor,
  setTxHistoryCursor,
  type TxHistoryBackfillCursor,
} from '@/store/historicalRpcSyncSlice'
import { showNotification } from '@/store/notificationsSlice'
import { selectHistoricalRpcLogBatchSize, selectHistoricalRpcLogMaxConcurrentRequests } from '@/store/settingsSlice'
import { resetTxHistorySync, setTxHistorySync } from '@/store/txHistorySyncSlice'
import { getSafeContract } from '@/utils/safe-versions'
import { buildMultisigTxId } from '@/utils/tx-id'
import { queryFilterBackwards } from '@/utils/queryFilterBackfill'
import { scheduleRpcRequest, setRpcSchedulerMaxConcurrency } from '@/utils/rpcRequestScheduler'
import type { SafeTransactionData } from '@safe-global/safe-core-sdk-types'
import type { Event } from '@ethersproject/contracts'
import type { Result } from 'ethers/lib/utils'

const HISTORY_PARSE_CONCURRENCY = 5

type ParsedExecutionLog = {
  blockNumber: number
  logIndex: number
  txHash: string
  safeTxHash: string
  timestamp: number
  executor: string
  decodedTxData?: Result
}

export type TxHistoryItem = {
  txId: string
  txHash: string
  safeTxHash: string
  timestamp: number
  executor: string
  decodedTxData?: SafeTransactionData
}

export type TxHistory = {
  [txId: string]: TxHistoryItem
}

function parseDecodedTxData(decodedTxData: Result, nonce: number): SafeTransactionData {
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

const mapWithConcurrencyLimit = async <T, U>(
  values: T[],
  limit: number,
  mapper: (value: T, index: number) => Promise<U>,
): Promise<U[]> => {
  if (!values.length) {
    return []
  }

  const boundedLimit = Math.max(1, Math.floor(limit))
  const results: U[] = new Array(values.length)
  let nextIndex = 0

  const workers = new Array(Math.min(boundedLimit, values.length)).fill(undefined).map(async () => {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(values[currentIndex], currentIndex)
    }
  })

  await Promise.all(workers)

  return results
}

const parseExecutionSuccessLog = async ({
  log,
  provider,
  safeContract,
  blockTimestampCache,
  txDataCache,
  scheduleRequest,
}: {
  log: Event
  provider: NonNullable<ReturnType<typeof useMultiWeb3ReadOnly>>
  safeContract: NonNullable<ReturnType<typeof getSafeContract>>
  blockTimestampCache: Map<number, Promise<number>>
  txDataCache: Map<string, Promise<{ executor: string; decodedTxData?: Result }>>
  scheduleRequest: <T>(request: () => Promise<T>) => Promise<T>
}): Promise<ParsedExecutionLog | undefined> => {
  const safeTxHash = (log.args as { txHash?: string } | undefined)?.txHash
  if (!safeTxHash || !log.transactionHash) {
    return
  }

  const timestampPromise =
    blockTimestampCache.get(log.blockNumber) ||
    scheduleRequest(() => provider.getBlock(log.blockNumber)).then((block) =>
      block?.timestamp ? block.timestamp * 1000 : 0,
    )

  blockTimestampCache.set(log.blockNumber, timestampPromise)

  const txDataPromise =
    txDataCache.get(log.transactionHash) ||
    scheduleRequest(() => provider.getTransaction(log.transactionHash)).then((tx) => {
      const executor = tx?.from ?? ''
      const txData = tx?.data

      if (!txData) {
        return { executor, decodedTxData: undefined }
      }

      try {
        return {
          executor,
          decodedTxData: safeContract.interface.decodeFunctionData('execTransaction', txData),
        }
      } catch (_error) {
        return { executor, decodedTxData: undefined }
      }
    })

  txDataCache.set(log.transactionHash, txDataPromise)

  const [timestamp, { executor, decodedTxData }] = await Promise.all([timestampPromise, txDataPromise])

  return {
    blockNumber: log.blockNumber,
    logIndex: log.logIndex,
    txHash: log.transactionHash,
    safeTxHash,
    timestamp,
    executor,
    decodedTxData,
  }
}

const sortParsedLogs = (logs: ParsedExecutionLog[]): ParsedExecutionLog[] => {
  return [...logs].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber - b.blockNumber
    }
    return a.logIndex - b.logIndex
  })
}

const mergeParsedLogsIntoHistory = (
  safeAddress: string,
  currentHistory: TxHistory,
  logs: ParsedExecutionLog[],
): TxHistory => {
  const orderedLogs = sortParsedLogs(logs)
  const nextHistory = {
    ...currentHistory,
  }
  let nextNonce = Object.keys(nextHistory).length

  orderedLogs.forEach((log) => {
    const txId = buildMultisigTxId(safeAddress, log.safeTxHash)
    const existingItem = nextHistory[txId]

    nextHistory[txId] = {
      txId,
      txHash: log.txHash,
      safeTxHash: log.safeTxHash,
      timestamp: log.timestamp,
      executor: log.executor,
      decodedTxData: log.decodedTxData
        ? parseDecodedTxData(log.decodedTxData, existingItem?.decodedTxData?.nonce ?? nextNonce++)
        : existingItem?.decodedTxData,
    }
  })

  return nextHistory
}

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
  const [pollCount, resetPolling] = useIntervalCounter(POLLING_INTERVAL)

  const [data, setData] = useState<TxHistory>()
  const [error, setError] = useState<Error>()
  const [loading, setLoading] = useState<boolean>(false)
  const txHistoryCursorRef = useRef<TxHistoryBackfillCursor>()
  const dataRef = useRef<TxHistory>({})
  const blockTimestampCacheRef = useRef(new Map<number, Promise<number>>())
  const txDataCacheRef = useRef(new Map<string, Promise<{ executor: string; decodedTxData?: Result }>>())

  useEffect(() => {
    txHistoryCursorRef.current = txHistoryCursor
  }, [txHistoryCursor])

  useEffect(() => {
    dataRef.current = data ?? {}
  }, [data])

  useEffect(() => {
    let isCurrent = true

    const load = async () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return
      }

      if (!safeAddress || !provider) {
        setData(undefined)
        setError(undefined)
        setLoading(false)
        dispatch(resetTxHistorySync())
        return
      }

      const safeContract = getSafeContract(safeAddress, safe.version, provider)
      if (!safeContract) {
        setData(undefined)
        setError(undefined)
        setLoading(false)
        dispatch(resetTxHistorySync())
        return
      }

      setError(undefined)
      setLoading(true)
      setRpcSchedulerMaxConcurrency(historicalRpcLogMaxConcurrentRequests)

      try {
        const executionFilter = safeContract.filters.ExecutionSuccess()
        const latestBlock = await scheduleRpcRequest(() => provider.getBlockNumber())
        const currentCursor = txHistoryCursorRef.current
        const initializedCursor: TxHistoryBackfillCursor = currentCursor || {
          latestSyncedBlock: latestBlock,
          backfillCursor: latestBlock,
          backfillComplete: false,
        }

        if (!currentCursor && txHistorySyncKey) {
          dispatch(setTxHistoryCursor({ key: txHistorySyncKey, value: initializedCursor }))
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

        const applyBatchLogs = async (batchLogs: Event[], range: { fromBlock: number }) => {
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
            workingHistory = mergeParsedLogsIntoHistory(safeAddress, workingHistory, parsedLogs)
            dataRef.current = workingHistory
            setData(workingHistory)
          }
          dispatch(setTxHistorySync({ loading: true, latestBlock, syncedToBlock: range.fromBlock }))
        }

        if (latestBlock > nextCursor.latestSyncedBlock) {
          await queryFilterBackwards<Event>({
            latestBlock,
            stopAtBlock: nextCursor.latestSyncedBlock + 1,
            batchSize: historicalRpcLogBatchSize,
            maxConcurrentRequests: historicalRpcLogMaxConcurrentRequests,
            collectLogs: false,
            shouldContinue: () => isCurrent,
            scheduleRequest: scheduleRpcRequest,
            queryRange: ({ fromBlock, toBlock }) => safeContract.queryFilter(executionFilter, fromBlock, toBlock),
            onBatch: applyBatchLogs,
          })
          nextCursor = {
            ...nextCursor,
            latestSyncedBlock: latestBlock,
          }
        }

        if (!nextCursor.backfillComplete) {
          const backfillStopAtBlock = Math.max(0, nextCursor.backfillCursor - historicalRpcLogBatchSize + 1)
          await queryFilterBackwards<Event>({
            latestBlock: nextCursor.backfillCursor,
            stopAtBlock: backfillStopAtBlock,
            batchSize: historicalRpcLogBatchSize,
            maxConcurrentRequests: 1,
            maxBatches: 1,
            collectLogs: false,
            shouldContinue: () => isCurrent,
            scheduleRequest: scheduleRpcRequest,
            queryRange: ({ fromBlock, toBlock }) => safeContract.queryFilter(executionFilter, fromBlock, toBlock),
            onBatch: async (batchLogs, range) => {
              await applyBatchLogs(batchLogs, range)
              const nextBackfillCursor = range.fromBlock - 1
              nextCursor = {
                ...nextCursor,
                backfillCursor: Math.max(0, nextBackfillCursor),
                backfillComplete: range.fromBlock === 0,
              }
            },
          })
        }

        if (isCurrent && txHistorySyncKey) {
          dispatch(setTxHistoryCursor({ key: txHistorySyncKey, value: nextCursor }))
          dispatch(
            setTxHistorySync({
              loading: false,
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
      }
    }

    void load()

    return () => {
      isCurrent = false
    }
  }, [
    dispatch,
    txHistorySyncKey,
    historicalRpcLogBatchSize,
    historicalRpcLogMaxConcurrentRequests,
    pollCount,
    provider,
    safe.version,
    safeAddress,
  ])

  // Log errors
  useEffect(() => {
    if (!error) return
    dispatch(
      showNotification({
        message:
          'Error fetching transaction history. If you see this error often, please consider using a more stable RPC URL.',
        groupKey: 'fetch-tx-history-error',
        variant: 'error',
        detailedMessage: error.message,
      }),
    )
    logError(Errors._602, error.message)
  }, [error, dispatch])

  // Reset the counter when safe address/chainId changes
  useEffect(() => {
    resetPolling()
    dataRef.current = {}
    blockTimestampCacheRef.current.clear()
    txDataCacheRef.current.clear()
    setData(undefined)
  }, [resetPolling, safeAddress, chainId])

  return [data, error, loading]
}

export default useLoadTxHistory
