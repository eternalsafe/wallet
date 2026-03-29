import { useEffect } from 'react'
import { type TokenInfo, TokenType } from '@safe-global/safe-gateway-typescript-sdk'
import useAsync, { type AsyncResult } from '../useAsync'
import { Errors, logError } from '@/services/exceptions'
import useSafeInfo from '../useSafeInfo'
import { getERC20Balance } from '@/utils/tokens'
import { constants } from 'ethers'
import { useTokens } from '@/hooks/useTokens'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import useIntervalCounter from '@/hooks/useIntervalCounter'
import { POLLING_INTERVAL } from '@/config/constants'

export type TokenItem = {
  tokenInfo: TokenInfo
  balance: string
  fiatBalance: string
  fiatConversion: string
  custom?: boolean
}

type TokenBalance = {
  token: TokenInfo
  balance: Awaited<ReturnType<typeof getERC20Balance>>
}

const isTokenItem = (item: TokenItem | undefined): item is TokenItem => {
  return !!item
}

const isTokenBalance = (item: TokenBalance | undefined): item is TokenBalance => {
  return !!item
}

export const useLoadBalances = (): AsyncResult<Array<TokenItem>> => {
  const [pollCount, resetPolling] = useIntervalCounter(POLLING_INTERVAL)
  const { safeAddress } = useSafeInfo()
  const web3ReadOnly = useMultiWeb3ReadOnly()

  const tokens = useTokens()

  const [data, error, loading] = useAsync<Array<TokenItem> | undefined>(
    async () => {
      if (!safeAddress || !tokens || !web3ReadOnly) return

      const balances = await Promise.all(
        tokens.map(async (token) => {
          try {
            let balance = await getERC20Balance(web3ReadOnly, token.address, safeAddress)
            return {
              token,
              balance,
            }
          } catch (_error) {
            return
          }
        }),
      )

      return balances
        .filter(isTokenBalance)
        .map(({ token, balance }) => {
          if (token.address !== constants.AddressZero && !token.extensions?.custom && balance.isZero()) {
            return
          }

          return {
            tokenInfo: {
              type: token.address === constants.AddressZero ? TokenType.NATIVE_TOKEN : TokenType.ERC20,
              address: token.address,
              decimals: token.decimals,
              logoUri: token.logoURI,
              name: token.name,
              symbol: token.symbol,
            },
            balance: balance?.toString() ?? '0',
            fiatBalance: '',
            fiatConversion: '',
            custom: token.extensions?.custom ?? false,
          } as TokenItem
        })
        .filter(isTokenItem)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pollCount, safeAddress, tokens, web3ReadOnly],
    false,
  )

  useEffect(() => {
    resetPolling()
  }, [resetPolling, safeAddress, tokens])

  // Log errors
  useEffect(() => {
    if (error) {
      logError(Errors._601, error.message)
    }
  }, [error])

  return [data, error, loading]
}

export default useLoadBalances
