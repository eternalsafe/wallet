import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import useChainId from './useChainId'
import useSafeAddress from './useSafeAddress'
import type { DraftBatchItem } from '@/store/batchSlice'
import { selectBatchBySafe, addTx, removeTx, setBatch } from '@/store/batchSlice'
import { type TransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { txDispatch, TxEvent } from '@/services/tx/txEvents'

export const useUpdateBatch = () => {
  const chainId = useChainId()
  const safeAddress = useSafeAddress()
  const dispatch = useAppDispatch()

  const onAdd = useCallback(
    async (txDetails: TransactionDetails): Promise<void> => {
      dispatch(
        addTx({
          chainId,
          safeAddress,
          txDetails,
        }),
      )

      txDispatch(TxEvent.BATCH_ADD, { txId: txDetails.txId })
    },
    [dispatch, chainId, safeAddress],
  )

  const onDelete = useCallback(
    (id: DraftBatchItem['id']) => {
      dispatch(
        removeTx({
          chainId,
          safeAddress,
          id,
        }),
      )
    },
    [dispatch, chainId, safeAddress],
  )

  const onSet = useCallback(
    (items: DraftBatchItem[]) => {
      dispatch(
        setBatch({
          chainId,
          safeAddress,
          items,
        }),
      )
    },
    [dispatch, chainId, safeAddress],
  )

  return [onAdd, onDelete, onSet] as const
}

export const useDraftBatch = (): DraftBatchItem[] => {
  const chainId = useChainId()
  const safeAddress = useSafeAddress()
  const batch = useAppSelector((state) => selectBatchBySafe(state, chainId, safeAddress))
  return batch
}
