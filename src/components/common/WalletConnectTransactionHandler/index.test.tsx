import React from 'react'
import { render, waitFor } from '@/tests/test-utils'
import { useRouter } from 'next/router'
import { useWalletConnectContext } from '@/components/common/WalletConnectProvider'
import useSafeInfo from '@/hooks/useSafeInfo'
import WalletConnectTransactionHandler from '@/components/common/WalletConnectTransactionHandler'
import { AppRoutes } from '@/config/routes'
import { WALLET_CONNECT_RETURN_TO_QUERY_PARAM } from '@/utils/wallet-connect'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/components/common/WalletConnectProvider', () => ({
  useWalletConnectContext: jest.fn(),
}))

jest.mock('@/hooks/useSafeInfo', () => jest.fn())

const mockUseRouter = useRouter as jest.Mock
const mockUseWalletConnectContext = useWalletConnectContext as jest.Mock
const mockUseSafeInfo = useSafeInfo as jest.Mock

describe('WalletConnectTransactionHandler', () => {
  it('stores the current page in returnTo when redirecting to WalletConnect transaction page', async () => {
    const push = jest.fn()

    mockUseRouter.mockReturnValue({
      pathname: AppRoutes.transactions.history,
      asPath: '/transactions/history?safe=eth:0x1234567890123456789012345678901234567890',
      query: {
        safe: 'eth:0x1234567890123456789012345678901234567890',
      },
      push,
    })

    mockUseSafeInfo.mockReturnValue({
      safeAddress: '0x1234567890123456789012345678901234567890',
    })

    mockUseWalletConnectContext.mockReturnValue({
      pendingRequest: {
        id: 1,
        params: {
          request: {
            method: 'eth_sendTransaction',
          },
        },
      },
    })

    render(<WalletConnectTransactionHandler />)

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith({
        pathname: AppRoutes.walletConnect.transaction,
        query: {
          safe: 'eth:0x1234567890123456789012345678901234567890',
          [WALLET_CONNECT_RETURN_TO_QUERY_PARAM]:
            '/transactions/history?safe=eth:0x1234567890123456789012345678901234567890',
        },
      })
    })
  })
})
