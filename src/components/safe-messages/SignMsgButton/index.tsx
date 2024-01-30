import { Button, Tooltip, IconButton } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import type { SyntheticEvent, ReactElement } from 'react'
import type { SafeMessage } from '@safe-global/safe-gateway-typescript-sdk'

import useWallet from '@/hooks/wallets/useWallet'
import useIsSafeMessageSignableBy from '@/hooks/messages/useIsSafeMessageSignableBy'
import useIsSafeMessagePending from '@/hooks/messages/useIsSafeMessagePending'

// TODO(devanon): maybe remove all of the safe-messages stuff if we don't need it

const SignMsgButton = ({ msg, compact = false }: { msg: SafeMessage; compact?: boolean }): ReactElement => {
  const wallet = useWallet()
  const isSignable = useIsSafeMessageSignableBy(msg, wallet?.address || '')
  const isPending = useIsSafeMessagePending(msg.messageHash)

  const onClick = (e: SyntheticEvent) => {
    e.stopPropagation()
  }

  const isDisabled = !isSignable || isPending

  return compact ? (
    <Tooltip title="Sign" arrow placement="top">
      <span>
        <IconButton onClick={onClick} color="primary" disabled={isDisabled} size="small">
          <CheckIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  ) : (
    <Button onClick={onClick} variant="contained" disabled={isDisabled} size="stretched">
      Sign
    </Button>
  )
}

export default SignMsgButton
