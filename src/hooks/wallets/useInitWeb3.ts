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
} from '@/hooks/wallets/web3'
import { useAppSelector } from '@/store'
import { selectRpc } from '@/store/settingsSlice'

export const useInitWeb3 = () => {
  const chain = useCurrentChain()
  const chainId = chain?.chainId
  const rpcUri = chain?.rpcUri
  const wallet = useWallet()
  const customRpc = useAppSelector(selectRpc)
  const customRpcUrl = chain ? customRpc?.[chain.chainId] : undefined

  useEffect(() => {
    if (wallet && wallet.chainId === chainId) {
      const web3 = createWeb3(wallet.provider)
      setWeb3(web3)
    } else {
      setWeb3(undefined)
    }
  }, [wallet, chainId])

  useEffect(() => {
    if (!rpcUri) {
      setWeb3ReadOnly(undefined)
      setMultiWeb3ReadOnly(undefined)
      return
    }
    const web3ReadOnly = createWeb3ReadOnly(rpcUri, customRpcUrl)
    setWeb3ReadOnly(web3ReadOnly)

    const multiWeb3ReadOnly = createMultiWeb3ReadOnly(web3ReadOnly)
    setMultiWeb3ReadOnly(multiWeb3ReadOnly)
  }, [rpcUri, customRpcUrl])
}
