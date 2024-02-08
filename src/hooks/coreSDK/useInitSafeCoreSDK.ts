import { useEffect } from 'react'
import { initSafeSDK, setSafeImplementation, setSafeSDK } from '@/hooks/coreSDK/safeCoreSDK'
import { trackError } from '@/services/exceptions'
import ErrorCodes from '@/services/exceptions/ErrorCodes'
import { useAppDispatch } from '@/store'
import { showNotification } from '@/store/notificationsSlice'
import { useWeb3ReadOnly } from '@/hooks/wallets/web3'
import { asError } from '@/services/exceptions/utils'
import { useUrlChainId } from '@/hooks/useChainId'
import useSafeAddress from '@/hooks/useSafeAddress'
import { bytes32ToAddress } from '@/utils/addresses'

export const useInitSafeCoreSDK = () => {
  const dispatch = useAppDispatch()
  const web3ReadOnly = useWeb3ReadOnly()
  const address = useSafeAddress()
  const chainId = useUrlChainId()

  useEffect(() => {
    if (!web3ReadOnly || !address || !chainId) {
      // If we don't reset the SDK, a previous Safe could remain in the store
      setSafeImplementation(undefined)
      setSafeSDK(undefined)
      return
    }

    // Get implementation address
    web3ReadOnly.getStorageAt(address, 0).then((impl) => {
      let implementation = bytes32ToAddress(impl)
      setSafeImplementation(implementation)

      // A read-only instance of the SDK is sufficient because we connect the signer to it when needed
      initSafeSDK({
        provider: web3ReadOnly,
        chainId: chainId,
        address: address,
        implementation,
      })
        .then(setSafeSDK)
        .catch((_e) => {
          const e = asError(_e)
          dispatch(
            showNotification({
              message: 'Please try connecting your wallet again.',
              groupKey: 'core-sdk-init-error',
              variant: 'error',
              detailedMessage: e.message,
            }),
          )
          trackError(ErrorCodes._105, e.message)
        })
    })
  }, [dispatch, address, chainId, web3ReadOnly])
}
