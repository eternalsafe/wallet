import { useEffect } from 'react'

import { Errors, logError } from '@/services/exceptions'
import { showNotification } from '@/store/notificationsSlice'
import { useAppDispatch } from '@/store'

import { useTxHistoryLoader } from './txHistory/useTxHistoryLoader'
import type { TxHistory } from './txHistory/types'

import type { AsyncResult } from '../useAsync'

export type { TxHistory, TxHistoryItem } from './txHistory/types'

export const useLoadTxHistory = (): AsyncResult<TxHistory> => {
  const dispatch = useAppDispatch()
  const { data, error, loading } = useTxHistoryLoader()

  useEffect(() => {
    if (!error) return

    dispatch(
      showNotification({
        message:
          'Error fetching transaction history. If you see this error often, please consider using a more stable RPC URL.',
        groupKey: 'fetch-tx-history-error',
        variant: 'error',
        detailedMessage: error.message,
      }),
    )
    logError(Errors._602, error.message)
  }, [error, dispatch])

  return [data, error, loading]
}

export default useLoadTxHistory
