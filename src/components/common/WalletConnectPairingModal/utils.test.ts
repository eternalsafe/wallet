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
      '1',
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

  it('falls back to the active chain when proposal chains are omitted', () => {
    const namespaces = buildApprovedNamespaces(
      {
        eip155: {
          methods: ['eth_sendTransaction'],
          events: ['accountsChanged'],
        },
      },
      '0x1234567890123456789012345678901234567890',
      '11155111',
    )

    expect(namespaces.eip155.accounts).toEqual(['eip155:11155111:0x1234567890123456789012345678901234567890'])
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
        '1',
      ),
    ).toThrow('No Safe address available for WalletConnect session approval')
  })
})
