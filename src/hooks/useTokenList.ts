import { useEffect, useState } from 'react'
import { type TokenInfo } from '@uniswap/token-lists'
import { SAFE_TOKEN_ADDRESSES } from '@/config/constants'
import { constants } from 'ethers'
import { useCurrentChain } from '@/hooks/useChains'
import { type NativeCurrency } from '@safe-global/safe-gateway-typescript-sdk'
import { Errors, logError } from '@/services/exceptions'

const safeTokenFromChain = (chainId: string): TokenInfo => {
  return {
    chainId: parseInt(chainId),
    address: SAFE_TOKEN_ADDRESSES[chainId],
    name: 'Safe Token',
    symbol: 'SAFE',
    decimals: 18,
    // always use mainnet logo for Safe Token
    logoURI: `https://safe-transaction-assets.safe.global/tokens/logos/${SAFE_TOKEN_ADDRESSES['1']}.png`,
  }
}

const tokenFromNativeCurrency = (chainId: string, nativeCurrency: NativeCurrency): TokenInfo => {
  return {
    chainId: parseInt(chainId),
    address: constants.AddressZero,
    name: nativeCurrency.name,
    symbol: nativeCurrency.symbol,
    decimals: nativeCurrency.decimals,
    logoURI: nativeCurrency.logoUri,
  }
}

export function useTokenList(tokenListURI: string, isTokenListEnabled: boolean): TokenInfo[] | undefined {
  const chain = useCurrentChain()

  const [tokenList, setTokenList] = useState<TokenInfo[]>()

  useEffect(() => {
    if (!chain) {
      setTokenList(undefined)
      return
    }

    const nativeToken = tokenFromNativeCurrency(chain.chainId, chain.nativeCurrency)

    if (!isTokenListEnabled) {
      setTokenList([nativeToken])
      return
    }

    const safeToken = safeTokenFromChain(chain.chainId)

    fetch(tokenListURI)
      .then(async (response) => {
        if (response.ok) {
          const { tokens } = await response.json()
          // TODO(devanon): consider what happens if Uniswap adds Safe Token
          tokens.push(...[nativeToken, safeToken])
          setTokenList(
            (tokens as TokenInfo[]).filter((token) => {
              const sameChainId = token.chainId === parseInt(chain.chainId)
              return sameChainId
            }),
          )
        } else {
          const errorMessage = await response.text()
          return Promise.reject(new Error(errorMessage))
        }
      })
      .catch((err) => {
        logError(Errors._601, err.message)
        setTokenList(undefined)
      })
  }, [tokenListURI, chain, isTokenListEnabled])

  return tokenList
}
