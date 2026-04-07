import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/tests/test-utils'
import EnvironmentVariables from '.'
import { HISTORICAL_RPC_LOG_BLOCK_BATCH_SIZE, HISTORICAL_RPC_LOG_MAX_CONCURRENT_REQUESTS } from '@/config/constants'
import { initialState as initialSettingsState, settingsSlice } from '@/store/settingsSlice'
import { LS_NAMESPACE } from '@/config/constants'

jest.mock('@/hooks/useChainId', () => ({
  __esModule: true,
  default: jest.fn(() => '1'),
}))

jest.mock('@/hooks/useChains', () => ({
  __esModule: true,
  default: jest.fn(() => ({ configs: [] })),
  useCurrentChain: jest.fn(() => ({
    chainId: '1',
    publicRpcUri: { value: 'https://rpc.example.org' },
  })),
}))

describe('EnvironmentVariables', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('shows the Chain Queries section with empty defaults', () => {
    render(<EnvironmentVariables />)

    expect(screen.getByText('Chain Queries')).toBeInTheDocument()
    expect(screen.queryByText('Historical RPC block range')).not.toBeInTheDocument()
    expect(screen.queryByText('Historical RPC max concurrent requests')).not.toBeInTheDocument()

    const blockRangeInput = screen.getByLabelText('Block range') as HTMLInputElement
    const maxConcurrentInput = screen.getByLabelText('Max concurrent requests') as HTMLInputElement

    expect(blockRangeInput.value).toBe('')
    expect(maxConcurrentInput.value).toBe('')
  })

  it('shows default values in the Chain Queries tooltip', async () => {
    render(<EnvironmentVariables />)

    await userEvent.hover(screen.getByLabelText('Chain Queries info'))

    expect(await screen.findByText(/Default block range:/)).toBeInTheDocument()
    expect(
      await screen.findByText(
        new RegExp(`Default block range: ${HISTORICAL_RPC_LOG_BLOCK_BATCH_SIZE.toLocaleString()}`),
      ),
    ).toBeInTheDocument()
    expect(
      await screen.findByText(
        new RegExp(
          `Default max concurrent requests: ${HISTORICAL_RPC_LOG_MAX_CONCURRENT_REQUESTS.toLocaleString()}\\.`,
        ),
      ),
    ).toBeInTheDocument()
  })

  it('shows persisted non-default Chain Queries values', () => {
    const nonDefaultBatchSize = HISTORICAL_RPC_LOG_BLOCK_BATCH_SIZE === 12_345 ? 12_346 : 12_345
    const nonDefaultMaxConcurrentRequests = HISTORICAL_RPC_LOG_MAX_CONCURRENT_REQUESTS === 2 ? 3 : 2

    window.localStorage.setItem(
      `${LS_NAMESPACE}${settingsSlice.name}`,
      JSON.stringify({
        ...initialSettingsState,
        env: {
          ...initialSettingsState.env,
          historicalRpcLogBatchSize: nonDefaultBatchSize,
          historicalRpcLogMaxConcurrentRequests: nonDefaultMaxConcurrentRequests,
        },
      }),
    )

    render(<EnvironmentVariables />)

    const blockRangeInput = screen.getByLabelText('Block range') as HTMLInputElement
    const maxConcurrentInput = screen.getByLabelText('Max concurrent requests') as HTMLInputElement

    return waitFor(() => {
      expect(blockRangeInput.value).toBe(`${nonDefaultBatchSize}`)
      expect(maxConcurrentInput.value).toBe(`${nonDefaultMaxConcurrentRequests}`)
    })
  })
})
