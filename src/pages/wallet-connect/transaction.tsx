import React, { useCallback, useContext, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Box, Button } from '@mui/material'
import { useWalletConnectContext } from '@/components/common/WalletConnectProvider'
import { createTx } from '@/services/tx/tx-sender'
import SafeTxProvider, { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import SignOrExecuteForm from '@/components/tx/SignOrExecuteForm'
import PageHeader from '@/components/common/PageHeader'
import { AppRoutes } from '@/config/routes'
import useChainId from '@/hooks/useChainId'
import useSafeInfo from '@/hooks/useSafeInfo'
import {
  extractWalletConnectReturnTo,
  extractWalletConnectTxParams,
  WALLET_CONNECT_RETURN_TO_QUERY_PARAM,
} from '@/utils/wallet-connect'

const WalletConnectTxContent = () => {
  const router = useRouter()
  const { pendingRequest, approveRequest, rejectRequest } = useWalletConnectContext()
  const { setSafeTx, setSafeTxError } = useContext(SafeTxContext)
  const chainId = useChainId()
  const { safeAddress } = useSafeInfo()
  const txParams = extractWalletConnectTxParams(pendingRequest, chainId, safeAddress)

  const redirectToOriginPage = useCallback(() => {
    const returnTo = extractWalletConnectReturnTo(router.query[WALLET_CONNECT_RETURN_TO_QUERY_PARAM])
    if (returnTo != null && !returnTo.startsWith(AppRoutes.walletConnect.transaction)) {
      router.push(returnTo)
      return
    }

    const { [WALLET_CONNECT_RETURN_TO_QUERY_PARAM]: _ignoredReturnTo, ...queryWithoutReturnTo } = router.query

    router.push({
      pathname: AppRoutes.balances.index,
      query: queryWithoutReturnTo,
    })
  }, [router])

  useEffect(() => {
    if (!txParams) {
      redirectToOriginPage()
    }
  }, [txParams, redirectToOriginPage])

  useEffect(() => {
    const createSafeTx = async () => {
      if (!txParams) {
        return
      }

      try {
        const tx = await createTx({
          to: txParams.to,
          value: txParams.value,
          data: txParams.data,
          operation: 0, // Call
        })

        setSafeTx(tx)
      } catch (err) {
        console.error('Failed to create SafeTransaction:', err)
        setSafeTxError(err instanceof Error ? err : new Error('Failed to create transaction'))
      }
    }

    createSafeTx()
  }, [txParams, setSafeTx, setSafeTxError])

  const handleSubmit = async (txId: string, _isExecuted?: boolean) => {
    try {
      await approveRequest(txId)
      redirectToOriginPage()
    } catch (err) {
      console.error('Failed to approve WalletConnect request:', err)
      setSafeTxError(err instanceof Error ? err : new Error('Failed to approve WalletConnect request'))
    }
  }

  const handleReject = async () => {
    try {
      await rejectRequest('User rejected the transaction')
      redirectToOriginPage()
    } catch (err) {
      console.error('Failed to reject WalletConnect request:', err)
    }
  }

  if (!txParams) {
    return null
  }

  return (
    <>
      <PageHeader
        title="WalletConnect Transaction Request"
        action={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                color: 'text.secondary',
                fontSize: '14px',
              }}
            >
              A dApp is requesting to submit a transaction through WalletConnect
            </Box>
          </Box>
        }
      />

      <main>
        <Box sx={{ p: 3 }}>
          <SignOrExecuteForm onSubmit={handleSubmit} isCreation />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button variant="contained" color="error" onClick={handleReject} sx={{ minWidth: '200px' }}>
              Reject Transaction
            </Button>
          </Box>
        </Box>
      </main>
    </>
  )
}

const WalletConnectTransactionPage = () => {
  return (
    <SafeTxProvider>
      <WalletConnectTxContent />
    </SafeTxProvider>
  )
}

export default WalletConnectTransactionPage
