import { ethers } from 'ethers'
import type { NextRouter } from 'next/router'
import type { ChainInfo } from '@/store/customChainsSlice'

const WEB_URL_PROTOCOLS = new Set(['http:', 'https:'])
const RPC_URL_PROTOCOLS = new Set(['http:', 'https:', 'ws:', 'wss:'])
const SHORT_NAME_REGEX = /^[a-zA-Z0-9-]+$/
const CHAIN_ID_REGEX = /^[1-9]\d*$/

export const MAGIC_NETWORK_QUERY_KEYS = [
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

export type MagicNetworkNotification = {
  message: string
  groupKey: string
  variant: 'error'
}

export type MagicNetworkParams = {
  chainIdParam: string | null
  chainName: string | null
  rpcUrl: string | null
  shortName: string | null
  currencyName: string | null
  currencySymbol: string | null
  currencyLogo: string | null
  explorerAddr: string | undefined
  explorerTx: string | undefined
  multisendAddress: string | undefined
  multisendCallOnlyAddress: string | undefined
  l2: string | null
  isTestnet: string | null
  decodedRpcUrl: string | null
}

export type RequiredMagicNetworkParams = MagicNetworkParams & {
  chainIdParam: string
  chainName: string
  rpcUrl: string
  decodedRpcUrl: string
}

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

export const parseMagicNetworkParams = (searchParams: Pick<URLSearchParams, 'get'>): MagicNetworkParams => {
  const rpcUrl = searchParams.get('rpc')

  return {
    chainIdParam: searchParams.get('chainId'),
    chainName: searchParams.get('chain'),
    rpcUrl,
    shortName: searchParams.get('shortName'),
    currencyName: searchParams.get('currency'),
    currencySymbol: searchParams.get('symbol'),
    currencyLogo: decodeSearchParamValue(searchParams.get('logo')) ?? null,
    explorerAddr: decodeSearchParamValue(searchParams.get('expAddr')),
    explorerTx: decodeSearchParamValue(searchParams.get('expTx')),
    multisendAddress: decodeSearchParamValue(searchParams.get('multisendAddress')),
    multisendCallOnlyAddress: decodeSearchParamValue(searchParams.get('multisendCallOnlyAddress')),
    l2: searchParams.get('l2'),
    isTestnet: searchParams.get('testnet'),
    decodedRpcUrl: decodeSearchParamValue(rpcUrl) || rpcUrl,
  }
}

export const hasRequiredMagicNetworkParams = (params: MagicNetworkParams): params is RequiredMagicNetworkParams => {
  return !!(params.rpcUrl && params.chainIdParam && params.chainName && params.decodedRpcUrl)
}

const isUrlWithAllowedProtocol = (url: string, allowedProtocols: Set<string>): boolean => {
  try {
    return allowedProtocols.has(new URL(url).protocol)
  } catch {
    return false
  }
}

export const getMagicNetworkValidationError = (
  params: RequiredMagicNetworkParams,
  existingChain: ChainInfo | undefined,
  supportedChains: Array<ChainInfo>,
): MagicNetworkNotification | undefined => {
  if (!CHAIN_ID_REGEX.test(params.chainIdParam)) {
    return {
      message: 'Invalid chainId. It must be a number greater than 0.',
      groupKey: 'magic-network-invalid-chain-id',
      variant: 'error',
    }
  }

  if (existingChain && !existingChain.custom) {
    return {
      message: `Cannot override built-in network ${existingChain.chainName} via URL.`,
      groupKey: 'magic-network-built-in-network-blocked',
      variant: 'error',
    }
  }

  if (!isUrlWithAllowedProtocol(params.decodedRpcUrl, RPC_URL_PROTOCOLS)) {
    return {
      message: 'Invalid RPC URL protocol. Allowed protocols: http, https, ws, wss.',
      groupKey: 'magic-network-invalid-rpc-url',
      variant: 'error',
    }
  }

  if (
    (params.multisendAddress && !params.multisendCallOnlyAddress) ||
    (!params.multisendAddress && params.multisendCallOnlyAddress)
  ) {
    return {
      message: 'Both multisendAddress and multisendCallOnlyAddress are required when overriding multisend.',
      groupKey: 'magic-network-multisend-missing-pair',
      variant: 'error',
    }
  }

  if (params.multisendAddress && !ethers.utils.isAddress(params.multisendAddress)) {
    return {
      message: 'Invalid multisendAddress value.',
      groupKey: 'magic-network-invalid-multisend-address',
      variant: 'error',
    }
  }

  if (params.multisendCallOnlyAddress && !ethers.utils.isAddress(params.multisendCallOnlyAddress)) {
    return {
      message: 'Invalid multisendCallOnlyAddress value.',
      groupKey: 'magic-network-invalid-multisend-call-only-address',
      variant: 'error',
    }
  }

  if (existingChain) {
    return
  }

  if (!params.currencyName || !params.currencySymbol || !params.shortName) {
    const missingParams = [
      !params.currencyName ? 'currency' : '',
      !params.currencySymbol ? 'symbol' : '',
      !params.shortName ? 'shortName' : '',
    ]
      .filter(Boolean)
      .join(', ')

    return {
      message: `Missing required network params: ${missingParams}`,
      groupKey: 'missing-network-params',
      variant: 'error',
    }
  }

  if (!SHORT_NAME_REGEX.test(params.shortName)) {
    return {
      message: 'Invalid shortName. Only letters, numbers and hyphens are allowed.',
      groupKey: 'magic-network-invalid-shortname',
      variant: 'error',
    }
  }

  const shortNameInUse = supportedChains.some(
    (chain) => chain.shortName === params.shortName && chain.chainId !== params.chainIdParam,
  )
  if (shortNameInUse) {
    return {
      message: `shortName "${params.shortName}" is already in use by another chain.`,
      groupKey: 'magic-network-duplicate-shortname',
      variant: 'error',
    }
  }

  if (params.currencyLogo && !isUrlWithAllowedProtocol(params.currencyLogo, WEB_URL_PROTOCOLS)) {
    return {
      message: 'Invalid logo URL protocol. Allowed protocols: http, https.',
      groupKey: 'magic-network-invalid-logo-url',
      variant: 'error',
    }
  }

  if (params.explorerAddr && !isUrlWithAllowedProtocol(params.explorerAddr, WEB_URL_PROTOCOLS)) {
    return {
      message: 'Invalid expAddr URL protocol. Allowed protocols: http, https.',
      groupKey: 'magic-network-invalid-explorer-address-url',
      variant: 'error',
    }
  }

  if (params.explorerTx && !isUrlWithAllowedProtocol(params.explorerTx, WEB_URL_PROTOCOLS)) {
    return {
      message: 'Invalid expTx URL protocol. Allowed protocols: http, https.',
      groupKey: 'magic-network-invalid-explorer-tx-url',
      variant: 'error',
    }
  }
}

export const clearMagicNetworkParams = (router: Pick<NextRouter, 'query' | 'pathname' | 'replace'>): void => {
  const nextQuery = { ...router.query }

  MAGIC_NETWORK_QUERY_KEYS.forEach((key) => {
    delete nextQuery[key]
  })

  router.replace({
    pathname: router.pathname,
    query: nextQuery,
  })
}
