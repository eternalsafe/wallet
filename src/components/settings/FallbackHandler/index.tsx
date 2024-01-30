import { Typography, Box, Grid, Paper, Alert } from '@mui/material'
import semverSatisfies from 'semver/functions/satisfies'
import { useMemo } from 'react'
import type { ReactElement } from 'react'

import EthHashInfo from '@/components/common/EthHashInfo'
import useSafeInfo from '@/hooks/useSafeInfo'
import { getFallbackHandlerContractDeployment } from '@/services/contracts/deployments'
import { HelpCenterArticle } from '@/config/constants'
import ExternalLink from '@/components/common/ExternalLink'

const FALLBACK_HANDLER_VERSION = '>=1.1.1'

export const FallbackHandler = (): ReactElement | null => {
  const { safe } = useSafeInfo()

  const supportsFallbackHandler = !!safe.version && semverSatisfies(safe.version, FALLBACK_HANDLER_VERSION)

  const fallbackHandlerDeployment = useMemo(() => {
    return getFallbackHandlerContractDeployment(safe.chainId, safe.version)
  }, [safe.version, safe.chainId])

  if (!supportsFallbackHandler) {
    return null
  }

  const hasFallbackHandler = !!safe.fallbackHandler
  const isOfficial =
    hasFallbackHandler && safe.fallbackHandler?.value === fallbackHandlerDeployment?.networkAddresses[safe.chainId]

  const warning = !hasFallbackHandler ? (
    <>The {'Safe{Wallet}'} may not work correctly as no fallback handler is currently set.</>
  ) : !isOfficial ? (
    <>
      An <b>unofficial</b> fallback handler is currently set.
    </>
  ) : undefined

  return (
    <Paper sx={{ padding: 4 }}>
      <Grid container direction="row" justifyContent="space-between" spacing={3}>
        <Grid item lg={4} xs={12}>
          <Typography variant="h4" fontWeight={700}>
            Fallback handler
          </Typography>
        </Grid>

        <Grid item xs>
          <Box>
            <Typography>
              The fallback handler adds fallback logic for funtionality that may not be present in the Safe Account
              contract. Learn more about the fallback handler{' '}
              <ExternalLink href={HelpCenterArticle.FALLBACK_HANDLER}>here</ExternalLink>
            </Typography>

            <Alert severity={!hasFallbackHandler ? 'warning' : isOfficial ? 'success' : 'info'} sx={{ mt: 2 }}>
              {warning && <Typography mb={hasFallbackHandler ? 2 : 0}>{warning}</Typography>}

              {safe.fallbackHandler && (
                <EthHashInfo
                  shortAddress={false}
                  name={safe.fallbackHandler.name || fallbackHandlerDeployment?.contractName}
                  address={safe.fallbackHandler.value}
                  customAvatar={safe.fallbackHandler.logoUri}
                  showCopyButton
                  hasExplorer
                />
              )}
            </Alert>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  )
}
