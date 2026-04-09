import type { ParsedExecutionLog, TxHistory } from './types'
import type { SafeTransactionData } from '@safe-global/safe-core-sdk-types'
import type { Result } from 'ethers/lib/utils'
import { buildMultisigTxId } from '@/utils/tx-id'

const parseDecodedTxData = (decodedTxData: Result, nonce: number): SafeTransactionData => {
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

const sortParsedLogs = (logs: ParsedExecutionLog[]): ParsedExecutionLog[] => {
  return [...logs].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber - b.blockNumber
    }
    return a.logIndex - b.logIndex
  })
}

const sortHistoryItemsByExecutionDesc = (
  a: {
    txId: string
    blockNumber?: number
    logIndex?: number
    timestamp: number
  },
  b: {
    txId: string
    blockNumber?: number
    logIndex?: number
    timestamp: number
  },
): number => {
  const blockDiff = (b.blockNumber ?? 0) - (a.blockNumber ?? 0)
  if (blockDiff !== 0) {
    return blockDiff
  }

  const logDiff = (b.logIndex ?? 0) - (a.logIndex ?? 0)
  if (logDiff !== 0) {
    return logDiff
  }

  const timestampDiff = (b.timestamp ?? 0) - (a.timestamp ?? 0)
  if (timestampDiff !== 0) {
    return timestampDiff
  }

  return b.txId.localeCompare(a.txId)
}

const deriveNoncesFromExecutionOrder = (history: TxHistory, safeNonce: number): TxHistory => {
  if (!Number.isFinite(safeNonce) || safeNonce < 0) {
    return history
  }

  const orderedItems = Object.values(history).sort(sortHistoryItemsByExecutionDesc)
  if (!orderedItems.length) {
    return history
  }

  const lastExecutedNonce = safeNonce - 1
  const nextHistory: TxHistory = {
    ...history,
  }

  orderedItems.forEach((item, index) => {
    const derivedNonce = lastExecutedNonce - index
    if (derivedNonce < 0) {
      return
    }

    nextHistory[item.txId] = {
      ...item,
      nonce: derivedNonce,
      decodedTxData: item.decodedTxData
        ? {
            ...item.decodedTxData,
            nonce: derivedNonce,
          }
        : item.decodedTxData,
    }
  })

  return nextHistory
}

export const mergeParsedLogsIntoHistory = (
  safeAddress: string,
  safeNonce: number,
  currentHistory: TxHistory,
  logs: ParsedExecutionLog[],
): TxHistory => {
  const orderedLogs = sortParsedLogs(logs)
  const nextHistory: TxHistory = {
    ...currentHistory,
  }

  orderedLogs.forEach((log) => {
    const txId = buildMultisigTxId(safeAddress, log.safeTxHash)
    const existingItem = nextHistory[txId]
    const existingNonce = existingItem?.nonce ?? existingItem?.decodedTxData?.nonce ?? 0

    nextHistory[txId] = {
      txId,
      txHash: log.txHash || existingItem?.txHash || '',
      safeTxHash: log.safeTxHash,
      timestamp: log.timestamp > 0 ? log.timestamp : existingItem?.timestamp ?? 0,
      executor: log.executor || existingItem?.executor || '',
      nonce: existingItem?.nonce,
      blockNumber: log.blockNumber ?? existingItem?.blockNumber,
      logIndex: log.logIndex ?? existingItem?.logIndex,
      decodedTxData: log.decodedTxData
        ? parseDecodedTxData(log.decodedTxData, existingNonce)
        : existingItem?.decodedTxData,
    }
  })

  return deriveNoncesFromExecutionOrder(nextHistory, safeNonce)
}

export const getTxHistoryForSafe = (
  history: TxHistory | undefined,
  safeAddress: string | undefined,
): TxHistory | undefined => {
  if (!history || !safeAddress) {
    return
  }

  const txIdPrefix = `multisig_${safeAddress.toLowerCase()}_`
  const scopedHistory = Object.entries(history).reduce<TxHistory>((acc, [txId, item]) => {
    if (item?.txId?.toLowerCase().startsWith(txIdPrefix)) {
      acc[txId] = item
    }
    return acc
  }, {})

  return Object.keys(scopedHistory).length ? scopedHistory : undefined
}
