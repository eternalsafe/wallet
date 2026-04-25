import {
  buildTxHistorySyncKey,
  clearTxHistoryCursor,
  historicalRpcSyncSlice,
  selectTxHistoryCursor,
  setTxHistoryCursor,
} from '../historicalRpcSyncSlice'
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

    it('should keep cursor progress monotonic for the same chain and safe address', () => {
      const state = historicalRpcSyncSlice.reducer(
        historicalRpcSyncSlice.reducer(
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
        ),
        setTxHistoryCursor({
          chainId: '1',
          safeAddress: '0xAbCdEf1234567890ABCDef1234567890abCDef12',
          cursor: {
            latestSyncedBlock: 120,
            backfillCursor: 90,
            backfillComplete: false,
          },
        }),
      )

      expect(state.txHistoryBySafe['1:0xabcdef1234567890abcdef1234567890abcdef12']).toEqual({
        latestSyncedBlock: 123,
        backfillCursor: 45,
        backfillComplete: false,
      })
    })
  })

  describe('clearTxHistoryCursor', () => {
    it('should remove the stored cursor for the chain and safe address', () => {
      const populatedState = historicalRpcSyncSlice.reducer(
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

      const state = historicalRpcSyncSlice.reducer(
        populatedState,
        clearTxHistoryCursor({
          chainId: '1',
          safeAddress: '0xAbCdEf1234567890ABCDef1234567890abCDef12',
        }),
      )

      expect(state).toEqual({
        txHistoryBySafe: {},
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
