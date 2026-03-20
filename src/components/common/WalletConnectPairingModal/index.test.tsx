import React from 'react'
import { render, screen } from '@testing-library/react'
import { useAppDispatch, useAppSelector } from '@/store'
import { useWalletConnectContext } from '@/components/common/WalletConnectProvider'
import WalletConnectPairingModal from '@/components/common/WalletConnectPairingModal'

jest.mock('@/store', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}))

jest.mock('@/components/common/WalletConnectProvider', () => ({
  useWalletConnectContext: jest.fn(),
}))

jest.mock('@/hooks/useSafeInfo', () => jest.fn(() => ({ safeAddress: '0x1234567890123456789012345678901234567890' })))
jest.mock('@/hooks/useChainId', () => jest.fn(() => '1'))

const mockUseAppDispatch = useAppDispatch as jest.Mock
const mockUseAppSelector = useAppSelector as jest.Mock
const mockUseWalletConnectContext = useWalletConnectContext as jest.Mock

describe('WalletConnectPairingModal', () => {
  beforeEach(() => {
    mockUseAppDispatch.mockReturnValue(jest.fn())
    mockUseAppSelector.mockReturnValue('wc-project-id')
    mockUseWalletConnectContext.mockReturnValue({
      isInitialized: true,
      isInitializing: false,
      sessions: [],
      pendingProposal: null,
      pendingRequest: null,
      error: null,
      pair: jest.fn(),
      approveSession: jest.fn(),
      rejectSession: jest.fn(),
      approveRequest: jest.fn(),
      rejectRequest: jest.fn(),
      disconnectSession: jest.fn(),
      updateSession: jest.fn(),
    })
  })

  it('shows Connect/Proposals/Sessions tabs and no Transactions tab', () => {
    const anchorEl = document.createElement('button')
    document.body.appendChild(anchorEl)

    render(<WalletConnectPairingModal open onClose={jest.fn()} anchorEl={anchorEl} />)

    expect(screen.getByRole('tab', { name: 'Connect' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Proposals' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Sessions' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Transactions' })).not.toBeInTheDocument()
  })
})
