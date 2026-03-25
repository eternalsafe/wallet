import { useEffect, useState } from 'react'
import type { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import type { SafeAppData } from '@safe-global/safe-gateway-typescript-sdk'

import { useSafeApps } from '@/hooks/safe-apps/useSafeApps'
import SafeAppsHeader from '@/components/safe-apps/SafeAppsHeader'
import SafeAppList from '@/components/safe-apps/SafeAppList'
import { RemoveCustomAppModal } from '@/components/safe-apps/RemoveCustomAppModal'
import { AppRoutes } from '@/config/routes'
import { useHasFeature } from '@/hooks/useChains'
import { FEATURES } from '@/utils/chains'

const SafeApps: NextPage = () => {
  const { query, isReady, push } = useRouter()
  const appUrl = Array.isArray(query.appUrl) ? query.appUrl[0] : query.appUrl
  const safe = Array.isArray(query.safe) ? query.safe[0] : query.safe
  const isSafeAppsEnabled = useHasFeature(FEATURES.SAFE_APPS)
  const { customSafeApps, addCustomApp, removeCustomApp } = useSafeApps()

  const [isOpenRemoveSafeAppModal, setIsOpenRemoveSafeAppModal] = useState<boolean>(false)
  const [customSafeAppToRemove, setCustomSafeAppToRemove] = useState<SafeAppData>()

  useEffect(() => {
    if (!isReady) return

    if (appUrl) {
      push({ pathname: AppRoutes.apps.open, query: { safe, appUrl } })
    }
  }, [appUrl, isReady, push, safe])

  if (!isSafeAppsEnabled) return <></>

  const openRemoveCustomAppModal = (app: SafeAppData) => {
    setIsOpenRemoveSafeAppModal(true)
    setCustomSafeAppToRemove(app)
  }

  const onConfirmRemoveCustomAppModal = (safeAppId: number) => {
    removeCustomApp(safeAppId)
    setIsOpenRemoveSafeAppModal(false)
  }

  return (
    <>
      <Head>
        <title>{'Safe{Wallet} – My custom Safe Apps'}</title>
      </Head>

      <SafeAppsHeader />

      <main>
        <SafeAppList
          title="My custom apps"
          safeAppsList={customSafeApps}
          addCustomApp={addCustomApp}
          removeCustomApp={openRemoveCustomAppModal}
        />
      </main>

      {customSafeAppToRemove && (
        <RemoveCustomAppModal
          open={isOpenRemoveSafeAppModal}
          app={customSafeAppToRemove}
          onClose={() => setIsOpenRemoveSafeAppModal(false)}
          onConfirm={onConfirmRemoveCustomAppModal}
        />
      )}
    </>
  )
}

export default SafeApps
