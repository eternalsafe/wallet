import { render, waitFor } from '@/tests/test-utils'
import BookmarkedSafeAppsPage from '@/pages/apps/bookmarked'
import { useRouter } from 'next/router'
import { AppRoutes } from '@/config/routes'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

const mockUseRouter = useRouter as jest.Mock

describe('/apps/bookmarked page', () => {
  it('redirects to /apps while preserving the safe query param', async () => {
    const replace = jest.fn()

    mockUseRouter.mockReturnValue({
      query: {
        safe: 'eth:0x1234567890123456789012345678901234567890',
      },
      replace,
    })

    render(<BookmarkedSafeAppsPage />)

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith({
        pathname: AppRoutes.apps.index,
        query: {
          safe: 'eth:0x1234567890123456789012345678901234567890',
        },
      })
    })
  })
})
