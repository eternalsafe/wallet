import { BigNumber } from 'ethers'
import { hexZeroPad } from 'ethers/lib/utils'
import { renderHook, waitFor } from '@/tests/test-utils'
import useLoadBalances from '../loadables/useLoadBalances'
import useSafeInfo from '@/hooks/useSafeInfo'
import { useTokens } from '@/hooks/useTokens'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import useIntervalCounter from '@/hooks/useIntervalCounter'
import { getERC20Balance } from '@/utils/tokens'

jest.mock('@/hooks/useSafeInfo', () => jest.fn())
jest.mock('@/hooks/useTokens', () => ({
  useTokens: jest.fn(),
}))
jest.mock('@/hooks/wallets/web3', () => ({
  useMultiWeb3ReadOnly: jest.fn(),
}))
jest.mock('@/hooks/useIntervalCounter', () => jest.fn())
jest.mock('@/utils/tokens', () => ({
  getERC20Balance: jest.fn(),
}))

describe('useLoadBalances reverts', () => {
  const mockUseSafeInfo = useSafeInfo as jest.MockedFunction<typeof useSafeInfo>
  const mockUseTokens = useTokens as jest.MockedFunction<typeof useTokens>
  const mockUseMultiWeb3ReadOnly = useMultiWeb3ReadOnly as jest.MockedFunction<typeof useMultiWeb3ReadOnly>
  const mockUseIntervalCounter = useIntervalCounter as jest.MockedFunction<typeof useIntervalCounter>
  const mockGetERC20Balance = getERC20Balance as jest.MockedFunction<typeof getERC20Balance>

  test('skips tokens whose balanceOf call reverts', async () => {
    const badToken = {
      chainId: 1,
      address: hexZeroPad('0x1', 20),
      name: 'Bad token',
      symbol: 'BAD',
      decimals: 18,
      logoURI: '',
    }
    const goodToken = {
      chainId: 1,
      address: hexZeroPad('0x2', 20),
      name: 'Good token',
      symbol: 'GOOD',
      decimals: 18,
      logoURI: '',
    }

    mockUseSafeInfo.mockReturnValue({
      safeAddress: hexZeroPad('0x1234', 20),
    } as any)
    mockUseTokens.mockReturnValue([badToken as any, goodToken as any])
    mockUseMultiWeb3ReadOnly.mockReturnValue({} as any)
    mockUseIntervalCounter.mockReturnValue([0, jest.fn()])
    mockGetERC20Balance.mockImplementation(async (_provider, tokenAddress) => {
      if (tokenAddress === badToken.address) {
        throw new Error('call revert exception')
      }
      return BigNumber.from(42)
    })

    const { result } = renderHook(() => useLoadBalances())

    await waitFor(() => {
      expect(result.current[1]).toBeUndefined()
      expect(result.current[0]).toHaveLength(1)
      expect(result.current[0]?.[0].tokenInfo.address).toBe(goodToken.address)
      expect(result.current[0]?.[0].balance).toBe('42')
    })
  })
})
