import { type EIP1193Provider } from '@web3-onboard/core'
import { JsonRpcProvider, Web3Provider, type Network } from '@ethersproject/providers'
import ExternalStore from '@/services/ExternalStore'
import { EMPTY_DATA } from '@safe-global/protocol-kit/dist/src/utils/constants'
import { type MulticallProvider, MulticallWrapper } from 'ethers-multicall-provider'

export const createWeb3ReadOnly = (customRpc: string): JsonRpcProvider => {
  return new JsonRpcProvider({ url: customRpc, timeout: 10_000 })
}

export const createMultiWeb3ReadOnly = (customRpc: string, network: Network): MulticallProvider<JsonRpcProvider> => {
  return MulticallWrapper.wrap(new JsonRpcProvider(customRpc, network), 50)
}

export const createWeb3 = (walletProvider: EIP1193Provider): Web3Provider => {
  return new Web3Provider(walletProvider)
}

export const { setStore: setWeb3, useStore: useWeb3 } = new ExternalStore<MulticallProvider<Web3Provider>>()

export const {
  getStore: getWeb3ReadOnly,
  setStore: setWeb3ReadOnly,
  useStore: useWeb3ReadOnly,
} = new ExternalStore<JsonRpcProvider>()

export const {
  getStore: getMultiWeb3ReadOnly,
  setStore: setMultiWeb3ReadOnly,
  useStore: useMultiWeb3ReadOnly,
} = new ExternalStore<MulticallProvider<Web3Provider | JsonRpcProvider>>()

export const getUserNonce = async (userAddress: string): Promise<number> => {
  const web3 = getWeb3ReadOnly()
  if (!web3) return -1
  try {
    return await web3.getTransactionCount(userAddress, 'pending')
  } catch (error) {
    return Promise.reject(error)
  }
}

export const isSmartContract = async (provider: JsonRpcProvider, address: string): Promise<boolean> => {
  const code = await provider.getCode(address)

  return code !== EMPTY_DATA
}
