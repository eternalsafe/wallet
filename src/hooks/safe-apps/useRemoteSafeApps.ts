import { useMemo } from 'react'
import { getSafeApps } from '@safe-global/safe-gateway-typescript-sdk'
import type { SafeAppsResponse } from '@safe-global/safe-gateway-typescript-sdk'
import { Errors, logError } from '@/services/exceptions'
import { asError } from '@/services/exceptions/utils'
import useChainId from '@/hooks/useChainId'
import type { AsyncResult } from '../useAsync'
import useAsync from '../useAsync'
import type { SafeAppsTag } from '@/config/constants'

// To avoid multiple simultaneous requests (e.g. the Dashboard and the SAFE header widget),
// cache the request promise for 100ms
let cache: Record<string, Promise<SafeAppsResponse> | undefined> = {}
const cachedGetSafeApps = (chainId: string): ReturnType<typeof getSafeApps> | undefined => {
  if (!cache[chainId]) {
    const clientUrl = typeof window === 'undefined' ? undefined : window.location.origin
    cache[chainId] = getSafeApps(chainId, clientUrl ? { client_url: clientUrl } : undefined).catch((error) => {
      logError(Errors._902, asError(error).message)
      return []
    })

    // Clear the cache the promise resolves with a small delay
    cache[chainId].finally(() => {
      setTimeout(() => (cache[chainId] = undefined), 100)
    })
  }

  return cache[chainId]
}

const useRemoteSafeApps = (tag?: SafeAppsTag): AsyncResult<SafeAppsResponse> => {
  const chainId = useChainId()

  const [remoteApps, error, loading] = useAsync<SafeAppsResponse>(() => {
    if (!chainId) return
    return cachedGetSafeApps(chainId)
  }, [chainId])

  const apps = useMemo(() => {
    if (!remoteApps || !tag) return remoteApps
    return remoteApps.filter((app) => app.tags.includes(tag))
  }, [remoteApps, tag])

  const sortedApps = useMemo(() => {
    return apps?.sort((a, b) => a.name.localeCompare(b.name))
  }, [apps])

  return [sortedApps, error, loading]
}

export { useRemoteSafeApps }
