import type { SessionRequest } from '@/hooks/wallets/useWalletConnect'
import { extractWalletConnectReturnTo, extractWalletConnectTxParams } from '@/utils/wallet-connect'

const buildRequest = (paramsOverrides: Partial<SessionRequest['params']> = {}): SessionRequest => ({
  id: 1,
  topic: 'topic',
  params: {
    chainId: 'eip155:1',
    request: {
      method: 'eth_sendTransaction',
      params: [
        {
          from: '0x1234567890123456789012345678901234567890',
          to: '0x3430d04E42a722c5Ae52C5Bffbf1F230C2677600',
          value: '0x1',
          data: '0xabcdef',
        },
      ],
    },
    ...paramsOverrides,
  },
})

describe('extractWalletConnectTxParams', () => {
  it('returns null for non-eth_sendTransaction methods', () => {
    const request = buildRequest({
      chainId: 'eip155:1',
      request: {
        method: 'personal_sign',
        params: [],
      },
    })

    expect(extractWalletConnectTxParams(request, '1', '0x1234567890123456789012345678901234567890')).toBeNull()
  })

  it('returns null for chain mismatch', () => {
    const request = buildRequest({
      chainId: 'eip155:137',
      request: buildRequest().params.request,
    })

    expect(extractWalletConnectTxParams(request, '1', '0x1234567890123456789012345678901234567890')).toBeNull()
  })

  it('returns null when "from" does not match the Safe address', () => {
    const request = buildRequest({
      chainId: 'eip155:1',
      request: {
        method: 'eth_sendTransaction',
        params: [
          {
            from: '0x9999999999999999999999999999999999999999',
            to: '0x3430d04E42a722c5Ae52C5Bffbf1F230C2677600',
            value: '0x1',
            data: '0xabcdef',
          },
        ],
      },
    })

    expect(extractWalletConnectTxParams(request, '1', '0x1234567890123456789012345678901234567890')).toBeNull()
  })

  it('normalizes transaction params for createTx', () => {
    const request = buildRequest({
      chainId: 'eip155:1',
      request: {
        method: 'eth_sendTransaction',
        params: [
          {
            from: '0x1234567890123456789012345678901234567890',
            to: '0x3430d04E42a722c5Ae52C5Bffbf1F230C2677600',
          },
        ],
      },
    })

    expect(extractWalletConnectTxParams(request, '1', '0x1234567890123456789012345678901234567890')).toEqual({
      to: '0x3430d04E42a722c5Ae52C5Bffbf1F230C2677600',
      value: '0',
      data: '0x',
    })
  })
})

describe('extractWalletConnectReturnTo', () => {
  it('returns route when it is a valid internal path', () => {
    expect(extractWalletConnectReturnTo('/balances?safe=eth:0x123')).toBe('/balances?safe=eth:0x123')
  })

  it('returns null for external URLs', () => {
    expect(extractWalletConnectReturnTo('https://example.com')).toBeNull()
  })

  it('returns null when query value is missing', () => {
    expect(extractWalletConnectReturnTo(undefined)).toBeNull()
  })
})
