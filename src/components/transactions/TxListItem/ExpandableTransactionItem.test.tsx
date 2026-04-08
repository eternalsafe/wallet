import { render, screen } from '@/tests/test-utils'
import ExpandableTransactionItem from './ExpandableTransactionItem'

describe('ExpandableTransactionItem', () => {
  it('is collapsed by default until clicked', () => {
    render(
      <ExpandableTransactionItem
        testId="expandable-tx-item"
        item={
          {
            type: 'TRANSACTION',
            conflictType: 'NONE',
            transaction: {
              id: 'multisig_0x577a0d87f4e6fbdd55d51ac4a4344ec042c04bb2_0x1234',
              timestamp: 1_800_000_000_000,
              txStatus: 'SUCCESS',
              txInfo: {
                type: 'Custom',
                to: { value: '0x1111111111111111111111111111111111111111' },
                dataSize: '0',
                value: '0',
                isCancellation: false,
              },
              executionInfo: {
                type: 'MULTISIG',
                nonce: 1,
                confirmationsRequired: 1,
                confirmationsSubmitted: 1,
              },
            },
          } as any
        }
        txDetails={
          {
            txData: {
              to: '0x1111111111111111111111111111111111111111',
              value: '0',
              data: '0x',
              operation: 0,
            },
          } as any
        }
      />,
    )

    const summaryButton = screen.getByRole('button')
    expect(summaryButton).toHaveAttribute('aria-expanded', 'false')
  })
})
