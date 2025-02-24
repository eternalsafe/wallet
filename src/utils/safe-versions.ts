import { hasSafeFeature as sdkHasSafeFeature } from '@safe-global/protocol-kit/dist/src/utils'
import type { SAFE_FEATURES } from '@safe-global/protocol-kit/dist/src/utils'
import type { SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'
import type { Provider } from '@ethersproject/providers'
import { isValidSafeVersion } from '@/hooks/coreSDK/safeCoreSDK'

import { Gnosis_safe__factory as Gnosis_safe__factory111 } from '@/types/contracts/factories/@safe-global/safe-deployments/dist/assets/v1.1.1'
import { Gnosis_safe__factory as Gnosis_safe__factory120 } from '@/types/contracts/factories/@safe-global/safe-deployments/dist/assets/v1.2.0'
import {
  Gnosis_safe_l2__factory as Gnosis_safe_l2__factory130,
  Gnosis_safe__factory as Gnosis_safe__factory130,
} from '@/types/contracts/factories/@safe-global/safe-deployments/dist/assets/v1.3.0'
import {
  Safe_l2__factory as Safe_l2__factory141,
  Safe__factory as Safe__factory141,
} from '@/types/contracts/factories/@safe-global/safe-deployments/dist/assets/v1.4.1'

// Note: backend returns `SafeInfo['version']` as `null` for unsupported contracts
export const hasSafeFeature = (feature: SAFE_FEATURES, version: SafeInfo['version']): boolean => {
  if (!version) {
    return false
  }
  return sdkHasSafeFeature(feature, version)
}

function getSafeFactory(safeVersion: string | null) {
  const [version, isL2] = (safeVersion ?? '').split('+')
  if (!isValidSafeVersion(version)) return

  const factories = {
    '1.1.1': Gnosis_safe__factory111,
    '1.2.0': Gnosis_safe__factory120,
    '1.3.0': isL2 ? Gnosis_safe_l2__factory130 : Gnosis_safe__factory130,
    '1.4.1': isL2 ? Safe_l2__factory141 : Safe__factory141,
  }

  return factories[version]
}

export const getSafeABI = (safeVersion: string | null) => {
  return getSafeFactory(safeVersion)?.abi
}

export const getSafeContract = (safeAddress: string, safeVersion: string | null, provider: Provider) => {
  return getSafeFactory(safeVersion)?.connect(safeAddress, provider)
}
