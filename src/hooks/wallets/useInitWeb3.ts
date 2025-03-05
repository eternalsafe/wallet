import { useEffect } from 'react'
import { useCurrentChain } from '@/hooks/useChains'
import useWallet from '@/hooks/wallets/useWallet'
import {
  createMultiWeb3ReadOnly,
  createWeb3,
  createWeb3ReadOnly,
  setMultiWeb3ReadOnly,
  setWeb3,
  setWeb3ReadOnly,
  useWeb3,
} from '@/hooks/wallets/web3'
import { useAppDispatch, useAppSelector } from '@/store'
import { selectRpc, setRpc } from '@/store/settingsSlice'
import { useRouter } from 'next/router'
import { AppRoutes } from '@/config/routes'
import { closeByGroupKey, showNotification } from '@/store/notificationsSlice'
import { MulticallWrapper } from 'ethers-multicall-provider'

const RPC_URL_ERROR_KEY = 'rpc-url-error'

export const useInitWeb3 = () => {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const chain = useCurrentChain()
  const chainId = chain?.chainId
  const wallet = useWallet()
  const customRpc = useAppSelector(selectRpc)
  const customRpcUrl = chain ? customRpc?.[chain.chainId] : undefined
  const web3 = useWeb3()

  useEffect(() => {
    if (!chainId) {
      setWeb3(undefined)
      setWeb3ReadOnly(undefined)
      setMultiWeb3ReadOnly(undefined)
      return
    }
    if (!customRpcUrl) {
      if (!wallet && !web3) {
        setWeb3(undefined)
        setWeb3ReadOnly(undefined)
        setMultiWeb3ReadOnly(undefined)
        return
      }

      if (wallet && wallet.chainId !== chainId) {
        dispatch(
          showNotification({
            message: `Your wallet seems to be connected to the wrong network. You must change your wallet network to ${
              chain?.chainName ?? 'the same network'
            }.`,
            groupKey: RPC_URL_ERROR_KEY,
            variant: 'error',
          }),
        )
        return
      }

      // If wallet is connected and on the correct network, use its provider
      if (wallet && wallet.chainId === chainId) {
        const internalWeb3 = createWeb3(wallet.provider)
        setWeb3(MulticallWrapper.wrap(internalWeb3, 50))
        dispatch(closeByGroupKey({ groupKey: RPC_URL_ERROR_KEY }))
        if (internalWeb3) {
          setWeb3ReadOnly(internalWeb3)
          setMultiWeb3ReadOnly(MulticallWrapper.wrap(internalWeb3, 50))
        }
      }
      return
    }

    const web3ReadOnly = createWeb3ReadOnly(customRpcUrl)

    web3ReadOnly._networkPromise
      .then((network) => {
        setWeb3ReadOnly(web3ReadOnly)
        dispatch(closeByGroupKey({ groupKey: RPC_URL_ERROR_KEY }))

        const multiWeb3ReadOnly = createMultiWeb3ReadOnly(customRpcUrl, network)
        setMultiWeb3ReadOnly(multiWeb3ReadOnly)
      })
      .catch((error) => {
        dispatch(
          setRpc({
            chainId,
          }),
        )
        dispatch(
          showNotification({
            message: `Cannot connect to the provided RPC URL for  ${
              chain?.chainName ?? 'this'
            } network, please provide a new one.`,
            groupKey: RPC_URL_ERROR_KEY,
            variant: 'error',
            detailedMessage: error.message,
          }),
        )
        router.push({ pathname: AppRoutes.welcome.index, query: { chain: chain.shortName } })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customRpcUrl, chain, wallet, chainId, router, dispatch])
}
