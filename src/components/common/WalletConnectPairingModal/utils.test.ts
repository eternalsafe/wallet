import { buildApprovedNamespaces } from '@/components/common/WalletConnectPairingModal/utils'

describe('buildApprovedNamespaces', () => {
  it('builds namespaces with the Safe address as the account', () => {
    const namespaces = buildApprovedNamespaces(
      {
        eip155: {
          chains: ['eip155:1', 'eip155:137'],
          methods: ['eth_sendTransaction'],
          events: ['accountsChanged'],
        },
      },
      '0x1234567890123456789012345678901234567890',
    )

    expect(namespaces).toEqual({
      eip155: {
        accounts: [
          'eip155:1:0x1234567890123456789012345678901234567890',
          'eip155:137:0x1234567890123456789012345678901234567890',
        ],
        methods: ['eth_sendTransaction'],
        events: ['accountsChanged'],
      },
    })
  })

  it('throws when no Safe address is available', () => {
    expect(() =>
      buildApprovedNamespaces(
        {
          eip155: {
            chains: ['eip155:1'],
            methods: ['eth_sendTransaction'],
            events: ['accountsChanged'],
          },
        },
        '',
      ),
    ).toThrow('No Safe address available for WalletConnect session approval')
  })
})
