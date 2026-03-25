import { asError } from '@/services/exceptions/utils'
import { dispatchPreparedSignature } from '@/services/safe-messages/safeMsgNotifications'
import { dispatchSafeMsgProposal, dispatchSafeMsgConfirmation } from '@/services/safe-messages/safeMsgSender'
import { type EIP712TypedData, type SafeMessage } from '@safe-global/safe-gateway-typescript-sdk'
import { useEffect, useCallback, useState } from 'react'
import useSafeInfo from '../useSafeInfo'
import useOnboard from '../wallets/useOnboard'

const HIDE_DELAY = 3000

const useSyncSafeMessageSigner = (
  message: SafeMessage | undefined,
  decodedMessage: string | EIP712TypedData,
  safeMessageHash: string,
  requestId: string | undefined,
  safeAppId: number | undefined,
  onClose: () => void,
) => {
  const [submitError, setSubmitError] = useState<Error | undefined>()
  const onboard = useOnboard()
  const { safe } = useSafeInfo()

  // If the message gets updated in the messageSlice we dispatch it if the signature is complete
  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined
    if (message?.preparedSignature) {
      timeout = setTimeout(() => dispatchPreparedSignature(message, safeMessageHash, onClose, requestId), HIDE_DELAY)
    }
    return () => clearTimeout(timeout)
  }, [message, safe.chainId, safeMessageHash, onClose, requestId])

  const onSign = useCallback(async (): Promise<SafeMessage | undefined> => {
    // Error is shown when no wallet is connected, this appeases TypeScript
    if (!onboard) {
      return
    }

    setSubmitError(undefined)

    try {
      // When collecting the first signature
      if (!message) {
        await dispatchSafeMsgProposal({ onboard, safe, message: decodedMessage, safeAppId })
        return
      } else {
        await dispatchSafeMsgConfirmation({ onboard, safe, message: decodedMessage })

        // No requestID => we are in the confirm message dialog and do not need to leave the window open
        if (!requestId) {
          onClose()
          return
        }
        return
      }
    } catch (e) {
      setSubmitError(asError(e))
    }
  }, [onboard, requestId, message, safe, decodedMessage, safeAppId, onClose])

  return { submitError, onSign }
}

export default useSyncSafeMessageSigner
