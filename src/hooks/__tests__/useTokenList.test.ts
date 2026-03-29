import { renderHook, waitFor } from '@/tests/test-utils'
import { SAFE_TOKEN_ADDRESSES } from '@/config/constants'
import { useCurrentChain } from '@/hooks/useChains'
import { useTokenList } from '@/hooks/useTokenList'
import * as exceptions from '@/services/exceptions'
import { hexZeroPad } from 'ethers/lib/utils'

jest.mock('@/hooks/useChains', () => ({
  useCurrentChain: jest.fn(),
}))

describe('useTokenList', () => {
  const mockUseCurrentChain = useCurrentChain as jest.MockedFunction<typeof useCurrentChain>
  let mockLogError: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseCurrentChain.mockReturnValue({
      chainId: '1',
    } as any)

    jest.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          tokens: [
            {
              chainId: 101,
              address: '5mbK36SZ7J19An8jFochhQS4of8g6BwUjbeCSxBSoWdp',
              name: 'Wrapped SOL',
              symbol: 'wSOL',
              decimals: 9,
              logoURI: '',
            },
            {
              chainId: 1,
              address: 'invalid-address',
              name: 'Broken token',
              symbol: 'BROKEN',
              decimals: 18,
              logoURI: '',
            },
            {
              chainId: 1,
              address: hexZeroPad('0x111', 20),
              name: 'Valid token',
              symbol: 'VALID',
              decimals: 18,
              logoURI: '',
            },
          ],
        }),
    } as any)

    mockLogError = jest
      .spyOn(exceptions, 'logError')
      .mockImplementation((content, thrown) => new exceptions.CodedException(content, thrown))
  })

  test('ignores non-EVM addresses and keeps valid list tokens', async () => {
    const { result } = renderHook(() => useTokenList('https://example.com/token-list.json', true))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current?.map((token) => token.address)).toEqual([
        '0x0000000000000000000000000000000000000111',
        SAFE_TOKEN_ADDRESSES['1'],
      ])
      expect(mockLogError).not.toHaveBeenCalled()
    })
  })
})
