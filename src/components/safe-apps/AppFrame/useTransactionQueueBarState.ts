import { useCallback, useContext, useEffect, useState } from 'react'
import { TxModalContext } from '@/components/tx-flow'

const useTransactionQueueBarState = () => {
  const [expanded, setExpanded] = useState(false)
  const [dismissedByUser, setDismissedByUser] = useState(false)
  const { page = { results: [] } } = {}
  const { txFlow } = useContext(TxModalContext)

  const dismissQueueBar = useCallback((): void => {
    setDismissedByUser(true)
  }, [])

  useEffect(() => {
    if (txFlow) setExpanded(false)
  }, [txFlow])

  return {
    expanded,
    dismissedByUser,
    setExpanded,
    dismissQueueBar,
    transactions: page,
  }
}

export default useTransactionQueueBarState
