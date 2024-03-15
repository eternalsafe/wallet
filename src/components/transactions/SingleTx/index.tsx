import ErrorMessage from '@/components/tx/ErrorMessage'
import { useRouter } from 'next/router'
import useSafeInfo from '@/hooks/useSafeInfo'
import useAsync from '@/hooks/useAsync'
import type { Label, Transaction, TransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { LabelValue } from '@safe-global/safe-gateway-typescript-sdk'
import { getTransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { sameAddress } from '@/utils/addresses'
import { ReactElement, useEffect, useState } from 'react'
import { makeTxFromDetails } from '@/utils/transactions'
import { TxListGrid } from '@/components/transactions/TxList'
import ExpandableTransactionItem, {
  TransactionSkeleton,
} from '@/components/transactions/TxListItem/ExpandableTransactionItem'
import GroupLabel from '../GroupLabel'
import { isMultisigDetailedExecutionInfo } from '@/utils/transaction-guards'
import { useAppSelector } from '@/store'
import { selectAddedTx } from '@/store/addedTxsSlice'
import { extractTxDetails } from '@/services/tx/extractTxInfo'

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
  const { safe, safeAddress } = useSafeInfo()
  const transaction = useAppSelector((state) => selectAddedTx(state, safe.chainId, safeAddress, transactionKey ?? ''))

  const [txDetails, setTxDetails] = useState<TransactionDetails | undefined>(undefined)
  const [txDetailsError, setTxDetailsError] = useState<Error | undefined>(undefined)

  useEffect(() => {
    if (!transaction || !safeAddress) return
    extractTxDetails(safeAddress, transaction, transactionId).then(setTxDetails).catch(setTxDetailsError)
  }, [transaction, safe.chainId, safeAddress])

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
