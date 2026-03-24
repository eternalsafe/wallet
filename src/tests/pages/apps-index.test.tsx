import React from 'react'
import { render, screen, waitFor } from '@/tests/test-utils'
import SafeAppsPage from '@/pages/apps'
import { useRouter } from 'next/router'
import { useSafeApps } from '@/hooks/safe-apps/useSafeApps'
import useSafeAppsFilters from '@/hooks/safe-apps/useSafeAppsFilters'
import { useHasFeature } from '@/hooks/useChains'
import { AppRoutes } from '@/config/routes'
import { FEATURES } from '@/utils/chains'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/hooks/safe-apps/useSafeApps', () => ({
  useSafeApps: jest.fn(),
}))

jest.mock('@/hooks/safe-apps/useSafeAppsFilters', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@/hooks/useChains', () => ({
  useHasFeature: jest.fn(),
}))

jest.mock('@/components/safe-apps/SafeAppsSDKLink', () => ({
  __esModule: true,
  default: () => <div data-testid="safe-apps-sdk-link" />,
}))

jest.mock('@/components/safe-apps/SafeAppsHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="safe-apps-header" />,
}))

jest.mock('@/components/safe-apps/SafeAppList', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div data-testid="safe-apps-list">{title}</div>,
}))

jest.mock('@/components/safe-apps/SafeAppsFilters', () => ({
  __esModule: true,
  default: () => <div data-testid="safe-apps-filters" />,
}))

const mockUseRouter = useRouter as jest.Mock
const mockUseSafeApps = useSafeApps as jest.Mock
const mockUseSafeAppsFilters = useSafeAppsFilters as jest.Mock
const mockUseHasFeature = useHasFeature as jest.Mock

describe('/apps page', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockUseSafeApps.mockReturnValue({
      remoteSafeApps: [
        { id: 1, name: 'App 1' },
        { id: 2, name: 'App 2' },
      ],
      remoteSafeAppsLoading: false,
      pinnedSafeApps: [],
      pinnedSafeAppIds: new Set<number>(),
      togglePin: jest.fn(),
    })

    mockUseSafeAppsFilters.mockReturnValue({
      filteredApps: [
        { id: 1, name: 'App 1' },
        { id: 2, name: 'App 2' },
      ],
      query: '',
      setQuery: jest.fn(),
      setSelectedCategories: jest.fn(),
      setOptimizedWithBatchFilter: jest.fn(),
      selectedCategories: [],
    })

    mockUseHasFeature.mockImplementation((feature: FEATURES) => feature === FEATURES.SAFE_APPS)
  })

  it('redirects to /apps/open when appUrl query is present', async () => {
    const push = jest.fn()

    mockUseRouter.mockReturnValue({
      query: {
        safe: 'eth:0x1234567890123456789012345678901234567890',
        appUrl: 'https://tx-builder.safe.global',
      },
      push,
    })

    render(<SafeAppsPage />)

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith({
        pathname: AppRoutes.apps.open,
        query: {
          safe: 'eth:0x1234567890123456789012345678901234567890',
          appUrl: 'https://tx-builder.safe.global',
        },
      })
    })
  })

  it('renders nothing when SAFE_APPS feature is disabled', () => {
    mockUseHasFeature.mockReturnValue(false)

    mockUseRouter.mockReturnValue({
      query: {
        safe: 'eth:0x1234567890123456789012345678901234567890',
      },
      push: jest.fn(),
    })

    render(<SafeAppsPage />)

    expect(screen.queryByTestId('safe-apps-sdk-link')).not.toBeInTheDocument()
    expect(screen.queryByTestId('safe-apps-header')).not.toBeInTheDocument()
  })
})
