import { fireEvent, render, screen } from '@/tests/test-utils'
import WalletConnectButton from '.'
import { useWalletConnectContext } from '@/components/common/WalletConnectProvider'
import useSafeInfo from '@/hooks/useSafeInfo'

jest.mock('@/components/common/WalletConnectProvider', () => ({
  useWalletConnectContext: jest.fn(),
}))

jest.mock('@/hooks/useSafeInfo', () => jest.fn())

jest.mock('@/components/common/WalletConnectPairingModal', () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) => (
    <div data-testid="walletconnect-pairing-modal">{open ? 'open' : 'closed'}</div>
  ),
}))

const mockUseWalletConnectContext = useWalletConnectContext as jest.Mock
const mockUseSafeInfo = useSafeInfo as jest.Mock

describe('WalletConnectButton', () => {
  beforeEach(() => {
    mockUseWalletConnectContext.mockReturnValue({
      sessions: [],
      pendingProposal: null,
      pendingRequest: null,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('is disabled when no Safe is loaded', () => {
    mockUseSafeInfo.mockReturnValue({ safeAddress: '' })

    render(<WalletConnectButton />)

    expect(screen.getByRole('button', { name: 'WalletConnect Pairing' })).toBeDisabled()
  })

  it('opens the pairing modal when a Safe is loaded and clicked', () => {
    mockUseSafeInfo.mockReturnValue({ safeAddress: '0x1234567890123456789012345678901234567890' })

    render(<WalletConnectButton />)

    const button = screen.getByRole('button', { name: 'WalletConnect Pairing' })
    expect(button).toBeEnabled()
    expect(screen.getByTestId('walletconnect-pairing-modal')).toHaveTextContent('closed')

    fireEvent.click(button)
    expect(screen.getByTestId('walletconnect-pairing-modal')).toHaveTextContent('open')
  })
})
