import { useEffect, useState } from 'react'
import { Paper, Grid, Typography, Button, SvgIcon, Box } from '@mui/material'

import FileIcon from '@/public/images/settings/data/file.svg'
import ExportIcon from '@/public/images/common/export.svg'
import { getPersistedState, useAppSelector } from '@/store'
import { addressBookSlice, selectAllAddressBooks } from '@/store/addressBookSlice'
import { addedSafesSlice, selectAllAddedSafes } from '@/store/addedSafesSlice'
import { safeAppsSlice, selectSafeApps } from '@/store/safeAppsSlice'
import { selectSettings, settingsSlice } from '@/store/settingsSlice'
import { addedTxsSlice, selectAllAddedTxs } from '@/store/addedTxsSlice'
import { customTokensSlice, selectCustomTokens } from '@/store/customTokensSlice'
import { customChainsSlice } from '@/store/customChainsSlice'
import InfoIcon from '@/public/images/notifications/info.svg'
import { ImportFileUpload } from '@/components/settings/DataManagement/ImportFileUpload'
import { ImportDialog } from '@/components/settings/DataManagement/ImportDialog'
import { SAFE_EXPORT_VERSION } from '@/components/settings/DataManagement/useGlobalImportFileParser'
import { FileListCard } from '@/components/settings/DataManagement/FileListCard'

import css from './styles.module.css'

const getExportFileName = () => {
  const today = new Date().toISOString().slice(0, 10)
  return `safe-${today}.json`
}

export const exportAppData = () => {
  // Extract the slices we want to export
  const {
    [addressBookSlice.name]: addressBook,
    [addedSafesSlice.name]: addedSafes,
    [settingsSlice.name]: setting,
    [safeAppsSlice.name]: safeApps,
    [addedTxsSlice.name]: addedTxs,
    [customTokensSlice.name]: customTokens,
    [customChainsSlice.name]: customChains,
  } = getPersistedState()

  // Ensure they are under the same name as the slice
  const exportData = {
    [addressBookSlice.name]: addressBook,
    [addedSafesSlice.name]: addedSafes,
    [settingsSlice.name]: setting,
    [safeAppsSlice.name]: safeApps,
    [addedTxsSlice.name]: addedTxs,
    [customTokensSlice.name]: customTokens,
    [customChainsSlice.name]: customChains,
  }

  const data = JSON.stringify({ version: SAFE_EXPORT_VERSION.V2_5, data: exportData })

  const blob = new Blob([data], { type: 'text/json' })
  const link = document.createElement('a')

  link.download = getExportFileName()
  link.href = window.URL.createObjectURL(blob)
  link.dataset.downloadurl = ['text/json', link.download, link.href].join(':')
  link.dispatchEvent(new MouseEvent('click'))
}

const DataManagement = () => {
  const [exportFileName, setExportFileName] = useState('')
  const [importFileName, setImportFileName] = useState<string>()
  const [jsonData, setJsonData] = useState<string>()

  const addedSafes = useAppSelector(selectAllAddedSafes)
  const addressBook = useAppSelector(selectAllAddressBooks)
  const settings = useAppSelector(selectSettings)
  const safeApps = useAppSelector(selectSafeApps)
  const customTokens = useAppSelector(selectCustomTokens)
  const addedTransactions = useAppSelector(selectAllAddedTxs)

  useEffect(() => {
    // Prevent hydration errors
    setExportFileName(getExportFileName())
  }, [])

  return (
    <>
      <Paper sx={{ p: 4, mb: 2 }}>
        <Grid container spacing={3}>
          <Grid item sm={4} xs={12}>
            <Typography variant="h4" fontWeight={700}>
              Data export
            </Typography>
          </Grid>

          <Grid item container xs>
            <Typography>
              Download your local data with your added Safe Accounts, address book, assets, transaction details and
              settings.
            </Typography>

            <FileListCard
              avatar={
                <Box className={css.fileIcon} sx={{ borderRadius: ({ shape }) => `${shape.borderRadius}px` }}>
                  <SvgIcon component={FileIcon} inheritViewBox fontSize="small" sx={{ fill: 'none' }} />
                </Box>
              }
              title={<b>{exportFileName}</b>}
              action={
                <Button variant="contained" className={css.exportIcon} onClick={exportAppData}>
                  <SvgIcon component={ExportIcon} inheritViewBox fontSize="small" />
                </Button>
              }
              addedSafes={addedSafes}
              addressBook={addressBook}
              customTokens={customTokens}
              addedTxs={addedTransactions}
              settings={settings}
              safeApps={safeApps}
            />
            <Typography>
              <SvgIcon
                component={InfoIcon}
                inheritViewBox
                fontSize="small"
                color="border"
                sx={{
                  verticalAlign: 'middle',
                  mr: 0.5,
                }}
              />
              Because Eternal Safe does not rely on any backend, it is even more important to keep a backup of this
              data. If you ever switch to a new browser or onboard another signer, this is the best way to get setup.
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 4 }}>
        <Grid container spacing={3}>
          <Grid item sm={4} xs={12}>
            <Typography variant="h4" fontWeight={700}>
              Data import
            </Typography>
          </Grid>

          <Grid item xs>
            <ImportFileUpload setFileName={setImportFileName} setJsonData={setJsonData} />
          </Grid>

          {jsonData && (
            <ImportDialog
              jsonData={jsonData}
              fileName={importFileName}
              setJsonData={setJsonData}
              setFileName={setImportFileName}
            />
          )}
        </Grid>
      </Paper>
    </>
  )
}

export default DataManagement
