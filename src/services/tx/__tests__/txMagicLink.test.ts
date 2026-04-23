import { OperationType, type SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { encodeTransactionMagicLink, decodeTransactionMagicLink } from '../txMagicLink'

describe('txMagicLink', () => {
  it('should encode and decode correctly', () => {
    const tx = {
      txParams: {
        data: '0x',
        baseGas: 21000,
        gasPrice: 10000000000,
        safeTxGas: 11000,
        gasToken: '0x0000000000000000000000000000000000000000',
        nonce: 0,
        refundReceiver: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        to: '0x1234567890123456789012345678901234567890',
        operation: OperationType.Call,
      },
      signatures: {
        '0x1234567890123456789012345678901234567890': '0x123',
      },
    } as unknown as SafeTransaction

    const link = encodeTransactionMagicLink(tx)

    const decoded = decodeTransactionMagicLink(link)

    expect(decoded).toEqual(tx)
  })
})
