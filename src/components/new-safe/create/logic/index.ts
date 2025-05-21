import type { Web3Provider, JsonRpcProvider } from '@ethersproject/providers'
import { type SafeInfo, type ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'
import {
  getReadOnlyFallbackHandlerContract,
  getReadOnlyGnosisSafeContract,
  getReadOnlyProxyFactoryContract,
} from '@/services/contracts/safeContracts'
import type { ConnectedWallet } from '@/hooks/wallets/useOnboard'
import { BigNumber } from '@ethersproject/bignumber'
import { SafeCreationStatus } from '@/components/new-safe/create/steps/StatusStep/useSafeCreation'
import { didRevert, type EthersError } from '@/utils/ethers-utils'
import { Errors, trackError } from '@/services/exceptions'
import { ErrorCode } from '@ethersproject/logger'
import { isWalletRejection } from '@/utils/wallets'
import type { PendingSafeTx } from '@/components/new-safe/create/types'
import type { NewSafeFormData } from '@/components/new-safe/create'
import type { UrlObject } from 'url'
import { AppRoutes } from '@/config/routes'
import type { AppDispatch, AppThunk } from '@/store'
import { showNotification } from '@/store/notificationsSlice'
import { SafeFactory } from '@safe-global/protocol-kit'
import type Safe from '@safe-global/protocol-kit'
import type { DeploySafeProps } from '@safe-global/protocol-kit'
import { createEthersAdapter } from '@/hooks/coreSDK/safeCoreSDK'
import { backOff } from 'exponential-backoff'
import { LATEST_SAFE_VERSION } from '@/config/constants'
import { EMPTY_DATA, ZERO_ADDRESS } from '@safe-global/protocol-kit/dist/src/utils/constants'
import { formatError } from '@/utils/formatters'
import { getSafeSDKAndImplementation, getSafeAddressFromTxReceipt } from '@/hooks/coreSDK/useInitSafeCoreSDK'
import type { Provider } from '@ethersproject/providers'
import { getSafeInfo } from '@/hooks/loadables/useLoadSafeInfo'
import type { SafeVersion } from '@safe-global/safe-core-sdk-types'

export type SafeCreationProps = {
  owners: string[]
  threshold: number
  saltNonce: number
}

/**
 * Prepare data for creating a Safe for the Core SDK
 */
export const getSafeDeployProps = async (
  safeParams: SafeCreationProps,
  callback: (txHash: string) => void,
  chainId: string,
): Promise<DeploySafeProps> => {
  const readOnlyFallbackHandlerContract = await getReadOnlyFallbackHandlerContract(chainId, LATEST_SAFE_VERSION)

  return {
    safeAccountConfig: {
      threshold: safeParams.threshold,
      owners: safeParams.owners,
      fallbackHandler: readOnlyFallbackHandlerContract.getAddress(),
    },
    saltNonce: safeParams.saltNonce.toString(),
    callback,
  }
}

/**
 * Create a Safe creation transaction via Core SDK and submits it to the wallet
 */
export const createNewSafe = async (ethersProvider: Web3Provider, props: DeploySafeProps): Promise<Safe> => {
  const ethAdapter = createEthersAdapter(ethersProvider)

  const safeFactory = await SafeFactory.create({ ethAdapter, safeVersion: LATEST_SAFE_VERSION as SafeVersion })
  return safeFactory.deploySafe(props)
}

/**
 * Encode a Safe creation transaction NOT using the Core SDK because it doesn't support that
 * This is used for gas estimation.
 */
export const encodeSafeCreationTx = async ({
  owners,
  threshold,
  saltNonce,
  chain,
}: SafeCreationProps & { chain: ChainInfo }) => {
  const readOnlySafeContract = await getReadOnlyGnosisSafeContract(chain, LATEST_SAFE_VERSION)
  const readOnlyProxyContract = await getReadOnlyProxyFactoryContract(chain.chainId, LATEST_SAFE_VERSION)
  const readOnlyFallbackHandlerContract = await getReadOnlyFallbackHandlerContract(chain.chainId, LATEST_SAFE_VERSION)

  const setupData = readOnlySafeContract.encode('setup', [
    owners,
    threshold,
    ZERO_ADDRESS,
    EMPTY_DATA,
    readOnlyFallbackHandlerContract.getAddress(),
    ZERO_ADDRESS,
    '0',
    ZERO_ADDRESS,
  ])

  return readOnlyProxyContract.encode('createProxyWithNonce', [readOnlySafeContract.getAddress(), setupData, saltNonce])
}

/**
 * Encode a Safe creation tx in a way that we can store locally and monitor using _waitForTransaction
 */
export const getSafeCreationTxInfo = async (
  provider: Web3Provider,
  owners: NewSafeFormData['owners'],
  threshold: NewSafeFormData['threshold'],
  saltNonce: NewSafeFormData['saltNonce'],
  chain: ChainInfo,
  wallet: ConnectedWallet,
): Promise<PendingSafeTx> => {
  const readOnlyProxyContract = await getReadOnlyProxyFactoryContract(chain.chainId, LATEST_SAFE_VERSION)

  const data = await encodeSafeCreationTx({
    owners: owners.map((owner) => owner.address),
    threshold,
    saltNonce,
    chain,
  })

  return {
    data,
    from: wallet.address,
    nonce: await provider.getTransactionCount(wallet.address),
    to: readOnlyProxyContract.getAddress(),
    value: BigNumber.from(0),
    startBlock: await provider.getBlockNumber(),
  }
}

export const estimateSafeCreationGas = async (
  chain: ChainInfo,
  provider: JsonRpcProvider,
  from: string,
  safeParams: SafeCreationProps,
): Promise<BigNumber> => {
  const readOnlyProxyFactoryContract = await getReadOnlyProxyFactoryContract(chain.chainId, LATEST_SAFE_VERSION)
  const encodedSafeCreationTx = encodeSafeCreationTx({ ...safeParams, chain })

  return provider.estimateGas({
    from: from,
    to: readOnlyProxyFactoryContract.getAddress(),
    data: encodedSafeCreationTx,
  })
}

export const pollSafeInfo = async (web3: Provider, chainId: string, txHash: string): Promise<SafeInfo> => {
  // exponential delay between attempts for around 4 min
  return backOff(
    async () => {
      const safeAddress = await getSafeAddressFromTxReceipt(txHash, web3)
      if (!safeAddress) {
        throw new Error('Safe address not found in transaction receipt')
      }
      let [sdk, implementation] = await getSafeSDKAndImplementation(web3, safeAddress, chainId)
      if (!sdk) {
        throw new Error('Safe SDK not available')
      }
      return await getSafeInfo(sdk, implementation)
    },
    {
      startingDelay: 750,
      maxDelay: 20000,
      numOfAttempts: 19,
      retry: (e) => {
        console.info('waiting for Safe SDK to provide safe information', e)
        return true
      },
    },
  )
}

export const handleSafeCreationError = (error: EthersError) => {
  trackError(Errors._800, error.message)

  if (isWalletRejection(error)) {
    return SafeCreationStatus.WALLET_REJECTED
  }

  if (error.code === ErrorCode.TRANSACTION_REPLACED) {
    if (error.reason === 'cancelled') {
      return SafeCreationStatus.ERROR
    } else {
      return SafeCreationStatus.SUCCESS
    }
  }

  if (didRevert(error.receipt)) {
    return SafeCreationStatus.REVERTED
  }

  if (error.code === ErrorCode.TIMEOUT) {
    return SafeCreationStatus.TIMEOUT
  }

  return SafeCreationStatus.ERROR
}

export const SAFE_CREATION_ERROR_KEY = 'create-safe-error'
export const showSafeCreationError = (error: EthersError | Error): AppThunk => {
  return (dispatch) => {
    dispatch(
      showNotification({
        message: `Your transaction was unsuccessful. Reason: ${formatError(error)}`,
        detailedMessage: error.message,
        groupKey: SAFE_CREATION_ERROR_KEY,
        variant: 'error',
      }),
    )
  }
}

export const checkSafeCreationTx = async (
  provider: JsonRpcProvider,
  pendingTx: PendingSafeTx,
  txHash: string,
  dispatch: AppDispatch,
): Promise<SafeCreationStatus> => {
  const TIMEOUT_TIME = 6.5 * 60 * 1000 // 6.5 minutes

  try {
    const receipt = await provider._waitForTransaction(txHash, 1, TIMEOUT_TIME, pendingTx)

    if (didRevert(receipt)) {
      return SafeCreationStatus.REVERTED
    }

    return SafeCreationStatus.SUCCESS
  } catch (err) {
    const _err = err as EthersError

    const status = handleSafeCreationError(_err)

    if (status !== SafeCreationStatus.SUCCESS) {
      dispatch(showSafeCreationError(_err))
    }

    return status
  }
}

export const CREATION_MODAL_QUERY_PARM = 'showCreationModal'

export const getRedirect = (
  chainPrefix: string,
  safeAddress: string,
  redirectQuery?: string | string[],
): UrlObject | string => {
  const redirectUrl = Array.isArray(redirectQuery) ? redirectQuery[0] : redirectQuery
  const address = `${chainPrefix}:${safeAddress}`

  // Should never happen in practice
  if (!chainPrefix) return AppRoutes.index

  // Go to the dashboard if no specific redirect is provided
  if (!redirectUrl) {
    return { pathname: AppRoutes.balances.index, query: { safe: address, [CREATION_MODAL_QUERY_PARM]: true } }
  }

  // Otherwise, redirect to the provided URL (e.g. from a Safe App)

  // We're prepending the safe address directly here because the `router.push` doesn't parse
  // The URL for already existing query params
  // TODO: Check if we can accomplish this with URLSearchParams or URL instead
  const hasQueryParams = redirectUrl.includes('?')
  const appendChar = hasQueryParams ? '&' : '?'
  return redirectUrl + `${appendChar}safe=${address}`
}
