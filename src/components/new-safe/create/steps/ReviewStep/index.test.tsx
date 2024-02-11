import { type ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'

import { render } from '@/tests/test-utils'
import { NetworkFee } from '@/components/new-safe/create/steps/ReviewStep/index'
import * as useWallet from '@/hooks/wallets/useWallet'
import { type ConnectedWallet } from '@/hooks/wallets/useOnboard'

const mockChainInfo = {
  chainId: '100',
  chainName: 'Gnosis Chain',
  l2: false,
  nativeCurrency: {
    symbol: 'ETH',
  },
} as ChainInfo

describe('NetworkFee', () => {
  it('should display the total fee if not social login', () => {
    jest.spyOn(useWallet, 'default').mockReturnValue({ label: 'MetaMask' } as unknown as ConnectedWallet)
    const mockTotalFee = '0.0123'
    const result = render(<NetworkFee totalFee={mockTotalFee} chain={mockChainInfo} willRelay={true} />)

    expect(result.getByText(`≈ ${mockTotalFee} ${mockChainInfo.nativeCurrency.symbol}`)).toBeInTheDocument()
  })
})
