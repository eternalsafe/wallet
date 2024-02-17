import { useEffect, useState } from 'react'
import { type TokenInfo } from '@uniswap/token-lists'
import { SAFE_TOKEN_ADDRESSES } from '@/config/constants'
import chains from '@/config/chains'
import { constants } from 'ethers'

const safeToken = {
  chainId: 1,
  address: SAFE_TOKEN_ADDRESSES[chains.eth],
  name: 'Safe Token',
  symbol: 'SAFE',
  decimals: 18,
  logoURI: 'https://safe-transaction-assets.safe.global/tokens/logos/0x5aFE3855358E112B5647B952709E6165e1c1eEEe.png',
}

// TODO(devanon): Support other chains
const nativeToken = {
  chainId: 1,
  address: constants.AddressZero,
  name: 'Ether',
  symbol: 'ETH',
  decimals: 18,
}

const defaultTokens = [safeToken, nativeToken]

export function useTokenList(
  tokenListURI: string,
  chainId: number,
  isTokenListEnabled: boolean,
): TokenInfo[] | undefined {
  const [tokenList, setTokenList] = useState<TokenInfo[]>()

  useEffect(() => {
    if (!isTokenListEnabled) {
      setTokenList(defaultTokens)
      return
    }

    fetch(tokenListURI)
      .then(async (response) => {
        if (response.ok) {
          const { tokens } = await response.json()
          // TODO(devanon): consider what happens if Uniswap adds Safe Token
          tokens.push(...defaultTokens)
          setTokenList(
            (tokens as TokenInfo[]).filter((token) => {
              const sameChainId = token.chainId === chainId
              return sameChainId
            }),
          )
        } else {
          const errorMessage = await response.text()
          return Promise.reject(new Error(errorMessage))
        }
      })
      .catch((err) => {
        console.log(err)
        setTokenList(undefined)
      })
  }, [tokenListURI, chainId, isTokenListEnabled])

  return tokenList
}
