import { render, screen } from '@testing-library/react'
import type { ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'
import useChains from '@/hooks/useChains'
import { FileListCard } from '@/components/settings/DataManagement/FileListCard'

jest.mock('@/hooks/useChains', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockUseChains = useChains as jest.Mock

describe('FileListCard', () => {
  const customChain = {
    chainId: '84532',
    chainName: 'Base Sepolia',
    shortName: 'base-sepolia',
  } as unknown as ChainInfo

  beforeEach(() => {
    mockUseChains.mockReturnValue({
      configs: [{ chainId: '1', chainName: 'Ethereum', shortName: 'eth', theme: { backgroundColor: '#DDD' } }],
    })
  })

  it('shows custom network count when custom chains are provided', () => {
    render(<FileListCard title={<b>export.json</b>} customChains={[customChain]} />)

    expect(screen.getByText(/Custom networks/i)).toBeInTheDocument()
    expect(screen.getByText(/for 1 chain/i)).toBeInTheDocument()
  })
})
