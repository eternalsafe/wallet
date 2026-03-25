import { extractTxDetails } from '@/services/tx/extractTxInfo'
import { getBatchTxDetailsFromLocalStore } from './ReviewBatch'

jest.mock('@/services/tx/extractTxInfo', () => ({
  extractTxDetails: jest.fn(),
}))

const mockExtractTxDetails = extractTxDetails as jest.Mock

describe('getBatchTxDetailsFromLocalStore', () => {
  const safe = {
    chainId: '1',
    address: { value: '0x0000000000000000000000000000000000000123' },
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns undefined when local transactions are not available', async () => {
    const txs = [{ transaction: { id: 'multisig_0x0000000000000000000000000000000000000123_0xabc' } }] as any

    expect(getBatchTxDetailsFromLocalStore(txs, undefined, safe)).toBeUndefined()
  })

  it('throws if a transaction id cannot be parsed', async () => {
    const txs = [{ transaction: { id: 'invalid-id' } }] as any

    await expect(getBatchTxDetailsFromLocalStore(txs, {} as any, safe)).rejects.toThrow(
      'Invalid transaction id: invalid-id',
    )
  })

  it('throws if a transaction is missing from local storage', async () => {
    const txs = [{ transaction: { id: 'multisig_0x0000000000000000000000000000000000000123_0xabc' } }] as any

    await expect(getBatchTxDetailsFromLocalStore(txs, {} as any, safe)).rejects.toThrow(
      'Transaction multisig_0x0000000000000000000000000000000000000123_0xabc is not available locally',
    )
  })

  it('builds transaction details from local transactions', async () => {
    const txs = [{ transaction: { id: 'multisig_0x0000000000000000000000000000000000000123_0xabc' } }] as any
    const localTx = { mock: true } as any
    const expectedDetails = { txId: 'multisig_0x0000000000000000000000000000000000000123_0xabc' } as any
    mockExtractTxDetails.mockResolvedValue(expectedDetails)

    const result = await getBatchTxDetailsFromLocalStore(txs, { '0xabc': localTx } as any, safe)

    expect(mockExtractTxDetails).toHaveBeenCalledWith(safe.address.value, localTx, safe, txs[0].transaction.id)
    expect(result).toEqual([expectedDetails])
  })
})
