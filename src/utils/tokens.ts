import { getMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import { ERC20__factory } from '@/types/contracts'
import { type TokenInfo, TokenType } from '@safe-global/safe-gateway-typescript-sdk'
import { constants, BigNumber } from 'ethers'

export const UNLIMITED_APPROVAL_AMOUNT = BigNumber.from(2).pow(256).sub(1)

/**
 * Fetches ERC20 token symbol and decimals from on-chain.
 * @param address address of erc20 token
 */
export const getERC20TokenInfoOnChain = async (address: string): Promise<Omit<TokenInfo, 'logoUri'> | undefined> => {
  const web3 = getMultiWeb3ReadOnly()
  if (!web3) return

  const erc20 = ERC20__factory.connect(address, web3)
  const [symbol, decimals, name] = await Promise.all([erc20.symbol(), erc20.decimals(), erc20.name()])
  return {
    address,
    symbol,
    decimals,
    name,
    type: TokenType.ERC20,
  }
}

/**
 * Fetches ERC20 balance, using the provided multicall provider.
 * @param token address of erc20 token
 * @param address address to check balance of
 * @param multicallProvider provider to use for multicall
 */
export const getERC20Balance = async (token: string, address: string): Promise<BigNumber | undefined> => {
  const web3 = getMultiWeb3ReadOnly()
  if (!web3) return

  if (token === constants.AddressZero) {
    const balance = await web3.getBalance(address)
    return balance
  }

  const erc20 = ERC20__factory.connect(token, web3)
  return erc20.balanceOf(address)
}
