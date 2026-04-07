import { renderHook } from '@/tests/test-utils'
import { useInitSafeCoreSDK } from '@/hooks/coreSDK/useInitSafeCoreSDK'
import * as web3 from '@/hooks/wallets/web3'
import * as router from 'next/router'
import * as useSafeAddress from '@/hooks/useSafeAddress'
import * as useChainId from '@/hooks/useChainId'
import * as useChains from '@/hooks/useChains'
import * as coreSDK from '@/hooks/coreSDK/safeCoreSDK'
import * as notificationsSlice from '@/store/notificationsSlice'
import { waitFor } from '@testing-library/react'
import type Safe from '@safe-global/protocol-kit'
import { ethers } from 'ethers'
import type { MulticallProvider } from 'ethers-multicall-provider'
import { AppRoutes } from '@/config/routes'

describe('useInitSafeCoreSDK hook', () => {
  const mockSafeAddress = '0x0000000000000000000000000000000000005AFE'
  const mockChainId = '5'
  const mockImplementation = '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552'

  let mockProvider: MulticallProvider

  beforeEach(() => {
    jest.clearAllMocks()

    // mock getStorageAt for master copy
    mockProvider = jest.fn().mockImplementation(() => {
      return {
        getNetwork: jest.fn().mockResolvedValue({ chainId: Number(mockChainId) }),
        getStorageAt: jest.fn().mockResolvedValue(ethers.utils.hexZeroPad(mockImplementation, 32)),
        getCode: jest.fn().mockResolvedValue('0x01'),
      }
    })() as unknown as MulticallProvider

    jest.spyOn(web3, 'useMultiWeb3ReadOnly').mockReturnValue(mockProvider)
    jest.spyOn(useSafeAddress, 'default').mockReturnValue(mockSafeAddress)
    jest.spyOn(useChainId, 'default').mockReturnValue(mockChainId)
    jest.spyOn(useChains, 'useCurrentChain').mockReturnValue(undefined)
    jest
      .spyOn(router, 'useRouter')
      .mockReturnValue({ query: { safe: `gno:${mockSafeAddress}` } } as unknown as router.NextRouter)
  })

  it('initializes a Core SDK instance', async () => {
    const mockSafe = {} as Safe
    const initMock = jest.spyOn(coreSDK, 'initSafeSDK').mockReturnValue(Promise.resolve(mockSafe))
    const setSDKMock = jest.spyOn(coreSDK, 'setSafeSDK')

    renderHook(() => useInitSafeCoreSDK())

    await waitFor(() => {
      expect(setSDKMock).toHaveBeenCalledWith(mockSafe)
    })

    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: mockChainId,
        provider: mockProvider,
        address: mockSafeAddress,
        implementation: mockImplementation,
      }),
    )
  })

  it('does not initialize a Core SDK instance if the provider is not initialized', async () => {
    const initMock = jest.spyOn(coreSDK, 'initSafeSDK')
    const setSDKMock = jest.spyOn(coreSDK, 'setSafeSDK')

    jest.spyOn(web3, 'useMultiWeb3ReadOnly').mockReturnValueOnce(undefined)

    renderHook(() => useInitSafeCoreSDK())

    expect(initMock).not.toHaveBeenCalled()
    expect(setSDKMock).toHaveBeenCalledWith(undefined)
  })

  it('uses chain-level multisend overrides when no safe-level metadata exists', async () => {
    const mockSafe = {} as Safe
    const initMock = jest.spyOn(coreSDK, 'initSafeSDK').mockReturnValue(Promise.resolve(mockSafe))
    const setSDKMock = jest.spyOn(coreSDK, 'setSafeSDK')

    jest.spyOn(useChains, 'useCurrentChain').mockReturnValue({
      chainId: mockChainId,
      multisendAddress: '0x1111111111111111111111111111111111111111',
      multisendCallOnlyAddress: '0x2222222222222222222222222222222222222222',
    } as any)

    renderHook(() => useInitSafeCoreSDK())

    await waitFor(() => {
      expect(setSDKMock).toHaveBeenCalledWith(mockSafe)
    })

    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({
        multisendAddress: '0x1111111111111111111111111111111111111111',
        multisendCallOnlyAddress: '0x2222222222222222222222222222222222222222',
      }),
    )
  })

  it('uses chain-level multisend overrides even if safe-level metadata exists', async () => {
    const mockSafe = {} as Safe
    const initMock = jest.spyOn(coreSDK, 'initSafeSDK').mockReturnValue(Promise.resolve(mockSafe))
    const setSDKMock = jest.spyOn(coreSDK, 'setSafeSDK')

    jest.spyOn(useChains, 'useCurrentChain').mockReturnValue({
      chainId: mockChainId,
      multisendAddress: '0x1111111111111111111111111111111111111111',
      multisendCallOnlyAddress: '0x2222222222222222222222222222222222222222',
    } as any)

    renderHook(() => useInitSafeCoreSDK(), {
      initialReduxState: {
        addedSafes: {
          [mockChainId]: {
            [mockSafeAddress]: {
              owners: [],
              threshold: 1,
              multisendAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              multisendCallOnlyAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            },
          },
        },
      },
    })

    await waitFor(() => {
      expect(setSDKMock).toHaveBeenCalledWith(mockSafe)
    })

    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({
        multisendAddress: '0x1111111111111111111111111111111111111111',
        multisendCallOnlyAddress: '0x2222222222222222222222222222222222222222',
      }),
    )
  })

  it('shows an RPC settings notification when Safe initialization fails', async () => {
    const showNotificationMock = jest.spyOn(notificationsSlice, 'showNotification')

    ;(mockProvider.getCode as jest.Mock).mockResolvedValue('0x')

    renderHook(() => useInitSafeCoreSDK())

    await waitFor(() => {
      expect(showNotificationMock).toHaveBeenCalledWith({
        message:
          'Please try connecting your Safe again. Ensure the address, chain and RPC URL are correct. If you see this error often, try configuring your RPC settings.',
        groupKey: 'core-sdk-init-error',
        variant: 'error',
        detailedMessage: `No Safe found at address ${mockSafeAddress} on chain with ID ${mockChainId}.`,
        link: {
          href: AppRoutes.settings.environmentVariables,
          title: 'RPC settings',
        },
      })
    })
  })
})
