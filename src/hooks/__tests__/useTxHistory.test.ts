import { Provider } from 'react-redux'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'

import { makeStore } from '@/store'
import { txHistorySlice } from '@/store/txHistorySlice'
import { buildMultisigTxId } from '@/utils/tx-id'

import useTxHistory from '../useTxHistory'
import * as safeInfo from '../useSafeInfo'

jest.mock('../useSafeInfo')

const SAFE_ADDRESS = '0x0000000000000000000000000000000000000afe'
const CHAIN_ID = '11155111'

describe('useTxHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(safeInfo, 'default').mockReturnValue({
      safeAddress: SAFE_ADDRESS,
      safe: { chainId: CHAIN_ID, nonce: 0, version: '1.4.1' },
    } as any)
  })

  it('ignores null persisted tx history entries', async () => {
    const txId = buildMultisigTxId(SAFE_ADDRESS, '0xsafe')
    const store = makeStore({
      [txHistorySlice.name]: {
        loading: false,
        syncKey: `${CHAIN_ID}:${SAFE_ADDRESS}`,
        data: {
          nullEntry: null,
          [txId]: {
            txId,
            txHash: '0xtx',
            safeTxHash: '0xsafe',
            timestamp: 1,
            executor: '0x0000000000000000000000000000000000000001',
          },
        },
      },
    } as any)

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        Provider as React.ComponentType<{ store: typeof store; children?: React.ReactNode }>,
        { store },
        children,
      )

    const { result } = renderHook(() => useTxHistory(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeUndefined()
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0].details.txHash).toBe('0xtx')
  })
})
