import { transactionKey, type TransactionMagicLink } from '@/services/tx/txMagicLink'
import { OperationType } from '@safe-global/safe-core-sdk-types'
import { addedTxsSlice, addOrUpdateTx } from '../addedTxsSlice'

describe('addedTxsSlice', () => {
  describe('addOrUpdateTx', () => {
    it('should add a tx to the store', () => {
      const tx: TransactionMagicLink = {
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
      }

      const state = addedTxsSlice.reducer(undefined, addOrUpdateTx({ chainId: '1', safeAddress: '0x0', tx }))

      const txKey = transactionKey(tx)

      expect(state).toEqual({
        '1': { '0x0': { [txKey]: tx } },
      })

      const tx2: TransactionMagicLink = {
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
          '0x4567890123456789012345678901234567890123': '0x456',
        },
      }

      expect(transactionKey(tx2)).toEqual(transactionKey(tx))

      expect(state).not.toEqual({
        '1': { '0x0': { [txKey]: tx2 } },
      })

      const stateB = addedTxsSlice.reducer(state, addOrUpdateTx({ chainId: '1', safeAddress: '0x0', tx: tx2 }))

      expect(stateB).toEqual({
        '1': { '0x0': { [txKey]: tx2 } },
      })

      const tx3: TransactionMagicLink = {
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
          '0x4567890123456789012345678901234567890123': '0x457',
        },
      }

      expect(transactionKey(tx3)).toEqual(transactionKey(tx2))

      expect(stateB).not.toEqual({
        '1': { '0x0': { [txKey]: tx3 } },
      })

      const stateC = addedTxsSlice.reducer(stateB, addOrUpdateTx({ chainId: '1', safeAddress: '0x0', tx: tx3 }))

      expect(stateC).toEqual({
        '1': { '0x0': { [txKey]: tx3 } },
      })
    })
  })
})
