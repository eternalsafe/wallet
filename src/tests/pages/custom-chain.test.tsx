import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import CustomChain from '@/pages/custom-chain'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

const mockUseRouter = useRouter as jest.Mock

describe('custom-chain page', () => {
  const pushMock = jest.fn()
  const backMock = jest.fn()

  const submitForm = () => {
    const form = screen.getByRole('button', { name: 'Add Network' }).closest('form')
    if (!form) {
      throw new Error('Expected custom-chain form to exist')
    }
    fireEvent.submit(form)
  }

  const fillRequiredFields = (overrides: Partial<Record<string, string>> = {}) => {
    fireEvent.change(screen.getByLabelText(/Chain ID/i), { target: { value: overrides.chainId ?? '84532' } })
    fireEvent.change(screen.getByLabelText(/Network Name/i), { target: { value: overrides.chain ?? 'Base Sepolia' } })
    fireEvent.change(screen.getByLabelText(/Short Name/i), { target: { value: overrides.shortName ?? 'base-sepolia' } })
    fireEvent.change(screen.getByLabelText(/RPC URL/i), {
      target: { value: overrides.rpc ?? 'https://sepolia.base.org' },
    })
    fireEvent.change(screen.getByLabelText(/Currency Name/i), { target: { value: overrides.currency ?? 'Ether' } })
    fireEvent.change(screen.getByLabelText(/Currency Symbol/i), { target: { value: overrides.symbol ?? 'ETH' } })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: pushMock,
      back: backMock,
    })
  })

  it('blocks submission when required fields are missing', async () => {
    render(<CustomChain />)

    submitForm()

    expect(await screen.findByText('Chain ID is required')).toBeInTheDocument()
    expect(screen.getByText('Network name is required')).toBeInTheDocument()
    expect(screen.getByText('Short name is required')).toBeInTheDocument()
    expect(screen.getByText('RPC URL is required')).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('submits valid data and redirects to magic-network URL flow', async () => {
    render(<CustomChain />)

    fillRequiredFields()

    submitForm()

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith({
        pathname: '/',
        query: {
          chainId: '84532',
          chain: 'Base Sepolia',
          shortName: 'base-sepolia',
          rpc: 'https://sepolia.base.org',
          currency: 'Ether',
          symbol: 'ETH',
        },
      })
    })
  })

  it('validates malformed chainId, RPC protocol, and multisend addresses', async () => {
    render(<CustomChain />)

    fillRequiredFields({
      chainId: 'not-a-number',
      rpc: 'ftp://invalid-rpc.example',
    })
    fireEvent.change(screen.getByLabelText(/MultiSend Address/i), { target: { value: '0x1234' } })
    fireEvent.change(screen.getByLabelText(/MultiSendCallOnly Address/i), { target: { value: '0x5678' } })

    submitForm()

    expect(await screen.findByText('Chain ID must be a number')).toBeInTheDocument()
    expect(screen.getByText('Invalid RPC URL format')).toBeInTheDocument()
    expect(screen.getAllByText('Invalid Ethereum address')).toHaveLength(2)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('rejects chainId values that are zero or below', async () => {
    render(<CustomChain />)

    fillRequiredFields({ chainId: '0' })
    submitForm()

    expect(await screen.findByText('Chain ID must be greater than 0')).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
