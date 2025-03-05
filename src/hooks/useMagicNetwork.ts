import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppDispatch } from '@/store'
import { setRpc } from '@/store/settingsSlice'
import { addChain, type ChainInfo } from '@/store/customChainsSlice'
import { type RPC_AUTHENTICATION } from '@safe-global/safe-gateway-typescript-sdk'
import useChainId from '@/hooks/useChainId'
import useChains from './useChains'
import { showNotification } from '@/store/notificationsSlice'
import { useRouter } from 'next/router'

export const useMagicNetwork = (): void => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const chainId = useChainId()
  const supportedChains = useChains()

  useEffect(() => {
    // Get params
    const chainIdParam = searchParams.get('chainId')
    const chainName = searchParams.get('chain')
    const rpcUrl = searchParams.get('rpc')
    const shortName = searchParams.get('shortName')
    const currencyName = searchParams.get('currency')
    const currencySymbol = searchParams.get('symbol')
    const currencyLogo = searchParams.get('logo')
    const explorerAddr = searchParams.get('expAddr')
    const explorerTx = searchParams.get('expTx')
    const l2 = searchParams.get('l2')
    const isTestnet = searchParams.get('testnet')

    // Return if no RPC param, chainId or chainName
    if (!rpcUrl || !chainIdParam || !chainName) return

    // Check if chain already exists in supported chains
    const existingChain = supportedChains.configs.find((chain) => chain.chainId === chainIdParam)

    if (!existingChain) {
      // Return if no currency info
      if (!currencyName || !currencySymbol || !shortName) {
        const missingParams = [
          !currencyName ? 'currency' : '',
          !currencySymbol ? 'symbol' : '',
          !shortName ? 'shortName' : '',
          !chainName ? 'chain' : '',
        ]
          .filter(Boolean)
          .join(', ')
        dispatch(
          showNotification({
            message: `Missing required network params: ${missingParams}`,
            groupKey: 'missing-network-params',
            variant: 'error',
          }),
        )
        return
      }

      // Create a new chain configuration
      const newChain = {
        custom: true,
        chainId: chainIdParam,
        chainName,
        shortName,
        description: '',
        chainLogoUri: currencyLogo || null,
        l2: l2 === 'true',
        isTestnet: isTestnet === 'true',
        nativeCurrency: {
          name: currencyName,
          symbol: currencySymbol,
          decimals: 18,
          logoUri: currencyLogo || '',
        },
        blockExplorerUriTemplate: {
          address: explorerAddr || 'https://example.com/address/{{address}}',
          txHash: explorerTx || 'https://example.com/tx/{{txHash}}',
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
          value: decodeURIComponent(rpcUrl),
        },
        rpcUri: {
          authentication: 'NO_AUTH' as RPC_AUTHENTICATION,
          value: decodeURIComponent(rpcUrl),
        },
        safeAppsRpcUri: {
          authentication: 'NO_AUTH' as RPC_AUTHENTICATION,
          value: decodeURIComponent(rpcUrl),
        },
        transactionService: '',
        gasPrice: [],
      } as ChainInfo

      // Add the chain to Redux store
      dispatch(addChain(newChain))
    }

    // Store RPC URL in settings
    dispatch(
      setRpc({
        chainId: chainIdParam,
        rpc: decodeURIComponent(rpcUrl),
      }),
    )

    router.replace({ query: { chain: shortName } })
  }, [searchParams, dispatch, chainId, supportedChains, router])
}

export default useMagicNetwork
