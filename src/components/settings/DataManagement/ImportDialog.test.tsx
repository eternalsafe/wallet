import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useAppDispatch } from '@/store'
import { useGlobalImportJsonParser } from '@/components/settings/DataManagement/useGlobalImportFileParser'
import { setCustomChains } from '@/store/customChainsSlice'
import { ImportDialog } from '@/components/settings/DataManagement/ImportDialog'
import type { ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'

jest.mock('@/store', () => ({
  useAppDispatch: jest.fn(),
}))

jest.mock('@/components/settings/DataManagement/useGlobalImportFileParser', () => ({
  useGlobalImportJsonParser: jest.fn(),
}))

jest.mock('@/components/common/ModalDialog', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/settings/DataManagement/FileListCard', () => ({
  FileListCard: () => <div>FileListCard</div>,
}))

jest.mock('@/components/settings/DataManagement/ImportFileUpload', () => ({
  ImportFileUpload: () => <div>ImportFileUpload</div>,
}))

const mockUseAppDispatch = useAppDispatch as jest.Mock
const mockUseGlobalImportJsonParser = useGlobalImportJsonParser as jest.Mock

describe('ImportDialog', () => {
  it('enables import when only custom chains are present', async () => {
    const dispatchMock = jest.fn()
    const customChains: Parameters<typeof setCustomChains>[0] = [
      {
        chainId: '84532',
        chainName: 'Base Sepolia',
        shortName: 'base-sepolia',
        custom: true,
      } as unknown as ChainInfo,
    ]

    mockUseAppDispatch.mockReturnValue(dispatchMock)
    mockUseGlobalImportJsonParser.mockReturnValue({
      addedSafes: undefined,
      addedSafesCount: 0,
      addressBook: undefined,
      addressBookEntriesCount: 0,
      customTokens: undefined,
      addedTxs: undefined,
      settings: undefined,
      safeApps: undefined,
      customChains,
      error: undefined,
    })

    const setFileName = jest.fn()
    const setJsonData = jest.fn()

    render(
      <ImportDialog
        fileName="import.json"
        jsonData="{}"
        setFileName={setFileName}
        setJsonData={setJsonData}
        onClose={jest.fn()}
      />,
    )

    const importButton = screen.getByRole('button', { name: 'Import' })
    expect(importButton).toBeEnabled()

    fireEvent.click(importButton)

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(setCustomChains(customChains))
    })
  })
})
