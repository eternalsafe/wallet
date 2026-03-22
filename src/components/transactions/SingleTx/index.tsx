import ErrorMessage from '@/components/tx/ErrorMessage'
import { useRouter } from 'next/router'
import useSafeInfo from '@/hooks/useSafeInfo'
import type { Label, Transaction } from '@safe-global/safe-gateway-typescript-sdk'
import { LabelValue } from '@safe-global/safe-gateway-typescript-sdk'
import { type ReactElement, useEffect, useState } from 'react'
import { enrichTransactionDetailsFromHistory, makeTxFromDetails } from '@/utils/transactions'
import { TxListGrid } from '@/components/transactions/TxList'
import ExpandableTransactionItem, {
  TransactionSkeleton,
} from '@/components/transactions/TxListItem/ExpandableTransactionItem'
import GroupLabel from '../GroupLabel'
import { isMultisigDetailedExecutionInfo, type TransactionDetails } from '@/utils/transaction-guards'
import { useAppSelector } from '@/store'
import { selectAddedTx } from '@/store/addedTxsSlice'
import { extractTxDetails } from '@/services/tx/extractTxInfo'
import { useTransactionMagicLink } from '@/hooks/useMagicLink'
import { selectTxFromHistory } from '@/store/txHistorySlice'

const SingleTxGrid = ({ txDetails }: { txDetails: TransactionDetails }): ReactElement => {
  const tx: Transaction = makeTxFromDetails(txDetails)

  // Show a label for the transaction if it's a queued transaction
  const { safe } = useSafeInfo()
  const nonce = isMultisigDetailedExecutionInfo(txDetails?.detailedExecutionInfo)
    ? txDetails?.detailedExecutionInfo.nonce
    : -1
  const label = nonce === safe.nonce ? LabelValue.Next : nonce > safe.nonce ? LabelValue.Queued : undefined

  return (
    <TxListGrid>
      {label ? <GroupLabel item={{ label } as Label} /> : null}

      <ExpandableTransactionItem item={tx} txDetails={txDetails} />
    </TxListGrid>
  )
}

const SingleTx = () => {
  const router = useRouter()
  const { id } = router.query
  const transactionId = Array.isArray(id) ? id[0] : id
  const transactionKey = transactionId ? transactionId.split('_')[2] : undefined
  const { txKey } = useTransactionMagicLink()

  const { safe, safeAddress } = useSafeInfo()
  const transaction = useAppSelector((state) => selectAddedTx(state, safe.chainId, safeAddress, transactionKey ?? ''))
  const executedTx = useAppSelector((state) => selectTxFromHistory(state, transactionId))

  const [txDetails, setTxDetails] = useState<TransactionDetails | undefined>(undefined)
  const [txDetailsError, setTxDetailsError] = useState<Error | undefined>(undefined)

  useEffect(() => {
    if (!safeAddress || !transaction || !transactionId) return

    extractTxDetails(safeAddress, transaction, safe, transactionId)
      .then((details) => {
        if (executedTx) {
          enrichTransactionDetailsFromHistory(details, executedTx)
        }
        return details
      })
      .then(setTxDetails)
      .catch(setTxDetailsError)
  }, [safeAddress, transaction, safe, transactionId, executedTx])

  useEffect(() => {
    if (txKey && safeAddress && router) {
      let query = { ...router.query }
      query.id = `multisig_${safeAddress}_${txKey}`
      delete query.tx
      router.push({ query })
    }
  }, [txKey, safeAddress, router])

  if (txDetailsError) {
    return <ErrorMessage error={txDetailsError}>Failed to load transaction</ErrorMessage>
  }

  if (txDetails) {
    return <SingleTxGrid txDetails={txDetails} />
  }

  // Loading skeleton
  return <TransactionSkeleton />
}

export default SingleTx
