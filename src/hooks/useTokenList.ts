import { useEffect, useState } from 'react'
import { type TokenInfo } from '@uniswap/token-lists'

export function useTokenList(tokenListURI: string, chainId: number): TokenInfo[] | undefined {
  const [tokenList, setTokenList] = useState<TokenInfo[]>()

  useEffect(() => {
    fetch(tokenListURI)
      .then(async (response) => {
        if (response.ok) {
          const { tokens } = await response.json()
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
  }, [tokenListURI, chainId])

  return tokenList
}
