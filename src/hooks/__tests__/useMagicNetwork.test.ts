import { renderHook, waitFor } from '@/tests/test-utils'
import useMagicNetwork, { decodeSearchParamValue } from '@/hooks/useMagicNetwork'
import { upsertChain, type ChainInfo } from '@/store/customChainsSlice'
import { setRpc } from '@/store/settingsSlice'
import { showNotification } from '@/store/notificationsSlice'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/router'
import useChains from '@/hooks/useChains'
import { useConfirmationDialog } from '@/components/common/ConfirmationDialog'

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}))

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/hooks/useChains', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@/components/common/ConfirmationDialog', () => ({
  useConfirmationDialog: jest.fn(),
}))

jest.mock('@/store/customChainsSlice', () => {
  const original = jest.requireActual('@/store/customChainsSlice')
  return {
    ...original,
    upsertChain: jest.fn(original.upsertChain),
  }
})

jest.mock('@/store/settingsSlice', () => {
  const original = jest.requireActual('@/store/settingsSlice')
  return {
    ...original,
    setRpc: jest.fn(original.setRpc),
  }
})

jest.mock('@/store/notificationsSlice', () => {
  const original = jest.requireActual('@/store/notificationsSlice')
  return {
    ...original,
    showNotification: jest.fn(original.showNotification),
  }
})

const mockUseSearchParams = useSearchParams as jest.Mock
const mockUseRouter = useRouter as jest.Mock
const mockUseChains = useChains as jest.Mock
const mockUseConfirmationDialog = useConfirmationDialog as jest.Mock

const createSearchParams = (params: Record<string, string | undefined>) => ({
  get: (key: string) => params[key] ?? null,
})

const makeCustomChain = (overrides: Partial<ChainInfo> = {}): ChainInfo =>
  ({
    chainId: '84532',
    chainName: 'Base Sepolia',
    shortName: 'base-sepolia',
    custom: true,
    description: '',
    chainLogoUri: null,
    l2: true,
    isTestnet: true,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      logoUri: '',
    },
    blockExplorerUriTemplate: {
      address: 'https://sepolia.basescan.org/address/{{address}}',
      txHash: 'https://sepolia.basescan.org/tx/{{txHash}}',
      api: '',
    },
    features: [],
    disabledWallets: [],
    theme: {
      textColor: '#001428',
      backgroundColor: '#DDDDDD',
    },
    publicRpcUri: {
      authentication: 'NO_AUTH',
      value: 'https://sepolia.base.org',
    },
    rpcUri: {
      authentication: 'NO_AUTH',
      value: 'https://sepolia.base.org',
    },
    safeAppsRpcUri: {
      authentication: 'NO_AUTH',
      value: 'https://sepolia.base.org',
    },
    transactionService: '',
    gasPrice: [],
    ...overrides,
  } as ChainInfo)

describe('useMagicNetwork', () => {
  const mockReplace = jest.fn()
  const confirmMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseChains.mockReturnValue({ configs: [] })
    mockUseRouter.mockReturnValue({
      pathname: '/',
      query: {},
      replace: mockReplace,
    })
    mockUseSearchParams.mockReturnValue(
      createSearchParams({
        chainId: undefined,
        chain: undefined,
        rpc: undefined,
      }),
    )
    confirmMock.mockResolvedValue(true)
    mockUseConfirmationDialog.mockReturnValue({ confirm: confirmMock })
  })

  it('decodes percent-encoded values', () => {
    const encoded = 'https%3A%2F%2Fetherscan.io%2Faddress%2F%7B%7Baddress%7D%7D'
    expect(decodeSearchParamValue(encoded)).toBe('https://etherscan.io/address/{{address}}')
  })

  it('returns undefined for missing values', () => {
    expect(decodeSearchParamValue(null)).toBeUndefined()
  })

  it('blocks overriding a built-in chain via URL', async () => {
    mockUseRouter.mockReturnValue({
      pathname: '/',
      query: {
        foo: 'bar',
        chainId: '1',
        rpc: 'https://malicious-rpc.example',
      },
      replace: mockReplace,
    })
    mockUseChains.mockReturnValue({
      configs: [makeCustomChain({ chainId: '1', chainName: 'Ethereum', shortName: 'eth', custom: false })],
    })
    mockUseSearchParams.mockReturnValue(
      createSearchParams({
        chainId: '1',
        chain: 'Ethereum',
        rpc: 'https://malicious-rpc.example',
      }),
    )

    renderHook(() => useMagicNetwork())

    await waitFor(() => {
      expect(showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          groupKey: 'magic-network-built-in-network-blocked',
        }),
      )
    })

    expect(upsertChain).not.toHaveBeenCalled()
    expect(setRpc).not.toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/',
      query: { foo: 'bar' },
    })
  })

  it('rejects invalid RPC protocol before applying updates', async () => {
    mockUseSearchParams.mockReturnValue(
      createSearchParams({
        chainId: '84532',
        chain: 'Base Sepolia',
        rpc: 'ftp://invalid.example',
        shortName: 'base-sepolia',
        currency: 'Ether',
        symbol: 'ETH',
      }),
    )

    renderHook(() => useMagicNetwork())

    await waitFor(() => {
      expect(showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          groupKey: 'magic-network-invalid-rpc-url',
        }),
      )
    })

    expect(confirmMock).not.toHaveBeenCalled()
    expect(upsertChain).not.toHaveBeenCalled()
    expect(setRpc).not.toHaveBeenCalled()
  })

  it('requires both multisend overrides when either is provided', async () => {
    mockUseSearchParams.mockReturnValue(
      createSearchParams({
        chainId: '84532',
        chain: 'Base Sepolia',
        rpc: 'https://sepolia.base.org',
        shortName: 'base-sepolia',
        currency: 'Ether',
        symbol: 'ETH',
        multisendAddress: '0x1111111111111111111111111111111111111111',
      }),
    )

    renderHook(() => useMagicNetwork())

    await waitFor(() => {
      expect(showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          groupKey: 'magic-network-multisend-missing-pair',
        }),
      )
    })

    expect(confirmMock).not.toHaveBeenCalled()
    expect(upsertChain).not.toHaveBeenCalled()
    expect(setRpc).not.toHaveBeenCalled()
  })

  it('rejects invalid multisend address format', async () => {
    mockUseSearchParams.mockReturnValue(
      createSearchParams({
        chainId: '84532',
        chain: 'Base Sepolia',
        rpc: 'https://sepolia.base.org',
        shortName: 'base-sepolia',
        currency: 'Ether',
        symbol: 'ETH',
        multisendAddress: 'not-an-address',
        multisendCallOnlyAddress: '0x2222222222222222222222222222222222222222',
      }),
    )

    renderHook(() => useMagicNetwork())

    await waitFor(() => {
      expect(showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          groupKey: 'magic-network-invalid-multisend-address',
        }),
      )
    })

    expect(confirmMock).not.toHaveBeenCalled()
    expect(upsertChain).not.toHaveBeenCalled()
    expect(setRpc).not.toHaveBeenCalled()
  })

  it('rejects invalid multisend call only address format', async () => {
    mockUseSearchParams.mockReturnValue(
      createSearchParams({
        chainId: '84532',
        chain: 'Base Sepolia',
        rpc: 'https://sepolia.base.org',
        shortName: 'base-sepolia',
        currency: 'Ether',
        symbol: 'ETH',
        multisendAddress: '0x1111111111111111111111111111111111111111',
        multisendCallOnlyAddress: 'not-an-address',
      }),
    )

    renderHook(() => useMagicNetwork())

    await waitFor(() => {
      expect(showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          groupKey: 'magic-network-invalid-multisend-call-only-address',
        }),
      )
    })

    expect(confirmMock).not.toHaveBeenCalled()
    expect(upsertChain).not.toHaveBeenCalled()
    expect(setRpc).not.toHaveBeenCalled()
  })

  it('requires explicit confirmation before applying network updates', async () => {
    confirmMock.mockResolvedValue(false)
    mockUseSearchParams.mockReturnValue(
      createSearchParams({
        chainId: '84532',
        chain: 'Base Sepolia',
        rpc: 'https://sepolia.base.org',
        shortName: 'base-sepolia',
        currency: 'Ether',
        symbol: 'ETH',
      }),
    )

    renderHook(() => useMagicNetwork())

    await waitFor(() => {
      expect(showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          groupKey: 'magic-network-canceled',
        }),
      )
    })

    expect(upsertChain).not.toHaveBeenCalled()
    expect(setRpc).not.toHaveBeenCalled()
  })

  it('adds a valid custom chain, including multisend overrides, and sets RPC', async () => {
    mockUseSearchParams.mockReturnValue(
      createSearchParams({
        chainId: '84532',
        chain: 'Base Sepolia',
        rpc: 'https://sepolia.base.org',
        shortName: 'base-sepolia',
        currency: 'Ether',
        symbol: 'ETH',
        logo: 'https%3A%2F%2Fexample.com%2Flogo.png',
        expAddr: 'https%3A%2F%2Fsepolia.basescan.org%2Faddress%2F%7B%7Baddress%7D%7D',
        expTx: 'https%3A%2F%2Fsepolia.basescan.org%2Ftx%2F%7B%7BtxHash%7D%7D',
        l2: 'true',
        testnet: 'true',
        multisendAddress: '0x1111111111111111111111111111111111111111',
        multisendCallOnlyAddress: '0x2222222222222222222222222222222222222222',
      }),
    )

    renderHook(() => useMagicNetwork())

    await waitFor(() => {
      expect(upsertChain).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: '84532',
          shortName: 'base-sepolia',
          multisendAddress: '0x1111111111111111111111111111111111111111',
          multisendCallOnlyAddress: '0x2222222222222222222222222222222222222222',
        }),
      )
    })

    expect(setRpc).toHaveBeenCalledWith({
      chainId: '84532',
      rpc: 'https://sepolia.base.org',
    })
    expect(mockReplace).toHaveBeenCalledWith({ query: { chain: 'base-sepolia' } })
  })

  it('updates multisend overrides for an existing custom chain', async () => {
    mockUseChains.mockReturnValue({
      configs: [makeCustomChain()],
    })
    mockUseSearchParams.mockReturnValue(
      createSearchParams({
        chainId: '84532',
        chain: 'Base Sepolia',
        rpc: 'https://sepolia.base.org',
        multisendAddress: '0x3333333333333333333333333333333333333333',
        multisendCallOnlyAddress: '0x4444444444444444444444444444444444444444',
      }),
    )

    renderHook(() => useMagicNetwork())

    await waitFor(() => {
      expect(upsertChain).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: '84532',
          shortName: 'base-sepolia',
          multisendAddress: '0x3333333333333333333333333333333333333333',
          multisendCallOnlyAddress: '0x4444444444444444444444444444444444444444',
        }),
      )
    })

    expect(setRpc).toHaveBeenCalledWith({
      chainId: '84532',
      rpc: 'https://sepolia.base.org',
    })
    expect(mockReplace).toHaveBeenCalledWith({ query: { chain: 'base-sepolia' } })
  })
})
