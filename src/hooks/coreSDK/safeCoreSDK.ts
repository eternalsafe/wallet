import { getMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import { _SAFE_DEPLOYMENTS } from '@safe-global/safe-deployments/dist/deployments'
import {
  getCompatibilityFallbackHandlerDeployment,
  getCreateCallDeployment,
  getMultiSendCallOnlyDeployment,
  getMultiSendDeployment,
  getProxyFactoryDeployment,
  getSafeL2SingletonDeployment,
  getSafeSingletonDeployment,
  getSignMessageLibDeployment,
  getSimulateTxAccessorDeployment,
} from '@safe-global/safe-deployments'
import type { DeploymentFilter, SingletonDeployment } from '@safe-global/safe-deployments/dist/types'
import ExternalStore from '@/services/ExternalStore'
import { Gnosis_safe__factory } from '@/types/contracts'
import { invariant } from '@/utils/helpers'
import type { Web3Provider } from '@ethersproject/providers'
import Safe, { EthersAdapter } from '@safe-global/protocol-kit'
import { safeDeploymentsVersions } from '@safe-global/protocol-kit/dist/src/contracts/config'
import type { ContractNetworkConfig, ContractNetworksConfig } from '@safe-global/protocol-kit/dist/src/types'
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
  multisendAddress?: string
  multisendCallOnlyAddress?: string
}

export type MultiSendContractOverrides = Pick<SafeCoreSDKProps, 'multisendAddress' | 'multisendCallOnlyAddress'>
type SafeDeploymentVersionConfig = (typeof safeDeploymentsVersions)[string]
const SAFE_DEPLOYMENT_VERSION_ORDER = ['1.4.1', '1.3.0', '1.2.0', '1.1.1', '1.0.0']

const getSafeDeploymentVersionConfig = (safeVersion: string): SafeDeploymentVersionConfig => {
  const matchedVersion = SAFE_DEPLOYMENT_VERSION_ORDER.find((version) => semverSatisfies(safeVersion, version))
  return safeDeploymentsVersions[matchedVersion || '1.3.0']
}

const getDeploymentAddress = (
  getDeployment: (filter?: DeploymentFilter) => SingletonDeployment | undefined,
  chainId: string,
  version?: string,
): string | undefined => {
  if (!version) {
    return undefined
  }

  return getDeployment({
    version,
    network: chainId,
    released: true,
  })?.defaultAddress
}

const getBaseContractNetworkConfig = (
  chainId: string,
  safeVersion: string,
  isL1SafeMasterCopy: boolean,
): ContractNetworkConfig | undefined => {
  const deploymentVersions = getSafeDeploymentVersionConfig(safeVersion)

  const safeMasterCopyAddress = isL1SafeMasterCopy
    ? getDeploymentAddress(getSafeSingletonDeployment, chainId, deploymentVersions.safeMasterCopyVersion)
    : getDeploymentAddress(getSafeL2SingletonDeployment, chainId, deploymentVersions.safeMasterCopyL2Version) ||
      getDeploymentAddress(getSafeSingletonDeployment, chainId, deploymentVersions.safeMasterCopyVersion)

  const safeProxyFactoryAddress = getDeploymentAddress(
    getProxyFactoryDeployment,
    chainId,
    deploymentVersions.safeProxyFactoryVersion,
  )
  const fallbackHandlerAddress = getDeploymentAddress(
    getCompatibilityFallbackHandlerDeployment,
    chainId,
    deploymentVersions.compatibilityFallbackHandler,
  )
  const multiSendAddress = getDeploymentAddress(getMultiSendDeployment, chainId, deploymentVersions.multiSendVersion)
  const multiSendCallOnlyAddress = getDeploymentAddress(
    getMultiSendCallOnlyDeployment,
    chainId,
    deploymentVersions.multiSendCallOnlyVersion,
  )
  const signMessageLibAddress = getDeploymentAddress(
    getSignMessageLibDeployment,
    chainId,
    deploymentVersions.signMessageLibVersion,
  )
  const createCallAddress = getDeploymentAddress(getCreateCallDeployment, chainId, deploymentVersions.createCallVersion)
  const simulateTxAccessorAddress = getDeploymentAddress(
    getSimulateTxAccessorDeployment,
    chainId,
    deploymentVersions.createCallVersion,
  )

  if (
    !safeMasterCopyAddress ||
    !safeProxyFactoryAddress ||
    !multiSendAddress ||
    !multiSendCallOnlyAddress ||
    !fallbackHandlerAddress ||
    !signMessageLibAddress ||
    !createCallAddress ||
    !simulateTxAccessorAddress
  ) {
    return undefined
  }

  return {
    safeMasterCopyAddress,
    safeProxyFactoryAddress,
    multiSendAddress,
    multiSendCallOnlyAddress,
    fallbackHandlerAddress,
    signMessageLibAddress,
    createCallAddress,
    simulateTxAccessorAddress,
  }
}

const normalizeAddressOverride = (address?: string): string | undefined => {
  const trimmed = address?.trim()
  return trimmed ? trimmed : undefined
}

export const getContractNetworksForOverrides = (
  chainId: string,
  safeVersion: string,
  isL1SafeMasterCopy: boolean,
  overrides: MultiSendContractOverrides,
): ContractNetworksConfig | undefined => {
  const multisendAddress = normalizeAddressOverride(overrides.multisendAddress)
  const multisendCallOnlyAddress = normalizeAddressOverride(overrides.multisendCallOnlyAddress)

  if (!multisendAddress || !multisendCallOnlyAddress) {
    return undefined
  }

  const contractConfig = getBaseContractNetworkConfig(chainId, safeVersion, isL1SafeMasterCopy)

  if (!contractConfig) {
    return undefined
  }

  return {
    [chainId]: {
      ...contractConfig,
      multiSendAddress: multisendAddress,
      multiSendCallOnlyAddress: multisendCallOnlyAddress,
    },
  }
}

// Safe Core SDK
export const initSafeSDK = async ({
  provider,
  chainId,
  address,
  implementation,
  multisendAddress,
  multisendCallOnlyAddress,
}: SafeCoreSDKProps): Promise<Safe> => {
  const safeVersion = await Gnosis_safe__factory.connect(address, provider).VERSION()

  // find out if the implementation is any of the possible L1Safe singletons
  let isL1SafeMasterCopy = _SAFE_DEPLOYMENTS.some((safeDeployments) =>
    (Object.values(safeDeployments.deployments) ?? []).some((deployment) => deployment.address === implementation),
  )

  // Legacy Safe contracts
  if (isLegacyVersion(safeVersion)) {
    isL1SafeMasterCopy = true
  }

  const contractNetworks = getContractNetworksForOverrides(chainId, safeVersion, isL1SafeMasterCopy, {
    multisendAddress,
    multisendCallOnlyAddress,
  })

  return Safe.create({
    ethAdapter: createReadOnlyEthersAdapter(provider),
    safeAddress: address,
    isL1SafeMasterCopy,
    contractNetworks,
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
