import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppDispatch } from '@/store'
import { setRpc } from '@/store/settingsSlice'
import { upsertChain, type ChainInfo } from '@/store/customChainsSlice'
import { type RPC_AUTHENTICATION } from '@safe-global/safe-gateway-typescript-sdk'
import useChains from './useChains'
import { showNotification } from '@/store/notificationsSlice'
import { useRouter } from 'next/router'
import { useConfirmationDialog } from '@/components/common/ConfirmationDialog'
import {
  clearMagicNetworkParams,
  decodeSearchParamValue,
  getMagicNetworkValidationError,
  hasRequiredMagicNetworkParams,
  parseMagicNetworkParams,
} from './useMagicNetwork.utils'

export { decodeSearchParamValue }

export const useMagicNetwork = (): void => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const supportedChains = useChains()
  const { confirm } = useConfirmationDialog()

  useEffect(() => {
    const run = async () => {
      const params = parseMagicNetworkParams(searchParams)

      // Return if no RPC param, chainId or chainName
      if (!hasRequiredMagicNetworkParams(params)) return

      const existingChain = supportedChains.configs.find((chain) => chain.chainId === params.chainIdParam)
      const validationError = getMagicNetworkValidationError(params, existingChain, supportedChains.configs)

      if (validationError) {
        dispatch(showNotification(validationError))
        clearMagicNetworkParams(router)
        return
      }

      const isConfirmed = await confirm({
        title: 'Apply network configuration',
        message: `Apply network configuration for "${existingChain?.chainName || params.chainName}" (chainId ${
          params.chainIdParam
        })?`,
        confirmText: 'Apply',
      })

      if (!isConfirmed) {
        dispatch(
          showNotification({
            message: 'Custom network changes canceled.',
            groupKey: 'magic-network-canceled',
            variant: 'warning',
          }),
        )
        clearMagicNetworkParams(router)
        return
      }

      const targetShortName = existingChain?.shortName || params.shortName

      if (!existingChain) {
        // Create a new chain configuration
        const newChain = {
          custom: true,
          chainId: params.chainIdParam,
          chainName: params.chainName,
          shortName: params.shortName,
          description: '',
          chainLogoUri: params.currencyLogo || null,
          l2: params.l2 === 'true',
          isTestnet: params.isTestnet === 'true',
          nativeCurrency: {
            name: params.currencyName,
            symbol: params.currencySymbol,
            decimals: 18,
            logoUri: params.currencyLogo || '',
          },
          blockExplorerUriTemplate: {
            address: params.explorerAddr || 'https://example.com/address/{{address}}',
            txHash: params.explorerTx || 'https://example.com/tx/{{txHash}}',
            api: '',
          },
          features: [],
          disabledWallets: [],
          theme: {
            textColor: '#001428',
            backgroundColor: '#DDDDDD',
          },
          publicRpcUri: {
            authentication: 'NO_AUTH' as RPC_AUTHENTICATION,
            value: params.decodedRpcUrl,
          },
          rpcUri: {
            authentication: 'NO_AUTH' as RPC_AUTHENTICATION,
            value: params.decodedRpcUrl,
          },
          safeAppsRpcUri: {
            authentication: 'NO_AUTH' as RPC_AUTHENTICATION,
            value: params.decodedRpcUrl,
          },
          transactionService: '',
          gasPrice: [],
          multisendAddress: params.multisendAddress,
          multisendCallOnlyAddress: params.multisendCallOnlyAddress,
        } as ChainInfo

        dispatch(upsertChain(newChain))
      } else if (existingChain.custom && params.multisendAddress && params.multisendCallOnlyAddress) {
        dispatch(
          upsertChain({
            ...existingChain,
            multisendAddress: params.multisendAddress,
            multisendCallOnlyAddress: params.multisendCallOnlyAddress,
          }),
        )
      }

      // Store RPC URL in settings
      dispatch(
        setRpc({
          chainId: params.chainIdParam,
          rpc: params.decodedRpcUrl,
        }),
      )

      if (targetShortName) {
        router.replace({ query: { chain: targetShortName } })
      } else {
        clearMagicNetworkParams(router)
      }
    }

    void run()
  }, [searchParams, dispatch, supportedChains, router, confirm])
}

export default useMagicNetwork
