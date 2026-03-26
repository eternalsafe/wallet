import * as store from '@/store'
import { FEATURES } from '@/utils/chains'
import { TOKEN_LISTS } from '@/store/settingsSlice'
import { renderHook } from '@/tests/test-utils'
import { useCurrentChain } from '@/hooks/useChains'
import { useTokenList } from '@/hooks/useTokenList'
import { useCustomTokens } from '@/hooks/useCustomTokens'
import { useTokens } from '../useTokens'

jest.mock('@/hooks/useChains', () => ({
  useCurrentChain: jest.fn(),
}))

jest.mock('@/hooks/useTokenList', () => ({
  useTokenList: jest.fn(),
}))

jest.mock('@/hooks/useCustomTokens', () => ({
  useCustomTokens: jest.fn(),
}))

describe('useTokens', () => {
  const mockUseCurrentChain = useCurrentChain as jest.MockedFunction<typeof useCurrentChain>
  const mockUseTokenList = useTokenList as jest.MockedFunction<typeof useTokenList>
  const mockUseCustomTokens = useCustomTokens as jest.MockedFunction<typeof useCustomTokens>

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseCurrentChain.mockReturnValue({
      chainId: '1',
      features: [FEATURES.DEFAULT_TOKENLIST],
    } as any)
    mockUseTokenList.mockReturnValue([])
    mockUseCustomTokens.mockReturnValue([])
  })

  test('uses dweb.link for the default Uniswap token list URL', () => {
    jest.spyOn(store, 'useAppSelector').mockImplementation((selector) =>
      selector({
        settings: {
          tokenList: TOKEN_LISTS.ALL,
          env: { ipfs: '' },
        },
      } as store.RootState),
    )

    renderHook(() => useTokens())

    expect(mockUseTokenList).toHaveBeenCalledWith('https://dweb.link/ipns/tokens.uniswap.org', true)
  })

  test('uses a custom IPFS gateway for the Uniswap token list when configured', () => {
    jest.spyOn(store, 'useAppSelector').mockImplementation((selector) =>
      selector({
        settings: {
          tokenList: TOKEN_LISTS.ALL,
          env: { ipfs: 'https://my.gateway.example' },
        },
      } as store.RootState),
    )

    renderHook(() => useTokens())

    expect(mockUseTokenList).toHaveBeenCalledWith('https://my.gateway.example/ipns/tokens.uniswap.org', true)
  })
})
