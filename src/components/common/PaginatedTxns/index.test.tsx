import { render, screen } from '@/tests/test-utils'
import PaginatedTxns from '.'
import useSafeInfo from '@/hooks/useSafeInfo'
import useTxHistory from '@/hooks/useTxHistory'

jest.mock('@/hooks/useSafeInfo', () => jest.fn())
jest.mock('@/hooks/useTxHistory', () => jest.fn(() => ({ data: [], error: undefined, loading: false })))
jest.mock('@/hooks/usePendingTxs', () => ({
  useHasPendingTxs: jest.fn(() => false),
}))

describe('PaginatedTxns', () => {
  const mockUseSafeInfo = useSafeInfo as jest.MockedFunction<typeof useSafeInfo>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSafeInfo.mockReturnValue({
      safeAddress: '0x1234567890123456789012345678901234567890',
      safe: {
        chainId: '1',
      },
    } as any)
  })

  it('shows historical sync progress text when history is syncing', () => {
    render(<PaginatedTxns useTxns={useTxHistory as any} />, {
      initialReduxState: {
        txHistorySync: {
          loading: true,
          latestBlock: 1_000_000,
          syncedToBlock: 950_000,
        },
      } as any,
    })

    expect(screen.getByText('Scanning history... At Block: 950000 - Latest Block: 1000000')).toBeInTheDocument()
  })
})
