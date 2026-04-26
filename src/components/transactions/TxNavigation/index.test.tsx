import { render, screen } from '@/tests/test-utils'
import TxNavigation from '.'
import * as useSafeInfoHook from '@/hooks/useSafeInfo'

describe('TxNavigation', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.spyOn(useSafeInfoHook, 'default').mockReturnValue({
      safeAddress: '0xSafe',
      safe: { chainId: '1' },
      safeLoaded: true,
      safeLoading: false,
      safeError: undefined,
    } as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows scanning progress on the history route', () => {
    render(<TxNavigation />, {
      routerProps: { pathname: '/transactions/history' },
      initialReduxState: {
        historicalRpcSync: {
          txHistoryBySafe: {
            '1:0xsafe': {
              latestSyncedBlock: 100,
              backfillCursor: 80,
              backfillComplete: false,
            },
          },
        },
      } as any,
    })

    expect(screen.getByText('Scanning history... block 80 of 100')).toBeInTheDocument()
  })

  it('shows completed progress once backfill reaches block zero', () => {
    render(<TxNavigation />, {
      routerProps: { pathname: '/transactions/history' },
      initialReduxState: {
        historicalRpcSync: {
          txHistoryBySafe: {
            '1:0xsafe': {
              latestSyncedBlock: 100,
              backfillCursor: 0,
              backfillComplete: true,
            },
          },
        },
      } as any,
    })

    expect(screen.getByText('History scanned. Latest block: 100')).toBeInTheDocument()
  })
})
