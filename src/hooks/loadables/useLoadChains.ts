import { useEffect } from 'react'
import { type ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'
import useAsync, { type AsyncResult } from '../useAsync'
import { logError, Errors } from '@/services/exceptions'
import { getChainsConfig } from '@/config/supportedChains'
import useLocalStorage from '@/services/local-storage/useLocalStorage'

const STORAGE_KEY = 'chains'

export const useLoadChains = (): AsyncResult<ChainInfo[]> => {
  const [storedChains] = useLocalStorage(STORAGE_KEY)
  const [data, error, loading] = useAsync<ChainInfo[]>(async () => {
    const supportedChains = await getChainsConfig()
    // Merge stored chains with supported chains, preferring stored versions
    const mergedChains = [...supportedChains]

    if (storedChains?.length) {
      storedChains.forEach((storedChain: ChainInfo) => {
        const index = mergedChains.findIndex(chain => chain.chainId === storedChain.chainId)
        if (index >= 0) {
          mergedChains[index] = storedChain
        } else {
          mergedChains.push(storedChain)
        }
      })
    }

    return mergedChains
  }, [storedChains])

  // Log errors
  useEffect(() => {
    if (error) {
      logError(Errors._620, error.message)
    }
  }, [error])

  return [data, error, loading]
}

export default useLoadChains
