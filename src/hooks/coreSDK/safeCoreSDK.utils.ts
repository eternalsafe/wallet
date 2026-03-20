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
import { safeDeploymentsVersions } from '@safe-global/protocol-kit/dist/src/contracts/config'
import type { ContractNetworkConfig, ContractNetworksConfig } from '@safe-global/protocol-kit/dist/src/types'
import semverSatisfies from 'semver/functions/satisfies'

export type MultiSendContractOverrides = {
  multisendAddress?: string
  multisendCallOnlyAddress?: string
}

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
