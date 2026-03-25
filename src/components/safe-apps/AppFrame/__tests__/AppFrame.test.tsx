import React from 'react'
import { render, screen } from '@/tests/test-utils'
import AppFrame from '@/components/safe-apps/AppFrame'
import { initialState as initialSettingsState } from '@/store/settingsSlice'

jest.mock('@/hooks/useChainId', () => jest.fn(() => '1'))

jest.mock('@/hooks/useSafeInfo', () =>
  jest.fn(() => ({
    safe: {
      chainId: '1',
      threshold: 1,
      nonce: 0,
      owners: [{ value: '0x0000000000000000000000000000000000000001' }],
    },
    safeLoaded: true,
    safeAddress: '0x0000000000000000000000000000000000000123',
  })),
)

jest.mock('@/hooks/useAddressBook', () => jest.fn(() => ({})))

jest.mock('@/hooks/safe-apps/permissions', () => ({
  useSafePermissions: jest.fn(() => ({
    getPermissions: jest.fn(() => []),
    hasPermission: jest.fn(() => true),
    permissionsRequest: undefined,
    setPermissionsRequest: jest.fn(),
    confirmPermissionRequest: jest.fn(() => []),
  })),
}))

jest.mock('@/hooks/useChains', () => ({
  useCurrentChain: jest.fn(() => undefined),
}))

jest.mock('@/services/tx/txEvents', () => ({
  TxEvent: { SAFE_APPS_REQUEST: 'SAFE_APPS_REQUEST' },
  txSubscribe: jest.fn(() => jest.fn()),
}))

jest.mock('@/services/safe-messages/safeMsgEvents', () => ({
  SafeMsgEvent: { SIGNATURE_PREPARED: 'SIGNATURE_PREPARED' },
  safeMsgSubscribe: jest.fn(() => jest.fn()),
}))

jest.mock('@/components/safe-apps/AppFrame/useTransactionQueueBarState', () =>
  jest.fn(() => ({
    expanded: false,
    dismissedByUser: false,
    setExpanded: jest.fn(),
    dismissQueueBar: jest.fn(),
    transactions: { results: [] },
  })),
)

jest.mock('@/components/safe-apps/AppFrame/useAppIsLoading', () =>
  jest.fn(() => ({
    iframeRef: { current: { src: 'https://example.com' } },
    appIsLoading: false,
    isLoadingSlow: false,
    setAppIsLoading: jest.fn(),
  })),
)

jest.mock('@/components/safe-apps/AppFrame/useAppCommunicator', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    send: jest.fn(),
  })),
  CommunicatorMessages: {
    REJECT_TRANSACTION_MESSAGE: 'rejected',
  },
}))

jest.mock('@/components/safe-apps/AppFrame/useGetSafeInfo', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn(() => ({ safeAddress: '0x123' }))),
}))

jest.mock('@/components/safe-apps/AppFrame/SafeAppIframe', () => ({
  __esModule: true,
  default: () => <div data-testid="safe-app-iframe" />,
}))

jest.mock('@/components/safe-apps/AppFrame/TransactionQueueBar', () => ({
  __esModule: true,
  default: () => null,
  TRANSACTION_BAR_HEIGHT: 0,
}))

jest.mock('@/components/safe-apps/PermissionsPrompt', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('@/components/tx-flow/flows', () => ({
  SafeAppsTxFlow: () => null,
  SignMessageFlow: () => null,
  SignMessageOnChainFlow: () => null,
}))

const mockUseAppCommunicator = jest.requireMock('@/components/safe-apps/AppFrame/useAppCommunicator')
  .default as jest.Mock

const safeAppFromManifest = {
  id: 0.1,
  url: 'https://example.com',
  name: 'Example App',
  description: 'Example app',
  accessControl: { type: 'NO_RESTRICTIONS' },
  tags: [],
  features: [],
  socialProfiles: [],
  developerWebsite: '',
  chainIds: ['1'],
  iconUrl: 'https://example.com/icon.png',
  safeAppsPermissions: [],
} as any

describe('AppFrame appearance', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('uses a light app surface by default', () => {
    render(<AppFrame appUrl="https://example.com" allowedFeaturesList="" safeAppFromManifest={safeAppFromManifest} />)

    const appContainer = screen.getByTestId('safe-app-iframe').parentElement as HTMLElement
    const wrapper = appContainer.parentElement as HTMLElement

    expect(wrapper).toHaveStyle({ backgroundColor: '#fff' })
    expect(appContainer).toHaveStyle({ backgroundColor: '#fff' })
  })

  it('disables the forced light app surface when the setting is off', () => {
    render(<AppFrame appUrl="https://example.com" allowedFeaturesList="" safeAppFromManifest={safeAppFromManifest} />, {
      initialReduxState: {
        settings: {
          ...initialSettingsState,
          theme: {
            ...initialSettingsState.theme,
            safeAppsUseLightBackground: false,
          },
        },
      },
    })

    const appContainer = screen.getByTestId('safe-app-iframe').parentElement as HTMLElement
    const wrapper = appContainer.parentElement as HTMLElement

    expect(wrapper).not.toHaveStyle({ backgroundColor: '#fff' })
    expect(appContainer).not.toHaveStyle({ backgroundColor: '#fff' })
  })

  it('returns local balances via communicator handler', async () => {
    render(<AppFrame appUrl="https://example.com" allowedFeaturesList="" safeAppFromManifest={safeAppFromManifest} />, {
      initialReduxState: {
        balances: {
          data: [
            {
              tokenInfo: {
                type: 'NATIVE_TOKEN',
                address: '0x0000000000000000000000000000000000000000',
                decimals: 18,
                symbol: 'ETH',
                name: 'Ether',
                logoUri: 'https://example.com/eth.png',
              },
              balance: '42',
              fiatBalance: '',
              fiatConversion: '',
            },
          ],
          loading: false,
          error: undefined,
        },
      },
    })

    const handlers = mockUseAppCommunicator.mock.calls.at(-1)?.[3]
    const balances = await handlers.onGetSafeBalances('usd')

    expect(balances).toEqual({
      fiatTotal: '0',
      items: [
        {
          tokenInfo: {
            type: 'NATIVE_TOKEN',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            symbol: 'ETH',
            name: 'Ether',
            logoUri: 'https://example.com/eth.png',
          },
          balance: '42',
          fiatBalance: '0',
          fiatConversion: '0',
        },
      ],
    })
  })

  it('returns local transaction details via communicator handler', async () => {
    render(<AppFrame appUrl="https://example.com" allowedFeaturesList="" safeAppFromManifest={safeAppFromManifest} />, {
      initialReduxState: {
        txHistory: {
          data: {
            multisig_0x0000000000000000000000000000000000000123_0xabc: {
              txId: 'multisig_0x0000000000000000000000000000000000000123_0xabc',
              txHash: '0x1234',
              safeTxHash: '0xabc',
              timestamp: 1700000000000,
              executor: '0x0000000000000000000000000000000000000005',
            },
          },
          loading: false,
          error: undefined,
        },
      },
    })

    const handlers = mockUseAppCommunicator.mock.calls.at(-1)?.[3]
    const txDetails = await handlers.onGetTxBySafeTxHash('0xabc')

    expect(txDetails.txInfo.type).toBe('Custom')
    expect(txDetails.safeAddress).toBe('0x0000000000000000000000000000000000000123')
  })

  it('throws for off-chain signatures when not in local state', async () => {
    render(<AppFrame appUrl="https://example.com" allowedFeaturesList="" safeAppFromManifest={safeAppFromManifest} />)

    const handlers = mockUseAppCommunicator.mock.calls.at(-1)?.[3]

    await expect(handlers.onGetOffChainSignature('0xhash')).rejects.toThrow(
      'Off-chain signatures are not supported yet. See issue #7.',
    )
  })
})
