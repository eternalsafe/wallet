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
import type Safe from '@safe-global/protocol-kit'
import { _SAFE_DEPLOYMENTS, _SAFE_L2_DEPLOYMENTS } from '@safe-global/safe-deployments/dist/deployments'
import semverSatisfies from 'semver/functions/satisfies'

const isKnownContract = (address: string): boolean => {
  return _SAFE_DEPLOYMENTS
    .concat(_SAFE_L2_DEPLOYMENTS)
    .some((safeDeployments) =>
      (Object.values(safeDeployments.deployments) ?? []).some((deployment) => deployment.address === address),
    )
}

export const getSafeInfo = async (sdk: Safe, implementation: string): Promise<SafeInfo> => {
  const [address, chainId, nonce, threshold, owners, modules, guard, fallbackHandler, contractVersion] =
    await Promise.all([
      sdk.getAddress(),
      sdk.getChainId(),
      sdk.getNonce(),
      sdk.getThreshold(),
      sdk.getOwners(),
      sdk.getModules(),
      sdk.getGuard().catch(console.error),
      sdk.getFallbackHandler(),
      sdk.getContractVersion(),
    ])

  let version = contractVersion.toString()
  if (!sdk.getContractManager().isL1SafeMasterCopy) {
    version = version + '+L2'
  }

  let implementationVersionState = isKnownContract(implementation)
    ? semverSatisfies(version, '<1.4.1')
      ? ImplementationVersionState.OUTDATED
      : ImplementationVersionState.UP_TO_DATE
    : ImplementationVersionState.UNKNOWN

  let info: SafeInfo = {
    address: { value: address },
    chainId: chainId.toString(),
    nonce,
    threshold,
    owners: owners.map(addressEx),
    implementation: addressEx(implementation),
    implementationVersionState,

    modules: modules.map(addressEx),
    guard: guard ? addressEx(guard) : null,
    fallbackHandler: addressEx(fallbackHandler),
    version,

    // these tags are used to force hook reloads, not needed in Eternal Safe
    collectiblesTag: '',
    txQueuedTag: '',
    txHistoryTag: '',
    messagesTag: '',
  }

  return info
}

export const useLoadSafeInfo = (): AsyncResult<SafeInfo> => {
  const address = useSafeAddress()
  const chainId = useChainId()
  const [pollCount, resetPolling] = useIntervalCounter(POLLING_INTERVAL)
  const sdk = useSafeSDK()
  const implementation = useSafeImplementation()
  const { safe } = useSafeInfo()
  const isStoredSafeValid = safe.chainId === chainId && safe.address.value === address

  const [data, error, loading] = useAsync<SafeInfo | undefined>(async () => {
    if (!sdk || !implementation) return

    return await getSafeInfo(sdk, implementation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollCount, sdk, implementation])

  // Reset the counter when safe SDK (based on address/chainId) changes
  useEffect(() => {
    resetPolling()
  }, [resetPolling, sdk])

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
