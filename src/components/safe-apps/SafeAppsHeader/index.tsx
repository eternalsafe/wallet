import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ReactElement } from 'react'
import { useCurrentChain } from '@/hooks/useChains'

import css from './styles.module.css'

const SafeAppsHeader = (): ReactElement => {
  const chain = useCurrentChain()
  return (
    <>
      <Box className={css.container}>
        <Typography className={css.title} variant="h3">
          My custom Safe Apps{chain?.chainName ? ` on ${chain.chainName}` : ''}
        </Typography>

        <Typography className={css.subtitle}>
          Add and manage custom Safe Apps for your Safe Account. Note: custom Safe Apps may make calls to external APIs.
          You use Safe Apps via Eternal Safe at your own risk.
        </Typography>
      </Box>
    </>
  )
}

export default SafeAppsHeader
