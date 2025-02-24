import extractTxInfo from '@/services/tx/extractTxInfo'
import type { TransactionDetails } from '@/utils/transaction-guards'
import type { SafeTransaction } from '@safe-global/safe-core-sdk-types'
import EthSafeTransaction from '@safe-global/protocol-kit/dist/src/utils/transactions/SafeTransaction'
import { EthSafeSignature } from '@safe-global/protocol-kit'
import { useEffect, useState } from 'react'

export const useSafeTransactionFromDetails = (
  txDetails: TransactionDetails | undefined,
): SafeTransaction | undefined => {
  const [safeTx, setSafeTx] = useState<SafeTransaction | undefined>()

  useEffect(() => {
    if (txDetails) {
      const { txParams, signatures } = extractTxInfo(txDetails, txDetails.safeAddress)

      const safeTx = new EthSafeTransaction(txParams)
      Object.entries(signatures).forEach(([signer, data]) => {
        safeTx.addSignature(new EthSafeSignature(signer, data))
      })

      setSafeTx(safeTx)
    }
  }, [txDetails])

  return safeTx
}
