import {
  getFallbackHandlerContractDeployment,
  getMultiSendCallOnlyContractDeployment,
  getProxyFactoryContractDeployment,
  getSafeContractDeployment,
  getSignMessageLibContractDeployment,
} from './deployments'
import { LATEST_SAFE_VERSION } from '@/config/constants'
import { ImplementationVersionState } from '@safe-global/safe-gateway-typescript-sdk'
import type { ChainInfo, SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'
import type { GetContractProps, SafeVersion } from '@safe-global/safe-core-sdk-types'
import type { SafeContractEthers } from '@safe-global/protocol-kit'
import type { SignMessageLibEthersContract } from '@safe-global/protocol-kit'
import { assertValidSafeVersion, createEthersAdapter, createReadOnlyEthersAdapter } from '@/hooks/coreSDK/safeCoreSDK'
import type CompatibilityFallbackHandlerEthersContract from '@safe-global/protocol-kit/dist/src/adapters/ethers/contracts/CompatibilityFallbackHandler/CompatibilityFallbackHandlerEthersContract'
import type { Web3Provider } from '@ethersproject/providers'
import type { EthersAdapter } from '@safe-global/protocol-kit'
import semver from 'semver'

// `UNKNOWN` is returned if the mastercopy does not match supported ones
// @see https://github.com/safe-global/safe-client-gateway/blob/main/src/routes/safes/handlers/safes.rs#L28-L31
//      https://github.com/safe-global/safe-client-gateway/blob/main/src/routes/safes/converters.rs#L77-L79
export const isValidMasterCopy = (implementationVersionState: SafeInfo['implementationVersionState']): boolean => {
  return implementationVersionState !== ImplementationVersionState.UNKNOWN
}

export const _getValidatedGetContractProps = (
  safeVersion: SafeInfo['version'],
): Pick<GetContractProps, 'safeVersion'> => {
  assertValidSafeVersion(safeVersion)

  // SDK request here: https://github.com/safe-global/safe-core-sdk/issues/261
  // Remove '+L2'/'+Circles' metadata from version
  const [noMetadataVersion] = safeVersion.split('+')

  return {
    safeVersion: noMetadataVersion as SafeVersion,
  }
}

// Safe

const getSafeContractEthers = (safe: SafeInfo, ethAdapter: EthersAdapter): Promise<SafeContractEthers> => {
  return ethAdapter.getSafeContract({
    customContractAddress: safe.address.value,
    ..._getValidatedGetContractProps(safe.version),
  })
}

export const getReadOnlyCurrentSafeContract = (safe: SafeInfo): Promise<SafeContractEthers> => {
  const ethAdapter = createReadOnlyEthersAdapter()
  return getSafeContractEthers(safe, ethAdapter)
}

export const getCurrentGnosisSafeContract = (safe: SafeInfo, provider: Web3Provider): Promise<SafeContractEthers> => {
  const ethAdapter = createEthersAdapter(provider)
  return getSafeContractEthers(safe, ethAdapter)
}

export const getReadOnlyGnosisSafeContract = (chain: ChainInfo, safeVersion: string = LATEST_SAFE_VERSION) => {
  const ethAdapter = createReadOnlyEthersAdapter()

  return ethAdapter.getSafeContract({
    singletonDeployment: getSafeContractDeployment(chain, safeVersion),
    ..._getValidatedGetContractProps(safeVersion),
  })
}

// MultiSend

export const _getMinimumMultiSendCallOnlyVersion = (safeVersion: SafeInfo['version']) => {
  const INITIAL_CALL_ONLY_VERSION = '1.3.0'

  if (!safeVersion) {
    return INITIAL_CALL_ONLY_VERSION
  }

  return semver.gte(safeVersion, INITIAL_CALL_ONLY_VERSION) ? safeVersion : INITIAL_CALL_ONLY_VERSION
}

export const getMultiSendCallOnlyContract = (
  chainId: string,
  safeVersion: SafeInfo['version'],
  provider: Web3Provider,
) => {
  const ethAdapter = createEthersAdapter(provider)
  const multiSendVersion = _getMinimumMultiSendCallOnlyVersion(safeVersion)

  return ethAdapter.getMultiSendCallOnlyContract({
    singletonDeployment: getMultiSendCallOnlyContractDeployment(chainId, multiSendVersion),
    ..._getValidatedGetContractProps(safeVersion),
  })
}

export const getReadOnlyMultiSendCallOnlyContract = (chainId: string, safeVersion: SafeInfo['version']) => {
  const ethAdapter = createReadOnlyEthersAdapter()
  const multiSendVersion = _getMinimumMultiSendCallOnlyVersion(safeVersion)

  return ethAdapter.getMultiSendCallOnlyContract({
    singletonDeployment: getMultiSendCallOnlyContractDeployment(chainId, multiSendVersion),
    ..._getValidatedGetContractProps(safeVersion),
  })
}

// GnosisSafeProxyFactory

export const getReadOnlyProxyFactoryContract = async (chainId: string, safeVersion: SafeInfo['version']) => {
  const ethAdapter = createReadOnlyEthersAdapter()

  return await ethAdapter.getSafeProxyFactoryContract({
    singletonDeployment: getProxyFactoryContractDeployment(chainId, safeVersion),
    ..._getValidatedGetContractProps(safeVersion),
  })
}

// Fallback handler

export const getReadOnlyFallbackHandlerContract = (
  chainId: string,
  safeVersion: SafeInfo['version'],
): Promise<CompatibilityFallbackHandlerEthersContract> => {
  const ethAdapter = createReadOnlyEthersAdapter()

  return ethAdapter.getCompatibilityFallbackHandlerContract({
    singletonDeployment: getFallbackHandlerContractDeployment(chainId, safeVersion),
    ..._getValidatedGetContractProps(safeVersion),
  })
}

// Sign messages deployment

export const getReadOnlySignMessageLibContract = (
  chainId: string,
  safeVersion: SafeInfo['version'],
): Promise<SignMessageLibEthersContract> => {
  const ethAdapter = createReadOnlyEthersAdapter()

  return ethAdapter.getSignMessageLibContract({
    singletonDeployment: getSignMessageLibContractDeployment(chainId, safeVersion),
    ..._getValidatedGetContractProps(safeVersion),
  })
}
