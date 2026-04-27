import { useEffect, useRef } from 'react'
import { type Slice } from '@reduxjs/toolkit'
import { useAppDispatch } from '@/store'
import { type AsyncResult } from './useAsync'
import useSafeInfo from './useSafeInfo'
import { buildTxHistorySyncKey } from '@/store/historicalRpcSyncSlice'

// Import all the loadable hooks
import useLoadChains from './loadables/useLoadChains'
import useLoadSafeInfo from './loadables/useLoadSafeInfo'
import useLoadBalances from './loadables/useLoadBalances'
import useLoadTxHistory from './loadables/useLoadTxHistory'
import useLoadTxQueue from '@/hooks/loadables/useLoadTxQueue'
import useLoadCollectiblesBalances from '@/hooks/loadables/useLoadCollectiblesBalance'

// Import all the loadable slices
import { chainsSlice } from '@/store/chainsSlice'
import { safeInfoSlice } from '@/store/safeInfoSlice'
import { balancesSlice } from '@/store/balancesSlice'
import { txHistorySlice } from '@/store/txHistorySlice'
import { txQueueSlice } from '@/store/txQueueSlice'
import { spendingLimitSlice } from '@/store/spendingLimitsSlice'
import useLoadSpendingLimits from '@/hooks/loadables/useLoadSpendingLimits'
import { collectiblesBalanceSlice } from '@/store/collectiblesBalancesSlice'

// Dispatch into the corresponding store when the loadable is loaded
const useUpdateStore = (
  slice: Slice,
  useLoadHook: () => AsyncResult<unknown>,
  getExtraPayload?: (params: { data: unknown; error: Error | undefined; loading: boolean }) => Record<string, unknown>,
): void => {
  const dispatch = useAppDispatch()
  const [data, error, loading] = useLoadHook()
  const setAction = slice.actions.set

  useEffect(() => {
    const extraPayload = getExtraPayload?.({ data, error, loading }) ?? {}
    dispatch(
      setAction({
        data,
        error: data ? undefined : error?.message,
        loading: loading && !data,
        ...extraPayload,
      }),
    )
  }, [dispatch, setAction, data, error, loading, getExtraPayload])
}

const useUpdateTxHistoryStore = (syncKey: string | undefined): void => {
  const dispatch = useAppDispatch()
  const [data, error, loading] = useLoadTxHistory()
  const previousSyncKeyRef = useRef(syncKey)

  useEffect(() => {
    const syncKeyChanged = previousSyncKeyRef.current !== syncKey
    previousSyncKeyRef.current = syncKey

    if (syncKeyChanged) {
      dispatch(
        txHistorySlice.actions.set({
          data: undefined,
          error: undefined,
          loading: false,
          syncKey,
        }),
      )
      return
    }

    dispatch(
      txHistorySlice.actions.set({
        data,
        error: data ? undefined : error?.message,
        loading: loading && !data,
        syncKey,
      }),
    )
  }, [data, dispatch, error, loading, syncKey])
}

const useLoadableStores = () => {
  const { safe, safeAddress } = useSafeInfo()
  const txHistorySyncKey = safeAddress ? buildTxHistorySyncKey(safe.chainId, safeAddress) : undefined

  useUpdateStore(chainsSlice, useLoadChains)
  useUpdateStore(safeInfoSlice, useLoadSafeInfo)
  useUpdateStore(balancesSlice, useLoadBalances)
  useUpdateStore(collectiblesBalanceSlice, useLoadCollectiblesBalances)
  useUpdateTxHistoryStore(txHistorySyncKey)
  useUpdateStore(txQueueSlice, useLoadTxQueue)
  useUpdateStore(spendingLimitSlice, useLoadSpendingLimits)
}

export default useLoadableStores
