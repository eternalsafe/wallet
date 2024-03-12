import React, { Fragment, type ReactElement, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import List from '@mui/material/List'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import SvgIcon from '@mui/material/SvgIcon'
import Box from '@mui/material/Box'
import { Link as MuiLink } from '@mui/material'
import { type ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'

import AddIcon from '@/public/images/common/add.svg'
import useChains, { useCurrentChain } from '@/hooks/useChains'
import useChainId from '@/hooks/useChainId'
import { useAppSelector } from '@/store'
import { selectAllAddedSafes } from '@/store/addedSafesSlice'
import SafeListItem from '@/components/sidebar/SafeListItem'

import { AppRoutes } from '@/config/routes'
import css from './styles.module.css'
import ChainIndicator from '@/components/common/ChainIndicator'
import useSafeInfo from '@/hooks/useSafeInfo'
import LoadingIcon from '@/public/images/common/loading.svg'
import useWallet from '@/hooks/wallets/useWallet'
import useConnectWallet from '@/components/common/ConnectWallet/useConnectWallet'
import KeyholeIcon from '@/components/common/icons/KeyholeIcon'

const NO_WALLET_MESSAGE = 'Connect a wallet to view your Safe Accounts'
const NO_SAFE_MESSAGE = 'Add a Safe Account'

const SafeList = ({ closeDrawer }: { closeDrawer?: () => void }): ReactElement => {
  const router = useRouter()
  const chainId = useChainId()
  const currentChain = useCurrentChain()
  const { safeAddress, safe } = useSafeInfo()
  const { configs } = useChains()
  const addedSafes = useAppSelector(selectAllAddedSafes)
  const wallet = useWallet()
  const handleConnect = useConnectWallet()

  const hasWallet = !!wallet
  const hasNoSafes = Object.keys(addedSafes).length === 0
  const isWelcomePage = router.pathname === AppRoutes.welcome.index
  const isSingleTxPage = router.pathname === AppRoutes.transactions.tx

  /**
   * Navigate to the dashboard when selecting a safe on the welcome page,
   * navigate to the history when selecting a safe on a single tx page,
   * otherwise keep the current route
   */
  const getHref = useCallback(
    (chain: ChainInfo, address: string) => {
      return {
        pathname: isWelcomePage
          ? AppRoutes.balances.index
          : isSingleTxPage
          ? AppRoutes.transactions.history
          : router.pathname,
        query: { ...router.query, safe: `${chain.shortName}:${address}` },
      }
    },
    [isWelcomePage, isSingleTxPage, router.pathname, router.query],
  )

  return (
    <div>
      <div className={css.header}>
        <Typography variant="h4" display="inline" fontWeight={700}>
          My Safe Accounts
        </Typography>

        {!isWelcomePage && (
          <Link
            href={{ pathname: AppRoutes.welcome.index, query: { chain: currentChain?.shortName } }}
            passHref
            legacyBehavior
          >
            <Button
              disableElevation
              size="small"
              variant="outlined"
              onClick={closeDrawer}
              startIcon={<SvgIcon component={AddIcon} inheritViewBox fontSize="small" />}
            >
              Add
            </Button>
          </Link>
        )}
      </div>

      {hasNoSafes && (
        <Box display="flex" flexDirection="column" alignItems="center" py={10}>
          {hasWallet ? (
            <>
              <SvgIcon component={LoadingIcon} inheritViewBox sx={{ width: '85px', height: '80px' }} />

              <Typography variant="body2" color="primary.light" textAlign="center" mt={3}>
                {!isWelcomePage ? (
                  <Link href={{ pathname: AppRoutes.welcome.index, query: router.query }} passHref legacyBehavior>
                    <MuiLink onClick={closeDrawer}>{NO_SAFE_MESSAGE}</MuiLink>
                  </Link>
                ) : (
                  <>{NO_SAFE_MESSAGE}</>
                )}{' '}
                an existing one
              </Typography>
            </>
          ) : (
            <Box display="flex" flexDirection="column" alignItems="center" gap={3} maxWidth={250}>
              <Box display="flex" alignItems="center" justifyContent="center">
                <KeyholeIcon size={40} />
              </Box>

              <Typography variant="body2" color="primary.light" textAlign="center" sx={{ textWrap: 'balance' }}>
                {NO_WALLET_MESSAGE}
              </Typography>

              <Button onClick={handleConnect} variant="contained" size="stretched" disableElevation>
                Connect wallet
              </Button>
            </Box>
          )}
        </Box>
      )}

      {!hasNoSafes &&
        configs.map((chain) => {
          const addedSafesOnChain = addedSafes[chain.chainId] ?? {}
          const isCurrentChain = chain.chainId === chainId
          const addedSafeEntriesOnChain = Object.entries(addedSafesOnChain)

          if (!isCurrentChain && !addedSafeEntriesOnChain.length) {
            return null
          }

          return (
            <Fragment key={chain.chainName}>
              {/* Chain indicator */}
              <ChainIndicator chainId={chain.chainId} className={css.chainDivider} showLogo={false} />

              {/* No Safes yet */}
              {!addedSafeEntriesOnChain.length && (
                <Typography variant="body2" color="primary.light" p={2} textAlign="center">
                  {!isWelcomePage ? (
                    <Link href={{ pathname: AppRoutes.welcome.index, query: router.query }} passHref legacyBehavior>
                      <MuiLink onClick={closeDrawer}>{NO_SAFE_MESSAGE}</MuiLink>
                    </Link>
                  ) : (
                    <>{NO_SAFE_MESSAGE}</>
                  )}{' '}
                  an existing one on this network
                </Typography>
              )}

              {/* Added Safes */}
              <List className={css.list}>
                {addedSafeEntriesOnChain.map(([address, { threshold, owners }]) => {
                  const href = getHref(chain, address)
                  return (
                    <SafeListItem
                      key={address}
                      address={address}
                      threshold={threshold}
                      owners={owners.length}
                      chainId={chain.chainId}
                      closeDrawer={closeDrawer}
                      href={href}
                      shouldScrollToSafe
                      isAdded
                    />
                  )
                })}

                {isCurrentChain && safeAddress && !addedSafesOnChain[safeAddress] && (
                  <SafeListItem
                    address={safeAddress}
                    threshold={safe.threshold}
                    owners={safe.owners.length}
                    chainId={safe.chainId}
                    closeDrawer={closeDrawer}
                    href={{ pathname: router.pathname, query: router.query }}
                    shouldScrollToSafe
                  />
                )}
              </List>
            </Fragment>
          )
        })}
    </div>
  )
}

export default SafeList
