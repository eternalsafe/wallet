import { type ReactElement } from 'react'
import { Typography, Button } from '@mui/material'
import useHiddenTokens from '@/hooks/useHiddenTokens'
import useBalances from '@/hooks/useBalances'
import { VisibilityOutlined } from '@mui/icons-material'

import css from './styles.module.css'

const HiddenTokenButton = ({
  toggleShowHiddenAssets,
  showHiddenAssets,
}: {
  toggleShowHiddenAssets?: () => void
  showHiddenAssets?: boolean
}): ReactElement | null => {
  const { balances } = useBalances()
  const currentHiddenAssets = useHiddenTokens()

  const hiddenAssetCount =
    balances.items?.filter((item) => currentHiddenAssets.includes(item.tokenInfo.address)).length || 0

  return (
    <div className={css.hiddenTokenButton}>
      <Button
        sx={{
          gap: 1,
          padding: 1,
          borderWidth: '1px !important',
          borderColor: ({ palette }) => palette.border.main,
        }}
        disabled={showHiddenAssets}
        onClick={toggleShowHiddenAssets}
        data-testid="toggle-hidden-assets"
        variant="outlined"
      >
        <>
          <VisibilityOutlined fontSize="small" />
          <Typography fontSize="medium">
            {hiddenAssetCount === 0
              ? 'Hide tokens'
              : `${hiddenAssetCount} hidden token${hiddenAssetCount > 1 ? 's' : ''}`}{' '}
          </Typography>
        </>
      </Button>
    </div>
  )
}

export default HiddenTokenButton
