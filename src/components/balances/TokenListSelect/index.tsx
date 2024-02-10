import { useAppDispatch, useAppSelector } from '@/store'
import { selectSettings, setTokenList, TOKEN_LISTS } from '@/store/settingsSlice'
import { FEATURES } from '@/utils/chains'
import type { SelectChangeEvent } from '@mui/material'
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import { OnboardingTooltip } from '@/components/common/OnboardingTooltip'
import { useHasFeature } from '@/hooks/useChains'

const LS_TOKENLIST_ONBOARDING = 'tokenlist_onboarding'

const TokenListLabel = {
  [TOKEN_LISTS.TRUSTED]: 'None',
  [TOKEN_LISTS.ALL]: 'Uniswap Labs',
}

const TokenListSelect = () => {
  const dispatch = useAppDispatch()
  const settings = useAppSelector(selectSettings)
  const hasDefaultTokenlist = useHasFeature(FEATURES.DEFAULT_TOKENLIST)

  const handleSelectTokenList = (event: SelectChangeEvent<TOKEN_LISTS>) => {
    const selectedString = event.target.value as TOKEN_LISTS
    dispatch(setTokenList(selectedString))
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
          renderValue={(value) => TokenListLabel[value]}
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
        </Select>
      </OnboardingTooltip>
    </FormControl>
  )
}

export default TokenListSelect
