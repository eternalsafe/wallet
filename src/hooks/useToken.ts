import { useEffect } from 'react'
import { getERC20TokenInfoOnChain } from '@/utils/tokens'
import { Errors, logError } from '@/services/exceptions'
import useAsync, { type AsyncResult } from '@/hooks/useAsync'
import type { TokenInfo } from '@safe-global/safe-gateway-typescript-sdk'
import useSafeInfo from '@/hooks/useSafeInfo'

export function useToken(token: string): AsyncResult<Omit<TokenInfo, 'logoUri'>> {
  const { safe } = useSafeInfo()
  const chainId = safe.chainId

  const [data, error, loading] = useAsync<Omit<TokenInfo, 'logoUri'> | undefined>(
    async () => {
      if (!token || !chainId) return

      return await getERC20TokenInfoOnChain(token)
    },
    [chainId, token],
    true,
  )

  // Log errors
  useEffect(() => {
    if (error) {
      logError(Errors._601, error.message)
    }
  }, [error])

  return [data, error, loading]
}
