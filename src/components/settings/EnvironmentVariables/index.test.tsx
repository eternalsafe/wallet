import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as chainIdModule from '@/hooks/useChainId'
import * as chainsModule from '@/hooks/useChains'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  initialState as initialSettingsState,
  setHistoricalRpcLogBatchSize,
  setHistoricalRpcLogMaxConcurrentRequests,
} from '@/store/settingsSlice'
import EnvironmentVariables from '.'

jest.mock('@/store', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}))

describe('EnvironmentVariables', () => {
  const dispatch = jest.fn()

  beforeEach(() => {
    localStorage.clear()
    dispatch.mockReset()

    jest.spyOn(chainIdModule, 'default').mockReturnValue('1')
    jest.spyOn(chainsModule, 'useCurrentChain').mockReturnValue({
      chainId: '1',
      publicRpcUri: { value: 'https://rpc.example' },
    } as any)

    ;(useAppDispatch as jest.Mock).mockReturnValue(dispatch)
    ;(useAppSelector as jest.Mock).mockImplementation((selector: (state: any) => unknown) =>
      selector({
        settings: initialSettingsState,
      }),
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders Chain queries fields from persisted settings', async () => {
    ;(useAppSelector as jest.Mock).mockImplementation((selector: (state: any) => unknown) =>
      selector({
        settings: {
          ...initialSettingsState,
          env: {
            ...initialSettingsState.env,
            rpc: { '1': 'https://rpc.example' },
            historicalRpcLogBatchSize: 2500,
            historicalRpcLogMaxConcurrentRequests: 6,
          },
        },
      }),
    )

    await act(async () => {
      render(<EnvironmentVariables />)
    })

    expect(screen.getByLabelText('Historical log block batch size')).toHaveValue(2500)
    expect(screen.getByLabelText('Max parallel historical log requests')).toHaveValue(6)
  })

  it('dispatches both Chain queries values on submit', async () => {
    const originalLocation = window.location

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload: jest.fn(),
      },
    })

    await act(async () => {
      render(<EnvironmentVariables />)
    })

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Historical log block batch size'), { target: { value: '4000' } })
      fireEvent.change(screen.getByLabelText('Max parallel historical log requests'), { target: { value: '8' } })
    })

    await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeEnabled())

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }))
    })

    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(setHistoricalRpcLogBatchSize(4000)))
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(setHistoricalRpcLogMaxConcurrentRequests(8)))

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })
})
