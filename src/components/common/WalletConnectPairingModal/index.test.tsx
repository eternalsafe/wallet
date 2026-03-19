import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import { useAppDispatch, useAppSelector } from '@/store'
import { useWalletConnectContext } from '@/components/common/WalletConnectProvider'
import WalletConnectPairingModal from '@/components/common/WalletConnectPairingModal'
import { AppRoutes } from '@/config/routes'
import { WALLET_CONNECT_RETURN_TO_QUERY_PARAM } from '@/utils/wallet-connect'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/store', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}))

jest.mock('@/components/common/WalletConnectProvider', () => ({
  useWalletConnectContext: jest.fn(),
}))

jest.mock('@/hooks/useSafeInfo', () => jest.fn(() => ({ safeAddress: '0x1234567890123456789012345678901234567890' })))
jest.mock('@/hooks/useChainId', () => jest.fn(() => '1'))

const mockUseRouter = useRouter as jest.Mock
const mockUseAppDispatch = useAppDispatch as jest.Mock
const mockUseAppSelector = useAppSelector as jest.Mock
const mockUseWalletConnectContext = useWalletConnectContext as jest.Mock

const baseWalletConnectContext = {
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
}

describe('WalletConnectPairingModal', () => {
  beforeEach(() => {
    mockUseAppDispatch.mockReturnValue(jest.fn())
    mockUseAppSelector.mockReturnValue('wc-project-id')
    mockUseWalletConnectContext.mockReturnValue(baseWalletConnectContext)
    mockUseRouter.mockReturnValue({
      query: { safe: 'eth:0x1234567890123456789012345678901234567890' },
      asPath: '/balances?safe=eth:0x1234567890123456789012345678901234567890',
      push: jest.fn(),
    })
  })

  it('shows tabs in order: Connect, Proposals, Transactions, Sessions', () => {
    const anchorEl = document.createElement('button')
    document.body.appendChild(anchorEl)

    render(<WalletConnectPairingModal open onClose={jest.fn()} anchorEl={anchorEl} />)

    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim())
    expect(tabs).toEqual(['Connect', 'Proposals', 'Transactions', 'Sessions'])
  })

  it('navigates to the WalletConnect transaction page from the Transactions tab', async () => {
    const push = jest.fn()
    const onClose = jest.fn()

    mockUseWalletConnectContext.mockReturnValue({
      ...baseWalletConnectContext,
      pendingRequest: {
        id: 7,
        topic: 'topic',
        params: {
          request: {
            method: 'eth_sendTransaction',
            params: [],
          },
          chainId: 'eip155:1',
        },
      },
    })

    mockUseRouter.mockReturnValue({
      query: { safe: 'eth:0x1234567890123456789012345678901234567890' },
      asPath: '/transactions/history?safe=eth:0x1234567890123456789012345678901234567890',
      push,
    })

    const anchorEl = document.createElement('button')
    document.body.appendChild(anchorEl)

    render(<WalletConnectPairingModal open onClose={onClose} anchorEl={anchorEl} />)

    await waitFor(() => {
      expect(screen.getByText('Pending Transaction Request')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Review transaction' }))

    expect(push).toHaveBeenCalledWith({
      pathname: AppRoutes.walletConnect.transaction,
      query: {
        safe: 'eth:0x1234567890123456789012345678901234567890',
        [WALLET_CONNECT_RETURN_TO_QUERY_PARAM]:
          '/transactions/history?safe=eth:0x1234567890123456789012345678901234567890',
      },
    })
    expect(onClose).toHaveBeenCalled()
  })
})
