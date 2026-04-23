import { TokenType } from '@safe-global/safe-gateway-typescript-sdk'
import type { TokenItem } from '@/hooks/loadables/useLoadBalances'
import * as store from '@/store'
import { renderHook } from '@/tests/test-utils'
import useBalances from '../useBalances'
import { hexZeroPad } from 'ethers/lib/utils'

describe('useBalances', () => {
  test('empty balance', () => {
    const balance: TokenItem[] = []
    jest.spyOn(store, 'useAppSelector').mockImplementation((selector) =>
      selector({
        balances: { data: balance, error: undefined, loading: false },
      } as unknown as store.RootState),
    )

    const { result } = renderHook(() => useBalances())

    expect(result.current.balances).toHaveLength(0)
  })

  test('return all balances', () => {
    const tokenAddress = hexZeroPad('0x2', 20)
    const balance: TokenItem[] = [
      {
        balance: '40',
        fiatBalance: '40',
        fiatConversion: '1',
        tokenInfo: {
          address: tokenAddress,
          decimals: 18,
          logoUri: '',
          name: 'Hidden Token',
          symbol: 'HT',
          type: TokenType.ERC20,
        },
      },
      {
        balance: '60',
        fiatBalance: '60',
        fiatConversion: '1',
        tokenInfo: {
          address: tokenAddress,
          decimals: 18,
          logoUri: '',
          name: 'Visible Token',
          symbol: 'VT',
          type: TokenType.ERC20,
        },
      },
    ]

    jest.spyOn(store, 'useAppSelector').mockImplementation((selector) =>
      selector({
        balances: { data: balance, error: undefined, loading: false },
      } as unknown as store.RootState),
    )

    const { result } = renderHook(() => useBalances())

    expect(result.current.balances).toHaveLength(2)
  })
})
