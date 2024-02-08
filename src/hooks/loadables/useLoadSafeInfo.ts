import { useEffect } from 'react'
import { ImplementationVersionState, type SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'
import useAsync, { type AsyncResult } from '../useAsync'
import useSafeAddress from '../useSafeAddress'
import { useChainId } from '../useChainId'
import useIntervalCounter from '../useIntervalCounter'
import useSafeInfo from '../useSafeInfo'
import { Errors, logError } from '@/services/exceptions'
import { POLLING_INTERVAL } from '@/config/constants'
import { useSafeImplementation, useSafeSDK } from '@/hooks/coreSDK/safeCoreSDK'
import { addressEx } from '@/utils/addresses'

export const useLoadSafeInfo = (): AsyncResult<SafeInfo> => {
  const address = useSafeAddress()
  const chainId = useChainId()
  const [pollCount, resetPolling] = useIntervalCounter(POLLING_INTERVAL)
  const sdk = useSafeSDK()
  const implementation = useSafeImplementation()
  const { safe } = useSafeInfo()
  const isStoredSafeValid = safe.chainId === chainId && safe.address.value === address

  const [data, error, loading] = useAsync<SafeInfo | undefined>(async () => {
    if (!chainId || !address || !sdk || !implementation) return

    let [nonce, threshold, owners, modules, guard, fallbackHandler, version] = await Promise.all([
      sdk.getNonce(),
      sdk.getThreshold(),
      sdk.getOwners(),
      sdk.getModules(),
      sdk.getGuard(),
      sdk.getFallbackHandler(),
      sdk.getContractVersion(),
    ])

    let info: SafeInfo = {
      address: { value: address },
      chainId,
      nonce,
      threshold,
      owners: owners.map(addressEx),
      implementation: addressEx(implementation),
      // TODO(devanon): Get version state: https://github.com/safe-global/safe-client-gateway/blob/main/src/routes/safes/safes.service.ts#L233
      implementationVersionState: ImplementationVersionState.UP_TO_DATE,

      modules: modules.map(addressEx),
      guard: addressEx(guard),
      fallbackHandler: addressEx(fallbackHandler),
      version,

      // TODO(devanon): these tags are used to force a hook reload, probably not needed here but should check: https://github.com/safe-global/safe-client-gateway/blob/main/src/routes/safes/safes.service.ts#L103
      collectiblesTag: '',
      txQueuedTag: '',
      txHistoryTag: '',
      messagesTag: '',
    }

    return info
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, address, pollCount, sdk, implementation])

  // Reset the counter when safe address/chainId changes
  useEffect(() => {
    resetPolling()
  }, [resetPolling, address, chainId])

  // Log errors
  useEffect(() => {
    if (error) {
      logError(Errors._600, error.message)
    }
  }, [error])

  return [
    // Return stored SafeInfo between polls
    data ?? (isStoredSafeValid ? safe : data),
    error,
    loading,
  ]
}

export default useLoadSafeInfo
