import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react'
import Button, { type ButtonProps } from '@mui/material/Button'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import ModalDialog from '@/components/common/ModalDialog'

type ConfirmationDialogRequest = {
  title?: ReactNode
  message: ReactNode
  confirmText?: string
  cancelText?: string
  confirmButtonProps?: Omit<ButtonProps, 'onClick' | 'children'>
  cancelButtonProps?: Omit<ButtonProps, 'onClick' | 'children'>
}

type ConfirmationDialogContextValue = {
  confirm: (request: ConfirmationDialogRequest) => Promise<boolean>
}

const ConfirmationDialogContext = createContext<ConfirmationDialogContextValue | null>(null)

export const useConfirmationDialog = (): ConfirmationDialogContextValue => {
  const context = useContext(ConfirmationDialogContext)

  if (!context) {
    throw new Error('useConfirmationDialog must be used within a ConfirmationDialogProvider')
  }

  return context
}

export const ConfirmationDialogProvider = ({ children }: { children: ReactNode }) => {
  const [request, setRequest] = useState<ConfirmationDialogRequest | null>(null)
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null)

  const resolveAndClose = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed)
    resolverRef.current = null
    setRequest(null)
  }, [])

  const confirm = useCallback((nextRequest: ConfirmationDialogRequest): Promise<boolean> => {
    if (resolverRef.current) {
      resolverRef.current(false)
    }

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setRequest(nextRequest)
    })
  }, [])

  const contextValue = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmationDialogContext.Provider value={contextValue}>
      {children}

      {request && (
        <ModalDialog
          open
          onClose={() => resolveAndClose(false)}
          dialogTitle={request.title || 'Confirm action'}
          hideChainIndicator
        >
          <DialogContent sx={{ p: '24px !important' }}>
            {typeof request.message === 'string' ? <Typography>{request.message}</Typography> : request.message}
          </DialogContent>

          <DialogActions>
            <Button onClick={() => resolveAndClose(false)} {...request.cancelButtonProps}>
              {request.cancelText || 'Cancel'}
            </Button>
            <Button
              onClick={() => resolveAndClose(true)}
              variant="contained"
              disableElevation
              {...request.confirmButtonProps}
            >
              {request.confirmText || 'Confirm'}
            </Button>
          </DialogActions>
        </ModalDialog>
      )}
    </ConfirmationDialogContext.Provider>
  )
}
