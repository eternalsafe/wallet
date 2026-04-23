import { render, screen } from '@/tests/test-utils'
import type { SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'
import {
  DetailedExecutionInfoType,
  TransactionInfoType,
  TransactionStatus,
  type TransactionDetails,
  type TransactionSummary,
} from '@safe-global/safe-gateway-typescript-sdk'
import * as useIsPending from '@/hooks/useIsPending'
import * as useSafeInfo from '@/hooks/useSafeInfo'
import * as useWallet from '@/hooks/wallets/useWallet'
import * as useTransactionStatus from '@/hooks/useTransactionStatus'
import TxSigners from '.'

const TX_ID = 'multisig_0x87a57cBf742CC1Fc702D0E9BF595b1E056693e2f_0x236da79434c398bf98b204e6f3d93d'

const txSummary = {
  id: TX_ID,
  txStatus: TransactionStatus.SUCCESS,
  txInfo: {
    type: TransactionInfoType.CUSTOM,
    to: { value: '0x1234567890123456789012345678901234567890' },
    value: '0',
    dataSize: '0',
    isCancellation: false,
  },
  executionInfo: {
    type: DetailedExecutionInfoType.MULTISIG,
    nonce: 1,
    confirmationsRequired: 1,
    confirmationsSubmitted: 1,
    missingSigners: [],
  },
} as unknown as TransactionSummary

const txDetails = {
  txId: TX_ID,
  txStatus: TransactionStatus.SUCCESS,
  executedAt: 1740762000000,
  txInfo: {
    type: TransactionInfoType.CUSTOM,
    to: { value: '0x1234567890123456789012345678901234567890' },
    value: '0',
    dataSize: '0',
    isCancellation: false,
  },
  detailedExecutionInfo: {
    type: DetailedExecutionInfoType.MULTISIG,
    nonce: 1,
    confirmationsRequired: 1,
    confirmations: [],
    safeTxHash: '0x236da79434c398bf98b204e6f3d93d',
    baseGas: '0',
    gasPrice: '0',
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: { value: '0x0000000000000000000000000000000000000000' },
    safeTxGas: '0',
    submittedAt: 1740761000000,
    signers: [],
    trusted: true,
  },
} as unknown as TransactionDetails

describe('TxSigners', () => {
  beforeEach(() => {
    jest.spyOn(useWallet, 'default').mockReturnValue(null)
    jest.spyOn(useIsPending, 'default').mockReturnValue(false)
    jest.spyOn(useTransactionStatus, 'default').mockReturnValue('Success')
    jest.spyOn(useSafeInfo, 'default').mockReturnValue({
      safeAddress: '0x87a57cBf742CC1Fc702D0E9BF595b1E056693e2f',
      safe: { nonce: 1 } as SafeInfo,
      safeError: undefined,
      safeLoading: false,
      safeLoaded: true,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows executed state for executed transactions loaded without executor', () => {
    render(<TxSigners txDetails={txDetails} txSummary={txSummary} />)

    expect(screen.getByTestId('tx-action-status')).toHaveTextContent('Executed')
  })
})
