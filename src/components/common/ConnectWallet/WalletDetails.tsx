import { Box, SvgIcon } from '@mui/material'
import type { ReactElement } from 'react'

import LockIcon from '@/public/images/common/lock.svg'

import WalletLogin from '@/components/welcome/WelcomeLogin/WalletLogin'

const WalletDetails = ({ onConnect }: { onConnect: () => void }): ReactElement => {
  return (
    <>
      <Box my={1} display="flex" justifyContent="center">
        <SvgIcon inheritViewBox sx={{ width: 64, height: 64, display: 'block' }}>
          <LockIcon />
        </SvgIcon>
      </Box>

      <WalletLogin onLogin={onConnect} />
    </>
  )
}

export default WalletDetails
