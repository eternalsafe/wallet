import { render, screen } from '@/tests/test-utils'
import * as useChains from '@/hooks/useChains'
import * as web3 from '@/hooks/wallets/web3'
import WelcomeLogin from '../index'

describe('WelcomeLogin', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('renders a single load/create action set when wallet or RPC is available', () => {
    jest.spyOn(web3, 'useWeb3').mockReturnValue({} as any)
    jest.spyOn(useChains, 'useCurrentChain').mockReturnValue({
      chainId: '1',
      chainName: 'Ethereum',
      shortName: 'eth',
    } as any)

    render(<WelcomeLogin />)

    expect(screen.getAllByRole('link', { name: 'Load Safe' })).toHaveLength(1)
    expect(screen.getAllByRole('link', { name: 'Create Safe' })).toHaveLength(1)
  })
})
