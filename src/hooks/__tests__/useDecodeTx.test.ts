import type { SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { renderHook, waitFor } from '@/tests/test-utils'
import useDecodeTx from '@/hooks/useDecodeTx'
import { getFunctionSignature } from '@/utils/hash-lookup'
import { getDecodedData } from '@safe-global/safe-gateway-typescript-sdk'

jest.mock('@/hooks/useChainId', () => jest.fn(() => '1'))
jest.mock('@/utils/hash-lookup', () => ({
  getFunctionSignature: jest.fn(),
}))
jest.mock('@safe-global/safe-gateway-typescript-sdk', () => ({
  getDecodedData: jest.fn(),
}))

const buildTx = (data: string): SafeTransaction =>
  ({
    data: {
      to: '0x3430d04E42a722c5Ae52C5Bffbf1F230C2677600',
      value: '0',
      data,
      operation: 0,
      baseGas: 0,
      gasPrice: 0,
      gasToken: '0x0000000000000000000000000000000000000000',
      refundReceiver: '0x0000000000000000000000000000000000000000',
      nonce: 1,
      safeTxGas: 0,
    },
  } as unknown as SafeTransaction)

describe('useDecodeTx', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('decodes locally when a function signature is found', async () => {
    ;(getFunctionSignature as jest.Mock).mockResolvedValue('transfer(address,uint256)')
    const tx = buildTx(
      '0xa9059cbb000000000000000000000000474e5ded6b5d078163bfb8f6dba355c3aa5478c80000000000000000000000000000000000000000000000008ac7230489e80000',
    )

    const { result } = renderHook(() => useDecodeTx(tx))

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
      expect(result.current[0]?.method).toBe('transfer')
      expect(result.current[0]?.parameters).toHaveLength(2)
    })

    expect(getDecodedData).not.toHaveBeenCalled()
  })

  it('returns no decoded data when no local signature is found (raw calldata path)', async () => {
    ;(getFunctionSignature as jest.Mock).mockResolvedValue(null)
    const tx = buildTx('0x12345678')

    const { result } = renderHook(() => useDecodeTx(tx))

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    expect(result.current[0]).toBeUndefined()
    expect(getDecodedData).not.toHaveBeenCalled()
  })

  it('uses remote decoding only when explicitly requested', async () => {
    ;(getDecodedData as jest.Mock).mockResolvedValue({ method: 'remoteMethod', parameters: [] })
    const tx = buildTx('0xa9059cbb')

    const { result } = renderHook(() => useDecodeTx(tx, true))

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    expect(getDecodedData).toHaveBeenCalledWith('1', '0xa9059cbb', tx.data.to)
    expect(result.current[0]?.method).toBe('remoteMethod')
  })
})
