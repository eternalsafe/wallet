import type { SafeAppData } from '@safe-global/safe-gateway-typescript-sdk'
import { Typography, SvgIcon } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'

import CopyButton from '@/components/common/CopyButton'
import ShareIcon from '@/public/images/common/share.svg'
import css from './styles.module.css'
import SafeAppIconCard from '@/components/safe-apps/SafeAppIconCard'

type CustomAppProps = {
  safeApp: SafeAppData
  shareUrl: string
}

const CustomApp = ({ safeApp, shareUrl }: CustomAppProps) => {
  return (
    <div className={css.customAppContainer}>
      <SafeAppIconCard src={safeApp.iconUrl} alt={safeApp.name} width={48} height={48} />

      <Typography component="h2" mt={2} color="text.primary" fontWeight={700}>
        {safeApp.name}
      </Typography>

      <Typography variant="body2" mt={1} color="text.secondary">
        {safeApp.description}
      </Typography>

      {shareUrl ? (
        <CopyButton
          className={css.customAppCheckIcon}
          text={shareUrl}
          initialToolTipText={`Copy share URL for ${safeApp.name}`}
        >
          <SvgIcon component={ShareIcon} inheritViewBox color="border" fontSize="small" />
        </CopyButton>
      ) : (
        <CheckIcon color="success" className={css.customAppCheckIcon} />
      )}
    </div>
  )
}

export default CustomApp
