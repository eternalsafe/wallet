import { renderHook, waitFor } from '@/tests/test-utils'
import { ethers } from 'ethers'
import { createSafeTx } from '@/tests/builders/safeTx'
import type { SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { type ConnectedWallet } from '@/hooks/wallets/useOnboard'
import * as useSafeInfoHook from '@/hooks/useSafeInfo'
import * as wallet from '@/hooks/wallets/useWallet'
import * as store from '@/store'
import * as walletHooks from '@/utils/wallets'
import * as pending from '@/hooks/usePendingTxs'
import * as txSender from '@/services/tx/tx-sender/dispatch'
import * as onboardHooks from '@/hooks/wallets/useOnboard'
import { type OnboardAPI } from '@web3-onboard/core'
import {
  useAlreadySigned,
  useImmediatelyExecutable,
  useIsExecutionLoop,
  useRecommendedNonce,
  useTxActions,
  useValidateNonce,
} from './hooks'
import type Safe from '@safe-global/protocol-kit'
import type { SafeTransaction } from '@safe-global/safe-core-sdk-types'
import * as safeCoreSDK from '@/hooks/coreSDK/safeCoreSDK'
import { getMockDetailedTx } from '@/tests/mocks/transactions'

describe('SignOrExecute hooks', () => {
  let mockSDK: Safe

  beforeEach(() => {
    jest.clearAllMocks()

    // Onboard
    jest.spyOn(onboardHooks, 'default').mockReturnValue({
      setChain: jest.fn(),
      state: {
        get: () => ({
          wallets: [
            {
              label: 'MetaMask',
              accounts: [{ address: '0x1234567890000000000000000000000000000000' }],
              connected: true,
              chains: [{ id: '1' }],
            },
          ],
        }),
      },
    } as unknown as OnboardAPI)

    // Wallet
    jest.spyOn(wallet, 'default').mockReturnValue({
      chainId: '1',
      label: 'MetaMask',
      address: '0x1234567890000000000000000000000000000000',
    } as unknown as ConnectedWallet)

    // SDK
    mockSDK = {
      getTransactionHash: (safeTransaction: SafeTransaction) => {
        return '0x123'
      },
    } as unknown as Safe

    jest.spyOn(safeCoreSDK, 'getSafeSDK').mockReturnValue(mockSDK)
    jest.spyOn(safeCoreSDK, 'useSafeSDK').mockReturnValue(mockSDK)
  })

  describe('useValidateNonce', () => {
    it('should return true if nonce is correct', () => {
      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: ethers.utils.hexZeroPad('0x000', 20),
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const { result } = renderHook(() => useValidateNonce(createSafeTx()))

      expect(result.current).toBe(true)
    })

    it('should return false if nonce is incorrect', () => {
      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 90,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: ethers.utils.hexZeroPad('0x000', 20),
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const { result } = renderHook(() => useValidateNonce(createSafeTx()))

      expect(result.current).toBe(false)
    })
  })

  describe('useIsExecutionLoop', () => {
    it('should return true when a safe is executing its own transaction', () => {
      const address = ethers.utils.hexZeroPad('0x789', 20)

      jest.spyOn(useSafeInfoHook, 'default').mockReturnValue({
        safeAddress: address,
        safe: {
          version: '1.3.0',
          address: { value: address },
          owners: [{ value: address }],
          nonce: 100,
          chainId: '1',
        } as SafeInfo,
        safeLoaded: true,
        safeLoading: false,
        safeError: undefined,
      })

      jest.spyOn(wallet, 'default').mockReturnValue({
        chainId: '1',
        label: 'MetaMask',
        address: address,
      } as ConnectedWallet)

      const { result } = renderHook(() => useIsExecutionLoop())

      expect(result.current).toBe(true)
    })

    it('should return false when a safe is not executing its own transaction', () => {
      jest.spyOn(wallet, 'default').mockReturnValue({
        chainId: '1',
        label: 'MetaMask',
        address: ethers.utils.hexZeroPad('0x456', 20),
      } as ConnectedWallet)

      const { result } = renderHook(() => useIsExecutionLoop())

      expect(result.current).toBe(false)
    })
  })

  describe('useRecommendedNonce', () => {
    it('should return the same nonce when queue is empty', async () => {
      const sdk = {
        getNonce: jest.fn().mockResolvedValue(100),
      } as unknown as Safe

      jest.spyOn(safeCoreSDK, 'useSafeSDK').mockReturnValue(sdk)
      jest.spyOn(store, 'useAppSelector').mockReturnValue({ data: [] })

      const { result } = renderHook(() => useRecommendedNonce())

      await waitFor(() => {
        expect(result.current).toBe(100)
      })
    })

    it('should return a higher nonce when queue has 1 item', async () => {
      const sdk = {
        getNonce: jest.fn().mockResolvedValue(100),
      } as unknown as Safe

      jest.spyOn(safeCoreSDK, 'useSafeSDK').mockReturnValue(sdk)
      jest.spyOn(store, 'useAppSelector').mockReturnValue({ data: [getMockDetailedTx({ nonce: 100 })] })

      const { result } = renderHook(() => useRecommendedNonce())

      await waitFor(() => {
        expect(result.current).toBe(101)
      })
    })

    it('should return a higher nonce when queue has 2 items', async () => {
      const sdk = {
        getNonce: jest.fn().mockResolvedValue(100),
      } as unknown as Safe

      jest.spyOn(safeCoreSDK, 'useSafeSDK').mockReturnValue(sdk)
      jest
        .spyOn(store, 'useAppSelector')
        .mockReturnValue({ data: [getMockDetailedTx({ nonce: 101 }), getMockDetailedTx({ nonce: 102 })] })

      const { result } = renderHook(() => useRecommendedNonce())

      await waitFor(() => {
        expect(result.current).toBe(103)
      })
    })

    it('should return the contract nonce when that is higher', async () => {
      const sdk = {
        getNonce: jest.fn().mockResolvedValue(100),
      } as unknown as Safe

      jest.spyOn(safeCoreSDK, 'useSafeSDK').mockReturnValue(sdk)
      jest
        .spyOn(store, 'useAppSelector')
        .mockReturnValue({ data: [getMockDetailedTx({ nonce: 99 }), getMockDetailedTx({ nonce: 98 })] })

      const { result } = renderHook(() => useRecommendedNonce())

      await waitFor(() => {
        expect(result.current).toBe(100)
      })
    })
  })

  describe('useImmediatelyExecutable', () => {
    it('should return true for newly created transactions with threshold 1 and no pending transactions', () => {
      jest.spyOn(useSafeInfoHook, 'default').mockReturnValue({
        safeAddress: ethers.utils.hexZeroPad('0x000', 20),
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }],
          threshold: 1,
          nonce: 100,
        } as SafeInfo,
        safeLoaded: true,
        safeLoading: false,
        safeError: undefined,
      })

      jest.spyOn(pending, 'useHasPendingTxs').mockReturnValue(false)

      const { result } = renderHook(() => useImmediatelyExecutable())

      expect(result.current).toBe(true)
    })

    it('should return false for newly created transactions with threshold > 1', () => {
      jest.spyOn(useSafeInfoHook, 'default').mockReturnValue({
        safeAddress: ethers.utils.hexZeroPad('0x000', 20),
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }],
          threshold: 2,
          nonce: 100,
          chainId: '1',
        } as SafeInfo,
        safeLoaded: true,
        safeLoading: false,
        safeError: undefined,
      })

      jest.spyOn(pending, 'useHasPendingTxs').mockReturnValue(false)

      const { result } = renderHook(() => useImmediatelyExecutable())

      expect(result.current).toBe(false)
    })

    it('should return false for safes with pending transactions', () => {
      jest.spyOn(useSafeInfoHook, 'default').mockReturnValue({
        safeAddress: ethers.utils.hexZeroPad('0x000', 20),
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }],
          threshold: 1,
          nonce: 100,
          chainId: '1',
        } as SafeInfo,
        safeLoaded: true,
        safeLoading: false,
        safeError: undefined,
      })

      jest.spyOn(pending, 'useHasPendingTxs').mockReturnValue(true)

      const { result } = renderHook(() => useImmediatelyExecutable())

      expect(result.current).toBe(false)
    })
  })

  describe('useTxActions', () => {
    it('should return sign and execute actions', () => {
      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const { result } = renderHook(() => useTxActions())

      expect(result.current.signTx).toBeDefined()
      expect(result.current.executeTx).toBeDefined()
    })

    it('should sign a tx with or without an id', async () => {
      jest.spyOn(walletHooks, 'isSmartContractWallet').mockReturnValue(Promise.resolve(false))

      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const signSpy = jest
        .spyOn(txSender, 'dispatchTxSigning')
        .mockImplementation(() => Promise.resolve(createSafeTx()))

      const onchainSignSpy = jest.spyOn(txSender, 'dispatchOnChainSigning').mockImplementation(() => Promise.resolve())

      const { result } = renderHook(() => useTxActions())
      const { signTx } = result.current

      const id = await signTx(createSafeTx())
      expect(signSpy).toHaveBeenCalled()
      expect(onchainSignSpy).not.toHaveBeenCalled()
      expect(id).toBe('multisig_0x0000000000000000000000000000000000000000_0x123')

      const id2 = await signTx(createSafeTx(), '456')
      expect(signSpy).toHaveBeenCalled()
      expect(id2).toBe('multisig_0x0000000000000000000000000000000000000000_0x123')
    })

    it('should sign a tx on-chain', async () => {
      jest.spyOn(walletHooks, 'isSmartContractWallet').mockReturnValue(Promise.resolve(true))

      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const signSpy = jest.spyOn(txSender, 'dispatchOnChainSigning').mockImplementation(() => Promise.resolve())

      const { result } = renderHook(() => useTxActions())
      const { signTx } = result.current

      const id = await signTx(createSafeTx(), '456')
      expect(signSpy).toHaveBeenCalled()
      expect(id).toBe('456')
    })

    it('should execute a tx without a txId (immediate execution)', async () => {
      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const executeSpy = jest
        .spyOn(txSender, 'dispatchTxExecution')
        .mockImplementation((() => Promise.resolve(createSafeTx())) as unknown as typeof txSender.dispatchTxExecution)

      const { result } = renderHook(() => useTxActions())
      const { executeTx } = result.current

      const id = await executeTx({ gasPrice: 1 }, createSafeTx())
      expect(executeSpy).toHaveBeenCalled()
      expect(id).toEqual('multisig_0x0000000000000000000000000000000000000000_0x123')
    })

    it('should execute a tx with an id (existing tx)', async () => {
      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const executeSpy = jest
        .spyOn(txSender, 'dispatchTxExecution')
        .mockImplementation((() => Promise.resolve(createSafeTx())) as unknown as typeof txSender.dispatchTxExecution)

      const { result } = renderHook(() => useTxActions())
      const { executeTx } = result.current

      const id = await executeTx({ gasPrice: 1 }, createSafeTx(), '455')
      expect(executeSpy).toHaveBeenCalled()
      expect(id).toEqual('455')
    })

    it('should throw an error if the tx is undefined', async () => {
      jest.spyOn(useSafeInfoHook, 'default').mockImplementation(() => ({
        safe: {
          version: '1.3.0',
          address: { value: ethers.utils.hexZeroPad('0x000', 20) },
          nonce: 100,
          threshold: 2,
          owners: [{ value: ethers.utils.hexZeroPad('0x123', 20) }, { value: ethers.utils.hexZeroPad('0x456', 20) }],
          chainId: '1',
        } as SafeInfo,
        safeAddress: '0x123',
        safeError: undefined,
        safeLoading: false,
        safeLoaded: true,
      }))

      const { result } = renderHook(() => useTxActions())
      const { signTx, executeTx } = result.current

      // Expect signTx to throw an error
      await expect(signTx()).rejects.toThrowError('Transaction not provided')
      await expect(executeTx({ gasPrice: 1 })).rejects.toThrowError('Transaction not provided')
    })
  })

  describe('useAlreadySigned', () => {
    it('should return true if wallet already signed a tx', () => {
      // Wallet
      jest.spyOn(wallet, 'default').mockReturnValue({
        chainId: '1',
        label: 'MetaMask',
        address: '0x1234567890000000000000000000000000000000',
      } as unknown as ConnectedWallet)

      const tx = createSafeTx()
      tx.addSignature({
        signer: '0x1234567890000000000000000000000000000000',
        data: '0x0001',
        staticPart: () => '',
        dynamicPart: () => '',
      })
      const { result } = renderHook(() => useAlreadySigned(tx))
      expect(result.current).toEqual(true)
    })
  })
  it('should return false if wallet has not signed a tx yet', () => {
    // Wallet
    jest.spyOn(wallet, 'default').mockReturnValue({
      chainId: '1',
      label: 'MetaMask',
      address: '0x1234567890000000000000000000000000000000',
    } as unknown as ConnectedWallet)

    const tx = createSafeTx()
    tx.addSignature({
      signer: '0x00000000000000000000000000000000000000000',
      data: '0x0001',
      staticPart: () => '',
      dynamicPart: () => '',
    })
    const { result } = renderHook(() => useAlreadySigned(tx))
    expect(result.current).toEqual(false)
  })
})
