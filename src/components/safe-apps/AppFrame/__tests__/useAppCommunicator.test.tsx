import type { MutableRefObject } from 'react'
import { renderHook } from '@/tests/test-utils'
import useAppCommunicator from '../useAppCommunicator'
import { createSafeAppsWeb3Provider } from '@/hooks/wallets/web3'

jest.mock('@/hooks/wallets/web3', () => ({
  createSafeAppsWeb3Provider: jest.fn(),
}))

describe('useAppCommunicator', () => {
  const createSafeAppsWeb3ProviderMock = createSafeAppsWeb3Provider as jest.MockedFunction<
    typeof createSafeAppsWeb3Provider
  >

  const chain = {
    chainId: '137',
    rpcUri: { value: 'https://polygon-mainnet.infura.io/v3/' },
    publicRpcUri: { value: 'https://polygon-bor-rpc.publicnode.com' },
  }

  const iframeRef = {
    current: document.createElement('iframe'),
  } as MutableRefObject<HTMLIFrameElement | null>

  const handlers = {
    onConfirmTransactions: jest.fn(),
    onSignMessage: jest.fn(),
    onGetTxBySafeTxHash: jest.fn(),
    onGetEnvironmentInfo: jest.fn(),
    onGetSafeBalances: jest.fn(),
    onGetSafeInfo: jest.fn(),
    onGetChainInfo: jest.fn(),
    onGetPermissions: jest.fn(),
    onSetPermissions: jest.fn(),
    onRequestAddressBook: jest.fn(),
    onSetSafeSettings: jest.fn(),
    onGetOffChainSignature: jest.fn(),
  } as any

  beforeEach(() => {
    createSafeAppsWeb3ProviderMock.mockReset()
  })

  it('uses chain public RPC when no custom RPC is set', () => {
    renderHook(() => useAppCommunicator(iframeRef, undefined, chain as any, handlers))

    expect(createSafeAppsWeb3ProviderMock).toHaveBeenLastCalledWith(chain.publicRpcUri.value)
  })

  it('uses the user-provided RPC when present', () => {
    renderHook(() => useAppCommunicator(iframeRef, undefined, chain as any, handlers), {
      initialReduxState: {
        settings: {
          env: {
            rpc: {
              [chain.chainId]: 'https://my.custom.rpc.example',
            },
          },
        },
      } as any,
    })

    expect(createSafeAppsWeb3ProviderMock).toHaveBeenLastCalledWith('https://my.custom.rpc.example')
  })
})
