import { useAppDispatch, useAppSelector } from '@/store'
import {
  addCustomTokenList,
  removeCustomTokenList,
  selectCustomTokenLists,
  selectSettings,
  setTokenList,
  TOKEN_LISTS,
} from '@/store/settingsSlice'
import { FEATURES } from '@/utils/chains'
import type { SelectChangeEvent } from '@mui/material'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { OnboardingTooltip } from '@/components/common/OnboardingTooltip'
import { useHasFeature } from '@/hooks/useChains'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useMemo, useState } from 'react'
import { DEFAULT_IPFS_GATEWAY } from '@/config/constants'
import { isSupportedCustomTokenListUrl, resolveTokenListUrl } from '@/utils/tokenListUrl'

const LS_TOKENLIST_ONBOARDING = 'tokenlist_onboarding'
const MANAGE_TOKEN_LISTS_OPTION = '__MANAGE_TOKEN_LISTS__'

const TokenListLabel = {
  [TOKEN_LISTS.TRUSTED]: 'None',
  [TOKEN_LISTS.ALL]: 'Uniswap Labs',
}

const getTokenListLabel = (value: string): string => {
  if (value === TOKEN_LISTS.TRUSTED) return TokenListLabel[TOKEN_LISTS.TRUSTED]
  if (value === TOKEN_LISTS.ALL) return TokenListLabel[TOKEN_LISTS.ALL]

  return value
}

const TokenListSelect = () => {
  const dispatch = useAppDispatch()
  const settings = useAppSelector(selectSettings)
  const customTokenLists = useAppSelector(selectCustomTokenLists)
  const hasDefaultTokenlist = useHasFeature(FEATURES.DEFAULT_TOKENLIST)
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [customTokenList, setCustomTokenList] = useState('')
  const [customTokenListError, setCustomTokenListError] = useState('')

  const ipfsGateway = useMemo(() => settings.env.ipfs || DEFAULT_IPFS_GATEWAY, [settings.env.ipfs])

  const handleSelectTokenList = (event: SelectChangeEvent<string>) => {
    const selectedString = event.target.value
    if (selectedString === MANAGE_TOKEN_LISTS_OPTION) {
      setDialogOpen(true)
      return
    }

    dispatch(setTokenList(selectedString))
  }

  const handleAddCustomTokenList = () => {
    const tokenList = customTokenList.trim()
    if (!isSupportedCustomTokenListUrl(tokenList) || !resolveTokenListUrl(tokenList, ipfsGateway)) {
      setCustomTokenListError('Enter a valid https:// or ipfs:// URL')
      return
    }

    dispatch(addCustomTokenList(tokenList))
    dispatch(setTokenList(tokenList))

    setCustomTokenList('')
    setCustomTokenListError('')
  }

  const handleRemoveCustomTokenList = (tokenList: string) => {
    dispatch(removeCustomTokenList(tokenList))
  }

  if (!hasDefaultTokenlist) {
    return null
  }

  return (
    <FormControl size="small">
      <InputLabel id="tokenlist-select-label">Token list</InputLabel>

      <OnboardingTooltip
        widgetLocalStorageId={LS_TOKENLIST_ONBOARDING}
        text={
          <>
            By default, we show only tokens you add.
            <br />
            You can also use the Uniswap Labs token list (but be aware this will rely on external sites for logos).
          </>
        }
      >
        <Select
          labelId="tokenlist-select-label"
          id="tokenlist-select"
          value={settings.tokenList}
          label="Tokenlist"
          onChange={handleSelectTokenList}
          renderValue={(value) => getTokenListLabel(value)}
          sx={{ minWidth: '152px' }}
        >
          <MenuItem value={TOKEN_LISTS.TRUSTED}>
            <Box display="flex" flexDirection="row" gap="4px" alignItems="center" minWidth={155}>
              {TokenListLabel.TRUSTED}
            </Box>
          </MenuItem>

          <MenuItem value={TOKEN_LISTS.ALL}>
            <span>{TokenListLabel.ALL}</span>
          </MenuItem>

          {customTokenLists.map((tokenList) => (
            <MenuItem key={tokenList} value={tokenList}>
              <span>{tokenList}</span>
            </MenuItem>
          ))}

          <Divider />
          <MenuItem value={MANAGE_TOKEN_LISTS_OPTION}>Manage token lists</MenuItem>
        </Select>
      </OnboardingTooltip>

      <Dialog
        open={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        aria-labelledby="manage-token-lists-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="manage-token-lists-title">Manage token lists</DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add https:// or ipfs:// token-list URLs. IPFS URLs use your configured IPFS gateway or the default fallback.
          </Typography>

          <Box display="flex" gap={1} alignItems="flex-start" mb={2}>
            <TextField
              fullWidth
              size="small"
              label="Token list URL"
              value={customTokenList}
              onChange={(event) => {
                setCustomTokenList(event.target.value)
                if (customTokenListError) {
                  setCustomTokenListError('')
                }
              }}
              error={!!customTokenListError}
              helperText={customTokenListError || ' '}
            />

            <Button variant="contained" onClick={handleAddCustomTokenList}>
              Add
            </Button>
          </Box>

          {customTokenLists.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No custom token lists added yet.
            </Typography>
          ) : (
            <Box display="flex" flexDirection="column" gap={1}>
              {customTokenLists.map((tokenList) => (
                <Box key={tokenList} display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {tokenList}
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={() => handleRemoveCustomTokenList(tokenList)}
                    aria-label={`Remove token list ${tokenList}`}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </FormControl>
  )
}

export default TokenListSelect
