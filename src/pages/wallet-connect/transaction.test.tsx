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
  extractWalletConnectTxParams: jest.fn(),
}))

jest.mock('@/services/tx/tx-sender', () => ({
  createTx: jest.fn(),
}))

jest.mock('@/components/tx/SignOrExecuteForm', () => ({
  __esModule: true,
  default: () => <div data-testid="sign-or-execute-form" />,
}))

jest.mock('@/components/common/PageHeader', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div>{title}</div>,
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
  it('redirects to balances after rejecting a WalletConnect transaction', async () => {
    const push = jest.fn()
    const rejectRequest = jest.fn().mockResolvedValue(undefined)

    mockUseRouter.mockReturnValue({
      push,
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

    render(<WalletConnectTransactionPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Reject Transaction' }))

    await waitFor(() => {
      expect(rejectRequest).toHaveBeenCalledWith('User rejected the transaction')
    })

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith({
        pathname: AppRoutes.balances.index,
        query: {
          safe: 'eth:0x1234567890123456789012345678901234567890',
        },
      })
    })
  })
})
