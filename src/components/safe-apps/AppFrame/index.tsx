import { useContext, useState } from 'react'
import type { ReactElement } from 'react'
import { useCallback, useEffect } from 'react'
import { CircularProgress, Typography } from '@mui/material'
import { useRouter } from 'next/router'
import Head from 'next/head'
import type {
  AddressBookItem,
  BaseTransaction,
  EIP712TypedData,
  RequestId,
  SafeSettings,
  SendTransactionRequestParams,
} from '@safe-global/safe-apps-sdk'
import { Methods } from '@safe-global/safe-apps-sdk'

import { TxEvent, txSubscribe } from '@/services/tx/txEvents'
import useSafeInfo from '@/hooks/useSafeInfo'
import useChainId from '@/hooks/useChainId'
import useAddressBook from '@/hooks/useAddressBook'
import { useSafePermissions } from '@/hooks/safe-apps/permissions'
import { useCurrentChain } from '@/hooks/useChains'
import { isSameUrl } from '@/utils/url'
import useTransactionQueueBarState from '@/components/safe-apps/AppFrame/useTransactionQueueBarState'
import useAppIsLoading from './useAppIsLoading'
import useAppCommunicator, { CommunicatorMessages } from './useAppCommunicator'
import TransactionQueueBar, { TRANSACTION_BAR_HEIGHT } from './TransactionQueueBar'
import { safeMsgSubscribe, SafeMsgEvent } from '@/services/safe-messages/safeMsgEvents'
import { useAppSelector } from '@/store'
import { selectSafeMessages } from '@/store/safeMessagesSlice'
import { isSafeMessageListItem } from '@/utils/safe-message-guards'
import { isOffchainEIP1271Supported } from '@/utils/safe-messages'
import PermissionsPrompt from '@/components/safe-apps/PermissionsPrompt'
import { PermissionStatus, type SafeAppDataWithPermissions } from '@/components/safe-apps/types'

import css from './styles.module.css'
import SafeAppIframe from './SafeAppIframe'
import useGetSafeInfo from './useGetSafeInfo'
import { hasFeature, FEATURES } from '@/utils/chains'
import {
  selectSafeAppsUseLightBackground,
  selectTokenList,
  selectOnChainSigning,
  TOKEN_LISTS,
} from '@/store/settingsSlice'
import { TxModalContext } from '@/components/tx-flow'
import { SafeAppsTxFlow, SignMessageFlow, SignMessageOnChainFlow } from '@/components/tx-flow/flows'
import useBalances from '@/hooks/useBalances'
import { selectAddedTxs } from '@/store/addedTxsSlice'
import { selectTxHistory } from '@/store/txHistorySlice'
import { extractTxDetails } from '@/services/tx/extractTxInfo'
import { enrichTransactionDetailsFromHistory, partiallyDecodedTransaction } from '@/utils/transactions'

type AppFrameProps = {
  appUrl: string
  allowedFeaturesList: string
  safeAppFromManifest: SafeAppDataWithPermissions
}

const AppFrame = ({ appUrl, allowedFeaturesList, safeAppFromManifest }: AppFrameProps): ReactElement => {
  const chainId = useChainId()
  // We use offChainSigning by default
  const [settings, setSettings] = useState<SafeSettings>({
    offChainSigning: true,
  })
  const [currentRequestId, setCurrentRequestId] = useState<RequestId | undefined>()
  const safeMessages = useAppSelector(selectSafeMessages)
  const { safe, safeLoaded, safeAddress } = useSafeInfo()
  const { balances } = useBalances()
  const addedTxs = useAppSelector((state) => selectAddedTxs(state, chainId, safeAddress))
  const { data: txHistory } = useAppSelector(selectTxHistory)
  const tokenlist = useAppSelector(selectTokenList)
  const onChainSigning = useAppSelector(selectOnChainSigning)
  const useLightSafeAppsBackground = useAppSelector(selectSafeAppsUseLightBackground)

  const addressBook = useAddressBook()
  const chain = useCurrentChain()
  const router = useRouter()
  const {
    expanded: queueBarExpanded,
    dismissedByUser: queueBarDismissed,
    setExpanded,
    dismissQueueBar,
    transactions,
  } = useTransactionQueueBarState()
  const queueBarVisible = transactions.results.length > 0 && !queueBarDismissed
  const { iframeRef, appIsLoading, isLoadingSlow, setAppIsLoading } = useAppIsLoading()
  const { getPermissions, hasPermission, permissionsRequest, setPermissionsRequest, confirmPermissionRequest } =
    useSafePermissions()
  const { setTxFlow } = useContext(TxModalContext)

  const getTxBySafeTxHash = useCallback(
    async (safeTxHash: string) => {
      if (!safeAddress) {
        throw new Error('Safe is not loaded yet')
      }

      const localTx = addedTxs?.[safeTxHash]
      const executedTx = Object.values(txHistory || {}).find((tx) => tx.safeTxHash === safeTxHash)

      if (localTx) {
        const details = await extractTxDetails(safeAddress, localTx, safe)

        if (executedTx) {
          enrichTransactionDetailsFromHistory(details, executedTx)
        }

        return details
      }

      if (executedTx) {
        return partiallyDecodedTransaction(executedTx, safeAddress).details
      }

      throw new Error('Transaction not found locally')
    },
    [addedTxs, safe, safeAddress, txHistory],
  )

  const onTxFlowClose = () => {
    setCurrentRequestId((prevId) => {
      if (prevId) {
        communicator?.send(CommunicatorMessages.REJECT_TRANSACTION_MESSAGE, prevId, true)
      }
      return undefined
    })
  }

  const communicator = useAppCommunicator(iframeRef, safeAppFromManifest, chain, {
    onConfirmTransactions: (txs: BaseTransaction[], requestId: RequestId, params?: SendTransactionRequestParams) => {
      const data = {
        app: safeAppFromManifest,
        requestId: requestId,
        txs: txs,
        params: params,
      }

      setCurrentRequestId(requestId)
      setTxFlow(<SafeAppsTxFlow data={data} />, onTxFlowClose)
    },
    onSignMessage: (
      message: string | EIP712TypedData,
      requestId: string,
      method: Methods.signMessage | Methods.signTypedMessage,
      sdkVersion: string,
    ) => {
      const isOffChainSigningSupported = isOffchainEIP1271Supported(safe, chain, sdkVersion)
      const signOffChain = isOffChainSigningSupported && !onChainSigning && !!settings.offChainSigning

      setCurrentRequestId(requestId)

      if (signOffChain) {
        setTxFlow(
          <SignMessageFlow
            logoUri={safeAppFromManifest?.iconUrl || ''}
            name={safeAppFromManifest?.name || ''}
            message={message}
            requestId={requestId}
          />,
          onTxFlowClose,
        )
      } else {
        setTxFlow(
          <SignMessageOnChainFlow
            props={{
              app: safeAppFromManifest,
              requestId,
              message,
              method,
            }}
          />,
        )
      }
    },
    onGetPermissions: getPermissions,
    onSetPermissions: setPermissionsRequest,
    onRequestAddressBook: (origin: string): AddressBookItem[] => {
      if (hasPermission(origin, Methods.requestAddressBook)) {
        return Object.entries(addressBook).map(([address, name]) => ({ address, name, chainId }))
      }

      return []
    },
    onGetTxBySafeTxHash: getTxBySafeTxHash,
    onGetEnvironmentInfo: () => ({
      origin: document.location.origin,
    }),
    onGetSafeInfo: useGetSafeInfo(),
    onGetSafeBalances: async (_currency) => {
      const isDefaultTokenlistSupported = chain && hasFeature(chain, FEATURES.DEFAULT_TOKENLIST)
      const shouldIncludeOnlyTrustedTokens = isDefaultTokenlistSupported && TOKEN_LISTS.TRUSTED === tokenlist

      return {
        fiatTotal: '0',
        items: balances
          .filter((token) => {
            if (!shouldIncludeOnlyTrustedTokens) return true
            return !token.custom
          })
          .map((token) => ({
            tokenInfo: token.tokenInfo,
            balance: token.balance,
            fiatBalance: token.fiatBalance || '0',
            fiatConversion: token.fiatConversion || '0',
          })),
      }
    },
    onGetChainInfo: () => {
      if (!chain) return

      const { nativeCurrency, chainName, chainId, shortName, blockExplorerUriTemplate } = chain

      return {
        chainName,
        chainId,
        shortName,
        nativeCurrency,
        blockExplorerUriTemplate,
      }
    },
    onSetSafeSettings: (safeSettings: SafeSettings) => {
      const newSettings: SafeSettings = {
        ...settings,
        offChainSigning: !!safeSettings.offChainSigning,
      }

      setSettings(newSettings)

      return newSettings
    },
    onGetOffChainSignature: async (messageHash: string) => {
      const safeMessage = safeMessages.data?.results
        ?.filter(isSafeMessageListItem)
        ?.find((item) => item.messageHash === messageHash)

      if (safeMessage) {
        return safeMessage.preparedSignature
      }

      // TODO(issue #7): Re-implement off-chain signature lookup once issue #7 is closed.
      throw new Error('Off-chain signatures are not supported yet. See issue #7.')
    },
  })

  const onAcceptPermissionRequest = (_origin: string, requestId: RequestId) => {
    const permissions = confirmPermissionRequest(PermissionStatus.GRANTED)
    communicator?.send(permissions, requestId as string)
  }

  const onRejectPermissionRequest = (requestId?: RequestId) => {
    if (requestId) {
      confirmPermissionRequest(PermissionStatus.DENIED)
      communicator?.send('Permissions were rejected', requestId as string, true)
    } else {
      setPermissionsRequest(undefined)
    }
  }

  const onIframeLoad = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe || !isSameUrl(iframe.src, appUrl)) {
      return
    }

    setAppIsLoading(false)
  }, [appUrl, iframeRef, setAppIsLoading])

  useEffect(() => {
    const unsubscribe = txSubscribe(TxEvent.SAFE_APPS_REQUEST, async ({ safeAppRequestId, safeTxHash }) => {
      if (safeAppRequestId && currentRequestId === safeAppRequestId) {
        communicator?.send({ safeTxHash }, safeAppRequestId)
      }
    })

    return unsubscribe
  }, [chainId, communicator, currentRequestId])

  useEffect(() => {
    const unsubscribe = safeMsgSubscribe(SafeMsgEvent.SIGNATURE_PREPARED, ({ messageHash, requestId, signature }) => {
      if (requestId && currentRequestId === requestId) {
        communicator?.send({ messageHash, signature }, requestId)
      }
    })

    return unsubscribe
  }, [communicator, currentRequestId])

  if (!safeLoaded) {
    return <div />
  }

  return (
    <>
      <Head>
        <title>{`Safe Apps - Viewer - ${safeAppFromManifest.name}`}</title>
      </Head>

      <div className={css.wrapper} style={{ backgroundColor: useLightSafeAppsBackground ? '#fff' : undefined }}>
        {appIsLoading && (
          <div className={css.loadingContainer}>
            {isLoadingSlow && (
              <Typography variant="h4" gutterBottom>
                The Safe App is taking too long to load, consider refreshing.
              </Typography>
            )}
            <CircularProgress size={48} color="primary" />
          </div>
        )}

        <div
          style={{
            height: '100%',
            display: appIsLoading ? 'none' : 'block',
            paddingBottom: queueBarVisible ? TRANSACTION_BAR_HEIGHT : 0,
            backgroundColor: useLightSafeAppsBackground ? '#fff' : undefined,
          }}
        >
          <SafeAppIframe
            appUrl={appUrl}
            allowedFeaturesList={allowedFeaturesList}
            iframeRef={iframeRef}
            onLoad={onIframeLoad}
            title={safeAppFromManifest?.name}
          />
        </div>

        <TransactionQueueBar
          expanded={queueBarExpanded}
          visible={queueBarVisible && !queueBarDismissed}
          setExpanded={setExpanded}
          onDismiss={dismissQueueBar}
          transactions={transactions}
        />

        {permissionsRequest && (
          <PermissionsPrompt
            isOpen
            origin={permissionsRequest.origin}
            requestId={permissionsRequest.requestId}
            onAccept={onAcceptPermissionRequest}
            onReject={onRejectPermissionRequest}
            permissions={permissionsRequest.request}
          />
        )}
      </div>
    </>
  )
}

export default AppFrame
