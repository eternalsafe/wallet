import type { OperationType, SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { type SafeTransactionData } from '@safe-global/safe-core-sdk-types'
import {
  TransactionStatus,
  TransactionInfoType,
  DetailedExecutionInfoType,
  type SafeInfo,
} from '@safe-global/safe-gateway-typescript-sdk'
import { Operation } from '@safe-global/safe-gateway-typescript-sdk'
import {
  isMultisigDetailedExecutionInfo,
  isNativeTokenTransfer,
  type TransactionDetails,
} from '@/utils/transaction-guards'
import { transactionKey } from './txMagicLink'
import { addressEx } from '@/utils/addresses'
import type { Custom, MultisigExecutionDetails, TransactionData } from '@safe-global/safe-apps-sdk'
import { ethers } from 'ethers'
import { EternalSafeTransaction } from '@/store/addedTxsSlice'

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
    ? txDetails.detailedExecutionInfo.baseGas
    : '0'

  const gasPrice = isMultisigDetailedExecutionInfo(txDetails.detailedExecutionInfo)
    ? txDetails.detailedExecutionInfo.gasPrice
    : '0'

  const safeTxGas = isMultisigDetailedExecutionInfo(txDetails.detailedExecutionInfo)
    ? txDetails.detailedExecutionInfo.safeTxGas
    : '0'

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
  safeTx: EternalSafeTransaction | SafeTransaction,
  safe: SafeInfo,
  txId?: string,
): Promise<TransactionDetails> => {
  const dataByteLength = safeTx.data.data ? Buffer.byteLength(safeTx.data.data) : 0
  const dataSize = dataByteLength >= 2 ? Math.floor((dataByteLength - 2) / 2) : 0

  const txInfo: Custom = {
    type: TransactionInfoType.CUSTOM,
    to: addressEx(safeTx.data.to),
    dataSize: dataSize.toString(),
    value: safeTx.data.value,
    isCancellation: isCancellation(safeAddress, safeTx.data, dataSize),
  }

  const operation = (safeTx.data.operation ?? Operation.CALL) as unknown as Operation

  const txData: TransactionData = {
    hexData: safeTx.data.data,
    // Need to use some transaction decoder to get the decoded data
    // e.g. tenderly, openchain, etc.
    dataDecoded: undefined,
    to: addressEx(safeTx.data.to),
    value: safeTx.data.value,
    operation,
    addressInfoIndex: undefined,
    trustedDelegateCallTarget: false,
  }

  const txKey = await transactionKey(safeTx)

  const detailedExecutionInfo: MultisigExecutionDetails = {
    type: DetailedExecutionInfoType.MULTISIG,
    submittedAt: safeTx instanceof EternalSafeTransaction ? safeTx.timestamp : Date.now(),
    nonce: safeTx.data.nonce,
    safeTxGas: safeTx.data.safeTxGas?.toString() ?? '0',
    baseGas: safeTx.data.baseGas?.toString() ?? '0',
    gasPrice: safeTx.data.gasPrice?.toString() ?? '0',
    gasToken: safeTx.data.gasToken,
    refundReceiver: addressEx(safeTx.data.refundReceiver),
    safeTxHash: txKey,
    executor: undefined, // modified in `enrichTransactionDetailsFromHistory`
    signers: safe.owners,
    confirmationsRequired: safe.threshold,
    confirmations: Array.from(safeTx.signatures.values()).map((signature) => ({
      signer: addressEx(signature.signer),
      signature: signature.data,
      submittedAt: 0, // TOOD(devanon): implement this
    })),
    rejectors: undefined, // TOOD(devanon): implement this
    gasTokenInfo: undefined,
    trusted: true,
  }

  const proposedTxId = txId ?? `multisig_${safeAddress}_${txKey}`

  // modified in `enrichTransactionDetailsFromHistory`
  const txStatus =
    detailedExecutionInfo.confirmations.length >= safe.threshold
      ? TransactionStatus.AWAITING_EXECUTION
      : TransactionStatus.AWAITING_CONFIRMATIONS

  return {
    safeAddress,
    txId: proposedTxId,
    txStatus,
    txInfo,
    txData,
    detailedExecutionInfo,
    executedAt: undefined, // modified in `enrichTransactionDetailsFromHistory`
    txHash: undefined, // modified in `enrichTransactionDetailsFromHistory`
  }
}

function isCancellation(safe: string, transactionData: SafeTransactionData, dataSize: number): boolean {
  const { to, value, baseGas, gasPrice, gasToken, operation, refundReceiver, safeTxGas } = transactionData

  return (
    to === safe &&
    dataSize === 0 &&
    (!value || Number(value) === 0) &&
    operation === 0 &&
    (!baseGas || baseGas === '0') &&
    (!gasPrice || gasPrice === '0') &&
    (!gasToken || gasToken === ethers.constants.AddressZero) &&
    (!refundReceiver || refundReceiver === ethers.constants.AddressZero) &&
    (!safeTxGas || safeTxGas === '0')
  )
}
