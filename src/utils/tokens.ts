import { getMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import { ERC20__factory, ERC721__factory } from '@/types/contracts'
import { HISTORICAL_RPC_LOG_BLOCK_BATCH_SIZE, HISTORICAL_RPC_LOG_MAX_CONCURRENT_REQUESTS } from '@/config/constants'
import { queryFilterBackwards } from '@/utils/queryFilterBackfill'
import { type TokenInfo, TokenType } from '@safe-global/safe-gateway-typescript-sdk'
import { constants, BigNumber } from 'ethers'
import type { Provider } from '@ethersproject/abstract-provider'

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

export const isERC20Data = (value?: Pick<TokenInfo, 'type'>): value is Omit<TokenInfo, 'logoUri'> => {
  return !!value && value.type === TokenType.ERC20
}

/**
 * Fetches ERC20 balance, using the provided provider.
 * @param web3 provider to use for call
 * @param token address of erc20 token
 * @param address address to check balance of
 */
export const getERC20Balance = async (web3: Provider, token: string, address: string): Promise<BigNumber> => {
  if (token === constants.AddressZero) {
    const balance = await web3.getBalance(address)
    return balance
  }

  const erc20 = ERC20__factory.connect(token, web3)
  return erc20.balanceOf(address)
}

// const ERC1155InterfaceId: string = "0xd9b67a26";
const ERC721InterfaceId: string = '0x80ac58cd'

export const isERC721Token = async (address: string): Promise<boolean> => {
  const web3 = getMultiWeb3ReadOnly()
  if (!web3) return false

  const erc721 = ERC721__factory.connect(address, web3)
  try {
    return await erc721.supportsInterface(ERC721InterfaceId)
  } catch (e) {
    return false
  }
}

/**
 * Fetches ERC721 token symbol and decimals from on-chain.
 * @param address address of erc721 token
 */
export const getERC721TokenInfoOnChain = async (
  address: string,
): Promise<Omit<TokenInfo, 'logoUri' | 'decimals'> | undefined> => {
  const web3 = getMultiWeb3ReadOnly()
  if (!web3) return

  const erc20 = ERC721__factory.connect(address, web3)
  const [symbol, name] = await Promise.all([erc20.symbol(), erc20.name()])
  return {
    address,
    symbol,
    name,
    type: TokenType.ERC721,
  }
}

export const isERC721Data = (value?: Pick<TokenInfo, 'type'>): value is Omit<TokenInfo, 'logoUri' | 'decimals'> => {
  return !!value && value.type === TokenType.ERC721
}

/**
 * Fetches ERC721 balance, using the provided provider.
 * @param web3 provider to use for call
 * @param token address of erc20 token
 * @param address address to check balance of
 */
export const getERC721Balance = async (web3: Provider, token: string, address: string): Promise<BigNumber> => {
  const erc721 = ERC721__factory.connect(token, web3)
  return erc721.balanceOf(address)
}

/**
 * Fetches ERC721 token ids, using the provided provider.
 * @param web3 provider to use for call
 * @param token address of erc20 token
 * @param address address to check balance of
 */
export const getERC721TokenIds = async (
  web3: Provider,
  token: string,
  address: string,
  batchSize = HISTORICAL_RPC_LOG_BLOCK_BATCH_SIZE,
  maxConcurrentRequests = HISTORICAL_RPC_LOG_MAX_CONCURRENT_REQUESTS,
): Promise<Array<string>> => {
  const { tokenIds } = await syncERC721TokenIds(
    web3,
    token,
    address,
    [],
    -1,
    undefined,
    batchSize,
    maxConcurrentRequests,
  )
  return tokenIds
}

const sortTransferLogsByBlock = <TLog extends { blockNumber: number; logIndex: number }>(logs: TLog[]): TLog[] => {
  return [...logs].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber - b.blockNumber
    }
    return a.logIndex - b.logIndex
  })
}

const applyTransferLogsToOwnership = (
  ownerAddress: string,
  initialTokenIds: string[],
  logs: Array<{ args: { from?: string; to?: string; tokenId: BigNumber }; blockNumber: number; logIndex: number }>,
): string[] => {
  const normalizedOwner = ownerAddress.toLowerCase()
  const ownedTokenIds = new Set(initialTokenIds)

  sortTransferLogsByBlock(logs).forEach((event) => {
    const tokenId = event.args.tokenId?.toString()
    if (!tokenId) {
      return
    }

    const to = event.args.to?.toLowerCase()
    const from = event.args.from?.toLowerCase()
    if (to === normalizedOwner) {
      ownedTokenIds.add(tokenId)
    } else if (from === normalizedOwner) {
      ownedTokenIds.delete(tokenId)
    }
  })

  return [...ownedTokenIds]
}

export const syncERC721TokenIds = async (
  web3: Provider,
  token: string,
  address: string,
  currentTokenIds: string[] = [],
  fromBlockExclusive = -1,
  toBlockInclusive?: number,
  batchSize = HISTORICAL_RPC_LOG_BLOCK_BATCH_SIZE,
  maxConcurrentRequests = HISTORICAL_RPC_LOG_MAX_CONCURRENT_REQUESTS,
  scheduleRequest: <T>(request: () => Promise<T>) => Promise<T> = async <T>(request: () => Promise<T>) => request(),
): Promise<{ tokenIds: string[]; latestProcessedBlock: number }> => {
  const erc721 = ERC721__factory.connect(token, web3)
  const latestBlock =
    toBlockInclusive !== undefined ? Math.floor(toBlockInclusive) : await scheduleRequest(() => web3.getBlockNumber())
  const normalizedFromBlockExclusive = Math.floor(fromBlockExclusive)

  if (latestBlock <= normalizedFromBlockExclusive) {
    return {
      tokenIds: [...currentTokenIds],
      latestProcessedBlock: latestBlock,
    }
  }

  const stopAtBlock = Math.max(0, normalizedFromBlockExclusive + 1)

  const fromLogs = await queryFilterBackwards({
    latestBlock,
    stopAtBlock,
    batchSize,
    maxConcurrentRequests,
    scheduleRequest,
    queryRange: ({ fromBlock, toBlock }) =>
      erc721.queryFilter(
        erc721.filters['Transfer(address,address,uint256)'](address, undefined, undefined),
        fromBlock,
        toBlock,
      ),
  })
  const toLogs = await queryFilterBackwards({
    latestBlock,
    stopAtBlock,
    batchSize,
    maxConcurrentRequests,
    scheduleRequest,
    queryRange: ({ fromBlock, toBlock }) =>
      erc721.queryFilter(
        erc721.filters['Transfer(address,address,uint256)'](undefined, address, undefined),
        fromBlock,
        toBlock,
      ),
  })

  const combinedLogs = fromLogs.concat(toLogs)
  const tokenIds = applyTransferLogsToOwnership(
    address,
    currentTokenIds,
    combinedLogs as Array<{
      args: { from?: string; to?: string; tokenId: BigNumber }
      blockNumber: number
      logIndex: number
    }>,
  )

  return {
    tokenIds,
    latestProcessedBlock: latestBlock,
  }
}
