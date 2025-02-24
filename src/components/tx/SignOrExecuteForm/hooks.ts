import { useMemo } from 'react'
import { type TransactionOptions, type SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { sameString } from '@safe-global/protocol-kit/dist/src/utils'
import useSafeInfo from '@/hooks/useSafeInfo'
import useWallet from '@/hooks/wallets/useWallet'
import useOnboard from '@/hooks/wallets/useOnboard'
import { isSmartContractWallet } from '@/utils/wallets'
import { dispatchOnChainSigning, dispatchTxExecution, dispatchTxSigning } from '@/services/tx/tx-sender'
import { useHasPendingTxs } from '@/hooks/usePendingTxs'
import type { ConnectedWallet } from '@/hooks/wallets/useOnboard'
import type { OnboardAPI } from '@web3-onboard/core'
import { getSafeTxGas } from '@/services/tx/tx-sender/recommendedNonce'
import useAsync from '@/hooks/useAsync'
import { type TransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { useAddOrUpdateTx } from '@/hooks/useMagicLink'
import { txDispatch, TxEvent } from '@/services/tx/txEvents'
import { extractTxDetails } from '@/services/tx/extractTxInfo'
import { useSafeSDK } from '@/hooks/coreSDK/safeCoreSDK'
import useTxQueue from '@/hooks/useTxQueue'

type TxActions = {
  signTx: (safeTx?: SafeTransaction, txId?: string, origin?: string) => Promise<string>
  executeTx: (
    txOptions: TransactionOptions,
    safeTx?: SafeTransaction,
    txId?: string,
    origin?: string,
  ) => Promise<string>
}

function assertTx(safeTx: SafeTransaction | undefined): asserts safeTx {
  if (!safeTx) throw new Error('Transaction not provided')
}
function assertWallet(wallet: ConnectedWallet | null): asserts wallet {
  if (!wallet) throw new Error('Wallet not connected')
}
function assertOnboard(onboard: OnboardAPI | undefined): asserts onboard {
  if (!onboard) throw new Error('Onboard not connected')
}

export const useTxActions = (): TxActions => {
  const { safe } = useSafeInfo()
  const onboard = useOnboard()
  const wallet = useWallet()
  const addOrUpdateTx = useAddOrUpdateTx()

  return useMemo<TxActions>(() => {
    const safeAddress = safe.address.value
    const { chainId, version } = safe

    /**
     * Propose a transaction
     * If txId is passed, it's an existing tx being signed
     */
    const proposeTx = async (sender: string, safeTx: SafeTransaction, txId?: string): Promise<TransactionDetails> => {
      const txKey = await addOrUpdateTx(safeTx)
      if (!txKey) throw new Error('Failed to propose tx')

      const proposedTxId = `multisig_${safe.address.value}_${txKey}`

      // Dispatch a success event only if the tx is signed
      // Unsigned txs are proposed only temporarily and won't appear in the queue
      if (safeTx.signatures.size > 0) {
        txDispatch(txId ? TxEvent.SIGNATURE_PROPOSED : TxEvent.PROPOSED, {
          txId: proposedTxId,
          signerAddress: txId ? sender : undefined,
        })
      }

      return await extractTxDetails(safeAddress, safeTx, safe, proposedTxId)
    }

    const signTx: TxActions['signTx'] = async (safeTx, txId) => {
      assertTx(safeTx)
      assertWallet(wallet)
      assertOnboard(onboard)

      // Smart contract wallets must sign via an on-chain tx
      if (await isSmartContractWallet(wallet.chainId, wallet.address)) {
        // If the first signature is a smart contract wallet, we have to propose w/o signatures
        // Otherwise the backend won't pick up the tx
        // The signature will be added once the on-chain signature is indexed
        const id = txId || (await proposeTx(wallet.address, safeTx, txId)).txId
        await dispatchOnChainSigning(safeTx, id, onboard, chainId)
        return id
      }

      // Otherwise, sign off-chain
      const signedTx = await dispatchTxSigning(safeTx, version, onboard, chainId, txId)
      const tx = await proposeTx(wallet.address, signedTx, txId)
      return tx.txId
    }

    const executeTx: TxActions['executeTx'] = async (txOptions, safeTx, txId) => {
      assertTx(safeTx)
      assertWallet(wallet)
      assertOnboard(onboard)

      let tx: TransactionDetails | undefined

      // Propose the tx if there's no id yet ("immediate execution")
      if (!txId) {
        tx = await proposeTx(wallet.address, safeTx, txId)
        txId = tx.txId
      }

      // Execute the tx via connected wallet
      await dispatchTxExecution(safeTx, txOptions, txId, onboard, chainId, safeAddress)

      return txId
    }

    return { signTx, executeTx }
  }, [safe, onboard, wallet, addOrUpdateTx])
}

export const useValidateNonce = (safeTx: SafeTransaction | undefined): boolean => {
  const { safe } = useSafeInfo()
  return !!safeTx && safeTx?.data.nonce === safe.nonce
}

export const useImmediatelyExecutable = (): boolean => {
  const { safe } = useSafeInfo()
  const hasPending = useHasPendingTxs()
  return safe.threshold === 1 && !hasPending
}

// Check if the executor is the safe itself (it won't work)
export const useIsExecutionLoop = (): boolean => {
  const wallet = useWallet()
  const { safeAddress } = useSafeInfo()
  return wallet ? sameString(wallet.address, safeAddress) : false
}

export const useRecommendedNonce = (): number | undefined => {
  const sdk = useSafeSDK()
  const { data } = useTxQueue()

  const lastNonce = useMemo(() => {
    return data.length > 0 ? data[data.length - 1].details.detailedExecutionInfo.nonce : undefined
  }, [data])

  const [recommendedNonce] = useAsync(
    async () => {
      if (!sdk) return

      let recommendedNonce = await sdk.getNonce()

      if (lastNonce === undefined) return recommendedNonce

      if (recommendedNonce > lastNonce) return recommendedNonce

      return lastNonce + 1
    },
    [sdk, lastNonce],
    false, // keep old recommended nonce while refreshing to avoid skeleton
  )

  return recommendedNonce
}

export const useSafeTxGas = (safeTx: SafeTransaction | undefined): string | undefined => {
  const { safeAddress, safe } = useSafeInfo()

  // Memoize only the necessary params so that the useAsync hook is not called every time safeTx changes
  const safeTxParams = useMemo(() => {
    return !safeTx?.data?.to
      ? undefined
      : {
          to: safeTx?.data.to,
          value: safeTx?.data?.value,
          data: safeTx?.data?.data,
          operation: safeTx?.data?.operation,
        }
  }, [safeTx?.data.to, safeTx?.data.value, safeTx?.data.data, safeTx?.data.operation])

  const [safeTxGas] = useAsync(() => {
    if (!safe.chainId || !safeAddress || !safeTxParams || !safe.version) return

    return getSafeTxGas(safe.chainId, safeAddress, safe.version, safeTxParams)
  }, [safeAddress, safe.chainId, safe.version, safeTxParams])

  return safeTxGas
}

export const useAlreadySigned = (safeTx: SafeTransaction | undefined): boolean => {
  const wallet = useWallet()
  const hasSigned =
    safeTx && wallet && (safeTx.signatures.has(wallet.address.toLowerCase()) || safeTx.signatures.has(wallet.address))
  return Boolean(hasSigned)
}
