import { _hydrationReducer } from '@/store'
import { type ChainInfo, removeChain, upsertChain } from '@/store/customChainsSlice'
import { upsertAddressBookEntry } from '@/store/addressBookSlice'
import { add as addCustomToken } from '@/store/customTokensSlice'
import { setRpc } from '@/store/settingsSlice'

const makeCustomChain = (overrides: Partial<ChainInfo> = {}): ChainInfo =>
  ({
    chainId: '84532',
    chainName: 'Base Sepolia',
    shortName: 'base-sepolia',
    custom: true,
    description: '',
    chainLogoUri: null,
    l2: true,
    isTestnet: true,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      logoUri: '',
    },
    blockExplorerUriTemplate: {
      address: 'https://sepolia.basescan.org/address/{{address}}',
      txHash: 'https://sepolia.basescan.org/tx/{{txHash}}',
      api: '',
    },
    features: [],
    disabledWallets: [],
    theme: {
      textColor: '#001428',
      backgroundColor: '#DDDDDD',
    },
    publicRpcUri: {
      authentication: 'NO_AUTH',
      value: 'https://sepolia.base.org',
    },
    rpcUri: {
      authentication: 'NO_AUTH',
      value: 'https://sepolia.base.org',
    },
    safeAppsRpcUri: {
      authentication: 'NO_AUTH',
      value: 'https://sepolia.base.org',
    },
    transactionService: '',
    gasPrice: [],
    ...overrides,
  } as ChainInfo)

describe('custom chain lifecycle', () => {
  it('keeps chain-scoped app data when a custom chain is deleted and later re-added', () => {
    const chainId = '84532'
    const customChain = makeCustomChain()
    const address = '0x1111111111111111111111111111111111111111'
    const tokenAddress = '0x2222222222222222222222222222222222222222'

    let state = _hydrationReducer(undefined, { type: '@@INIT' } as never)

    state = _hydrationReducer(state, upsertChain(customChain))
    state = _hydrationReducer(state, setRpc({ chainId, rpc: 'https://sepolia.base.org' }))
    state = _hydrationReducer(state, upsertAddressBookEntry({ chainId, address, name: 'Alice' }))
    state = _hydrationReducer(
      state,
      addCustomToken([
        chainId,
        {
          chainId: Number(chainId),
          address: tokenAddress,
          name: 'Token',
          symbol: 'TKN',
          decimals: 18,
        },
      ]),
    )

    const preservedAddressBook = state.addressBook[chainId]
    const preservedTokens = state.customTokens[chainId]

    state = _hydrationReducer(state, setRpc({ chainId, rpc: undefined }))
    state = _hydrationReducer(state, removeChain(chainId))

    expect(state.customChains).toEqual([])
    expect(state.settings.env.rpc[chainId]).toBeUndefined()
    expect(state.addressBook[chainId]).toEqual(preservedAddressBook)
    expect(state.customTokens[chainId]).toEqual(preservedTokens)

    state = _hydrationReducer(state, upsertChain(customChain))

    expect(state.customChains).toEqual([customChain])
    expect(state.addressBook[chainId]).toEqual(preservedAddressBook)
    expect(state.customTokens[chainId]).toEqual(preservedTokens)
  })
})
