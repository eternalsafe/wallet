import { JsonRpcProvider } from '@ethersproject/providers'
import type { Event } from '@ethersproject/contracts'
import getChainsConfig from '@/config/supportedChains'
import { getSafeContract } from '@/utils/safe-versions'
import { queryFilterBackwards } from '@/utils/queryFilterBackfill'
import { extractSafeTxHashFromExecutionSuccessLog } from '@/hooks/loadables/useLoadTxHistory'

const runLiveRpcTests = process.env.RUN_LIVE_RPC_TESTS === 'true'
const itLive = runLiveRpcTests ? it : it.skip

describe('useLoadTxHistory live RPC parsing', () => {
  itLive(
    'loads and parses Sepolia ExecutionSuccess logs for 0x577A...4bb2 with real RPC data',
    async () => {
      const sepoliaPublicRpcUri = getChainsConfig().find((chain) => chain.chainId === '11155111')?.publicRpcUri.value
      if (!sepoliaPublicRpcUri) {
        throw new Error('Expected a hardcoded sepolia publicRpcUri in supported chain config')
      }

      const safeAddress = '0x577A0D87f4e6fbdd55d51Ac4a4344EC042C04bb2'
      const lowerBoundaryBlock = 5_475_050
      const upperBoundaryBlock = 5_698_792
      const provider = new JsonRpcProvider(sepoliaPublicRpcUri)
      const safeContract = getSafeContract(safeAddress, '1.4.1', provider)

      if (!safeContract) {
        throw new Error('Expected a supported Safe contract for v1.4.1')
      }

      const executionFilter = safeContract.filters.ExecutionSuccess()
      const logs = await queryFilterBackwards<Event>({
        latestBlock: upperBoundaryBlock,
        stopAtBlock: lowerBoundaryBlock,
        batchSize: 50_000,
        maxConcurrentRequests: 1,
        queryRange: ({ fromBlock, toBlock }) => safeContract.queryFilter(executionFilter, fromBlock, toBlock),
      })

      expect(logs.length).toBeGreaterThanOrEqual(3)

      const parsedByBlock = new Map(
        logs.map((log) => [
          log.blockNumber,
          {
            txHash: log.transactionHash,
            safeTxHash: extractSafeTxHashFromExecutionSuccessLog(log, safeContract.interface),
          },
        ]),
      )

      expect(parsedByBlock.get(5_475_050)).toEqual({
        txHash: '0x3de9305e761a5686e29012db6f1195fc2a7e84d99c5c2c94b063dc8ee26e153a',
        safeTxHash: '0xa3dee3cca8e0563b3d72816ca395a4cb9a361fc18fcb695d6a900c573b674e61',
      })
      expect(parsedByBlock.get(5_698_792)).toEqual({
        txHash: '0xe43e1ed380b80cac30895016567a4b46af59fb12c5d9a416651100f7baf0e875',
        safeTxHash: '0x0f8a096c42cc76ef922705ba4a3e57777a684822da95a44ed0f361f0975dd289',
      })
    },
    120_000,
  )
})
