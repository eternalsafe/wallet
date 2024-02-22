import useChainId from '@/hooks/useChainId'
import { useAppDispatch } from '@/store'
import { remove } from '@/store/customTokensSlice'
import { useCallback, useState } from 'react'

// This is the default for MUI Collapse
export const COLLAPSE_TIMEOUT_MS = 300

export const useRemoveToken = () => {
  const dispatch = useAppDispatch()
  const chainId = useChainId()

  const [removingToken, setRemovingToken] = useState<string>()

  const removeToken = useCallback(
    (address: string) => {
      setRemovingToken(address)
      setTimeout(() => {
        dispatch(remove([chainId, address]))
        setRemovingToken(undefined)
      }, COLLAPSE_TIMEOUT_MS)
    },
    [chainId, dispatch],
  )

  return {
    removeToken,
    removingToken,
  }
}
