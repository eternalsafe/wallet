import { useMemo } from 'react'
import { type TokenInfo } from '@uniswap/token-lists'
import { useAppSelector } from '@/store'
import { useTokenList } from '@/hooks/useTokenList'
import { useCustomTokens } from '@/hooks/useCustomTokens'
import { selectIPFS, selectSettings, TOKEN_LISTS } from '@/store/settingsSlice'
import { useCurrentChain } from '@/hooks/useChains'
import { FEATURES, hasFeature } from '@/utils/chains'
import { resolveTokenListUrl } from '@/hooks/tokenListUrl'

const useTokenListSetting = (): boolean | undefined => {
  const chain = useCurrentChain()
  const settings = useAppSelector(selectSettings)

  const isTokenListEnabled = useMemo(() => {
    if (settings.tokenList === TOKEN_LISTS.TRUSTED) return false
    return chain ? hasFeature(chain, FEATURES.DEFAULT_TOKENLIST) : undefined
  }, [chain, settings.tokenList])

  return isTokenListEnabled
}

export function useTokens(): Array<TokenInfo> | undefined {
  const isTokenListEnabled = useTokenListSetting()
  const customIPFS = useAppSelector(selectIPFS)

  const listTokens = useTokenList(resolveTokenListUrl(customIPFS), isTokenListEnabled ?? false)
  const customTokens = useCustomTokens()

  const tokens = useMemo(() => {
    const deduplicatedTokens = new Map<string, TokenInfo>()
    for (const token of listTokens ?? []) {
      deduplicatedTokens.set(token.address, token)
    }
    for (const token of customTokens ?? []) {
      deduplicatedTokens.set(token.address, token)
    }

    return Array.from(deduplicatedTokens.values())
  }, [listTokens, customTokens])

  return tokens
}
