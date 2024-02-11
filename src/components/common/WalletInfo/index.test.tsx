import { render } from '@/tests/test-utils'
import { WalletInfo } from '@/components/common/WalletInfo/index'
import { type EIP1193Provider, type OnboardAPI } from '@web3-onboard/core'
import * as constants from '@/config/constants'
import { act } from '@testing-library/react'

const mockWallet = {
  address: '0x1234567890123456789012345678901234567890',
  chainId: '5',
  label: '',
  provider: null as unknown as EIP1193Provider,
}

const mockOnboard = {
  connectWallet: jest.fn(),
  disconnectWallet: jest.fn(),
  setChain: jest.fn(),
} as unknown as OnboardAPI

describe('WalletInfo', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should display the wallet address', () => {
    const { getByText } = render(
      <WalletInfo
        wallet={mockWallet}
        onboard={mockOnboard}
        addressBook={{}}
        handleClose={jest.fn()}
        balance={undefined}
        currentChainId="1"
      />,
    )

    expect(getByText('0x1234...7890')).toBeInTheDocument()
  })

  it('should display a switch wallet button', () => {
    const { getByText } = render(
      <WalletInfo
        wallet={mockWallet}
        onboard={mockOnboard}
        addressBook={{}}
        handleClose={jest.fn()}
        balance={undefined}
        currentChainId="1"
      />,
    )

    expect(getByText('Switch wallet')).toBeInTheDocument()
  })

  it('should disconnect the wallet when the button is clicked', () => {
    const { getByText } = render(
      <WalletInfo
        wallet={mockWallet}
        onboard={mockOnboard}
        addressBook={{}}
        handleClose={jest.fn()}
        balance={undefined}
        currentChainId="1"
      />,
    )

    const disconnectButton = getByText('Disconnect')

    expect(disconnectButton).toBeInTheDocument()

    act(() => {
      disconnectButton.click()
    })

    expect(mockOnboard.disconnectWallet).toHaveBeenCalled()
  })

  it('should not display a Delete Account if not social login', () => {
    jest.spyOn(constants, 'IS_PRODUCTION', 'get').mockImplementation(() => false)

    const { queryByText } = render(
      <WalletInfo
        wallet={mockWallet}
        onboard={mockOnboard}
        addressBook={{}}
        handleClose={jest.fn()}
        balance={undefined}
        currentChainId="1"
      />,
    )

    expect(queryByText('Delete account')).not.toBeInTheDocument()
  })

  it('should not display an enable mfa button if mfa is already enabled', () => {
    const { queryByText } = render(
      <WalletInfo
        wallet={mockWallet}
        onboard={mockOnboard}
        addressBook={{}}
        handleClose={jest.fn()}
        balance={undefined}
        currentChainId="1"
      />,
    )

    expect(queryByText('Add multifactor authentication')).not.toBeInTheDocument()
  })
})
