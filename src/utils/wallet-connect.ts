import type { SessionRequest } from '@/hooks/wallets/useWalletConnect'
import { sameAddress } from '@/utils/addresses'

export const WALLET_CONNECT_RETURN_TO_QUERY_PARAM = 'returnTo'

type WalletConnectTxParams = {
  to: string
  value: string
  data: string
}

type RawWalletConnectTxParams = {
  to?: unknown
  from?: unknown
  value?: unknown
  data?: unknown
}

const buildEip155ChainRef = (chainId: string): string => `eip155:${chainId}`

export const extractWalletConnectReturnTo = (returnTo: string | string[] | undefined): string | null => {
  const route = Array.isArray(returnTo) ? returnTo[0] : returnTo
  if (typeof route !== 'string') return null

  if (!route.startsWith('/')) return null

  return route
}

export const extractWalletConnectTxParams = (
  pendingRequest: SessionRequest | null,
  currentChainId: string,
  safeAddress: string,
): WalletConnectTxParams | null => {
  if (!pendingRequest || pendingRequest.params.request.method !== 'eth_sendTransaction') {
    return null
  }

  if (pendingRequest.params.chainId !== buildEip155ChainRef(currentChainId)) {
    return null
  }

  const firstParam = pendingRequest.params.request.params?.[0]
  if (!firstParam || typeof firstParam !== 'object') {
    return null
  }

  const txParams = firstParam as RawWalletConnectTxParams
  if (typeof txParams.to !== 'string') {
    return null
  }

  if (typeof txParams.from === 'string' && safeAddress && !sameAddress(txParams.from, safeAddress)) {
    return null
  }

  return {
    to: txParams.to,
    value: typeof txParams.value === 'string' ? txParams.value : '0',
    data: typeof txParams.data === 'string' ? txParams.data : '0x',
  }
}
