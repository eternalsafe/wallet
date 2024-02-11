import { useEffect, useMemo } from 'react'
import { type TokenInfo, TokenType, type SafeBalanceResponse } from '@safe-global/safe-gateway-typescript-sdk'
import { useAppSelector } from '@/store'
import useAsync, { type AsyncResult } from '../useAsync'
import { Errors, logError } from '@/services/exceptions'
import { selectSettings, TOKEN_LISTS } from '@/store/settingsSlice'
import { useCurrentChain } from '../useChains'
import { FEATURES, hasFeature } from '@/utils/chains'
import { DEFAULT_IPFS_GATEWAY, DEFAULT_TOKENLIST_IPNS } from '@/config/constants'
import useSafeInfo from '../useSafeInfo'
import { getERC20Balance } from '@/utils/tokens'
import { useTokenList } from '@/hooks/useTokenList'
import { constants } from 'ethers'

type TokenItem = {
  tokenInfo: TokenInfo
  balance: string
  fiatBalance: string
  fiatConversion: string
}

const isTokenItem = (item: TokenItem | undefined): item is TokenItem => {
  return !!item
}

const useTokenListSetting = (): boolean | undefined => {
  const chain = useCurrentChain()
  const settings = useAppSelector(selectSettings)

  const isTokenListEnabled = useMemo(() => {
    if (settings.tokenList === TOKEN_LISTS.TRUSTED) return false
    return chain ? hasFeature(chain, FEATURES.DEFAULT_TOKENLIST) : undefined
  }, [chain, settings.tokenList])

  return isTokenListEnabled
}

export const useLoadBalances = (): AsyncResult<SafeBalanceResponse> => {
  const isTokenListEnabled = useTokenListSetting()
  const { safe, safeAddress } = useSafeInfo()
  const chainId = safe.chainId

  // TODO(devanon): get IPFS gateway from env or fallback to default, need method for this
  // TODO(devanon): make this load only if chosen
  const tokens = useTokenList(
    `${DEFAULT_IPFS_GATEWAY}/${DEFAULT_TOKENLIST_IPNS}`,
    +chainId,
    isTokenListEnabled ?? false,
  )
  // TODO(devanon): add on custom token list from state

  // Re-fetch assets when the entire SafeInfo updates
  const [data, error, loading] = useAsync<SafeBalanceResponse | undefined>(
    async () => {
      if (!chainId || !safeAddress || !tokens) return

      const requests = tokens.map(async (token) => {
        let balance = await getERC20Balance(token.address, safeAddress)
        if (balance === undefined || balance.eq(0)) return
        return {
          tokenInfo: {
            type: token.address === constants.AddressZero ? TokenType.NATIVE_TOKEN : TokenType.ERC20,
            address: token.address,
            decimals: token.decimals,
            logoUri: token.logoURI,
            name: token.name,
            symbol: token.symbol,
          },
          balance: balance.toString(),
          fiatBalance: '',
          fiatConversion: '',
        } as TokenItem
      })

      let balances = await Promise.all(requests)
      let filteredBalances = balances.filter(isTokenItem)

      return {
        fiatTotal: '',
        items: filteredBalances,
      }
    },
    [safeAddress, chainId, tokens],
    true,
  )

  // Log errors
  useEffect(() => {
    if (error) {
      logError(Errors._601, error.message)
    }
  }, [error])

  return [data, error, loading]
}

export default useLoadBalances
