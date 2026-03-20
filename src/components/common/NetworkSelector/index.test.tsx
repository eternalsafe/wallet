import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import NetworkSelector from './index'
import useChains from '@/hooks/useChains'
import { useChainId } from '@/hooks/useChainId'
import { useRouter } from 'next/router'
import { useAppDispatch } from '@/store'
import { useConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { removeChain } from '@/store/customChainsSlice'
import { setRpc } from '@/store/settingsSlice'

jest.mock('@/components/common/ChainIndicator', () => ({
  __esModule: true,
  default: ({ chainId }: { chainId: string }) => <span>{chainId}</span>,
}))

jest.mock('@/hooks/useChains', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@/hooks/useChainId', () => ({
  useChainId: jest.fn(),
}))

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/store', () => ({
  useAppDispatch: jest.fn(),
}))

jest.mock('@/components/common/ConfirmationDialog', () => ({
  useConfirmationDialog: jest.fn(),
}))

const mockUseChains = useChains as jest.Mock
const mockUseChainId = useChainId as jest.Mock
const mockUseRouter = useRouter as jest.Mock
const mockUseAppDispatch = useAppDispatch as jest.Mock
const mockUseConfirmationDialog = useConfirmationDialog as jest.Mock

describe('NetworkSelector', () => {
  const dispatchMock = jest.fn()
  const pushMock = jest.fn()
  const confirmMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseChains.mockReturnValue({
      configs: [
        { chainId: '1', chainName: 'Ethereum', shortName: 'eth', custom: false, isTestnet: false },
        { chainId: '84532', chainName: 'Base Sepolia', shortName: 'base-sepolia', custom: true, isTestnet: true },
      ],
    })
    mockUseChainId.mockReturnValue('1')
    mockUseRouter.mockReturnValue({
      pathname: '/',
      query: {},
      push: pushMock,
    })
    mockUseAppDispatch.mockReturnValue(dispatchMock)
    confirmMock.mockResolvedValue(true)
    mockUseConfirmationDialog.mockReturnValue({ confirm: confirmMock })
  })

  it('requires confirmation before deleting a custom network', async () => {
    confirmMock.mockResolvedValue(false)

    render(<NetworkSelector />)

    fireEvent.mouseDown(screen.getByRole('combobox'))
    fireEvent.click(await screen.findByLabelText('Delete network'))

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Delete network',
          confirmText: 'Delete',
        }),
      )
    })

    expect(dispatchMock).not.toHaveBeenCalledWith(setRpc({ chainId: '84532', rpc: undefined }))
    expect(dispatchMock).not.toHaveBeenCalledWith(removeChain('84532'))
  })
})
