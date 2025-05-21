import { Paper, Typography, Box, Link } from '@mui/material'
import css from './styles.module.css'
import LoadSafe from './LoadSafe'
import { useCurrentChain } from '@/hooks/useChains'
import { useAppSelector } from '@/store'
import { selectRpc } from '@/store/settingsSlice'
import LoadRPCUrl from '@/components/welcome/WelcomeLogin/LoadRPCUrl'
import { CHAINLIST_URL } from '@/config/constants'
import { useEffect, useState } from 'react'
import { useWeb3 } from '@/hooks/wallets/web3'
import NewSafe from './NewSafe'

const WelcomeLogin = () => {
  const web3 = useWeb3()
  const chain = useCurrentChain()
  const customRpc = useAppSelector(selectRpc)
  const customRpcUrl = chain ? customRpc?.[chain.chainId] : undefined

  const [forceShowRpcInput, setForceShowRpcInput] = useState(false)

  const toggleShowRpcInput = () => {
    setForceShowRpcInput(!forceShowRpcInput)
  }

  useEffect(() => {
    setForceShowRpcInput(false)
  }, [chain])

  return (
    <Paper className={css.loginCard} data-testid="welcome-login">
      <Box className={css.loginContent}>
        <Typography variant="h3" mt="auto" pt={5} fontWeight={700}>
          Eternal Safe
        </Typography>
        {/* TODO(eternalsafe): Gracefully handle the web3 variable loading in after sometime */}
        {(web3 || customRpcUrl) && !forceShowRpcInput ? (
          <>
            <Typography mb={2} textAlign="center">
              Create a new Safe or load an existing one.
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <LoadSafe />
              <NewSafe />
            </Box>
            {/* TODO(eternalsafe): Allow import of data here */}
          </>
        ) : chain ? (
          <>
            <Typography textAlign="center">
              To get started you must connect a wallet on {chain.chainName} or provide a RPC URL for the{' '}
              {chain.chainName} network.
              <br />
              <br />
              For best performance we recommend using a private RPC URL. Public URLs can be found on{' '}
              <Link href={`${CHAINLIST_URL}chain/${chain.chainId}`} color="primary" target="_blank" rel="noreferrer">
                Chainlist
              </Link>{' '}
              however they may be rate limited or have other restrictions.
              <br />
              <br />
              You can change this later in the settings.
            </Typography>
            <LoadRPCUrl hideRpcInput={() => setForceShowRpcInput(false)} />
          </>
        ) : (
          <Typography mb={2} textAlign="center">
            Please select a network from the dropdown above to get started.
          </Typography>
        )}

        <Typography variant="subtitle2" textAlign="center" mt="auto" pt={3}>
          <Link type="button" component="button" onClick={toggleShowRpcInput} color="primary">
            {forceShowRpcInput ? 'Close' : 'Open'} RPC URL input
          </Link>
        </Typography>
      </Box>
    </Paper>
  )
}

export default WelcomeLogin
