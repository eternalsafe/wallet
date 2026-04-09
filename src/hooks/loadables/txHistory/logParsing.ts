import type { ParsedExecutionLog } from './types'
import { Interface } from '@ethersproject/abi'
import type { Event } from '@ethersproject/contracts'
import type { Result } from 'ethers/lib/utils'

const executionSuccessEventInterface = new Interface(['event ExecutionSuccess(bytes32 txHash, uint256 payment)'])

export const extractSafeTxHashFromExecutionSuccessLog = (
  log: Event,
  safeContractInterface?: { parseLog: (event: { topics: string[]; data: string }) => { args: unknown } },
): string | undefined => {
  const logArgs = log.args as ({ txHash?: string } & { [key: number]: unknown }) | undefined
  const txHashFromArgs = logArgs?.txHash ?? (typeof logArgs?.[0] === 'string' ? (logArgs[0] as string) : undefined)
  if (txHashFromArgs) {
    return txHashFromArgs
  }

  if (!log.topics || !log.data) {
    return
  }

  const parseWithInterface = (iface: {
    parseLog: (event: { topics: string[]; data: string }) => { args: unknown }
  }): string | undefined => {
    const parsedLog = iface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    })
    const parsedArgs = parsedLog.args as ({ txHash?: string } & { [key: number]: unknown }) | undefined
    return parsedArgs?.txHash ?? (typeof parsedArgs?.[0] === 'string' ? (parsedArgs[0] as string) : undefined)
  }

  if (safeContractInterface) {
    try {
      const txHashFromSafeContractInterface = parseWithInterface(safeContractInterface)
      if (txHashFromSafeContractInterface) {
        return txHashFromSafeContractInterface
      }
    } catch (_error) {
      // Fall through to canonical event decoding below.
    }
  }

  try {
    return parseWithInterface(executionSuccessEventInterface)
  } catch (_error) {
    return
  }
}

export const parseExecutionSuccessLog = async ({
  log,
  provider,
  safeContract,
  blockTimestampCache,
  txDataCache,
  scheduleRequest,
}: {
  log: Event
  provider: {
    getBlock: (blockNumber: number) => Promise<{ timestamp?: number } | null | undefined>
    getTransaction: (txHash: string) => Promise<
      | {
          from?: string
          data?: string
        }
      | null
      | undefined
    >
  }
  safeContract: {
    interface: {
      parseLog: (event: { topics: string[]; data: string }) => { args: unknown }
      decodeFunctionData: (functionName: string, data: string) => Result
    }
  }
  blockTimestampCache: Map<number, Promise<number>>
  txDataCache: Map<string, Promise<{ executor: string; decodedTxData?: Result }>>
  scheduleRequest: <T>(request: () => Promise<T>) => Promise<T>
}): Promise<ParsedExecutionLog | undefined> => {
  const safeTxHash = extractSafeTxHashFromExecutionSuccessLog(log, safeContract.interface)
  if (!safeTxHash || !log.transactionHash) {
    return
  }

  const timestampPromise =
    blockTimestampCache.get(log.blockNumber) ||
    scheduleRequest(() => provider.getBlock(log.blockNumber))
      .then((block) => (block?.timestamp ? block.timestamp * 1000 : 0))
      .catch(() => 0)

  blockTimestampCache.set(log.blockNumber, timestampPromise)

  const txDataPromise =
    txDataCache.get(log.transactionHash) ||
    scheduleRequest(() => provider.getTransaction(log.transactionHash))
      .then((tx) => {
        const executor = tx?.from ?? ''
        const txData = tx?.data

        if (!txData) {
          return { executor, decodedTxData: undefined }
        }

        try {
          return {
            executor,
            decodedTxData: safeContract.interface.decodeFunctionData('execTransaction', txData),
          }
        } catch (_error) {
          return { executor, decodedTxData: undefined }
        }
      })
      .catch(() => ({ executor: '', decodedTxData: undefined }))

  txDataCache.set(log.transactionHash, txDataPromise)

  const [timestamp, { executor, decodedTxData }] = await Promise.all([timestampPromise, txDataPromise])

  return {
    blockNumber: log.blockNumber,
    logIndex: log.logIndex,
    txHash: log.transactionHash,
    safeTxHash,
    timestamp,
    executor,
    decodedTxData,
  }
}
