import React from 'react'
import { render, screen } from '@/tests/test-utils'
import AppFrame from '@/components/safe-apps/AppFrame'
import { initialState as initialSettingsState } from '@/store/settingsSlice'

jest.mock('@/hooks/useChainId', () => jest.fn(() => '1'))

jest.mock('@/hooks/useSafeInfo', () =>
  jest.fn(() => ({
    safe: { chainId: '1' },
    safeLoaded: true,
    safeAddress: '0x123',
  })),
)

jest.mock('@/hooks/useAddressBook', () => jest.fn(() => ({})))

jest.mock('@/hooks/safe-apps/useSafeAppFromBackend', () => ({
  useSafeAppFromBackend: jest.fn(() => [undefined, undefined, false]),
}))

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

jest.mock('@/services/safe-apps/track-app-usage-count', () => ({
  trackSafeAppOpenCount: jest.fn(),
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
})
