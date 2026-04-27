import type { SafeTransactionData } from '@safe-global/safe-core-sdk-types'

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

export const isTxHistoryItem = (value: unknown): value is TxHistoryItem => {
  const item = value as Partial<TxHistoryItem> | null

  return (
    !!item &&
    typeof item.txId === 'string' &&
    typeof item.txHash === 'string' &&
    typeof item.safeTxHash === 'string' &&
    typeof item.timestamp === 'number' &&
    typeof item.executor === 'string'
  )
}
