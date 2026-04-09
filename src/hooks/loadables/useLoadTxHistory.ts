import { useEffect } from 'react'
import { type AsyncResult } from '../useAsync'
import { Errors, logError } from '@/services/exceptions'
import { useAppDispatch } from '@/store'
import { AppRoutes } from '@/config/routes'
import { showNotification } from '@/store/notificationsSlice'
import { useTxHistoryLoader } from './txHistory/useTxHistoryLoader'
import type { TxHistory } from './txHistory/types'

export { extractSafeTxHashFromExecutionSuccessLog } from './txHistory/logParsing'
export type { TxHistory, TxHistoryItem } from './txHistory/types'

export const useLoadTxHistory = (): AsyncResult<TxHistory> => {
  const dispatch = useAppDispatch()
  const { data, error, loading } = useTxHistoryLoader()

  useEffect(() => {
    if (!error) {
      return
    }

    dispatch(
      showNotification({
        message:
          'Error fetching transaction history. If you see this error often, please configure your RPC URL or Chain Queries settings.',
        groupKey: 'fetch-tx-history-error',
        variant: 'error',
        detailedMessage: error.message,
        link: {
          href: AppRoutes.settings.environmentVariables,
          title: 'RPC settings',
        },
      }),
    )
    logError(Errors._602, error.message)
  }, [error, dispatch])

  return [data, error, loading]
}

export default useLoadTxHistory
