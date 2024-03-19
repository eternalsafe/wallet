import type { OperationType, SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { type SafeTransactionData } from '@safe-global/safe-core-sdk-types'
import {
  type TransactionDetails,
  TransactionStatus,
  TransactionInfoType,
  DetailedExecutionInfoType,
  type SafeInfo,
} from '@safe-global/safe-gateway-typescript-sdk'
import { Operation } from '@safe-global/safe-gateway-typescript-sdk'
import { isMultisigDetailedExecutionInfo, isNativeTokenTransfer } from '@/utils/transaction-guards'
import { transactionKey } from './txMagicLink'
import { addressEx } from '@/utils/addresses'
import type { Custom, MultisigExecutionDetails, TransactionData } from '@safe-global/safe-apps-sdk'

const ZERO_ADDRESS: string = '0x0000000000000000000000000000000000000000'
const EMPTY_DATA: string = '0x'

/**
 * Convert the CGW tx type to a Safe Core SDK tx
 */
const extractTxInfo = (
  txDetails: TransactionDetails,
  safeAddress: string,
): { txParams: SafeTransactionData; signatures: Record<string, string> } => {
  // Format signatures into a map
  let signatures: Record<string, string> = {}
  if (isMultisigDetailedExecutionInfo(txDetails.detailedExecutionInfo)) {
    signatures = txDetails.detailedExecutionInfo.confirmations.reduce((result, item) => {
      result[item.signer.value] = item.signature || ''
      return result
    }, signatures)
  }

  const data = txDetails.txData?.hexData ?? EMPTY_DATA

  const baseGas = isMultisigDetailedExecutionInfo(txDetails.detailedExecutionInfo)
    ? Number(txDetails.detailedExecutionInfo.baseGas)
    : 0

  const gasPrice = isMultisigDetailedExecutionInfo(txDetails.detailedExecutionInfo)
    ? Number(txDetails.detailedExecutionInfo.gasPrice)
    : 0

  const safeTxGas = isMultisigDetailedExecutionInfo(txDetails.detailedExecutionInfo)
    ? Number(txDetails.detailedExecutionInfo.safeTxGas)
    : 0

  const gasToken = isMultisigDetailedExecutionInfo(txDetails.detailedExecutionInfo)
    ? txDetails.detailedExecutionInfo.gasToken
    : ZERO_ADDRESS

  const nonce = isMultisigDetailedExecutionInfo(txDetails.detailedExecutionInfo)
    ? txDetails.detailedExecutionInfo.nonce
    : 0

  const refundReceiver = isMultisigDetailedExecutionInfo(txDetails.detailedExecutionInfo)
    ? txDetails.detailedExecutionInfo.refundReceiver.value
    : ZERO_ADDRESS

  const value = (() => {
    switch (txDetails.txInfo.type) {
      case 'Transfer':
        if (isNativeTokenTransfer(txDetails.txInfo.transferInfo)) {
          return txDetails.txInfo.transferInfo.value
        } else {
          return txDetails.txData?.value ?? '0'
        }
      case 'Custom':
        return txDetails.txInfo.value
      case 'Creation':
      case 'SettingsChange':
      default:
        return '0'
    }
  })()

  const to = (() => {
    switch (txDetails.txInfo.type) {
      case 'Transfer':
        if (isNativeTokenTransfer(txDetails.txInfo.transferInfo)) {
          return txDetails.txInfo.recipient.value
        } else {
          return txDetails.txInfo.transferInfo.tokenAddress
        }
      case 'Custom':
        return txDetails.txInfo.to.value
      case 'Creation':
      case 'SettingsChange':
      default:
        return safeAddress
    }
  })()

  const operation = (txDetails.txData?.operation ?? Operation.CALL) as unknown as OperationType

  return {
    txParams: {
      data,
      baseGas,
      gasPrice,
      safeTxGas,
      gasToken,
      nonce,
      refundReceiver,
      value,
      to,
      operation,
    },
    signatures,
  }
}

export default extractTxInfo

/**
 * Convert the Safe Core SDK tx to a CGW tx type
 */
export const extractTxDetails = async (
  safeAddress: string,
  safeTx: SafeTransaction,
  safe: SafeInfo,
  txId?: string,
  transactionStatus?: TransactionStatus,
): Promise<TransactionDetails> => {
  const dataByteLength = safeTx.data.data ? Buffer.byteLength(safeTx.data.data) : 0
  const dataSize = dataByteLength >= 2 ? Math.floor((dataByteLength - 2) / 2) : 0

  // TODO(devanon): extract more data similar to
  // https://github.com/safe-global/safe-client-gateway/blob/5293d98286bee62f1a7d13c3a405ed8e73bcf770/src/routes/transactions/mappers/common/transaction-info.mapper.ts#L64
  const txInfo: Custom = {
    type: TransactionInfoType.CUSTOM,
    to: addressEx(safeTx.data.to),
    dataSize: dataSize.toString(),
    value: safeTx.data.value,
    isCancellation: false, // TOOD(devanon): implement this,
  }

  const operation = (safeTx.data.operation ?? Operation.CALL) as unknown as Operation

  const txData: TransactionData = {
    hexData: safeTx.data.data,
    dataDecoded: undefined, // TOOD(devanon): implement this
    to: addressEx(safeTx.data.to),
    value: safeTx.data.value,
    operation,
    addressInfoIndex: undefined, // TOOD(devanon): implement this
    trustedDelegateCallTarget: false,
  }

  const txKey = await transactionKey(safeTx)

  // TODO(devanon): support module execution details
  // TODO(devanon): compare with https://github.com/safe-global/safe-client-gateway/blob/5293d98286bee62f1a7d13c3a405ed8e73bcf770/src/routes/transactions/mappers/multisig-transactions/multisig-transaction-execution-details.mapper.ts#L26
  const detailedExecutionInfo: MultisigExecutionDetails = {
    type: DetailedExecutionInfoType.MULTISIG,
    submittedAt: 200, // TOOD(devanon): implement this
    nonce: safeTx.data.nonce,
    safeTxGas: safeTx.data.safeTxGas?.toString() ?? '0',
    baseGas: safeTx.data.baseGas?.toString() ?? '0',
    gasPrice: safeTx.data.gasPrice?.toString() ?? '0',
    gasToken: safeTx.data.gasToken,
    refundReceiver: addressEx(safeTx.data.refundReceiver),
    safeTxHash: txKey,
    executor: undefined, // TOOD(devanon): implement this
    signers: safe.owners,
    confirmationsRequired: safe.threshold,
    confirmations: Array.from(safeTx.signatures.values()).map((signature) => ({
      signer: addressEx(signature.signer),
      signature: signature.data,
      submittedAt: 0, // TOOD(devanon): implement this
    })),
    rejectors: undefined, // TOOD(devanon): implement this
    gasTokenInfo: undefined, // TOOD(devanon): implement this
    trusted: true,
  }

  const proposedTxId = txId ?? `multisig_${safeAddress}_${txKey}`

  return {
    safeAddress,
    txId: proposedTxId,
    txStatus: transactionStatus ?? TransactionStatus.AWAITING_CONFIRMATIONS,
    txInfo,
    executedAt: undefined, // TOOD(devanon): implement this
    txData,
    detailedExecutionInfo,
  }
}
