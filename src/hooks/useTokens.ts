import { useMemo } from 'react'
import { type TokenInfo } from '@uniswap/token-lists'
import { useAppSelector } from '@/store'
import { useTokenList } from '@/hooks/useTokenList'
import { useCustomTokens } from '@/hooks/useCustomTokens'
import { selectIPFS, selectSettings, TOKEN_LISTS } from '@/store/settingsSlice'
import { useCurrentChain } from '@/hooks/useChains'
import { FEATURES, hasFeature } from '@/utils/chains'
import { DEFAULT_IPFS_GATEWAY, DEFAULT_TOKENLIST_IPNS } from '@/config/constants'
import { resolveTokenListUrl } from '@/utils/tokenListUrl'

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
  const settings = useAppSelector(selectSettings)

  const selectedTokenListUrl = useMemo(() => {
    if (settings.tokenList === TOKEN_LISTS.TRUSTED) return
    if (settings.tokenList === TOKEN_LISTS.ALL) return DEFAULT_TOKENLIST_IPNS

    return settings.tokenList
  }, [settings.tokenList])

  const tokenListUrl = useMemo(() => {
    if (!selectedTokenListUrl) return
    return resolveTokenListUrl(selectedTokenListUrl, customIPFS || DEFAULT_IPFS_GATEWAY)
  }, [customIPFS, selectedTokenListUrl])

  const listTokens = useTokenList(tokenListUrl, (isTokenListEnabled ?? false) && !!tokenListUrl)
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
