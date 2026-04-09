import { useEffect } from 'react'
import useAsync, { type AsyncResult } from '../useAsync'
import { Errors, logError } from '@/services/exceptions'
import useSafeInfo from '../useSafeInfo'
import { useAppSelector } from '@/store'
import { type DetailedTransaction, isDetailedTransactionListItem } from '@/utils/transaction-guards'
import { selectAddedTxs } from '@/store/addedTxsSlice'
import { extractTxDetails } from '@/services/tx/extractTxInfo'
import { isEqual } from 'lodash'
import { makeTxFromDetails } from '@/utils/transactions'
import { selectTxHistory } from '@/store/txHistorySlice'

export const useLoadTxQueue = (): AsyncResult<Array<DetailedTransaction>> => {
  const { safe, safeAddress } = useSafeInfo()
  const { chainId } = safe

  const transactions = useAppSelector((state) => selectAddedTxs(state, chainId, safeAddress), isEqual)
  const { data: executedTransactions, loading: executedTransactionsLoading } = useAppSelector(
    (state) => selectTxHistory(state),
    isEqual,
  )

  const [data, error, loading] = useAsync<Array<DetailedTransaction> | undefined>(
    async () => {
      if (!transactions || !executedTransactions || !safeAddress || !safe) {
        return
      }

      const results = await Promise.all(
        Object.values(transactions)
          .filter((tx) => tx.data.nonce >= safe.nonce)
          .map(async (tx) => {
            const details = await extractTxDetails(safeAddress, tx, safe)

            const executedTransaction = executedTransactions[details.txId]
            if (executedTransaction) return

            const transaction = makeTxFromDetails(details)

            return {
              ...transaction,
              details,
            }
          }),
      )

      return results.filter(isDetailedTransactionListItem).sort((a, b) => {
        return a.details.detailedExecutionInfo.nonce - b.details.detailedExecutionInfo.nonce
      })
    },
    [safe, safeAddress, transactions, executedTransactions],
    false,
  )

  useEffect(() => {
    if (error) {
      logError(Errors._603, error.message)
    }
  }, [error])

  return [data, error, loading || (executedTransactionsLoading && !executedTransactions)]
}

export default useLoadTxQueue
