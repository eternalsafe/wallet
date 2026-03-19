import { useState, useEffect } from 'react'
import {
  Button,
  TextField,
  IconButton,
  Typography,
  Box,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip,
  Popover,
  Paper,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useAppDispatch, useAppSelector } from '@/store'
import { selectWalletConnectApiKey, setWalletConnectPairingCode, setWalletConnectApiKey } from '@/store/settingsSlice'
import { useWalletConnectContext } from '@/components/common/WalletConnectProvider'
import useSafeInfo from '@/hooks/useSafeInfo'
import { buildApprovedNamespaces } from './utils'

type WalletConnectPairingModalProps = {
  open: boolean
  onClose: () => void
  anchorEl: HTMLElement | null
}

const WalletConnectPairingModal = ({ open, onClose, anchorEl }: WalletConnectPairingModalProps) => {
  const [pairingCode, setPairingCode] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const dispatch = useAppDispatch()
  const { safeAddress } = useSafeInfo()
  const walletConnectApiKey = useAppSelector(selectWalletConnectApiKey)
  const envApiKey = (typeof process !== 'undefined' && process.env.WC_PROJECT_ID) || ''
  const isApiKeySet = !!walletConnectApiKey

  const { sessions, pendingProposal, pair, approveSession, rejectSession, disconnectSession, error } =
    useWalletConnectContext()

  useEffect(() => {
    if (open) {
      setPairingCode('') // Reset pairing code when modal opens
    }
  }, [open])

  useEffect(() => {
    if (pendingProposal && activeTab !== 1) {
      setActiveTab(1)
    }
  }, [pendingProposal, activeTab])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const handleSubmit = async () => {
    if (pairingCode.trim() !== '') {
      try {
        dispatch(setWalletConnectPairingCode(pairingCode.trim()))

        await pair(pairingCode.trim())

        setPairingCode('')
      } catch (e) {
        console.error('Failed to pair:', e)
      }
    }
  }

  const handleApproveSession = async () => {
    if (!pendingProposal) return
    try {
      const namespaces = buildApprovedNamespaces(pendingProposal.params.requiredNamespaces, safeAddress)
      await approveSession(namespaces)
    } catch (e) {
      console.error('Failed to approve session:', e)
    }
  }

  const handleRejectSession = async () => {
    try {
      await rejectSession()
    } catch (e) {
      console.error('Failed to reject session:', e)
    }
  }

  const handleDisconnectSession = async (topic: string) => {
    try {
      await disconnectSession(topic)
    } catch (e) {
      console.error('Failed to disconnect session:', e)
    }
  }

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault()
    if (apiKeyInput.trim() !== '') {
      dispatch(setWalletConnectApiKey(apiKeyInput.trim()))
    }
  }

  const id = open ? 'walletconnect-popover' : undefined

  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      sx={{ mt: 1 }}
      transitionDuration={0}
    >
      <Paper sx={{ width: '500px', maxWidth: '100%', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">WalletConnect</Typography>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {!isApiKeySet ? (
          <>
            <Box sx={{ mb: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                You need to set a WalletConnect API key before you can use this feature.
                {envApiKey && (
                  <Box sx={{ mt: 1 }}>
                    An API key is available from your environment variables. You can use it or enter a custom one.
                  </Box>
                )}
              </Alert>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Please enter your WalletConnect API key below:
              </Typography>
              <form onSubmit={handleSaveApiKey}>
                <TextField
                  autoFocus
                  margin="dense"
                  id="api-key"
                  label="WalletConnect API Key"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button onClick={onClose} sx={{ mr: 1 }}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" color="primary" disabled={!apiKeyInput.trim()}>
                    Save API Key
                  </Button>
                </Box>
              </form>
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="WalletConnect tabs">
                <Tab label="Connect" />
                <Tab
                  label={
                    <>
                      Proposals
                      {pendingProposal && (
                        <Chip size="small" color="error" label="1" sx={{ ml: 1, height: 16, fontSize: '0.75rem' }} />
                      )}
                    </>
                  }
                />
                <Tab
                  label={
                    <>
                      Sessions
                      {sessions.length > 0 && (
                        <Chip
                          size="small"
                          color="primary"
                          label={sessions.length}
                          sx={{ ml: 1, height: 16, fontSize: '0.75rem' }}
                        />
                      )}
                    </>
                  }
                />
              </Tabs>
            </Box>

            <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
              {/* Connect Tab */}
              {activeTab === 0 && (
                <>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    Enter your WalletConnect pairing code to connect to a dApp.
                  </Typography>
                  <TextField
                    autoFocus
                    margin="dense"
                    id="pairing-code"
                    label="Pairing Code"
                    placeholder="wc:..."
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value)}
                  />
                  {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {error.message}
                    </Alert>
                  )}
                </>
              )}

              {/* Proposals Tab */}
              {activeTab === 1 && (
                <>
                  {pendingProposal ? (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Connection Request
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        <strong>{pendingProposal.params.proposer.metadata.name}</strong> wants to connect to your
                        wallet.
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {pendingProposal.params.proposer.metadata.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        URL: {pendingProposal.params.proposer.metadata.url}
                      </Typography>

                      <Typography variant="subtitle1" sx={{ mt: 2 }}>
                        Requested Permissions:
                      </Typography>

                      {Object.entries(pendingProposal.params.requiredNamespaces).map(([namespace, details]) => (
                        <Box key={namespace} sx={{ mt: 1 }}>
                          <Typography variant="subtitle2">{namespace}:</Typography>
                          <Box sx={{ pl: 2 }}>
                            {details.chains && (
                              <Typography variant="body2">Chains: {details.chains.join(', ')}</Typography>
                            )}
                            <Typography variant="body2">Methods: {details.methods.join(', ')}</Typography>
                            <Typography variant="body2">Events: {details.events.join(', ')}</Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body1">No pending connection proposals.</Typography>
                  )}
                </>
              )}

              {/* Sessions Tab */}
              {activeTab === 2 && (
                <>
                  {sessions.length > 0 ? (
                    <List>
                      {sessions.map((session, index) => (
                        <Box key={session.topic}>
                          <ListItem>
                            <ListItemText
                              primary={session.peer.metadata.name}
                              secondary={
                                <>
                                  <Typography variant="body2" component="span">
                                    {session.peer.metadata.url}
                                  </Typography>
                                  <br />
                                  <Typography variant="caption" component="span">
                                    Connected: {new Date(session.expiry * 1000).toLocaleString()}
                                  </Typography>
                                </>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => handleDisconnectSession(session.topic)}
                              >
                                Disconnect
                              </Button>
                            </ListItemSecondaryAction>
                          </ListItem>
                          {index < sessions.length - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body1">No active sessions.</Typography>
                  )}
                </>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button onClick={onClose} sx={{ mr: 1 }}>
                Cancel
              </Button>

              {/* Connect Tab */}
              {activeTab === 0 && (
                <Button onClick={handleSubmit} variant="contained" color="primary" disabled={!pairingCode.trim()}>
                  Connect
                </Button>
              )}

              {/* Proposals Tab */}
              {activeTab === 1 && pendingProposal && (
                <>
                  <Button onClick={handleRejectSession} variant="outlined" color="error" sx={{ mr: 1 }}>
                    Reject
                  </Button>
                  <Button onClick={handleApproveSession} variant="contained" color="primary">
                    Approve
                  </Button>
                </>
              )}
            </Box>
          </>
        )}
      </Paper>
    </Popover>
  )
}

export default WalletConnectPairingModal
