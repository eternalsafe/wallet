import { render, screen } from '@/tests/test-utils'
import userEvent from '@testing-library/user-event'
import CreateCustomTx from '@/components/tx-flow/flows/CustomTransaction/CreateCustomTx'

jest.mock('@/hooks/useChains', () => ({
  useCurrentChain: () => ({ nativeCurrency: { symbol: 'ETH', decimals: 18 } }),
}))

jest.mock('@/hooks/useBalances', () => ({
  __esModule: true,
  default: () => ({
    balances: [
      {
        tokenInfo: { type: 'NATIVE_TOKEN', symbol: 'ETH', decimals: 18 },
        balance: '1000000000000000000',
      },
    ],
    loading: false,
  }),
}))

describe('CreateCustomTx', () => {
  it('prevents submit with odd-length calldata', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()

    render(
      <CreateCustomTx
        params={{
          contractAddress: '',
          value: '0',
          calldata: '0x',
        }}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('Contract address'), '0x1234567890123456789012345678901234567890')
    await user.clear(screen.getByLabelText('Calldata'))
    await user.type(screen.getByLabelText('Calldata'), '0x123')

    expect(await screen.findByText('Hex data must have even number of characters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('prevents submit when value exceeds native balance', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()

    render(
      <CreateCustomTx
        params={{
          contractAddress: '',
          value: '0',
          calldata: '0x',
        }}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText('Contract address'), '0x1234567890123456789012345678901234567890')
    await user.clear(screen.getByLabelText('Value'))
    await user.type(screen.getByLabelText('Value'), '2')

    expect(await screen.findByText('Insufficient balance')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
