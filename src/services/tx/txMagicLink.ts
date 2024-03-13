import { type SafeTransactionData } from '@safe-global/safe-core-sdk-types'
import { keccak256 } from 'ethers/lib/utils'
import { encodeURI, decode } from 'js-base64'

export type TransactionMagicLink = { txParams: SafeTransactionData; signatures: Record<string, string> }

export const encodeTransactionMagicLink = (tx: TransactionMagicLink): string => {
  return encodeURI(JSON.stringify(tx))
}

export const decodeTransactionMagicLink = (link: string): TransactionMagicLink | undefined => {
  try {
    return JSON.parse(decode(link))
  } catch (e) {
    console.error(e)
  }
}

export const transactionKey = (tx: TransactionMagicLink): string => {
  return keccak256(
    new TextEncoder().encode(
      tx.txParams.to +
        tx.txParams.value +
        tx.txParams.data +
        tx.txParams.operation +
        tx.txParams.nonce +
        tx.txParams.safeTxGas +
        tx.txParams.baseGas +
        tx.txParams.gasPrice +
        tx.txParams.gasToken +
        tx.txParams.refundReceiver,
    ),
  )
}
