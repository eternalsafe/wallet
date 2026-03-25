import { useMemo, useCallback } from 'react'
import type { SafeAppData } from '@safe-global/safe-gateway-typescript-sdk'
import { useCustomSafeApps } from '@/hooks/safe-apps/useCustomSafeApps'
import { usePinnedSafeApps } from '@/hooks/safe-apps/usePinnedSafeApps'
import { useBrowserPermissions, useSafePermissions } from './permissions'
import { useRankedSafeApps } from '@/hooks/safe-apps/useRankedSafeApps'

type ReturnType = {
  allSafeApps: SafeAppData[]
  pinnedSafeApps: SafeAppData[]
  pinnedSafeAppIds: Set<number>
  customSafeApps: SafeAppData[]
  rankedSafeApps: SafeAppData[]
  customSafeAppsLoading: boolean
  addCustomApp: (app: SafeAppData) => void
  togglePin: (appId: number) => void
  removeCustomApp: (appId: number) => void
}

const useSafeApps = (): ReturnType => {
  const { customSafeApps, loading: customSafeAppsLoading, updateCustomSafeApps } = useCustomSafeApps()
  const { pinnedSafeAppIds, updatePinnedSafeApps } = usePinnedSafeApps()
  const { removePermissions: removeSafePermissions } = useSafePermissions()
  const { removePermissions: removeBrowserPermissions } = useBrowserPermissions()

  const allSafeApps = useMemo(() => [...customSafeApps].sort((a, b) => a.name.localeCompare(b.name)), [customSafeApps])

  const pinnedSafeApps = useMemo(
    () => allSafeApps.filter((app) => pinnedSafeAppIds.has(app.id)),
    [allSafeApps, pinnedSafeAppIds],
  )

  const rankedSafeApps = useRankedSafeApps(allSafeApps, pinnedSafeApps)

  const addCustomApp = useCallback(
    (app: SafeAppData) => {
      updateCustomSafeApps([...customSafeApps, app])
    },
    [updateCustomSafeApps, customSafeApps],
  )

  const removeCustomApp = useCallback(
    (appId: number) => {
      updateCustomSafeApps(customSafeApps.filter((app) => app.id !== appId))
      const app = customSafeApps.find((app) => app.id === appId)

      if (app) {
        removeSafePermissions(app.url)
        removeBrowserPermissions(app.url)
      }
    },
    [updateCustomSafeApps, customSafeApps, removeSafePermissions, removeBrowserPermissions],
  )

  const togglePin = (appId: number) => {
    const alreadyPinned = pinnedSafeAppIds.has(appId)
    const newSet = new Set(pinnedSafeAppIds)

    if (alreadyPinned) {
      newSet.delete(appId)
    } else {
      newSet.add(appId)
    }
    updatePinnedSafeApps(newSet)
  }

  return {
    allSafeApps,
    rankedSafeApps,

    pinnedSafeApps,
    pinnedSafeAppIds,
    togglePin,

    customSafeApps,
    customSafeAppsLoading,
    addCustomApp,
    removeCustomApp,
  }
}

export { useSafeApps }
