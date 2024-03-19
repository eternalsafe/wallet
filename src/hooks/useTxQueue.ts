import {
  ConflictType,
  getTransactionQueue,
  TransactionListItem,
  TransactionListItemType,
  type TransactionListPage,
} from '@safe-global/safe-gateway-typescript-sdk'
import { useAppSelector } from '@/store'
import useAsync from './useAsync'
import { selectTxQueue, selectQueuedTransactionsByNonce } from '@/store/txQueueSlice'
import useSafeInfo from './useSafeInfo'
import { isTransactionListItem } from '@/utils/transaction-guards'
import { selectAddedTxs } from '@/store/addedTxsSlice'
import { useEffect, useState } from 'react'
import { extractTxDetails } from '@/services/tx/extractTxInfo'

const useTxQueue = (
  pageUrl?: string,
): {
  page?: TransactionListPage
  error?: string
  loading: boolean
} => {
  const { safe, safeAddress, safeLoaded } = useSafeInfo()
  const { chainId } = safe

  const transactions = useAppSelector((state) => selectAddedTxs(state, chainId, safeAddress))
  // const [page, setPage] = useState<TransactionListPage | undefined>(undefined)

  // useEffect(() => {
  //   if (!transactions) return
  //   const transactionListPage = {
  //     results: Object.values(transactions).map(
  //       (tx) =>
  //       extractTxDetails(safeAddress, tx, safe)
  //         ({
  //           transaction: {
  //             id: tx;
  //             timestamp: number;
  //             txStatus: TransactionStatus;
  //             txInfo: TransactionInfo;
  //             executionInfo?: ExecutionInfo;
  //             safeAppInfo?: SafeAppInfo;
  //           },
  //           conflictType: ConflictType.NONE, // TODO(devanon): Implement conflict type
  //           type: TransactionListItemType.TRANSACTION,
  //         } as TransactionListItem)
  //     ),

  //     next: undefined,
  //     previous: undefined,
  //   }
  //   // for (const transaction of Object.values(transactions)) {
  //   //   console.log(transaction)
  //   // }
  //   setPage(transactionListPage)
  // }, [transactions])

  const [page, error, loading] = useAsync<TransactionListPage>(
    async () => {
      if (!transactions) {
        return {
          results: [],
          next: undefined,
          previous: undefined,
        }
      }
      console.log({ transactions })

      const results = await Promise.all(
        Object.values(transactions).map(async (tx) => {
          const txDetails = await extractTxDetails(safeAddress, tx, safe)
          // TODO(devanon): at this point we have the full txDetails, but we only take some of them
          // they are needed again inside TxDetails component
          // we should pass them all the way down

          return {
            transaction: {
              id: txDetails.txId,
              timestamp: txDetails.executedAt ?? 0,
              txStatus: txDetails.txStatus,
              txInfo: txDetails.txInfo,
              executionInfo: txDetails.detailedExecutionInfo,
              safeAppInfo: txDetails.safeAppInfo,
            },
            conflictType: ConflictType.NONE, // TODO(devanon): Implement conflict type
            type: TransactionListItemType.TRANSACTION,
          } as TransactionListItem
        }),
      )

      return {
        results,
        next: undefined,
        previous: undefined,
      }
    },
    [safe, safeAddress, transactions],
    false,
  )

  // If pageUrl is passed, load a new queue page from the API
  // const [page, error, loading] = useAsync<TransactionListPage>(() => {
  //   if (!pageUrl || !safeLoaded) return
  //   return getTransactionQueue(chainId, safeAddress, pageUrl)
  // }, [chainId, safeAddress, safeLoaded, pageUrl])

  // The latest page of the queue is always in the store
  const queueState = useAppSelector(selectTxQueue)

  console.log({ pageUrl })
  console.log({ page })

  // Return the new page or the stored page
  return {
    page,
    error: error?.message,
    loading: loading,
  }
}

// Get the size of the queue as a string with an optional '+' if there are more pages
export const useQueuedTxsLength = (): string => {
  const queue = useAppSelector(selectTxQueue)
  const { length } = queue.data?.results.filter(isTransactionListItem) ?? []
  const totalSize = length
  if (!totalSize) return ''
  const hasNextPage = queue.data?.next != null
  return `${totalSize}${hasNextPage ? '+' : ''}`
}

export const useQueuedTxByNonce = (nonce?: number) => {
  return useAppSelector((state) => selectQueuedTransactionsByNonce(state, nonce))
}

export default useTxQueue
