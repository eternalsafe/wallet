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
import { buildMultisigTxId } from '@/utils/tx-id'
import { queryFilterBackwards } from '@/utils/queryFilterBackfill'
import { scheduleRpcRequest, setRpcSchedulerMaxConcurrency } from '@/utils/rpcRequestScheduler'
import type { SafeTransactionData } from '@safe-global/safe-core-sdk-types'
import type { Event } from '@ethersproject/contracts'
import { Interface } from '@ethersproject/abi'
import type { Result } from 'ethers/lib/utils'

const HISTORY_PARSE_CONCURRENCY = 5
const executionSuccessEventInterface = new Interface(['event ExecutionSuccess(bytes32 txHash, uint256 payment)'])

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

export const extractSafeTxHashFromExecutionSuccessLog = (
  log: Event,
  safeContractInterface?: NonNullable<ReturnType<typeof getSafeContract>>['interface'],
): string | undefined => {
  const logArgs = log.args as ({ txHash?: string } & { [key: number]: unknown }) | undefined
  const txHashFromArgs = logArgs?.txHash ?? (typeof logArgs?.[0] === 'string' ? (logArgs[0] as string) : undefined)
  if (txHashFromArgs) {
    return txHashFromArgs
  }

  if (!log.topics || !log.data) {
    return
  }

  const parseWithInterface = (iface: {
    parseLog: (event: { topics: string[]; data: string }) => { args: unknown }
  }) => {
    const parsedLog = iface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    })
    const parsedArgs = parsedLog.args as ({ txHash?: string } & { [key: number]: unknown }) | undefined
    return parsedArgs?.txHash ?? (typeof parsedArgs?.[0] === 'string' ? (parsedArgs[0] as string) : undefined)
  }

  if (safeContractInterface) {
    try {
      const txHashFromSafeContractInterface = parseWithInterface(safeContractInterface)
      if (txHashFromSafeContractInterface) {
        return txHashFromSafeContractInterface
      }
    } catch (_error) {
      // Fall through to canonical event decoding below.
    }
  }

  try {
    return parseWithInterface(executionSuccessEventInterface)
  } catch (_error) {
    return
  }
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
  const safeTxHash = extractSafeTxHashFromExecutionSuccessLog(log, safeContract.interface)
  if (!safeTxHash || !log.transactionHash) {
    return
  }

  const timestampPromise =
    blockTimestampCache.get(log.blockNumber) ||
    scheduleRequest(() => provider.getBlock(log.blockNumber))
      .then((block) => (block?.timestamp ? block.timestamp * 1000 : 0))
      .catch(() => 0)

  blockTimestampCache.set(log.blockNumber, timestampPromise)

  const txDataPromise =
    txDataCache.get(log.transactionHash) ||
    scheduleRequest(() => provider.getTransaction(log.transactionHash))
      .then((tx) => {
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
      .catch(() => ({ executor: '', decodedTxData: undefined }))

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

const isTxHistoryForSafe = (history: TxHistory | undefined, safeAddress: string | undefined): history is TxHistory => {
  if (!history || !safeAddress) {
    return false
  }

  const historyItems = Object.values(history)
  if (!historyItems.length) {
    return false
  }

  const txIdPrefix = `multisig_${safeAddress.toLowerCase()}_`
  return historyItems.every((item) => item?.txId?.toLowerCase().startsWith(txIdPrefix))
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
  const persistedTxHistory = useAppSelector((state) => selectTxHistory(state).data)
  const initialPersistedHistory = useMemo(() => {
    if (!persistedTxHistory) {
      return
    }

    if (!safeAddress) {
      return persistedTxHistory
    }

    return isTxHistoryForSafe(persistedTxHistory, safeAddress) ? persistedTxHistory : undefined
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
            workingHistory = mergeParsedLogsIntoHistory(safeAddress, workingHistory, parsedLogs)
            dataRef.current = workingHistory
            setData(workingHistory)
          }
          if (updateProgress) {
            dispatch(setTxHistorySync({ loading: true, latestBlock, syncedToBlock: range.fromBlock }))
          }
        }

        if (latestBlock > nextCursor.latestSyncedBlock) {
          const headSyncRanges = getForwardSyncRanges(
            nextCursor.latestSyncedBlock + 1,
            latestBlock,
            historicalRpcLogBatchSize,
            historicalRpcLogMaxConcurrentRequests,
          )
          const logsByRange = await Promise.all(
            headSyncRanges.map(async (range) => ({
              range,
              logs: await scheduleRpcRequest(() =>
                safeContract.queryFilter(executionFilter, range.fromBlock, range.toBlock),
              ),
            })),
          )

          for (const { range, logs } of logsByRange) {
            await applyBatchLogs(logs, range, false)
            nextCursor = {
              ...nextCursor,
              latestSyncedBlock: Math.max(nextCursor.latestSyncedBlock, range.toBlock),
            }
          }
        }

        if (!nextCursor.backfillComplete) {
          const backfillWindowSize = historicalRpcLogBatchSize * historicalRpcLogMaxConcurrentRequests
          const backfillStopAtBlock = Math.max(0, nextCursor.backfillCursor - backfillWindowSize + 1)
          await queryFilterBackwards<Event>({
            latestBlock: nextCursor.backfillCursor,
            stopAtBlock: backfillStopAtBlock,
            batchSize: historicalRpcLogBatchSize,
            maxConcurrentRequests: historicalRpcLogMaxConcurrentRequests,
            maxBatches: historicalRpcLogMaxConcurrentRequests,
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
