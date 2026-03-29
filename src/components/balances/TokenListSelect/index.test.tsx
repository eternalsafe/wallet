import { fireEvent, render, screen } from '@testing-library/react'
import TokenListSelect from './index'
import { TOKEN_LISTS, initialState } from '@/store/settingsSlice'
import { useHasFeature } from '@/hooks/useChains'
import { useAppDispatch, useAppSelector } from '@/store'
import { FEATURES } from '@/utils/chains'

jest.mock('@/hooks/useChains', () => ({
  useHasFeature: jest.fn(),
}))

jest.mock('@/store', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}))

describe('TokenListSelect', () => {
  const mockUseHasFeature = useHasFeature as jest.MockedFunction<typeof useHasFeature>
  const mockUseAppDispatch = useAppDispatch as jest.MockedFunction<typeof useAppDispatch>
  const mockUseAppSelector = useAppSelector as jest.MockedFunction<typeof useAppSelector>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseHasFeature.mockImplementation((feature) => feature === FEATURES.DEFAULT_TOKENLIST)
    mockUseAppDispatch.mockReturnValue(jest.fn())
    mockUseAppSelector.mockImplementation((selector) =>
      selector({
        settings: {
          ...initialState,
          tokenList: TOKEN_LISTS.ALL,
          customTokenLists: [],
        },
      } as any),
    )
  })

  test('opens token list management dialog from the dropdown', async () => {
    render(<TokenListSelect />)

    fireEvent.mouseDown(screen.getByRole('combobox'))
    fireEvent.click(await screen.findByText('Manage token lists'))

    expect(await screen.findByRole('dialog', { name: 'Manage token lists' })).toBeInTheDocument()
  })
})
