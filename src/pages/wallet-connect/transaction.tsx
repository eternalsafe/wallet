import React, { useCallback, useContext, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Box, Container, Grid, IconButton, Paper, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useWalletConnectContext } from '@/components/common/WalletConnectProvider'
import { createTx } from '@/services/tx/tx-sender'
import SafeTxProvider, { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import SignOrExecuteForm from '@/components/tx/SignOrExecuteForm'
import ChainIndicator from '@/components/common/ChainIndicator'
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

  useEffect(() => {
    document.title = 'Eternal Safe - WalletConnect Transaction'
  }, [])

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
      <Head>
        <title>Eternal Safe - WalletConnect Transaction</title>
      </Head>

      <Container sx={{ mt: 2 }}>
        <Grid container justifyContent="center">
          <Grid item xs={12} md={11} display="flex" flexDirection="column">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h3">WalletConnect Transaction Request</Typography>
              <ChainIndicator inline />
            </Box>

            <Paper sx={{ position: 'relative' }}>
              <IconButton
                aria-label="Reject transaction request"
                onClick={handleReject}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: 'border.main',
                  p: 1,
                  backgroundColor: 'border.light',
                  '&:hover': {
                    backgroundColor: 'border.light',
                  },
                }}
              >
                <CloseIcon fontSize="large" />
              </IconButton>

              <Box sx={{ px: 4, py: 4 }}>
                <SignOrExecuteForm onSubmit={handleSubmit} isCreation />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
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
