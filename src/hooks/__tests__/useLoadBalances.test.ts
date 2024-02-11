import * as store from '@/store'
import { defaultSafeInfo } from '@/store/safeInfoSlice'
import { act, renderHook, waitFor } from '@/tests/test-utils'
import { hexZeroPad } from 'ethers/lib/utils'
import useLoadBalances from '../loadables/useLoadBalances'
import * as SafeGatewaySDK from '@safe-global/safe-gateway-typescript-sdk'
import { TokenType } from '@safe-global/safe-apps-sdk'
import { FEATURES } from '@/utils/chains'
import * as useChainId from '@/hooks/useChainId'
import { TOKEN_LISTS } from '@/store/settingsSlice'

const safeAddress = hexZeroPad('0x1234', 20)

const mockBalanceEUR = {
  fiatTotal: '1001',
  items: [
    {
      balance: '1001',
      fiatBalance: '1001',
      fiatConversion: '1',
      tokenInfo: {
        address: hexZeroPad('0x3', 20),
        decimals: 18,
        logoUri: '',
        name: 'sEuro',
        symbol: 'sEUR',
        type: TokenType.ERC20,
      },
    },
  ],
}

const mockBalanceUSD = {
  fiatTotal: '1002',
  items: [
    {
      balance: '1001',
      fiatBalance: '1001',
      fiatConversion: '1',
      tokenInfo: {
        address: hexZeroPad('0x3', 20),
        decimals: 18,
        logoUri: '',
        name: 'DAI',
        symbol: 'DAI',
        type: TokenType.ERC20,
      },
    },
  ],
}

const mockSafeInfo = {
  data: {
    ...defaultSafeInfo,
    address: { value: safeAddress },
    chainId: '5',
  },
  loading: false,
}

const mockBalanceDefaultList = { ...mockBalanceUSD, fiatTotal: '' }

const mockBalanceAllTokens = {
  fiatTotal: '',
  items: [
    {
      balance: '1',
      fiatBalance: '',
      fiatConversion: '',
      tokenInfo: {
        address: hexZeroPad('0x1', 20),
        decimals: 18,
        logoUri: '',
        name: 'First token',
        symbol: 'FIRST',
        type: TokenType.ERC20,
      },
    },
    {
      balance: '1',
      fiatBalance: '4',
      fiatConversion: '4',
      tokenInfo: {
        address: hexZeroPad('0x2', 20),
        decimals: 18,
        logoUri: '',
        name: 'Second token',
        symbol: '2ND',
        type: TokenType.ERC20,
      },
    },
  ],
}

const mockTokenList = [
  {
    chainId: 5,
    address: hexZeroPad('0x1', 20),
    name: 'First token',
    symbol: 'FIRST',
    decimals: 18,
    logoURI: 'https://safe-transaction-assets.safe.global/tokens/logos/0x5aFE3855358E112B5647B952709E6165e1c1eEEe.png',
  },
  {
    chainId: 5,
    address: hexZeroPad('0x2', 20),
    name: 'Second token',
    symbol: '2ND',
    decimals: 18,
    logoURI: 'https://safe-transaction-assets.safe.global/tokens/logos/0x5aFE3855358E112B5647B952709E6165e1c1eEEe.png',
  },
]

describe('useLoadBalances', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    jest.spyOn(useChainId, 'useChainId').mockReturnValue('5')
  })

  test('without selected Safe', async () => {
    // Mock fetch
    Object.defineProperty(window, 'fetch', {
      writable: true,
      value: jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                tokens: [mockTokenList],
              },
            }),
        }),
      ),
    })

    jest.spyOn(store, 'useAppSelector').mockImplementation((selector) =>
      selector({
        chains: {
          data: [
            {
              chainId: '5',
              features: [FEATURES.DEFAULT_TOKENLIST],
              chainName: 'Görli',
            } as any,
          ],
        },
        session: {
          lastChainId: '5',
        },
        safeInfo: {
          data: undefined,
          loading: false,
        },
        settings: {
          currency: 'USD',
          hiddenTokens: {},
          shortName: {
            copy: true,
            qr: true,
            show: true,
          },
          theme: {},
          tokenList: 'ALL',
        },
      } as store.RootState),
    )
    const { result } = renderHook(() => useLoadBalances())

    await waitFor(() => {
      expect(result.current[0]).toBeUndefined()
      expect(result.current[1]).toBeUndefined()
      expect(result.current[2]).toBeFalsy()
    })
  })

  test('only use default list if feature is enabled', async () => {
    jest.spyOn(SafeGatewaySDK, 'getBalances').mockImplementation(async (chainId, address, currency, query) => {
      expect(chainId).toEqual('5')
      expect(address).toEqual(safeAddress)
      expect(currency).toEqual('EUR')
      expect(query).toMatchObject({ trusted: false })

      return mockBalanceAllTokens
    })

    jest.spyOn(store, 'useAppSelector').mockImplementation((selector) =>
      selector({
        chains: {
          data: [
            {
              chainId: '5',
              features: [],
              chainName: 'Görli',
            } as any,
          ],
        },
        safeInfo: mockSafeInfo,
        settings: {
          currency: 'EUR',
          hiddenTokens: {},
          shortName: {
            copy: true,
            qr: true,
            show: true,
          },
          theme: {},
          tokenList: TOKEN_LISTS.TRUSTED,
        },
      } as store.RootState),
    )
    const { result } = renderHook(() => useLoadBalances())

    await waitFor(async () => {
      expect(result.current[0]?.fiatTotal).toEqual(mockBalanceAllTokens.fiatTotal)
      expect(result.current[1]).toBeUndefined()
    })
  })

  test('use trusted filter for default list and reload on settings change', async () => {
    // Mock fetch
    Object.defineProperty(window, 'fetch', {
      writable: true,
      value: jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                tokens: [mockTokenList],
              },
            }),
        }),
      ),
    })

    const mockSelector = jest.spyOn(store, 'useAppSelector').mockImplementation((selector) =>
      selector({
        chains: {
          data: [
            {
              chainId: '5',
              features: [FEATURES.DEFAULT_TOKENLIST],
              chainName: 'Görli',
            } as any,
          ],
        },
        session: {
          lastChainId: '5',
        },
        safeInfo: mockSafeInfo,
        settings: {
          currency: 'EUR',
          hiddenTokens: {},
          shortName: {
            copy: true,
            qr: true,
            show: true,
          },
          theme: {},
          tokenList: TOKEN_LISTS.TRUSTED,
        },
      } as store.RootState),
    )
    const { result, rerender } = renderHook(() => useLoadBalances())

    await waitFor(async () => {
      expect(result.current[0]?.fiatTotal).toEqual(mockBalanceDefaultList.fiatTotal)
      expect(result.current[1]).toBeUndefined()
    })

    mockSelector.mockImplementation((selector) =>
      selector({
        chains: {
          data: [
            {
              chainId: '5',
              features: [FEATURES.DEFAULT_TOKENLIST],
              chainName: 'Görli',
            } as any,
          ],
        },
        safeInfo: mockSafeInfo,
        settings: {
          currency: 'EUR',
          hiddenTokens: {},
          shortName: {
            copy: true,
            qr: true,
            show: true,
          },
          theme: {},
          tokenList: TOKEN_LISTS.ALL,
        },
      } as store.RootState),
    )

    act(() => rerender())

    await waitFor(async () => {
      expect(result.current[0]?.fiatTotal).toEqual(mockBalanceAllTokens.fiatTotal)
      expect(result.current[1]).toBeUndefined()
    })
  })
})
