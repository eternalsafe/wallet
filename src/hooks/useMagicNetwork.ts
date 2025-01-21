import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppDispatch } from '@/store'
import { setRpc } from '@/store/settingsSlice'
import { setLastChainId } from '@/store/sessionSlice'
import chains from '@/config/chains'
import useChainId from '@/hooks/useChainId'

export const useMagicNetwork = (): void => {
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const chainId = useChainId()

  useEffect(() => {
    // Get params
    const chainIdParam = searchParams.get('chainId')
    // const chainNameParam = searchParams.get('chain')
    const rpcUrl = searchParams.get('rpc')

    // Return if no RPC param
    if (!rpcUrl) return

    // Return if chain param doesn't match current chainId
    if (!chainIdParam) return

    // Store RPC URL in settings
    dispatch(
      setRpc({
        chainId: chainIdParam,
        rpc: decodeURIComponent(rpcUrl),
      }),
    )
  }, [searchParams, dispatch, chainId])
}

export default useMagicNetwork 