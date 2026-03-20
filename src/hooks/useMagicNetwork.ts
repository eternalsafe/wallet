import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppDispatch } from '@/store'
import { setRpc } from '@/store/settingsSlice'
import { upsertChain, type ChainInfo } from '@/store/customChainsSlice'
import { type RPC_AUTHENTICATION } from '@safe-global/safe-gateway-typescript-sdk'
import useChains from './useChains'
import { showNotification } from '@/store/notificationsSlice'
import { useRouter } from 'next/router'
import { ethers } from 'ethers'
import { useConfirmationDialog } from '@/components/common/ConfirmationDialog'

const WEB_URL_PROTOCOLS = new Set(['http:', 'https:'])
const RPC_URL_PROTOCOLS = new Set(['http:', 'https:', 'ws:', 'wss:'])
const SHORT_NAME_REGEX = /^[a-zA-Z0-9-]+$/
const MAGIC_NETWORK_QUERY_KEYS = [
  'chainId',
  'chain',
  'rpc',
  'shortName',
  'currency',
  'symbol',
  'logo',
  'expAddr',
  'expTx',
  'l2',
  'testnet',
  'multisendAddress',
  'multisendCallOnlyAddress',
]

export const decodeSearchParamValue = (value: string | null): string | undefined => {
  if (!value) {
    return undefined
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const isUrlWithAllowedProtocol = (url: string, allowedProtocols: Set<string>): boolean => {
  try {
    return allowedProtocols.has(new URL(url).protocol)
  } catch {
    return false
  }
}

const clearMagicNetworkParams = (router: ReturnType<typeof useRouter>): void => {
  const nextQuery = { ...router.query }
  MAGIC_NETWORK_QUERY_KEYS.forEach((key) => {
    delete nextQuery[key]
  })
  router.replace({
    pathname: router.pathname,
    query: nextQuery,
  })
}

export const useMagicNetwork = (): void => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const supportedChains = useChains()
  const { confirm } = useConfirmationDialog()

  useEffect(() => {
    const run = async () => {
      // Get params
      const chainIdParam = searchParams.get('chainId')
      const chainName = searchParams.get('chain')
      const rpcUrl = searchParams.get('rpc')
      const shortName = searchParams.get('shortName')
      const currencyName = searchParams.get('currency')
      const currencySymbol = searchParams.get('symbol')
      const currencyLogo = decodeSearchParamValue(searchParams.get('logo')) ?? null
      const explorerAddr = decodeSearchParamValue(searchParams.get('expAddr'))
      const explorerTx = decodeSearchParamValue(searchParams.get('expTx'))
      const multisendAddress = decodeSearchParamValue(searchParams.get('multisendAddress'))
      const multisendCallOnlyAddress = decodeSearchParamValue(searchParams.get('multisendCallOnlyAddress'))
      const l2 = searchParams.get('l2')
      const isTestnet = searchParams.get('testnet')
      const decodedRpcUrl = decodeSearchParamValue(rpcUrl) || rpcUrl

      // Return if no RPC param, chainId or chainName
      if (!rpcUrl || !chainIdParam || !chainName || !decodedRpcUrl) return

      // Check if chain already exists in supported chains
      const existingChain = supportedChains.configs.find((chain) => chain.chainId === chainIdParam)

      // Built-in networks can not be overridden through URL params
      if (existingChain && !existingChain.custom) {
        dispatch(
          showNotification({
            message: `Cannot override built-in network ${existingChain.chainName} via URL.`,
            groupKey: 'magic-network-built-in-network-blocked',
            variant: 'error',
          }),
        )
        clearMagicNetworkParams(router)
        return
      }

      if (!isUrlWithAllowedProtocol(decodedRpcUrl, RPC_URL_PROTOCOLS)) {
        dispatch(
          showNotification({
            message: 'Invalid RPC URL protocol. Allowed protocols: http, https, ws, wss.',
            groupKey: 'magic-network-invalid-rpc-url',
            variant: 'error',
          }),
        )
        clearMagicNetworkParams(router)
        return
      }

      if ((multisendAddress && !multisendCallOnlyAddress) || (!multisendAddress && multisendCallOnlyAddress)) {
        dispatch(
          showNotification({
            message: 'Both multisendAddress and multisendCallOnlyAddress are required when overriding multisend.',
            groupKey: 'magic-network-multisend-missing-pair',
            variant: 'error',
          }),
        )
        clearMagicNetworkParams(router)
        return
      }

      if (multisendAddress && !ethers.utils.isAddress(multisendAddress)) {
        dispatch(
          showNotification({
            message: 'Invalid multisendAddress value.',
            groupKey: 'magic-network-invalid-multisend-address',
            variant: 'error',
          }),
        )
        clearMagicNetworkParams(router)
        return
      }

      if (multisendCallOnlyAddress && !ethers.utils.isAddress(multisendCallOnlyAddress)) {
        dispatch(
          showNotification({
            message: 'Invalid multisendCallOnlyAddress value.',
            groupKey: 'magic-network-invalid-multisend-call-only-address',
            variant: 'error',
          }),
        )
        clearMagicNetworkParams(router)
        return
      }

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
          clearMagicNetworkParams(router)
          return
        }

        if (!SHORT_NAME_REGEX.test(shortName)) {
          dispatch(
            showNotification({
              message: 'Invalid shortName. Only letters, numbers and hyphens are allowed.',
              groupKey: 'magic-network-invalid-shortname',
              variant: 'error',
            }),
          )
          clearMagicNetworkParams(router)
          return
        }

        const shortNameInUse = supportedChains.configs.some(
          (chain) => chain.shortName === shortName && chain.chainId !== chainIdParam,
        )

        if (shortNameInUse) {
          dispatch(
            showNotification({
              message: `shortName "${shortName}" is already in use by another chain.`,
              groupKey: 'magic-network-duplicate-shortname',
              variant: 'error',
            }),
          )
          clearMagicNetworkParams(router)
          return
        }

        if (currencyLogo && !isUrlWithAllowedProtocol(currencyLogo, WEB_URL_PROTOCOLS)) {
          dispatch(
            showNotification({
              message: 'Invalid logo URL protocol. Allowed protocols: http, https.',
              groupKey: 'magic-network-invalid-logo-url',
              variant: 'error',
            }),
          )
          clearMagicNetworkParams(router)
          return
        }

        if (explorerAddr && !isUrlWithAllowedProtocol(explorerAddr, WEB_URL_PROTOCOLS)) {
          dispatch(
            showNotification({
              message: 'Invalid expAddr URL protocol. Allowed protocols: http, https.',
              groupKey: 'magic-network-invalid-explorer-address-url',
              variant: 'error',
            }),
          )
          clearMagicNetworkParams(router)
          return
        }

        if (explorerTx && !isUrlWithAllowedProtocol(explorerTx, WEB_URL_PROTOCOLS)) {
          dispatch(
            showNotification({
              message: 'Invalid expTx URL protocol. Allowed protocols: http, https.',
              groupKey: 'magic-network-invalid-explorer-tx-url',
              variant: 'error',
            }),
          )
          clearMagicNetworkParams(router)
          return
        }
      }

      const isConfirmed = await confirm({
        title: 'Apply network configuration',
        message: `Apply network configuration for "${
          existingChain?.chainName || chainName
        }" (chainId ${chainIdParam})?`,
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

      const targetShortName = existingChain?.shortName || shortName

      if (!existingChain) {
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
            value: decodedRpcUrl,
          },
          rpcUri: {
            authentication: 'NO_AUTH' as RPC_AUTHENTICATION,
            value: decodedRpcUrl,
          },
          safeAppsRpcUri: {
            authentication: 'NO_AUTH' as RPC_AUTHENTICATION,
            value: decodedRpcUrl,
          },
          transactionService: '',
          gasPrice: [],
          multisendAddress,
          multisendCallOnlyAddress,
        } as ChainInfo

        dispatch(upsertChain(newChain))
      } else if (existingChain.custom && multisendAddress && multisendCallOnlyAddress) {
        dispatch(
          upsertChain({
            ...existingChain,
            multisendAddress,
            multisendCallOnlyAddress,
          }),
        )
      }

      // Store RPC URL in settings
      dispatch(
        setRpc({
          chainId: chainIdParam,
          rpc: decodedRpcUrl,
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
