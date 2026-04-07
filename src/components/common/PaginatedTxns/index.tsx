import { type ReactElement, useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import TxList from '@/components/transactions/TxList'
import ErrorMessage from '@/components/tx/ErrorMessage'
import useTxHistory from '@/hooks/useTxHistory'
import useTxQueue from '@/hooks/useTxQueue'
import PagePlaceholder from '../PagePlaceholder'
import SkeletonTxList from './SkeletonTxList'
import NoTransactionsIcon from '@/public/images/transactions/no-transactions.svg'
import { useHasPendingTxs } from '@/hooks/usePendingTxs'
import useSafeInfo from '@/hooks/useSafeInfo'
import { useAppSelector } from '@/store'
import { selectTxHistorySync } from '@/store/txHistorySyncSlice'

const NoQueuedTxns = () => {
  return <PagePlaceholder img={<NoTransactionsIcon />} text="Queued transactions will appear here" />
}

const TxPage = ({
  useTxns,
}: {
  useTxns: typeof useTxHistory | typeof useTxQueue
  onNextPage?: (pageUrl: string) => void
}): ReactElement => {
  const { data, error, loading } = useTxns()
  const isQueue = useTxns === useTxQueue
  const hasPending = useHasPendingTxs()

  return (
    <>
      {data && data.length > 0 && <TxList items={data} />}

      {isQueue && data?.length === 0 && !hasPending && <NoQueuedTxns />}

      {error && <ErrorMessage>Error loading transactions</ErrorMessage>}

      {/* No skeletons for pending as they are shown above the queue which has them */}
      {loading && !hasPending && <SkeletonTxList />}
    </>
  )
}

const PaginatedTxns = ({ useTxns }: { useTxns: typeof useTxHistory | typeof useTxQueue }): ReactElement => {
  const [pages, setPages] = useState<string[]>([''])
  const { safeAddress, safe } = useSafeInfo()
  const { syncedToBlock, latestBlock, loading: syncLoading } = useAppSelector(selectTxHistorySync)
  const isHistory = useTxns === useTxHistory

  // Reset the pages when the Safe Account or filter changes
  useEffect(() => {
    setPages([''])
  }, [safe.chainId, safeAddress, useTxns])

  return (
    <Box position="relative">
      {isHistory && latestBlock !== undefined && syncedToBlock !== undefined && (
        <Typography color="text.secondary" variant="caption" display="block" mb={2}>
          {syncLoading
            ? `Syncing history from block ${latestBlock} down to block ${syncedToBlock}...`
            : `History synced through block ${syncedToBlock}.`}
        </Typography>
      )}
      {pages.map((pageUrl, index) => (
        <TxPage key={pageUrl} useTxns={useTxns} />
      ))}
    </Box>
  )
}

export default PaginatedTxns
