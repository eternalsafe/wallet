import { transactionKey } from '@/services/tx/txMagicLink'
import { OperationType } from '@safe-global/safe-core-sdk-types'
import EthSignSignature from '@safe-global/safe-core-sdk/dist/src/utils/signatures/SafeSignature'
import EthSafeTransaction from '@safe-global/safe-core-sdk/dist/src/utils/transactions/SafeTransaction'
import { addedTxsSlice, addOrUpdateTx } from '../addedTxsSlice'

describe('addedTxsSlice', () => {
  describe('addOrUpdateTx', () => {
    beforeEach(() => {
      jest.resetAllMocks()

      // TODO(devanon): mock getSafeSDK
      // mockCreateEnableModuleTx = jest.fn(() => ({
      //   data: {
      //     data: '0x',
      //     to: '0x',
      //   },
      // }))

      // mockSDK = {
      //   isModuleEnabled: jest.fn(() => false),
      //   createEnableModuleTx: mockCreateEnableModuleTx,
      //   createTransaction: jest.fn(() => 'asd'),
      // } as unknown as Safe

      // jest.spyOn(txSender, 'createMultiSendCallOnlyTx').mockImplementation(jest.fn())
      // jest.spyOn(safeCoreSDK, 'getSafeSDK').mockReturnValue(mockSDK)
      // jest.spyOn(spendingLimit, 'getSpendingLimitModuleAddress').mockReturnValue(ZERO_ADDRESS)
    })

    it('should add a tx to the store', async () => {
      const tx = new EthSafeTransaction({
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
      })
      tx.addSignature(new EthSignSignature('0x1234567890123456789012345678901234567890', '0x123'))

      const txKey = await transactionKey(tx)

      const state = addedTxsSlice.reducer(undefined, addOrUpdateTx({ chainId: '1', safeAddress: '0x0', tx, txKey }))

      expect(state).toEqual({
        '1': {
          '0x0': {
            [txKey]: {
              data: tx.data,
              signature: {
                '0x1234567890123456789012345678901234567890': '0x123',
              },
            },
          },
        },
      })

      tx.addSignature(new EthSignSignature('0x4567890123456789012345678901234567890123', '0x456'))

      expect(state).not.toEqual({
        '1': {
          '0x0': {
            [txKey]: {
              data: tx.data,
              signature: {
                '0x1234567890123456789012345678901234567890': '0x123',
                '0x4567890123456789012345678901234567890123': '0x456',
              },
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
              signature: {
                '0x1234567890123456789012345678901234567890': '0x123',
                '0x4567890123456789012345678901234567890123': '0x456',
              },
            },
          },
        },
      })

      const tx2 = new EthSafeTransaction({
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
      })
      tx2.addSignature(new EthSignSignature('0x1234567890123456789012345678901234567890', '0x123'))
      tx2.addSignature(new EthSignSignature('0x4567890123456789012345678901234567890123', '0x456'))

      expect(transactionKey(tx)).toEqual(transactionKey(tx2))

      expect(stateB).not.toEqual({
        '1': {
          '0x0': {
            [txKey]: {
              data: tx.data,
              signature: {
                '0x1234567890123456789012345678901234567890': '0x123',
                '0x4567890123456789012345678901234567890123': '0x457',
              },
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
              signature: {
                '0x1234567890123456789012345678901234567890': '0x123',
                '0x4567890123456789012345678901234567890123': '0x457',
              },
            },
          },
        },
      })
    })
  })
})
