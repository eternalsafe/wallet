import { renderHook } from '@/tests/test-utils'
import { useInitSafeCoreSDK } from '@/hooks/coreSDK/useInitSafeCoreSDK'
import * as web3 from '@/hooks/wallets/web3'
import * as router from 'next/router'
import * as useSafeAddress from '@/hooks/useSafeAddress'
import * as useChainId from '@/hooks/useChainId'
import * as coreSDK from '@/hooks/coreSDK/safeCoreSDK'
import { waitFor } from '@testing-library/react'
import type Safe from '@safe-global/protocol-kit'
import { ethers } from 'ethers'
import type { MulticallProvider } from 'ethers-multicall-provider'

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

    expect(initMock).toHaveBeenCalledWith({
      chainId: mockChainId,
      provider: mockProvider,
      address: mockSafeAddress,
      implementation: mockImplementation,
    })
  })

  it('does not initialize a Core SDK instance if the provider is not initialized', async () => {
    const initMock = jest.spyOn(coreSDK, 'initSafeSDK')
    const setSDKMock = jest.spyOn(coreSDK, 'setSafeSDK')

    jest.spyOn(web3, 'useMultiWeb3ReadOnly').mockReturnValueOnce(undefined)

    renderHook(() => useInitSafeCoreSDK())

    expect(initMock).not.toHaveBeenCalled()
    expect(setSDKMock).toHaveBeenCalledWith(undefined)
  })
})
