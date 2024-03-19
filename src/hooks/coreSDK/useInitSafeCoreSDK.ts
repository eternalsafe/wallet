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
import { ethers } from 'ethers'

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

    web3ReadOnly
      .getNetwork()
      .then((network) => {
        if (network.chainId === Number(chainId)) {
          // get implementation address
          return web3ReadOnly.getStorageAt(address, 0)
        } else {
          throw {
            skip: true,
          }
        }
      })
      .then((impl) => {
        if (!impl || impl === ethers.constants.HashZero) {
          throw new Error(`Nothing set on storage slot 0 in ${address}.`)
        }

        let implementation = bytes32ToAddress(impl)
        setSafeImplementation(implementation)

        // A read-only instance of the SDK is sufficient because we connect the signer to it when needed
        return initSafeSDK({
          provider: web3ReadOnly,
          chainId,
          address,
          implementation,
        })
      })
      .then(setSafeSDK)
      .catch((_e) => {
        if (_e?.skip) return

        setSafeImplementation(undefined)
        setSafeSDK(undefined)

        const e = asError(_e)
        dispatch(
          showNotification({
            message: 'Please try connecting your Safe again, ensure the address and chain are correct.',
            groupKey: 'core-sdk-init-error',
            variant: 'error',
            detailedMessage: e.message,
          }),
        )
        trackError(ErrorCodes._105, e.message)
      })
  }, [dispatch, address, chainId, web3ReadOnly])
}
