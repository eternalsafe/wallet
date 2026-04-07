import { useEffect } from 'react'
import { type SafeCollectibleResponse } from '@safe-global/safe-gateway-typescript-sdk'
import useAsync, { type AsyncResult } from '../useAsync'
import { Errors, logError } from '@/services/exceptions'
import useSafeInfo from '../useSafeInfo'
import { getERC721Balance, getERC721TokenIds } from '@/utils/tokens'
import { useAppSelector } from '@/store'
import { selectCustomCollectiblesByChain } from '@/store/customCollectiblesSlice'
import { selectHistoricalRpcLogBatchSize } from '@/store/settingsSlice'
import useChainId from '@/hooks/useChainId'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import useIntervalCounter from '@/hooks/useIntervalCounter'
import { POLLING_INTERVAL } from '@/config/constants'

const isSafeCollectibleResponse = (item: SafeCollectibleResponse | undefined): item is SafeCollectibleResponse => {
  return !!item
}

export const useLoadCollectiblesBalances = (): AsyncResult<Array<SafeCollectibleResponse>> => {
  const [pollCount, resetPolling] = useIntervalCounter(POLLING_INTERVAL)
  const { safeAddress } = useSafeInfo()
  const chainId = useChainId()
  const web3ReadOnly = useMultiWeb3ReadOnly()
  const historicalRpcLogBatchSize = useAppSelector(selectHistoricalRpcLogBatchSize)

  const collectibles = useAppSelector((state) => selectCustomCollectiblesByChain(state, chainId))

  const [data, error, loading] = useAsync<Array<SafeCollectibleResponse> | undefined>(
    async () => {
      if (!safeAddress || !collectibles || !web3ReadOnly) return undefined

      const balances = await Promise.all(
        collectibles.map(async (token) => {
          let balance = await getERC721Balance(web3ReadOnly, token.address, safeAddress)
          if (balance.gt(0)) {
            let ids = await getERC721TokenIds(web3ReadOnly, token.address, safeAddress, historicalRpcLogBatchSize)
            return ids.map((id) => {
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
          }
        }),
      )

      return balances.flat().filter(isSafeCollectibleResponse)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pollCount, safeAddress, collectibles, historicalRpcLogBatchSize, web3ReadOnly],
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
