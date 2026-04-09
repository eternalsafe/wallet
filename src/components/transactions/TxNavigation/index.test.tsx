import { render, screen } from '@/tests/test-utils'
import TxNavigation from '.'

describe('TxNavigation', () => {
  it('shows scanning history status on the history tab', () => {
    render(<TxNavigation />, {
      routerProps: {
        pathname: '/transactions/history',
      },
      initialReduxState: {
        txHistorySync: {
          loading: true,
          latestBlock: 1_000_000,
          syncedToBlock: 450_001,
        },
      } as any,
    })

    expect(screen.getByText('Scanning history... At Block: 450001 - Latest Block: 1000000')).toBeInTheDocument()
  })

  it('shows synced history status on the history tab', () => {
    render(<TxNavigation />, {
      routerProps: {
        pathname: '/transactions/history',
      },
      initialReduxState: {
        txHistorySync: {
          loading: false,
          latestBlock: 1_000_000,
          syncedToBlock: 0,
        },
      } as any,
    })

    expect(screen.getByText('History scanned. Latest Block: 1000000.')).toBeInTheDocument()
  })

  it('does not show scanning history status on the queue tab', () => {
    render(<TxNavigation />, {
      routerProps: {
        pathname: '/transactions/queue',
      },
      initialReduxState: {
        txHistorySync: {
          loading: true,
          latestBlock: 1_000_000,
          syncedToBlock: 450_001,
        },
      } as any,
    })

    expect(screen.queryByText('Scanning history... At Block: 450001 - Latest Block: 1000000')).not.toBeInTheDocument()
  })
})
