import React, { useCallback, useContext, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useWalletConnectContext } from '@/components/common/WalletConnectProvider'
import { createTx } from '@/services/tx/tx-sender'
import { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import SignOrExecuteForm from '@/components/tx/SignOrExecuteForm'
import TxLayout from '@/components/tx-flow/common/TxLayout'
import TxModalDialog from '@/components/common/TxModalDialog'
import { AppRoutes } from '@/config/routes'
import useChainId from '@/hooks/useChainId'
import useSafeInfo from '@/hooks/useSafeInfo'
import {
  extractWalletConnectReturnTo,
  extractWalletConnectTxParams,
  WALLET_CONNECT_RETURN_TO_QUERY_PARAM,
} from '@/utils/wallet-connect'

type WalletConnectTxParams = NonNullable<ReturnType<typeof extractWalletConnectTxParams>>

const WalletConnectTxReview = ({
  txParams,
  onSubmit,
}: {
  txParams: WalletConnectTxParams
  onSubmit: (txId: string, isExecuted?: boolean) => Promise<void>
}) => {
  const { setSafeTx, setSafeTxError } = useContext(SafeTxContext)

  useEffect(() => {
    createTx({
      to: txParams.to,
      value: txParams.value,
      data: txParams.data,
      operation: 0, // Call
    })
      .then(setSafeTx)
      .catch((err) => {
        setSafeTxError(err instanceof Error ? err : new Error('Failed to create transaction'))
      })
  }, [txParams, setSafeTx, setSafeTxError])

  const handleSubmit = async (txId: string, isExecuted?: boolean) => {
    try {
      await onSubmit(txId, isExecuted)
    } catch (err) {
      setSafeTxError(err instanceof Error ? err : new Error('Failed to approve WalletConnect request'))
      throw err
    }
  }

  return <SignOrExecuteForm onSubmit={handleSubmit} isCreation />
}

const WalletConnectTransactionPage = () => {
  const router = useRouter()
  const { pendingRequest, approveRequest, rejectRequest } = useWalletConnectContext()
  const isRequestHandledRef = useRef(false)
  const chainId = useChainId()
  const { safeAddress } = useSafeInfo()
  const txParams = extractWalletConnectTxParams(pendingRequest, chainId, safeAddress)

  useEffect(() => {
    document.title = 'Eternal Safe - WalletConnect Transaction'
  }, [])

  useEffect(() => {
    return () => {
      if (isRequestHandledRef.current || !pendingRequest) {
        return
      }

      isRequestHandledRef.current = true
      void rejectRequest('User rejected the transaction').catch((err) => {
        console.error('Failed to reject WalletConnect request on page leave:', err)
      })
    }
  }, [pendingRequest, rejectRequest])

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

  const handleSubmit = async (txId: string, _isExecuted?: boolean) => {
    await approveRequest(txId)
    isRequestHandledRef.current = true
    redirectToOriginPage()
  }

  const rejectCurrentRequest = useCallback(async () => {
    if (isRequestHandledRef.current) {
      return
    }

    isRequestHandledRef.current = true

    try {
      await rejectRequest('User rejected the transaction')
    } catch (err) {
      isRequestHandledRef.current = false
      throw err
    }
  }, [rejectRequest])

  const handleReject = async () => {
    try {
      await rejectCurrentRequest()
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
      <TxModalDialog open onClose={() => void handleReject()} fullWidth>
        <TxLayout title="Confirm transaction" subtitle="WalletConnect transaction request" step={0}>
          <WalletConnectTxReview txParams={txParams} onSubmit={handleSubmit} />
        </TxLayout>
      </TxModalDialog>
    </>
  )
}

export default WalletConnectTransactionPage
