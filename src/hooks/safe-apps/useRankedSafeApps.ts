import { useMemo } from 'react'
import type { SafeAppData } from '@safe-global/safe-gateway-typescript-sdk'
import { SafeAppsTag } from '@/config/constants'

// number of ranked Safe Apps that we want to display
const NUMBER_OF_SAFE_APPS = 5

const useRankedSafeApps = (safeApps: SafeAppData[], pinnedSafeApps: SafeAppData[]): SafeAppData[] => {
  return useMemo(() => {
    if (!safeApps.length) return []

    const sortedApps = safeApps.slice().sort((a, b) => a.name.localeCompare(b.name))

    const allRankedApps = pinnedSafeApps
      .concat(sortedApps)
      // Filter out Featured Apps because they are in their own section
      .filter((app) => !app.tags.includes(SafeAppsTag.DASHBOARD_FEATURED))

    // Use a Set to remove duplicates
    return [...new Set(allRankedApps)].slice(0, NUMBER_OF_SAFE_APPS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeApps])
}

export { useRankedSafeApps }
