import React from 'react'
import { render, screen, waitFor } from '@/tests/test-utils'
import SafeAppsOpenPage from '@/pages/apps/open'
import { useRouter } from 'next/router'
import { useHasFeature } from '@/hooks/useChains'
import { useSafeAppUrl } from '@/hooks/safe-apps/useSafeAppUrl'
import { useSafeAppFromManifest } from '@/hooks/safe-apps/useSafeAppFromManifest'
import { useSafeApps } from '@/hooks/safe-apps/useSafeApps'
import useSafeAppsInfoModal from '@/components/safe-apps/SafeAppsInfoModal/useSafeAppsInfoModal'
import { useBrowserPermissions } from '@/hooks/safe-apps/permissions'
import { FEATURES } from '@/utils/chains'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/hooks/useChainId', () => jest.fn(() => '1'))

jest.mock('@/hooks/useChains', () => ({
  useHasFeature: jest.fn(),
}))

jest.mock('@/hooks/safe-apps/useSafeAppUrl', () => ({
  useSafeAppUrl: jest.fn(),
}))

jest.mock('@/hooks/safe-apps/useSafeAppFromManifest', () => ({
  useSafeAppFromManifest: jest.fn(),
}))

jest.mock('@/hooks/safe-apps/useSafeApps', () => ({
  useSafeApps: jest.fn(),
}))

jest.mock('@/hooks/safe-apps/permissions', () => ({
  useBrowserPermissions: jest.fn(),
}))

jest.mock('@/components/safe-apps/SafeAppsInfoModal/useSafeAppsInfoModal', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@/components/safe-apps/SafeAppsInfoModal', () => ({
  __esModule: true,
  default: () => <div data-testid="safe-apps-info-modal" />,
}))

jest.mock('@/components/safe-apps/SafeAppsErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('@/components/safe-apps/SafeAppsErrorBoundary/SafeAppsLoadError', () => ({
  __esModule: true,
  default: () => <div data-testid="safe-app-load-error" />,
}))

jest.mock('@/components/safe-apps/AppFrame', () => ({
  __esModule: true,
  default: ({ appUrl }: { appUrl: string }) => <div data-testid="safe-app-frame" data-url={appUrl} />,
}))

const mockUseRouter = useRouter as jest.Mock
const mockUseHasFeature = useHasFeature as jest.Mock
const mockUseSafeAppUrl = useSafeAppUrl as jest.Mock
const mockUseSafeAppFromManifest = useSafeAppFromManifest as jest.Mock
const mockUseSafeApps = useSafeApps as jest.Mock
const mockUseSafeAppsInfoModal = useSafeAppsInfoModal as jest.Mock
const mockUseBrowserPermissions = useBrowserPermissions as jest.Mock

describe('/apps/open page', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockUseRouter.mockReturnValue({
      query: {
        safe: 'eth:0x1234567890123456789012345678901234567890',
      },
      isReady: true,
      push: jest.fn(),
      back: jest.fn(),
    })

    mockUseSafeAppUrl.mockReturnValue('https://tx-builder.safe.global')
    mockUseSafeApps.mockReturnValue({
      remoteSafeApps: [],
      remoteSafeAppsLoading: false,
    })
    mockUseSafeAppFromManifest.mockReturnValue({
      safeApp: {
        url: 'https://tx-builder.safe.global',
        safeAppsPermissions: [],
      },
      isLoading: false,
    })

    mockUseBrowserPermissions.mockReturnValue({
      addPermissions: jest.fn(),
      getPermissions: jest.fn(),
      getAllowedFeaturesList: jest.fn(() => ''),
    })

    mockUseSafeAppsInfoModal.mockReturnValue({
      isModalVisible: false,
      isSafeAppInDefaultList: false,
      isFirstTimeAccessingApp: false,
      isConsentAccepted: true,
      isPermissionsReviewCompleted: true,
      onComplete: jest.fn(),
    })

    mockUseHasFeature.mockImplementation((feature: FEATURES) => {
      if (feature === FEATURES.SAFE_APPS) return true
      return false
    })
  })

  it('renders the app frame for a valid safe app url', () => {
    render(<SafeAppsOpenPage />)

    expect(screen.getByTestId('safe-app-frame')).toHaveAttribute('data-url', 'https://tx-builder.safe.global')
  })

  it('redirects wallet connect app urls to apps list when native wallet connect is enabled', async () => {
    const push = jest.fn()

    mockUseRouter.mockReturnValue({
      query: {
        safe: 'eth:0x1234567890123456789012345678901234567890',
      },
      isReady: true,
      push,
      back: jest.fn(),
    })

    mockUseSafeAppUrl.mockReturnValue('https://wallet-connect.safe.global')

    mockUseHasFeature.mockImplementation((feature: FEATURES) => {
      return feature === FEATURES.SAFE_APPS || feature === FEATURES.NATIVE_WALLETCONNECT
    })

    render(<SafeAppsOpenPage />)

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith({
        pathname: '/apps',
        query: { safe: 'eth:0x1234567890123456789012345678901234567890' },
      })
    })
  })
})
