import usePendingActions from '@/hooks/usePendingActions'
import { renderHook, waitFor } from '@/tests/test-utils'
import type { SafeInfo, TransactionSummary } from '@safe-global/safe-gateway-typescript-sdk'
import {
  ConflictType,
  DetailedExecutionInfoType,
  LabelValue,
  TransactionListItemType,
} from '@safe-global/safe-gateway-typescript-sdk'
import { hexZeroPad } from 'ethers/lib/utils'
import type { EIP1193Provider } from '@web3-onboard/core'
import * as useWallet from '@/hooks/wallets/useWallet'
import * as useTxQueue from '@/hooks/useTxQueue'
import * as useSafeInfo from '@/hooks/useSafeInfo'
import type { TransactionListItem } from '@/utils/transaction-guards'

jest.mock('@safe-global/safe-gateway-typescript-sdk', () => ({
  ...jest.requireActual('@safe-global/safe-gateway-typescript-sdk'),
  getTransactionQueue: jest.fn(),
}))

describe('usePendingActions hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return no pending actions for current Safe with an empty queue', () => {
    const mockSafeAddress = hexZeroPad('0x1', 20)
    jest.spyOn(useSafeInfo, 'default').mockReturnValue({
      safeAddress: mockSafeAddress,
      safe: {
        chainId: '5',
      } as SafeInfo,
      safeError: undefined,
      safeLoading: false,
      safeLoaded: true,
    })

    const mockPage = {
      error: undefined,
      loading: false,
      data: [],
    }
    jest.spyOn(useTxQueue, 'default').mockReturnValue(mockPage)

    const { result } = renderHook(() => usePendingActions())
    expect(result.current).toEqual({ totalQueued: '', totalToSign: '' })
  })

  it('should return 1 queued txs and 1 pending signature for current Safe with a queue', async () => {
    const walletAddress = hexZeroPad('0x789', 20)
    const mockWallet = {
      address: walletAddress,
      chainId: '5',
      label: '',
      provider: null as unknown as EIP1193Provider,
    }
    jest.spyOn(useWallet, 'default').mockReturnValue({ ...mockWallet, provider: {} as EIP1193Provider })

    const mockSafeAddress = hexZeroPad('0x1', 20)
    jest.spyOn(useSafeInfo, 'default').mockReturnValue({
      safeAddress: mockSafeAddress,
      safe: {
        chainId: '5',
      } as SafeInfo,
      safeError: undefined,
      safeLoading: false,
      safeLoaded: true,
    })

    const page: Array<TransactionListItem> = [
      { type: TransactionListItemType.LABEL, label: LabelValue.Next },
      {
        type: TransactionListItemType.TRANSACTION,
        transaction: {
          txStatus: 'AWAITING_CONFIRMATIONS',
          executionInfo: {
            type: DetailedExecutionInfoType.MULTISIG,
            nonce: 8,
            confirmationsRequired: 3,
            confirmationsSubmitted: 1,
            missingSigners: [
              { value: '0x6a5602335a878ADDCa4BF63a050E34946B56B5bC' },
              { value: '0x0000000000000000000000000000000000000789' },
            ],
          },
        } as unknown as TransactionSummary,
        conflictType: ConflictType.NONE,
      },
    ]

    const mockPage = {
      error: undefined,
      loading: false,
      data: page as ReturnType<typeof useTxQueue.default>['data'],
    }
    jest.spyOn(useTxQueue, 'default').mockReturnValue(mockPage)

    const { result } = renderHook(() => usePendingActions())

    await waitFor(() => {
      expect(result.current).toEqual({ totalQueued: '1', totalToSign: '1' })
    })
  })
})
