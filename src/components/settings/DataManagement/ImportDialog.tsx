import { DialogContent, Alert, AlertTitle, DialogActions, Button, Box, SvgIcon } from '@mui/material'
import type { ReactElement, Dispatch, SetStateAction } from 'react'

import ModalDialog from '@/components/common/ModalDialog'
import { useAppDispatch } from '@/store'
import { addedSafesSlice } from '@/store/addedSafesSlice'
import { addressBookSlice } from '@/store/addressBookSlice'
import { safeAppsSlice } from '@/store/safeAppsSlice'
import { settingsSlice } from '@/store/settingsSlice'
import { FileListCard } from '@/components/settings/DataManagement/FileListCard'
import { useGlobalImportJsonParser } from '@/components/settings/DataManagement/useGlobalImportFileParser'
import FileIcon from '@/public/images/settings/data/file.svg'
import { ImportFileUpload } from '@/components/settings/DataManagement/ImportFileUpload'
import { showNotification } from '@/store/notificationsSlice'

import css from './styles.module.css'
import { customTokensSlice } from '@/store/customTokensSlice'
import { customChainsSlice } from '@/store/customChainsSlice'
import { addedTxsSlice } from '@/store/addedTxsSlice'

export const ImportDialog = ({
  onClose,
  fileName = '',
  setFileName,
  jsonData = '',
  setJsonData,
}: {
  onClose?: () => void
  fileName: string | undefined
  setFileName: Dispatch<SetStateAction<string | undefined>>
  jsonData: string | undefined
  setJsonData: Dispatch<SetStateAction<string | undefined>>
}): ReactElement => {
  const dispatch = useAppDispatch()
  const {
    addedSafes,
    addedSafesCount,
    addressBook,
    addressBookEntriesCount,
    customTokens,
    addedTxs,
    settings,
    safeApps,
    customChains,
    error,
  } = useGlobalImportJsonParser(jsonData)

  const isDisabled = (!addedSafes && !addressBook && !settings && !safeApps) || !!error

  const handleClose = () => {
    setFileName(undefined)
    setJsonData(undefined)
    onClose?.()
  }

  const handleImport = () => {
    if (addressBook) {
      dispatch(addressBookSlice.actions.setAddressBook(addressBook))
    }

    if (addedSafes) {
      dispatch(addedSafesSlice.actions.setAddedSafes(addedSafes))
    }

    if (customTokens) {
      dispatch(customTokensSlice.actions.setCustomTokens(customTokens))
    }

    if (addedTxs) {
      dispatch(addedTxsSlice.actions.setAddedTxs(addedTxs))
    }

    if (settings) {
      dispatch(settingsSlice.actions.setSettings(settings))
    }

    if (safeApps) {
      dispatch(safeAppsSlice.actions.setSafeApps(safeApps))
    }

    if (customChains) {
      dispatch(customChainsSlice.actions.setCustomChains(customChains))
    }

    dispatch(
      showNotification({
        variant: 'success',
        groupKey: 'global-import-success',
        message: 'Successfully imported data',
      }),
    )

    handleClose()
  }

  return (
    <ModalDialog open onClose={handleClose} dialogTitle="Data import" hideChainIndicator>
      <DialogContent>
        {!jsonData || !fileName ? (
          <Box mt={2}>
            <ImportFileUpload setFileName={setFileName} setJsonData={setJsonData} />
          </Box>
        ) : (
          <>
            <FileListCard
              avatar={
                <Box sx={{ borderRadius: ({ shape }) => `${shape.borderRadius}px` }}>
                  <SvgIcon
                    component={FileIcon}
                    inheritViewBox
                    fontSize="small"
                    sx={{ fill: 'none', display: 'block' }}
                  />
                </Box>
              }
              title={<b>{fileName}</b>}
              className={css.header}
              addedSafes={addedSafes}
              addressBook={addressBook}
              customTokens={customTokens}
              addedTxs={addedTxs}
              settings={settings}
              customChains={customChains}
              safeApps={safeApps}
              error={error}
              showPreview
            />
            {!isDisabled && (
              <Alert severity="warning">
                <AlertTitle sx={{ fontWeight: 700 }}>Overwrite your current data?</AlertTitle>
                This action will overwrite your currently added Safe Accounts, address book and settings with those from
                the imported file.
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleImport} variant="contained" disableElevation disabled={isDisabled}>
          Import
        </Button>
      </DialogActions>
    </ModalDialog>
  )
}
