import React from 'react'
import { fireEvent, render, screen, waitFor } from '@/tests/test-utils'
import WalletConnectTransactionPage from '@/pages/wallet-connect/transaction'
import { AppRoutes } from '@/config/routes'
import { useRouter } from 'next/router'
import { useWalletConnectContext } from '@/components/common/WalletConnectProvider'
import { extractWalletConnectTxParams } from '@/utils/wallet-connect'
import { createTx } from '@/services/tx/tx-sender'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/components/common/WalletConnectProvider', () => ({
  useWalletConnectContext: jest.fn(),
}))

jest.mock('@/hooks/useChainId', () => jest.fn(() => '1'))

jest.mock('@/hooks/useSafeInfo', () => jest.fn(() => ({ safeAddress: '0x1234567890123456789012345678901234567890' })))

jest.mock('@/utils/wallet-connect', () => ({
  ...jest.requireActual('@/utils/wallet-connect'),
  extractWalletConnectTxParams: jest.fn(),
}))

jest.mock('@/services/tx/tx-sender', () => ({
  createTx: jest.fn(),
}))

jest.mock('@/components/tx/SignOrExecuteForm', () => ({
  __esModule: true,
  default: ({ onSubmit }: { onSubmit?: (txId: string) => Promise<void> }) => (
    <div data-testid="sign-or-execute-form">
      <button onClick={() => void onSubmit?.('tx-id')}>confirm-sign</button>
    </div>
  ),
}))

jest.mock('@/components/tx-flow/common/TxLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/common/TxModalDialog', () => ({
  __esModule: true,
  default: ({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) => (
    <div>
      <button aria-label="close" onClick={() => onClose?.()}>
        close
      </button>
      {children}
    </div>
  ),
}))

jest.mock('@/components/tx-flow/SafeTxProvider', () => {
  const React = require('react')
  const setSafeTx = jest.fn()
  const setSafeTxError = jest.fn()
  const SafeTxContext = React.createContext({
    setSafeTx,
    setSafeTxError,
  })

  const SafeTxProvider = ({ children }: { children: React.ReactNode }) => (
    <SafeTxContext.Provider
      value={{
        setSafeTx,
        setSafeTxError,
      }}
    >
      {children}
    </SafeTxContext.Provider>
  )

  return {
    __esModule: true,
    default: SafeTxProvider,
    SafeTxContext,
  }
})

const mockUseRouter = useRouter as jest.Mock
const mockUseWalletConnectContext = useWalletConnectContext as jest.Mock
const mockExtractWalletConnectTxParams = extractWalletConnectTxParams as jest.Mock
const mockCreateTx = createTx as jest.Mock

describe('WalletConnect transaction page', () => {
  it('redirects to the origin page after rejecting a WalletConnect transaction', async () => {
    const push = jest.fn()
    const rejectRequest = jest.fn().mockResolvedValue(undefined)

    mockUseRouter.mockReturnValue({
      push,
      query: {
        safe: 'eth:0x1234567890123456789012345678901234567890',
        returnTo: '/transactions/history?safe=eth:0x1234567890123456789012345678901234567890',
      },
    })

    mockUseWalletConnectContext.mockReturnValue({
      pendingRequest: { id: 1 },
      approveRequest: jest.fn(),
      rejectRequest,
    })

    mockExtractWalletConnectTxParams.mockReturnValue({
      to: '0x3430d04E42a722c5Ae52C5Bffbf1F230C2677600',
      value: '0',
      data: '0x',
    })

    mockCreateTx.mockResolvedValue({})

    render(<WalletConnectTransactionPage />)

    await waitFor(() => {
      expect(document.title).toBe('Eternal Safe - WalletConnect Transaction')
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'close' })[0])

    await waitFor(() => {
      expect(rejectRequest).toHaveBeenCalledWith('User rejected the transaction')
    })

    expect(rejectRequest).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/transactions/history?safe=eth:0x1234567890123456789012345678901234567890')
    })
  })

  it('falls back to balances when returnTo is invalid', async () => {
    const push = jest.fn()
    const rejectRequest = jest.fn().mockResolvedValue(undefined)

    mockUseRouter.mockReturnValue({
      push,
      query: {
        safe: 'eth:0x1234567890123456789012345678901234567890',
        returnTo: 'https://example.com',
      },
    })

    mockUseWalletConnectContext.mockReturnValue({
      pendingRequest: { id: 1 },
      approveRequest: jest.fn(),
      rejectRequest,
    })

    mockExtractWalletConnectTxParams.mockReturnValue({
      to: '0x3430d04E42a722c5Ae52C5Bffbf1F230C2677600',
      value: '0',
      data: '0x',
    })

    mockCreateTx.mockResolvedValue({})

    render(<WalletConnectTransactionPage />)

    fireEvent.click(screen.getAllByRole('button', { name: 'close' })[0])

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith({
        pathname: AppRoutes.balances.index,
        query: {
          safe: 'eth:0x1234567890123456789012345678901234567890',
        },
      })
    })
  })

  it('rejects pending request when leaving the WalletConnect transaction page', async () => {
    const rejectRequest = jest.fn().mockResolvedValue(undefined)

    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      query: {
        safe: 'eth:0x1234567890123456789012345678901234567890',
      },
    })

    mockUseWalletConnectContext.mockReturnValue({
      pendingRequest: { id: 1 },
      approveRequest: jest.fn(),
      rejectRequest,
    })

    mockExtractWalletConnectTxParams.mockReturnValue({
      to: '0x3430d04E42a722c5Ae52C5Bffbf1F230C2677600',
      value: '0',
      data: '0x',
    })

    mockCreateTx.mockResolvedValue({})

    const { unmount } = render(<WalletConnectTransactionPage />)
    unmount()

    await waitFor(() => {
      expect(rejectRequest).toHaveBeenCalledWith('User rejected the transaction')
    })
  })

  it('does not auto-reject after a successful approval', async () => {
    const push = jest.fn()
    const approveRequest = jest.fn().mockResolvedValue(undefined)
    const rejectRequest = jest.fn().mockResolvedValue(undefined)

    mockUseRouter.mockReturnValue({
      push,
      query: {
        safe: 'eth:0x1234567890123456789012345678901234567890',
        returnTo: '/balances?safe=eth:0x1234567890123456789012345678901234567890',
      },
    })

    mockUseWalletConnectContext.mockReturnValue({
      pendingRequest: { id: 1 },
      approveRequest,
      rejectRequest,
    })

    mockExtractWalletConnectTxParams.mockReturnValue({
      to: '0x3430d04E42a722c5Ae52C5Bffbf1F230C2677600',
      value: '0',
      data: '0x',
    })

    mockCreateTx.mockResolvedValue({})

    const { unmount } = render(<WalletConnectTransactionPage />)

    fireEvent.click(screen.getByRole('button', { name: 'confirm-sign' }))

    await waitFor(() => {
      expect(approveRequest).toHaveBeenCalledWith('tx-id')
      expect(push).toHaveBeenCalledWith('/balances?safe=eth:0x1234567890123456789012345678901234567890')
    })

    unmount()

    expect(rejectRequest).not.toHaveBeenCalled()
  })
})
