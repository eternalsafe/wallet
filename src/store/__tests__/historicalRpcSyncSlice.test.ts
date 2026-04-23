import { buildTxHistorySyncKey, historicalRpcSyncSlice, selectTxHistoryCursor, setTxHistoryCursor } from '../historicalRpcSyncSlice'
import type { RootState } from '..'

describe('historicalRpcSyncSlice', () => {
  describe('buildTxHistorySyncKey', () => {
    it('should normalize the safe address casing in the sync key', () => {
      expect(buildTxHistorySyncKey('1', '0xAbCdEf1234567890ABCDef1234567890abCDef12')).toBe(
        '1:0xabcdef1234567890abcdef1234567890abcdef12',
      )
    })
  })

  describe('setTxHistoryCursor', () => {
    it('should store the cursor by chain and safe address', () => {
      const state = historicalRpcSyncSlice.reducer(
        undefined,
        setTxHistoryCursor({
          chainId: '1',
          safeAddress: '0xAbCdEf1234567890ABCDef1234567890abCDef12',
          cursor: {
            latestSyncedBlock: 123,
            backfillCursor: 45,
            backfillComplete: false,
          },
        }),
      )

      expect(state).toEqual({
        txHistoryBySafe: {
          '1:0xabcdef1234567890abcdef1234567890abcdef12': {
            latestSyncedBlock: 123,
            backfillCursor: 45,
            backfillComplete: false,
          },
        },
      })
    })
  })

  describe('selectTxHistoryCursor', () => {
    it('should return the stored cursor for the provided key', () => {
      const state = {
        historicalRpcSync: {
          txHistoryBySafe: {
            '1:0xabcdef1234567890abcdef1234567890abcdef12': {
              latestSyncedBlock: 123,
              backfillCursor: 45,
              backfillComplete: false,
            },
          },
        },
      } as unknown as RootState

      expect(selectTxHistoryCursor(state, '1:0xabcdef1234567890abcdef1234567890abcdef12')).toEqual({
        latestSyncedBlock: 123,
        backfillCursor: 45,
        backfillComplete: false,
      })
    })
  })
})
