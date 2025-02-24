import { getMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import { _SAFE_DEPLOYMENTS } from '@safe-global/safe-deployments/dist/deployments'
import ExternalStore from '@/services/ExternalStore'
import { Gnosis_safe__factory } from '@/types/contracts'
import { invariant } from '@/utils/helpers'
import type { Web3Provider } from '@ethersproject/providers'
import Safe, { EthersAdapter } from '@safe-global/protocol-kit'
import type { SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'
import type { Provider } from '@ethersproject/providers'
import { ethers } from 'ethers'
import semverSatisfies from 'semver/functions/satisfies'

export const isLegacyVersion = (safeVersion: string): boolean => {
  const LEGACY_VERSION = '<1.3.0'
  return semverSatisfies(safeVersion, LEGACY_VERSION)
}

export type ModernSafeVersion = '1.1.1' | '1.2.0' | '1.3.0' | '1.4.1'

export const isValidSafeVersion = (safeVersion?: SafeInfo['version']): safeVersion is ModernSafeVersion => {
  const SAFE_VERSIONS: ModernSafeVersion[] = ['1.4.1', '1.3.0', '1.2.0', '1.1.1']
  return !!safeVersion && SAFE_VERSIONS.some((version) => semverSatisfies(safeVersion, version))
}

// `assert` does not work with arrow functions
export function assertValidSafeVersion<T extends SafeInfo['version']>(safeVersion?: T): asserts safeVersion {
  return invariant(isValidSafeVersion(safeVersion), `${safeVersion} is not a valid Safe Account version`)
}

export const createEthersAdapter = (provider: Web3Provider) => {
  const signer = provider.getSigner(0)
  return new EthersAdapter({
    ethers,
    signerOrProvider: signer,
  })
}

export const createReadOnlyEthersAdapter = (provider: Provider | undefined = getMultiWeb3ReadOnly()) => {
  if (!provider) {
    throw new Error('Unable to create `EthersAdapter` without a provider')
  }

  return new EthersAdapter({
    ethers,
    signerOrProvider: provider,
  })
}

type SafeCoreSDKProps = {
  provider: Provider
  chainId: SafeInfo['chainId']
  address: SafeInfo['address']['value']
  implementation: SafeInfo['implementation']['value']
}

// Safe Core SDK
export const initSafeSDK = async ({ provider, address, implementation }: SafeCoreSDKProps): Promise<Safe> => {
  const safeVersion = await Gnosis_safe__factory.connect(address, provider).VERSION()

  // find out if the implementation is any of the possible L1Safe singletons
  let isL1SafeMasterCopy = _SAFE_DEPLOYMENTS.some((safeDeployments) =>
    (Object.values(safeDeployments.deployments) ?? []).some((deployment) => deployment.address === implementation),
  )

  // Legacy Safe contracts
  if (isLegacyVersion(safeVersion)) {
    isL1SafeMasterCopy = true
  }

  return Safe.create({
    ethAdapter: createReadOnlyEthersAdapter(provider),
    safeAddress: address,
    isL1SafeMasterCopy,
  })
}

export const {
  getStore: getSafeSDK,
  setStore: setSafeSDK,
  useStore: useSafeSDK,
} = new ExternalStore<Safe | undefined>()

export const {
  getStore: getSafeImplementation,
  setStore: setSafeImplementation,
  useStore: useSafeImplementation,
} = new ExternalStore<string | undefined>()
