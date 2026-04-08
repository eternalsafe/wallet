import useTxHistory from '@/hooks/useTxHistory'
import { renderHook, waitFor } from '@/tests/test-utils'
import { defaultSafeInfo } from '@/store/safeInfoSlice'
import { buildMultisigTxId } from '@/utils/tx-id'

describe('useTxHistory', () => {
  it('returns historical transactions ordered from latest to oldest', async () => {
    const safeAddress = '0x577A0D87f4e6fbdd55d51Ac4a4344EC042C04bb2'
    const olderTxId = buildMultisigTxId(safeAddress, `0x${'a'.repeat(64)}`)
    const newerTxId = buildMultisigTxId(safeAddress, `0x${'b'.repeat(64)}`)

    const { result } = renderHook(() => useTxHistory(), {
      initialReduxState: {
        safeInfo: {
          data: {
            ...defaultSafeInfo,
            address: { value: safeAddress },
            chainId: '11155111',
            version: '1.4.1',
          },
          loading: false,
        },
        txHistory: {
          data: {
            [olderTxId]: {
              txId: olderTxId,
              txHash: `0x${'c'.repeat(64)}`,
              safeTxHash: `0x${'a'.repeat(64)}`,
              timestamp: 1_700_000_000_000,
              executor: '0x1111111111111111111111111111111111111111',
            },
            [newerTxId]: {
              txId: newerTxId,
              txHash: `0x${'d'.repeat(64)}`,
              safeTxHash: `0x${'b'.repeat(64)}`,
              timestamp: 1_800_000_000_000,
              executor: '0x2222222222222222222222222222222222222222',
            },
          },
          loading: false,
        },
      } as any,
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toHaveLength(2)
    })

    expect(result.current.data[0]?.transaction.id).toBe(newerTxId)
    expect(result.current.data[1]?.transaction.id).toBe(olderTxId)
  })
})
