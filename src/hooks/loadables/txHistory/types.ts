import type { SafeTransactionData } from '@safe-global/safe-core-sdk-types'
import type { Result } from 'ethers/lib/utils'

export type ParsedExecutionLog = {
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
  nonce?: number
  blockNumber?: number
  logIndex?: number
  decodedTxData?: SafeTransactionData
}

export type TxHistory = Record<string, TxHistoryItem>
