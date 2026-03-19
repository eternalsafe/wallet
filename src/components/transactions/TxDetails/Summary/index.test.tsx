import { render, screen } from '@/tests/test-utils'
import type { TransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { DetailedExecutionInfoType } from '@safe-global/safe-gateway-typescript-sdk'
import Summary from '.'

const buildTxDetails = (value: string): TransactionDetails =>
  ({
    txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    detailedExecutionInfo: {
      type: DetailedExecutionInfoType.MULTISIG,
      confirmations: [],
      safeTxHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      baseGas: '0',
      gasPrice: '0',
      gasToken: '0x0000000000000000000000000000000000000000',
      refundReceiver: {
        value: '0x0000000000000000000000000000000000000000',
      },
      safeTxGas: '0',
      submittedAt: 1715720400000,
    },
    txData: {
      operation: 0,
      value,
      hexData: '0x',
    },
  } as TransactionDetails)

describe('Summary', () => {
  it('shows formatted transaction value in advanced details', () => {
    render(<Summary txDetails={buildTxDetails('1000000000000000000')} defaultExpanded />)

    expect(screen.getByText('Value:')).toBeInTheDocument()
    expect(screen.getByText('1 ETH')).toBeInTheDocument()
  })

  it('shows 0 ETH when value is empty', () => {
    render(<Summary txDetails={buildTxDetails('')} defaultExpanded />)

    expect(screen.getByText('0 ETH')).toBeInTheDocument()
  })
})
