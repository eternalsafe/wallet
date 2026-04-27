import { ethers } from 'ethers'

const runLiveSepoliaTests = process.env.RUN_LIVE_SEPOLIA_TESTS === 'true'
const describeLive = runLiveSepoliaTests ? describe : describe.skip

describeLive('useLoadTxHistory live Sepolia parsing', () => {
  it('parses the suspected ExecutionSuccess log shape', async () => {
    const provider = new ethers.providers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com', {
      name: 'sepolia',
      chainId: 11155111,
    })
    const safeAddress = '0x577A0D87f4e6fbdd55d51Ac4a4344EC042C04bb2'
    const txHash = '0xe460983504ce8700f9847d397bf40c86955c4f1425501066d0b59763694dcfdf'
    const blockNumber = 10_608_581
    const safe = new ethers.Contract(safeAddress, ['event ExecutionSuccess(bytes32 txHash, uint256 payment)'], provider)

    const [tx, logs] = await Promise.all([
      provider.getTransaction(txHash),
      safe.queryFilter(safe.filters.ExecutionSuccess(), blockNumber, blockNumber),
    ])

    expect(tx?.hash).toBe(txHash)
    expect(logs).toHaveLength(1)
    expect(logs[0].transactionHash).toBe(txHash)
    expect(logs[0].args?.txHash).toBe('0xb7056c6259d601cc1feed64e59c95d95cbcc911c62bb14cf783bfd3d809e609b')
  })
})
