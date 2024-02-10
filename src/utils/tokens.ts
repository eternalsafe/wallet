import { getWeb3ReadOnly } from '@/hooks/wallets/web3'
import { ERC20__factory } from '@/types/contracts'
import { type TokenInfo, TokenType } from '@safe-global/safe-gateway-typescript-sdk'
import { constants, BigNumber } from 'ethers'
import { type MulticallProvider } from 'ethers-multicall-provider'

export const UNLIMITED_APPROVAL_AMOUNT = BigNumber.from(2).pow(256).sub(1)

/**
 * Fetches ERC20 token symbol and decimals from on-chain.
 * @param address address of erc20 token
 */
export const getERC20TokenInfoOnChain = async (
  address: string,
): Promise<Omit<TokenInfo, 'name' | 'logoUri'> | undefined> => {
  const web3 = getWeb3ReadOnly()
  if (!web3) return

  const erc20 = ERC20__factory.connect(address, web3)
  const [symbol, decimals] = await Promise.all([erc20.symbol(), erc20.decimals()])
  return {
    address,
    symbol,
    decimals,
    type: TokenType.ERC20,
  }
}

/**
 * Fetches ERC20 balance, using the provided multicall provider.
 * @param token address of erc20 token
 * @param address address to check balance of
 * @param multicallProvider provider to use for multicall
 */
export const getERC20Balance = async (
  token: string,
  address: string,
  multicallProvider: MulticallProvider | undefined,
): Promise<BigNumber | undefined> => {
  if (!multicallProvider) return

  if (token === constants.AddressZero) {
    const balance = await multicallProvider.getBalance(address)
    return balance
  }

  const erc20 = ERC20__factory.connect(token, multicallProvider)
  return erc20.balanceOf(address)
}
