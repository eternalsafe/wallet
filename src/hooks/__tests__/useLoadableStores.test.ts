import { renderHook } from '@testing-library/react'

import { useAppDispatch } from '@/store'
import { txHistorySlice } from '@/store/txHistorySlice'

import useLoadableStores from '../useLoadableStores'
import useSafeInfo from '../useSafeInfo'
import useLoadBalances from '../loadables/useLoadBalances'
import useLoadChains from '../loadables/useLoadChains'
import useLoadCollectiblesBalances from '../loadables/useLoadCollectiblesBalance'
import useLoadSafeInfo from '../loadables/useLoadSafeInfo'
import useLoadSpendingLimits from '../loadables/useLoadSpendingLimits'
import useLoadTxHistory from '../loadables/useLoadTxHistory'
import useLoadTxQueue from '../loadables/useLoadTxQueue'

jest.mock('@/store', () => ({
  useAppDispatch: jest.fn(),
}))

jest.mock('../useSafeInfo', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../loadables/useLoadChains', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../loadables/useLoadSafeInfo', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../loadables/useLoadBalances', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../loadables/useLoadTxHistory', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../loadables/useLoadTxQueue', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../loadables/useLoadCollectiblesBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../loadables/useLoadSpendingLimits', () => ({
  __esModule: true,
  default: jest.fn(),
}))

describe('useLoadableStores', () => {
  it('tags tx history store writes with the active sync key', () => {
    const dispatch = jest.fn()

    ;(useAppDispatch as jest.Mock).mockReturnValue(dispatch)
    ;(useSafeInfo as jest.Mock).mockReturnValue({
      safeAddress: '0x0000000000000000000000000000000000000afe',
      safe: { chainId: '1', nonce: 0, version: '1.4.1' },
    })
    ;(useLoadChains as jest.Mock).mockReturnValue([undefined, undefined, false])
    ;(useLoadSafeInfo as jest.Mock).mockReturnValue([undefined, undefined, false])
    ;(useLoadBalances as jest.Mock).mockReturnValue([undefined, undefined, false])
    ;(useLoadTxHistory as jest.Mock).mockReturnValue([{ tx: 'history' }, undefined, false])
    ;(useLoadTxQueue as jest.Mock).mockReturnValue([undefined, undefined, false])
    ;(useLoadCollectiblesBalances as jest.Mock).mockReturnValue([undefined, undefined, false])
    ;(useLoadSpendingLimits as jest.Mock).mockReturnValue([undefined, undefined, false])

    renderHook(() => useLoadableStores())

    expect(dispatch).toHaveBeenCalledWith(
      txHistorySlice.actions.set({
        data: { tx: 'history' },
        error: undefined,
        loading: false,
        syncKey: '1:0x0000000000000000000000000000000000000afe',
      }),
    )
  })

  it('clears tx history on the first render after a sync key switch before restamping new data', () => {
    const dispatch = jest.fn()
    let currentChainId = '1'

    ;(useAppDispatch as jest.Mock).mockReturnValue(dispatch)
    ;(useSafeInfo as jest.Mock).mockImplementation(() => ({
      safeAddress: '0x0000000000000000000000000000000000000afe',
      safe: { chainId: currentChainId, nonce: 0, version: '1.4.1' },
    }))
    ;(useLoadChains as jest.Mock).mockReturnValue([undefined, undefined, false])
    ;(useLoadSafeInfo as jest.Mock).mockReturnValue([undefined, undefined, false])
    ;(useLoadBalances as jest.Mock).mockReturnValue([undefined, undefined, false])
    ;(useLoadTxHistory as jest.Mock).mockReturnValue([{ tx: 'stale-history' }, undefined, false])
    ;(useLoadTxQueue as jest.Mock).mockReturnValue([undefined, undefined, false])
    ;(useLoadCollectiblesBalances as jest.Mock).mockReturnValue([undefined, undefined, false])
    ;(useLoadSpendingLimits as jest.Mock).mockReturnValue([undefined, undefined, false])

    const { rerender } = renderHook(() => useLoadableStores())

    dispatch.mockClear()
    currentChainId = '2'
    rerender()

    expect(dispatch).toHaveBeenCalledWith(
      txHistorySlice.actions.set({
        data: undefined,
        error: undefined,
        loading: false,
        syncKey: '2:0x0000000000000000000000000000000000000afe',
      }),
    )
    expect(dispatch).not.toHaveBeenCalledWith(
      txHistorySlice.actions.set({
        data: { tx: 'stale-history' },
        error: undefined,
        loading: false,
        syncKey: '2:0x0000000000000000000000000000000000000afe',
      }),
    )
  })
})
