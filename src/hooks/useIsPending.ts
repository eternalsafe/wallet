import { useAppSelector } from '@/store'
import { selectPendingTxById } from '@/store/pendingTxsSlice'

const useIsPending = (txId: string): boolean => {
  const pendingTx = useAppSelector((state) => selectPendingTxById(state, txId))
  return !!pendingTx
}

export default useIsPending
