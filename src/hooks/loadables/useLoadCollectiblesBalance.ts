import { useEffect, useRef } from 'react'
import { type SafeCollectibleResponse } from '@safe-global/safe-gateway-typescript-sdk'
import useAsync, { type AsyncResult } from '../useAsync'
import { Errors, logError } from '@/services/exceptions'
import useSafeInfo from '../useSafeInfo'
import { getERC721Balance, syncERC721TokenIds } from '@/utils/tokens'
import { useAppDispatch, useAppSelector } from '@/store'
import { selectCustomCollectiblesByChain } from '@/store/customCollectiblesSlice'
import { selectHistoricalRpcLogBatchSize, selectHistoricalRpcLogMaxConcurrentRequests } from '@/store/settingsSlice'
import useChainId from '@/hooks/useChainId'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import useIntervalCounter from '@/hooks/useIntervalCounter'
import { POLLING_INTERVAL } from '@/config/constants'
import { buildCollectibleSyncKey, selectHistoricalRpcSyncState, setERC721Cursor } from '@/store/historicalRpcSyncSlice'
import { mapWithConcurrencyLimit } from '@/utils/mapWithConcurrencyLimit'
import { scheduleRpcRequest, setRpcSchedulerMaxConcurrency } from '@/utils/rpcRequestScheduler'

const isSafeCollectibleResponse = (item: SafeCollectibleResponse | undefined): item is SafeCollectibleResponse => {
  return !!item
}

export const useLoadCollectiblesBalances = (): AsyncResult<Array<SafeCollectibleResponse>> => {
  const dispatch = useAppDispatch()
  const [pollCount, resetPolling] = useIntervalCounter(POLLING_INTERVAL)
  const { safeAddress } = useSafeInfo()
  const chainId = useChainId()
  const web3ReadOnly = useMultiWeb3ReadOnly()
  const historicalRpcLogBatchSize = useAppSelector(selectHistoricalRpcLogBatchSize)
  const historicalRpcLogMaxConcurrentRequests = useAppSelector(selectHistoricalRpcLogMaxConcurrentRequests)
  const historicalRpcSync = useAppSelector(selectHistoricalRpcSyncState)
  const historicalRpcSyncRef = useRef(historicalRpcSync)

  const collectibles = useAppSelector((state) => selectCustomCollectiblesByChain(state, chainId))

  useEffect(() => {
    historicalRpcSyncRef.current = historicalRpcSync
  }, [historicalRpcSync])

  const [data, error, loading] = useAsync<Array<SafeCollectibleResponse> | undefined>(
    async () => {
      if (!safeAddress || !collectibles || !web3ReadOnly) return undefined

      setRpcSchedulerMaxConcurrency(historicalRpcLogMaxConcurrentRequests)
      const latestBlock = await scheduleRpcRequest(() => web3ReadOnly.getBlockNumber())
      const tokenSyncConcurrency = Math.max(1, Math.floor(historicalRpcLogMaxConcurrentRequests / 2))

      const balances = await mapWithConcurrencyLimit(
        collectibles,
        tokenSyncConcurrency,
        async (token): Promise<SafeCollectibleResponse[] | undefined> => {
          const balance = await scheduleRpcRequest(() => getERC721Balance(web3ReadOnly, token.address, safeAddress))
          const syncKey = buildCollectibleSyncKey(chainId, safeAddress, token.address)
          const existingCursor = historicalRpcSyncRef.current.erc721ByToken[syncKey]

          if (!balance.gt(0)) {
            dispatch(
              setERC721Cursor({
                key: syncKey,
                value: {
                  latestSyncedBlock: latestBlock,
                  tokenIds: [],
                },
              }),
            )
            return []
          }

          const { tokenIds } = await syncERC721TokenIds(
            web3ReadOnly,
            token.address,
            safeAddress,
            existingCursor?.tokenIds ?? [],
            existingCursor?.latestSyncedBlock ?? -1,
            latestBlock,
            historicalRpcLogBatchSize,
            historicalRpcLogMaxConcurrentRequests,
            scheduleRpcRequest,
          )

          dispatch(
            setERC721Cursor({
              key: syncKey,
              value: {
                latestSyncedBlock: latestBlock,
                tokenIds,
              },
            }),
          )

          return tokenIds.map((id) => {
            return {
              address: token.address,
              tokenName: token.name,
              tokenSymbol: token.symbol,
              logoUri: '',
              id,
              uri: '',
              name: '',
              description: '',
              imageUri: '',
            } as SafeCollectibleResponse
          })
        },
      )

      return balances.flat().filter(isSafeCollectibleResponse)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      pollCount,
      safeAddress,
      collectibles,
      historicalRpcLogBatchSize,
      historicalRpcLogMaxConcurrentRequests,
      dispatch,
      web3ReadOnly,
    ],
    false,
  )
  useEffect(() => {
    resetPolling()
  }, [resetPolling, safeAddress, collectibles])

  // Log errors
  useEffect(() => {
    if (error) {
      logError(Errors._601, error.message)
    }
  }, [error])

  return [data, error, loading]
}

export default useLoadCollectiblesBalances
