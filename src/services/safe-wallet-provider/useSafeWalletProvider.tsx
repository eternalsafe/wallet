import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'

import type { WalletSDK } from '.'
import { SafeWalletProvider } from '.'
import useSafeInfo from '@/hooks/useSafeInfo'
import { TxModalContext } from '@/components/tx-flow'
import { TxEvent, txSubscribe } from '@/services/tx/txEvents'
import type { SafeSettings } from '@safe-global/safe-apps-sdk'
import { useWeb3ReadOnly } from '@/hooks/wallets/web3'
import { getTransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { AppRoutes } from '@/config/routes'
import useChains from '@/hooks/useChains'

export const _useTxFlowApi = (chainId: string, safeAddress: string): WalletSDK | undefined => {
  const { setTxFlow } = useContext(TxModalContext)
  const web3ReadOnly = useWeb3ReadOnly()
  const router = useRouter()
  const { configs } = useChains()
  const pendingTxs = useRef<Record<string, string>>({})

  const [settings, setSettings] = useState<SafeSettings>({
    offChainSigning: true,
  })

  useEffect(() => {
    const unsubscribe = txSubscribe(TxEvent.PROCESSING, async ({ txId, txHash }) => {
      if (!txId) return
      pendingTxs.current[txId] = txHash
    })
    return unsubscribe
  }, [])

  return useMemo<WalletSDK | undefined>(() => {
    if (!chainId || !safeAddress) return

    // TODO(devanon): maybe remove this completely?

    return {
      async signMessage(message, appInfo) {
        throw Error('Not implemented')
      },

      async signTypedMessage(typedData, appInfo) {
        throw Error('Not implemented')
      },

      async send(params: { txs: any[]; params: { safeTxGas: number } }, appInfo) {
        throw Error('Not implemented')
      },

      async getBySafeTxHash(safeTxHash) {
        return getTransactionDetails(chainId, safeTxHash)
      },

      async switchChain(hexChainId, appInfo) {
        const decimalChainId = parseInt(hexChainId, 16).toString()
        if (decimalChainId === chainId) {
          return null
        }

        const cfg = configs.find((c) => c.chainId === chainId)
        if (!cfg) {
          throw new Error(`Chain ${chainId} not supported`)
        }

        if (prompt(`${appInfo.name} wants to switch to ${cfg.shortName}. Do you want to continue?`)) {
          router.push({
            pathname: AppRoutes.index,
            query: {
              chain: cfg.shortName,
            },
          })
        }

        return null
      },

      setSafeSettings(newSettings) {
        const res = {
          ...settings,
          ...newSettings,
        }

        setSettings(newSettings)

        return res
      },

      async proxy(method, params) {
        const data = await web3ReadOnly?.send(method, params)
        return data.result
      },
    }
  }, [chainId, safeAddress, settings, configs, router, web3ReadOnly])
}

const useSafeWalletProvider = (): SafeWalletProvider | undefined => {
  const { safe, safeAddress } = useSafeInfo()
  const { chainId } = safe

  const txFlowApi = _useTxFlowApi(chainId, safeAddress)

  return useMemo(() => {
    if (!safeAddress || !chainId || !txFlowApi) return

    return new SafeWalletProvider(
      {
        safeAddress,
        chainId: Number(chainId),
      },
      txFlowApi,
    )
  }, [safeAddress, chainId, txFlowApi])
}

export default useSafeWalletProvider
