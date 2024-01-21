import { Close } from '@mui/icons-material'
import {
  Dialog,
  DialogTitle,
  SvgIcon,
  Typography,
  IconButton,
  Divider,
  DialogContent,
  DialogActions,
  Button,
  Box,
} from '@mui/material'
import WarningIcon from '@/public/images/notifications/warning.svg'
import { type ReactElement, type SyntheticEvent } from 'react'

export type ConfirmCopyModalProps = {
  open: boolean
  onClose: () => void
  onCopy: { (e: SyntheticEvent): void }
  children: ReactElement
}

const ConfirmCopyModal = ({ open, onClose, onCopy, children }: ConfirmCopyModalProps) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        <Box data-testid="untrusted-token-warning" display="flex" flexDirection="row" alignItems="center" gap={1}>
          <SvgIcon component={WarningIcon} inheritViewBox color="warning" sx={{ mb: -0.4 }} />
          <Typography variant="h6" fontWeight={700}>
            Before you copy
          </Typography>
          <IconButton aria-label="close" onClick={onClose} sx={{ marginLeft: 'auto' }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent>{children}</DialogContent>
      <Divider />
      <DialogActions sx={{ padding: 3 }}>
        <Button size="small" variant="outlined" color="primary" onClick={onCopy}>
          Proceed and copy
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmCopyModal
