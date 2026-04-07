import { Box, Typography } from '@mui/material'
import NavTabs from '@/components/common/NavTabs'
import { transactionNavItems } from '@/components/sidebar/SidebarNavigation/config'
import { useAppSelector } from '@/store'
import { selectTxHistorySync } from '@/store/txHistorySyncSlice'
import { useRouter } from 'next/router'

const TxNavigation = () => {
  const { loading, syncedToBlock, latestBlock } = useAppSelector(selectTxHistorySync)
  const router = useRouter()
  const isHistorySelected = router.pathname === '/transactions/history' || router.pathname === '/transactions'

  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
      <NavTabs tabs={transactionNavItems} />
      {isHistorySelected && loading && syncedToBlock !== undefined && latestBlock !== undefined && (
        <Typography variant="caption" color="text.secondary" textAlign="right" ml={2}>
          {`Scanning history... At Block: ${syncedToBlock} - Latest Block: ${latestBlock}`}
        </Typography>
      )}
    </Box>
  )
}

export default TxNavigation
