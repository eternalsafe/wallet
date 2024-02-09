import { useEffect, useMemo } from 'react'
import { getBalances, TokenType, type SafeBalanceResponse } from '@safe-global/safe-gateway-typescript-sdk'
import { useAppSelector } from '@/store'
import useAsync, { type AsyncResult } from '../useAsync'
import { Errors, logError } from '@/services/exceptions'
import { selectCurrency, selectSettings, TOKEN_LISTS } from '@/store/settingsSlice'
import { useCurrentChain } from '../useChains'
import { FEATURES, hasFeature } from '@/utils/chains'
import { DEFAULT_IPFS_GATEWAY, DEFAULT_TOKENLIST_IPNS, POLLING_INTERVAL } from '@/config/constants'
import useIntervalCounter from '../useIntervalCounter'
import useSafeInfo from '../useSafeInfo'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import { getERC20Balance } from '@/utils/tokens'
import { useTokenList } from '@/hooks/useTokenList'

const useTokenListSetting = (): boolean | undefined => {
  const chain = useCurrentChain()
  const settings = useAppSelector(selectSettings)

  const isTrustedTokenList = useMemo(() => {
    if (settings.tokenList === TOKEN_LISTS.ALL) return false
    return chain ? hasFeature(chain, FEATURES.DEFAULT_TOKENLIST) : undefined
  }, [chain, settings.tokenList])

  return isTrustedTokenList
}

export const useLoadBalances = (): AsyncResult<SafeBalanceResponse> => {
  const [pollCount, resetPolling] = useIntervalCounter(POLLING_INTERVAL)
  const currency = useAppSelector(selectCurrency)
  const isTrustedTokenList = useTokenListSetting()
  const { safe, safeAddress } = useSafeInfo()
  const chainId = safe.chainId

  const multiWeb3ReadOnly = useMultiWeb3ReadOnly()
  // TODO(devanon): get IPFS gateway from env or fallback to default, need method for this
  const tokens = useTokenList(`${DEFAULT_IPFS_GATEWAY}/${DEFAULT_TOKENLIST_IPNS}`, +chainId)
  // TODO(devanon): add on custom token list from state

  // Re-fetch assets when the entire SafeInfo updates
  const [data, error, loading] = useAsync<SafeBalanceResponse | undefined>(
    async () => {
      if (!chainId || !safeAddress || !tokens || isTrustedTokenList === undefined) return

      // TODO: Add native token and safe token

      const requests = tokens.map(async (token) => {
        let balance = await getERC20Balance(token.address, safeAddress, multiWeb3ReadOnly)
        if (balance === undefined || balance.eq(0)) return
        return {
          tokenInfo: {
            type: TokenType.ERC20,
            address: token.address,
            decimals: token.decimals,
            logoUri: token.logoURI,
            name: token.name,
            symbol: token.symbol,
          },
          balance,
          fiatBalance: '',
          fiatConversion: '',
        }
      })

      let balances = await Promise.all(requests)
      //TODO(devanon): fix type error https://www.benmvp.com/blog/filtering-undefined-elements-from-array-typescript/
      let filteredBalances = balances.filter((balance) => balance !== undefined)

      console.log({ filteredBalances })

      // return {
      //   fiatTotal: '',
      //   items: filteredBalances,
      // }

      return getBalances(chainId, safeAddress, currency, {
        trusted: isTrustedTokenList,
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeAddress, chainId, currency, isTrustedTokenList, pollCount],
    false, // don't clear data between polls
  )

  // Reset the counter when safe address/chainId changes
  useEffect(() => {
    resetPolling()
  }, [resetPolling, safeAddress, chainId])

  // Log errors
  useEffect(() => {
    if (error) {
      logError(Errors._601, error.message)
    }
  }, [error])

  return [data, error, loading]
}

export default useLoadBalances
