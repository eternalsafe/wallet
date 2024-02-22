import { useMemo } from 'react'
import { type TokenInfo } from '@uniswap/token-lists'
import { useCurrentChain } from '@/hooks/useChains'
import { useAppSelector } from '@/store'
import { constants } from 'ethers'
import { selectCustomTokensByChain } from '@/store/customTokensSlice'
import { type NativeCurrency } from '@safe-global/safe-gateway-typescript-sdk'

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

export function useCustomTokens(): Array<TokenInfo> | undefined {
  const chain = useCurrentChain()

  const tokensOnChain = useAppSelector((state) => selectCustomTokensByChain(state, chain?.chainId))

  const tokens = useMemo(() => {
    if (!chain) return
    const nativeToken = tokenFromNativeCurrency(chain.chainId, chain.nativeCurrency)

    return [nativeToken, ...tokensOnChain]
  }, [tokensOnChain, chain])

  return tokens
}
