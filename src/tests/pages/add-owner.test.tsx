import type { ReactElement } from 'react'
import { render, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import AddOwnerPage from '@/pages/add-owner'
import { AppRoutes } from '@/config/routes'
import { TxModalContext } from '@/components/tx-flow'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

const mockUseRouter = useRouter as jest.Mock

const renderPage = (setTxFlow: jest.Mock): ReactElement => {
  return (
    <TxModalContext.Provider value={{ txFlow: undefined, setTxFlow, setFullWidth: jest.fn() }}>
      <AddOwnerPage />
    </TxModalContext.Provider>
  )
}

describe('/add-owner page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to setup and starts AddOwner flow when address is provided', async () => {
    const push = jest.fn().mockResolvedValue(true)
    const setTxFlow = jest.fn()
    const query = {
      address: '0x1111111111111111111111111111111111111111',
      safe: 'eth:0x2222222222222222222222222222222222222222',
    }

    mockUseRouter.mockReturnValue({
      query,
      push,
    })

    render(renderPage(setTxFlow))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith({ pathname: AppRoutes.settings.setup, query })
    })

    await waitFor(() => {
      expect(setTxFlow).toHaveBeenCalledTimes(1)
    })

    const txFlow = setTxFlow.mock.calls[0][0]
    expect(txFlow?.props?.address).toBe(query.address)
  })

  it('uses the first address when the query contains an address array', async () => {
    const push = jest.fn().mockResolvedValue(true)
    const setTxFlow = jest.fn()
    const query = {
      address: ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
      safe: 'eth:0x2222222222222222222222222222222222222222',
    }

    mockUseRouter.mockReturnValue({
      query,
      push,
    })

    render(renderPage(setTxFlow))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith({ pathname: AppRoutes.settings.setup, query })
    })

    await waitFor(() => {
      expect(setTxFlow).toHaveBeenCalledTimes(1)
    })

    const txFlow = setTxFlow.mock.calls[0][0]
    expect(txFlow?.props?.address).toBe(query.address[0])
  })

  it('redirects to setup without starting a flow when no address is provided', async () => {
    const push = jest.fn().mockResolvedValue(true)
    const setTxFlow = jest.fn()
    const query = {
      safe: 'eth:0x2222222222222222222222222222222222222222',
    }

    mockUseRouter.mockReturnValue({
      query,
      push,
    })

    render(renderPage(setTxFlow))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith({ pathname: AppRoutes.settings.setup, query })
    })

    await waitFor(() => {
      expect(setTxFlow).not.toHaveBeenCalled()
    })
  })
})
