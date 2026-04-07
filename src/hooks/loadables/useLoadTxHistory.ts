import { useEffect, useState } from 'react'
import { type AsyncResult } from '../useAsync'
import { HISTORICAL_RPC_LOG_BLOCK_BATCH_SIZE, POLLING_INTERVAL } from '@/config/constants'
import useIntervalCounter from '@/hooks/useIntervalCounter'
import useSafeInfo from '../useSafeInfo'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import { Errors, logError } from '@/services/exceptions'
import { asError } from '@/services/exceptions/utils'
import { useAppDispatch } from '@/store'
import { showNotification } from '@/store/notificationsSlice'
import { getSafeContract } from '@/utils/safe-versions'
import { buildMultisigTxId } from '@/utils/tx-id'
import { queryFilterBackwards } from '@/utils/queryFilterBackfill'
import type { SafeTransactionData } from '@safe-global/safe-core-sdk-types'
import type { Event } from '@ethersproject/contracts'
import type { Result } from 'ethers/lib/utils'

const HISTORY_PARSE_CONCURRENCY = 20

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
}: {
  log: Event
  provider: NonNullable<ReturnType<typeof useMultiWeb3ReadOnly>>
  safeContract: NonNullable<ReturnType<typeof getSafeContract>>
  blockTimestampCache: Map<number, Promise<number>>
  txDataCache: Map<string, Promise<{ executor: string; decodedTxData?: Result }>>
}): Promise<ParsedExecutionLog | undefined> => {
  const safeTxHash = (log.args as { txHash?: string } | undefined)?.txHash
  if (!safeTxHash || !log.transactionHash) {
    return
  }

  const timestampPromise =
    blockTimestampCache.get(log.blockNumber) ||
    provider.getBlock(log.blockNumber).then((block) => (block?.timestamp ? block.timestamp * 1000 : 0))

  blockTimestampCache.set(log.blockNumber, timestampPromise)

  const txDataPromise =
    txDataCache.get(log.transactionHash) ||
    provider.getTransaction(log.transactionHash).then((tx) => {
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

const buildTxHistory = (safeAddress: string, logs: ParsedExecutionLog[]): TxHistory => {
  const orderedLogs = [...logs].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber - b.blockNumber
    }
    return a.logIndex - b.logIndex
  })

  return orderedLogs.reduce((acc, log, index) => {
    const txId = buildMultisigTxId(safeAddress, log.safeTxHash)

    acc[txId] = {
      txId,
      txHash: log.txHash,
      safeTxHash: log.safeTxHash,
      timestamp: log.timestamp,
      executor: log.executor,
      decodedTxData: log.decodedTxData ? parseDecodedTxData(log.decodedTxData, index) : undefined,
    }

    return acc
  }, {} as TxHistory)
}

export const useLoadTxHistory = (): AsyncResult<TxHistory> => {
  const dispatch = useAppDispatch()
  const provider = useMultiWeb3ReadOnly()
  const { safe, safeAddress } = useSafeInfo()
  const { chainId } = safe
  const [pollCount, resetPolling] = useIntervalCounter(POLLING_INTERVAL)

  const [data, setData] = useState<TxHistory>()
  const [error, setError] = useState<Error>()
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    let isCurrent = true

    const load = async () => {
      if (!safeAddress || !provider) {
        setData(undefined)
        setError(undefined)
        setLoading(false)
        return
      }

      const safeContract = getSafeContract(safeAddress, safe.version, provider)
      if (!safeContract) {
        setData(undefined)
        setError(undefined)
        setLoading(false)
        return
      }

      setData(undefined)
      setError(undefined)
      setLoading(true)

      try {
        const executionFilter = safeContract.filters.ExecutionSuccess()
        const latestBlock = await provider.getBlockNumber()

        const blockTimestampCache = new Map<number, Promise<number>>()
        const txDataCache = new Map<string, Promise<{ executor: string; decodedTxData?: Result }>>()
        const parsedLogs: ParsedExecutionLog[] = []

        await queryFilterBackwards<Event>({
          latestBlock,
          batchSize: HISTORICAL_RPC_LOG_BLOCK_BATCH_SIZE,
          shouldContinue: () => isCurrent,
          queryRange: ({ fromBlock, toBlock }) => safeContract.queryFilter(executionFilter, fromBlock, toBlock),
          onBatch: async (batchLogs) => {
            if (!isCurrent || !batchLogs.length) {
              return
            }

            const parsedBatch = await mapWithConcurrencyLimit(batchLogs, HISTORY_PARSE_CONCURRENCY, (log) =>
              parseExecutionSuccessLog({
                log,
                provider,
                safeContract,
                blockTimestampCache,
                txDataCache,
              }),
            )

            if (!isCurrent) {
              return
            }

            parsedLogs.push(...(parsedBatch.filter(Boolean) as ParsedExecutionLog[]))
            setData(buildTxHistory(safeAddress, parsedLogs))
          },
        })

        if (isCurrent) {
          setData(buildTxHistory(safeAddress, parsedLogs))
        }
      } catch (err) {
        if (isCurrent) {
          setData(undefined)
          setError(asError(err))
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
  }, [pollCount, provider, safe.version, safeAddress])

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
  }, [resetPolling, safeAddress, chainId])

  return [data, error, loading]
}

export default useLoadTxHistory
