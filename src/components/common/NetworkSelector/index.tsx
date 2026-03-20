import ChainIndicator from '@/components/common/ChainIndicator'
import { type ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'
import Link from 'next/link'
import type { SelectChangeEvent } from '@mui/material'
import { Divider, ListSubheader, MenuItem, Select, Skeleton, IconButton, Tooltip } from '@mui/material'
import partition from 'lodash/partition'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import useChains from '@/hooks/useChains'
import { useRouter } from 'next/router'
import css from './styles.module.css'
import { useChainId } from '@/hooks/useChainId'
import { type ReactElement, useMemo, useCallback } from 'react'
import { AppRoutes } from '@/config/routes'
import { useAppDispatch } from '@/store'
import { removeChain } from '@/store/customChainsSlice'
import { showNotification } from '@/store/notificationsSlice'

const keepPathRoutes = [AppRoutes.welcome.index, AppRoutes.newSafe.load, AppRoutes.newSafe.create]

const CUSTOM_CHAIN_VALUE = 'custom-chain'

const NetworkSelector = (props: { onChainSelect?: () => void }): ReactElement => {
  const { configs } = useChains()
  const chainId = useChainId()
  const router = useRouter()
  const dispatch = useAppDispatch()

  // Separate custom chains from regular ones
  const [customChains, regularChains] = useMemo(() => partition(configs, (config) => config.custom === true), [configs])

  // Then separate regular chains into testnets and mainnets
  const [testNets, prodNets] = useMemo(
    () => partition(regularChains, (config) => config.isTestnet ?? false),
    [regularChains],
  )

  const getNetworkLink = useCallback(
    (shortName: string) => {
      const shouldKeepPath = keepPathRoutes.includes(router.pathname)

      const route = {
        pathname: shouldKeepPath ? router.pathname : '/',
        query: {
          chain: shortName,
        } as {
          chain: string
          safeViewRedirectURL?: string
        },
      }

      if (router.query?.safeViewRedirectURL) {
        route.query.safeViewRedirectURL = router.query?.safeViewRedirectURL.toString()
      }

      return route
    },
    [router],
  )

  const handleDeleteChain = useCallback(
    (e: React.MouseEvent, chain: ChainInfo) => {
      e.preventDefault()
      e.stopPropagation()

      // Remove the chain from the store
      dispatch(removeChain(chain.chainId))

      // Show notification
      dispatch(
        showNotification({
          message: `${chain.chainName} network has been removed`,
          groupKey: 'delete-network-success',
          variant: 'success',
        }),
      )

      // If we're currently on this chain, redirect to mainnet or another chain
      if (chainId === chain.chainId) {
        const defaultChain = configs.find((c) => !c.custom)
        if (defaultChain) {
          router.push(getNetworkLink(defaultChain.shortName))
        }
      }
    },
    [dispatch, chainId, configs, router, getNetworkLink],
  )

  const onChange = (event: SelectChangeEvent) => {
    event.preventDefault() // Prevent the link click
    const newChainId = event.target.value
    // Handle the custom chain option
    if (newChainId === CUSTOM_CHAIN_VALUE) {
      router.push(AppRoutes.customChain)
      return
    }

    const shortName = configs.find((item) => item.chainId === newChainId)?.shortName

    if (shortName) {
      router.push(getNetworkLink(shortName))
    }
  }

  const renderMenuItem = useCallback(
    (chain: ChainInfo, isCustom = false) => {
      return (
        <MenuItem key={chain.chainId} value={chain.chainId} className={css.menuItem}>
          <Link href={getNetworkLink(chain.shortName)} onClick={props.onChainSelect} className={css.item}>
            <ChainIndicator chainId={chain.chainId} inline />
          </Link>
          {isCustom && (
            <Tooltip title="Delete network">
              <IconButton
                size="small"
                onClick={(e) => handleDeleteChain(e, chain)}
                sx={{ ml: 1, p: 0.5 }}
                aria-label="Delete network"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </MenuItem>
      )
    },
    [getNetworkLink, props.onChainSelect, handleDeleteChain],
  )

  return configs.length ? (
    <Select
      value={chainId}
      onChange={onChange}
      size="small"
      className={css.select}
      variant="standard"
      IconComponent={ExpandMoreIcon}
      MenuProps={{
        transitionDuration: 0,
        MenuListProps: { component: undefined },
        sx: {
          '& .MuiPaper-root': {
            overflow: 'auto',
          },
        },
      }}
      sx={{
        '& .MuiSelect-select': {
          py: 0,
        },
      }}
    >
      {/* Custom Networks section */}
      {customChains.length > 0 && <ListSubheader className={css.listSubHeader}>Custom Networks</ListSubheader>}
      {customChains.map((chain) => renderMenuItem(chain, true))}
      {customChains.length > 0 && <Divider sx={{ my: 1 }} />}

      {/* Production Networks */}
      {prodNets.map((chain) => renderMenuItem(chain))}

      {/* Testnets */}
      <ListSubheader className={css.listSubHeader}>Testnets</ListSubheader>
      {testNets.map((chain) => renderMenuItem(chain))}

      {/* Create Custom Chain Option */}
      <Divider sx={{ my: 1 }} />
      <MenuItem value={CUSTOM_CHAIN_VALUE} className={css.menuItem}>
        <Link href={AppRoutes.customChain} onClick={props.onChainSelect} className={css.item}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <AddCircleOutlineIcon sx={{ mr: 1, fontSize: '1rem' }} />
            <span>Create Custom Chain</span>
          </div>
        </Link>
      </MenuItem>
    </Select>
  ) : (
    <Skeleton width={94} height={31} sx={{ mx: 2 }} />
  )
}

export default NetworkSelector
