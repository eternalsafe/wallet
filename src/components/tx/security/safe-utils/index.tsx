import type { ReactElement } from 'react'
import { Paper, Typography } from '@mui/material'

import ExternalLink from '@/components/common/ExternalLink'
import sharedCss from '@/components/tx/security/shared/styles.module.css'

export const SAFE_UTILS_URL = 'https://safeutils.openzeppelin.com/'

const SafeUtilsLink = (): ReactElement => (
  <Paper variant="outlined" className={sharedCss.wrapper}>
    <Typography variant="body2" fontWeight={700}>
      OpenZeppelin Safe Utils
    </Typography>

    <Typography variant="body2">
      <ExternalLink href={SAFE_UTILS_URL}>Review transaction</ExternalLink>
    </Typography>
  </Paper>
)

export default SafeUtilsLink
