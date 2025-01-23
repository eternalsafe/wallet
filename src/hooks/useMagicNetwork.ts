import { useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppDispatch } from '@/store'
import { setRpc } from '@/store/settingsSlice'
import { addChain } from '@/store/chainsSlice'
import { type ChainInfo, type RPC_AUTHENTICATION } from '@safe-global/safe-gateway-typescript-sdk'
import { getChainsConfig } from '@/config/supportedChains'
import useChainId from '@/hooks/useChainId'
import useLocalStorage from '@/services/local-storage/useLocalStorage'

const CHAINS_STORAGE_KEY = 'chains'

export const useMagicNetwork = (): void => {
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const chainId = useChainId()
  const [storedChains, setStoredChains] = useLocalStorage<ChainInfo[]>(CHAINS_STORAGE_KEY)

  useEffect(() => {
    // Get params
    const chainIdParam = searchParams.get('chainId')
    const rpcUrl = searchParams.get('rpc')
    const shortName = searchParams.get('chain')
    const currencyName = searchParams.get('currency')
    const currencySymbol = searchParams.get('symbol')
    const currencyLogo = searchParams.get('logo')
    const explorerAddr = searchParams.get('expAddr')
    const explorerTx = searchParams.get('expTx')

    // Return if no RPC param or chainId
    if (!rpcUrl || !chainIdParam) return

    // Check if chain already exists in supported chains
    const supportedChains = getChainsConfig()
    const existingChain = supportedChains.find((chain) => chain.chainId === chainIdParam)

    if (!existingChain) {
      // Return if no currency info
      if (!currencyName || !currencySymbol || !shortName) return

      // Create a new chain configuration
      const newChain: ChainInfo = {
        chainId: chainIdParam,
        chainName: currencyName,
        description: '',
        chainLogoUri: null,
        l2: false,
        isTestnet: false,
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
        shortName,
      }

      // Add the chain to Redux store
      dispatch(addChain(newChain))

      // Add the chain to local storage if it's not already in supported chains
      if (!(storedChains || []).find((chain) => chain.chainId === newChain.chainId)) {
        setStoredChains([...(storedChains || []), newChain])
      }
    }

    // Store RPC URL in settings
    dispatch(
      setRpc({
        chainId: chainIdParam,
        rpc: decodeURIComponent(rpcUrl),
      }),
    )
  }, [searchParams, dispatch, chainId, storedChains, setStoredChains])
}

export default useMagicNetwork 