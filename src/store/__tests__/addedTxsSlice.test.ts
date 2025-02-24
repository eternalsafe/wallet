import { transactionKey } from '@/services/tx/txMagicLink'
import { OperationType, type SafeTransaction } from '@safe-global/safe-core-sdk-types'
import EthSafeTransaction from '@safe-global/protocol-kit/dist/src/utils/transactions/SafeTransaction'
import { EthSafeSignature } from '@safe-global/protocol-kit'
import { addedTxsSlice, addOrUpdateTx } from '../addedTxsSlice'
import * as safeCoreSDK from '@/hooks/coreSDK/safeCoreSDK'
import type Safe from '@safe-global/protocol-kit'

describe('addedTxsSlice', () => {
  describe('addOrUpdateTx', () => {
    let mockSDK: Safe

    beforeEach(() => {
      jest.resetAllMocks()

      mockSDK = {
        getTransactionHash: (safeTransaction: SafeTransaction) => {
          return '0x123'
        },
      } as unknown as Safe

      jest.spyOn(safeCoreSDK, 'getSafeSDK').mockReturnValue(mockSDK)
    })

    it('should add a tx to the store', async () => {
      const tx = new EthSafeTransaction({
        data: '0x',
        baseGas: '21000',
        gasPrice: '10000000000',
        safeTxGas: '11000',
        gasToken: '0x0000000000000000000000000000000000000000',
        nonce: 0,
        refundReceiver: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        to: '0x1234567890123456789012345678901234567890',
        operation: OperationType.Call,
      })
      tx.addSignature(new EthSafeSignature('0x1234567890123456789012345678901234567890', '0x123'))

      const txKey = await transactionKey(tx)

      const state = addedTxsSlice.reducer(undefined, addOrUpdateTx({ chainId: '1', safeAddress: '0x0', tx, txKey }))

      expect(state).toEqual({
        '1': {
          '0x0': {
            [txKey]: {
              data: tx.data,
              signatures: {
                '0x1234567890123456789012345678901234567890': '0x123',
              },
              timestamp: expect.any(Number),
            },
          },
        },
      })

      tx.addSignature(new EthSafeSignature('0x4567890123456789012345678901234567890123', '0x456'))

      expect(state).not.toEqual({
        '1': {
          '0x0': {
            [txKey]: {
              data: tx.data,
              signatures: {
                '0x1234567890123456789012345678901234567890': '0x123',
                '0x4567890123456789012345678901234567890123': '0x456',
              },
              timestamp: expect.any(Number),
            },
          },
        },
      })

      const stateB = addedTxsSlice.reducer(state, addOrUpdateTx({ chainId: '1', safeAddress: '0x0', tx, txKey }))

      expect(stateB).toEqual({
        '1': {
          '0x0': {
            [txKey]: {
              data: tx.data,
              signatures: {
                '0x1234567890123456789012345678901234567890': '0x123',
                '0x4567890123456789012345678901234567890123': '0x456',
              },
              timestamp: expect.any(Number),
            },
          },
        },
      })

      const tx2 = new EthSafeTransaction({
        data: '0x',
        baseGas: '21000',
        gasPrice: '10000000000',
        safeTxGas: '11000',
        gasToken: '0x0000000000000000000000000000000000000000',
        nonce: 0,
        refundReceiver: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        to: '0x1234567890123456789012345678901234567890',
        operation: OperationType.Call,
      })
      tx2.addSignature(new EthSafeSignature('0x1234567890123456789012345678901234567890', '0x123'))
      tx2.addSignature(new EthSafeSignature('0x4567890123456789012345678901234567890123', '0x457'))

      expect(transactionKey(tx)).toEqual(transactionKey(tx2))

      expect(stateB).not.toEqual({
        '1': {
          '0x0': {
            [txKey]: {
              data: tx.data,
              signatures: {
                '0x1234567890123456789012345678901234567890': '0x123',
                '0x4567890123456789012345678901234567890123': '0x457',
              },
              timestamp: expect.any(Number),
            },
          },
        },
      })

      const stateC = addedTxsSlice.reducer(stateB, addOrUpdateTx({ chainId: '1', safeAddress: '0x0', tx: tx2, txKey }))

      expect(stateC).toEqual({
        '1': {
          '0x0': {
            [txKey]: {
              data: tx.data,
              signatures: {
                '0x1234567890123456789012345678901234567890': '0x123',
                '0x4567890123456789012345678901234567890123': '0x457',
              },
              timestamp: expect.any(Number),
            },
          },
        },
      })
    })
  })
})
