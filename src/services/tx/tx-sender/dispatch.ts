import type { SafeInfo, TransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import type { SafeTransaction, TransactionOptions, TransactionResult } from '@safe-global/safe-core-sdk-types'
import type { EthersError } from '@/utils/ethers-utils'
import { didReprice, didRevert } from '@/utils/ethers-utils'
import type MultiSendCallOnlyEthersContract from '@safe-global/safe-ethers-lib/dist/src/contracts/MultiSendCallOnly/MultiSendCallOnlyEthersContract'
import { type SpendingLimitTxParams } from '@/components/tx-flow/flows/TokenTransfer/ReviewSpendingLimitTx'
import { getSpendingLimitContract } from '@/services/contracts/spendingLimitContracts'
import type { ContractTransaction, PayableOverrides } from 'ethers'
import type { RequestId } from '@safe-global/safe-apps-sdk'
import { txDispatch, TxEvent } from '../txEvents'
import { getSafeSDKWithSigner, getUncheckedSafeSDK, assertWalletChain, tryOffChainTxSigning } from './sdk'
import { createWeb3 } from '@/hooks/wallets/web3'
import { type OnboardAPI } from '@web3-onboard/core'
import { asError } from '@/services/exceptions/utils'

/**
 * Sign a transaction
 */
export const dispatchTxSigning = async (
  safeTx: SafeTransaction,
  safeVersion: SafeInfo['version'],
  onboard: OnboardAPI,
  chainId: SafeInfo['chainId'],
  txId?: string,
): Promise<SafeTransaction> => {
  const sdk = await getSafeSDKWithSigner(onboard, chainId)

  let signedTx: SafeTransaction | undefined
  try {
    signedTx = await tryOffChainTxSigning(safeTx, safeVersion, sdk)
  } catch (error) {
    txDispatch(TxEvent.SIGN_FAILED, {
      txId,
      error: asError(error),
    })
    throw error
  }

  txDispatch(TxEvent.SIGNED, { txId })

  return signedTx
}

/**
 * On-Chain sign a transaction
 */
export const dispatchOnChainSigning = async (
  safeTx: SafeTransaction,
  txId: string,
  onboard: OnboardAPI,
  chainId: SafeInfo['chainId'],
) => {
  const sdkUnchecked = await getUncheckedSafeSDK(onboard, chainId)
  const safeTxHash = await sdkUnchecked.getTransactionHash(safeTx)
  const eventParams = { txId }

  try {
    // With the unchecked signer, the contract call resolves once the tx
    // has been submitted in the wallet not when it has been executed
    await sdkUnchecked.approveTransactionHash(safeTxHash)
    txDispatch(TxEvent.ONCHAIN_SIGNATURE_REQUESTED, eventParams)
  } catch (err) {
    txDispatch(TxEvent.FAILED, { ...eventParams, error: asError(err) })
    throw err
  }

  txDispatch(TxEvent.ONCHAIN_SIGNATURE_SUCCESS, eventParams)

  // Until the on-chain signature is/has been executed, the safeTx is not
  // signed so we don't return it
}

/**
 * Execute a transaction
 */
export const dispatchTxExecution = async (
  safeTx: SafeTransaction,
  txOptions: TransactionOptions,
  txId: string,
  onboard: OnboardAPI,
  chainId: SafeInfo['chainId'],
  safeAddress: string,
): Promise<string> => {
  const sdkUnchecked = await getUncheckedSafeSDK(onboard, chainId)
  const eventParams = { txId }

  // Execute the tx
  let result: TransactionResult | undefined
  try {
    result = await sdkUnchecked.executeTransaction(safeTx, txOptions)
    txDispatch(TxEvent.EXECUTING, eventParams)
  } catch (error) {
    txDispatch(TxEvent.FAILED, { ...eventParams, error: asError(error) })
    throw error
  }

  txDispatch(TxEvent.PROCESSING, { ...eventParams, txHash: result.hash })

  // Asynchronously watch the tx to be mined/validated
  result.transactionResponse
    ?.wait()
    .then((receipt) => {
      if (didRevert(receipt)) {
        txDispatch(TxEvent.REVERTED, { ...eventParams, error: new Error('Transaction reverted by EVM') })
      } else {
        txDispatch(TxEvent.PROCESSED, { ...eventParams, safeAddress })
      }
    })
    .catch((err) => {
      const error = err as EthersError

      if (didReprice(error)) {
        txDispatch(TxEvent.PROCESSED, { ...eventParams, safeAddress })
      } else {
        txDispatch(TxEvent.FAILED, { ...eventParams, error: asError(error) })
      }
    })

  return result.hash
}

export const dispatchBatchExecution = async (
  txs: TransactionDetails[],
  multiSendContract: MultiSendCallOnlyEthersContract,
  multiSendTxData: string,
  onboard: OnboardAPI,
  chainId: SafeInfo['chainId'],
  safeAddress: string,
  overrides?: PayableOverrides,
) => {
  const groupKey = multiSendTxData

  let result: TransactionResult | undefined

  try {
    const wallet = await assertWalletChain(onboard, chainId)

    const provider = createWeb3(wallet.provider)
    result = await multiSendContract.contract.connect(provider.getSigner()).multiSend(multiSendTxData, overrides)

    txs.forEach(({ txId }) => {
      txDispatch(TxEvent.EXECUTING, { txId, groupKey })
    })
  } catch (err) {
    txs.forEach(({ txId }) => {
      txDispatch(TxEvent.FAILED, { txId, error: asError(err), groupKey })
    })
    throw err
  }

  txs.forEach(({ txId }) => {
    txDispatch(TxEvent.PROCESSING, { txId, txHash: result!.hash, groupKey })
  })

  result!.transactionResponse
    ?.wait()
    .then((receipt) => {
      if (didRevert(receipt)) {
        txs.forEach(({ txId }) => {
          txDispatch(TxEvent.REVERTED, {
            txId,
            error: new Error('Transaction reverted by EVM'),
            groupKey,
          })
        })
      } else {
        txs.forEach(({ txId }) => {
          txDispatch(TxEvent.PROCESSED, {
            txId,
            groupKey,
            safeAddress,
          })
        })
      }
    })
    .catch((err) => {
      const error = err as EthersError

      if (didReprice(error)) {
        txs.forEach(({ txId }) => {
          txDispatch(TxEvent.PROCESSED, {
            txId,
            safeAddress,
          })
        })
      } else {
        txs.forEach(({ txId }) => {
          txDispatch(TxEvent.FAILED, {
            txId,
            error: asError(err),
            groupKey,
          })
        })
      }
    })

  return result!.hash
}

export const dispatchSpendingLimitTxExecution = async (
  txParams: SpendingLimitTxParams,
  txOptions: TransactionOptions,
  onboard: OnboardAPI,
  chainId: SafeInfo['chainId'],
  safeAddress: string,
) => {
  const id = JSON.stringify(txParams)

  let result: ContractTransaction | undefined
  try {
    const wallet = await assertWalletChain(onboard, chainId)
    const provider = createWeb3(wallet.provider)
    const contract = getSpendingLimitContract(chainId, provider.getSigner())

    result = await contract.executeAllowanceTransfer(
      txParams.safeAddress,
      txParams.token,
      txParams.to,
      txParams.amount,
      txParams.paymentToken,
      txParams.payment,
      txParams.delegate,
      txParams.signature,
      txOptions,
    )
    txDispatch(TxEvent.EXECUTING, { groupKey: id })
  } catch (error) {
    txDispatch(TxEvent.FAILED, { groupKey: id, error: asError(error) })
    throw error
  }

  txDispatch(TxEvent.PROCESSING_MODULE, {
    groupKey: id,
    txHash: result.hash,
  })

  result
    ?.wait()
    .then((receipt) => {
      if (didRevert(receipt)) {
        txDispatch(TxEvent.REVERTED, {
          groupKey: id,
          error: new Error('Transaction reverted by EVM'),
        })
      } else {
        txDispatch(TxEvent.PROCESSED, { groupKey: id, safeAddress })
      }
    })
    .catch((error) => {
      txDispatch(TxEvent.FAILED, { groupKey: id, error: asError(error) })
    })

  return result?.hash
}

export const dispatchSafeAppsTx = async (
  safeTx: SafeTransaction,
  safeAppRequestId: RequestId,
  onboard: OnboardAPI,
  chainId: SafeInfo['chainId'],
  txId?: string,
): Promise<string> => {
  const sdk = await getSafeSDKWithSigner(onboard, chainId)
  const safeTxHash = await sdk.getTransactionHash(safeTx)
  txDispatch(TxEvent.SAFE_APPS_REQUEST, { safeAppRequestId, safeTxHash, txId })
  return safeTxHash
}
