import { Box, Typography } from '@mui/material'
import NavTabs from '@/components/common/NavTabs'
import { transactionNavItems } from '@/components/sidebar/SidebarNavigation/config'
import useSafeInfo from '@/hooks/useSafeInfo'
import { useAppSelector } from '@/store'
import { AppRoutes } from '@/config/routes'
import { useRouter } from 'next/router'
import { buildTxHistorySyncKey, selectTxHistoryCursor } from '@/store/historicalRpcSyncSlice'

const TxNavigation = () => {
  const router = useRouter()
  const { safe, safeAddress } = useSafeInfo()
  const syncKey = safeAddress ? buildTxHistorySyncKey(safe.chainId, safeAddress) : ''
  const cursor = useAppSelector((state) => (syncKey ? selectTxHistoryCursor(state, syncKey) : undefined))

  const isHistorySelected =
    router.pathname === AppRoutes.transactions.history || router.pathname === AppRoutes.transactions.index

  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
      <NavTabs tabs={transactionNavItems} />

      {isHistorySelected && cursor && !cursor.backfillComplete && (
        <Typography variant="caption" color="text.secondary" textAlign="right" ml={2}>
          {`Scanning history... block ${cursor.backfillCursor} of ${cursor.latestSyncedBlock}`}
        </Typography>
      )}

      {isHistorySelected && cursor?.backfillComplete && (
        <Typography variant="caption" color="text.secondary" textAlign="right" ml={2}>
          {`History scanned. Latest block: ${cursor.latestSyncedBlock}`}
        </Typography>
      )}
    </Box>
  )
}

export default TxNavigation
