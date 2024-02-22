import { useEffect } from 'react'
import { type TokenInfo, TokenType } from '@safe-global/safe-gateway-typescript-sdk'
import useAsync, { type AsyncResult } from '../useAsync'
import { Errors, logError } from '@/services/exceptions'
import useSafeInfo from '../useSafeInfo'
import { getERC20Balance } from '@/utils/tokens'
import { constants } from 'ethers'
import { useTokens } from '@/hooks/useTokens'

export type SafeBalanceResponse = {
  fiatTotal: string
  items: Array<TokenItem>
}

export type TokenItem = {
  tokenInfo: TokenInfo
  balance: string
  fiatBalance: string
  fiatConversion: string
  custom?: boolean
}

const isTokenItem = (item: TokenItem | undefined): item is TokenItem => {
  return !!item
}

export const useLoadBalances = (): AsyncResult<SafeBalanceResponse> => {
  const { safeAddress } = useSafeInfo()

  const tokens = useTokens()

  // Re-fetch assets when the entire SafeInfo updates
  const [data, error, loading] = useAsync<SafeBalanceResponse | undefined>(
    async () => {
      if (!safeAddress || !tokens) return

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
          custom: token.extensions?.custom ?? false,
        } as TokenItem
      })

      let balances = await Promise.all(requests)
      let filteredBalances = balances.filter(isTokenItem)

      return {
        fiatTotal: '',
        items: filteredBalances,
      }
    },
    [safeAddress, tokens],
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
