import { Box, CircularProgress, Paper } from '@mui/material'
import Grid from '@mui/material/Unstable_Grid2'
import { useSafeAppFromManifest } from '@/hooks/safe-apps/useSafeAppFromManifest'
import { SafeAppDetails } from '@/components/safe-apps/SafeAppLandingPage/SafeAppDetails'
import { AppActions } from '@/components/safe-apps/SafeAppLandingPage/AppActions'
import useWallet from '@/hooks/wallets/useWallet'
import useOnboard from '@/hooks/wallets/useOnboard'
import { Errors, logError } from '@/services/exceptions'
import type { ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'

type Props = {
  appUrl: string
  chain: ChainInfo
}

const CHAIN_ID_WITH_A_DEMO = '1'

const SafeAppLanding = ({ appUrl, chain }: Props) => {
  const { safeApp, isLoading } = useSafeAppFromManifest(appUrl, chain.chainId)
  const wallet = useWallet()
  const onboard = useOnboard()
  const showDemo = chain.chainId === CHAIN_ID_WITH_A_DEMO

  const handleConnectWallet = async () => {
    if (!onboard) return

    onboard.connectWallet().catch((e) => logError(Errors._302, e))
  }

  if (isLoading) {
    return (
      <Box py={4} textAlign="center">
        <CircularProgress size={40} />
      </Box>
    )
  }

  if (!safeApp) {
    return <div>No Safe App found</div>
  }

  return (
    <Grid container>
      <Grid sm={12} md={12} lg={8} lgOffset={2} xl={6} xlOffset={3}>
        <Paper sx={{ p: 6 }}>
          <SafeAppDetails app={safeApp} showDefaultListWarning />
          <Grid container sx={{ mt: 4 }} rowSpacing={{ xs: 2, sm: 2 }}>
            <Grid xs={12} sm={12} md={showDemo ? 6 : 12}>
              <AppActions
                appUrl={appUrl}
                wallet={wallet}
                onConnectWallet={handleConnectWallet}
                chain={chain}
                app={safeApp}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  )
}

export { SafeAppLanding }
