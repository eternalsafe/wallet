import { type ReactElement, useMemo, useContext } from 'react'
import { Button, Tooltip, Typography, IconButton, Box, Checkbox, Skeleton } from '@mui/material'
import type { TokenInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { TokenType } from '@safe-global/safe-gateway-typescript-sdk'
import css from './styles.module.css'
import TokenAmount from '@/components/common/TokenAmount'
import TokenIcon from '@/components/common/TokenIcon'
import EnhancedTable, { type EnhancedTableProps } from '@/components/common/EnhancedTable'
import TokenExplorerLink from '@/components/common/TokenExplorerLink'
import { VisibilityOutlined } from '@mui/icons-material'
import TokenMenu from '../TokenMenu'
import useBalances from '@/hooks/useBalances'
import useHiddenTokens from '@/hooks/useHiddenTokens'
import { useHideAssets } from './useHideAssets'
import CheckWallet from '@/components/common/CheckWallet'
import useSpendingLimit from '@/hooks/useSpendingLimit'
import { TxModalContext } from '@/components/tx-flow'
import { TokenTransferFlow } from '@/components/tx-flow/flows'
import AddToken from '@/components/balances/AssetsTable/AddToken'

const skeletonCells: EnhancedTableProps['rows'][0]['cells'] = {
  asset: {
    rawValue: '0x0',
    content: (
      <div className={css.token}>
        <Skeleton variant="rounded" width="26px" height="26px" />
        <Typography>
          <Skeleton width="80px" />
        </Typography>
      </div>
    ),
  },
  balance: {
    rawValue: '0',
    content: (
      <Typography>
        <Skeleton width="32px" />
      </Typography>
    ),
  },
  value: {
    rawValue: '0',
    content: (
      <Typography>
        <Skeleton width="32px" />
      </Typography>
    ),
  },
  actions: {
    rawValue: '',
    sticky: true,
    content: <div></div>,
  },
}

const skeletonRows: EnhancedTableProps['rows'] = Array(3).fill({ cells: skeletonCells })

const isNativeToken = (tokenInfo: TokenInfo) => {
  return tokenInfo.type === TokenType.NATIVE_TOKEN
}

const headCells = [
  {
    id: 'asset',
    label: 'Asset',
    width: '60%',
  },
  {
    id: 'balance',
    label: 'Balance',
    width: '30%',
  },
  {
    id: 'actions',
    label: '',
    width: '30%',
    sticky: true,
  },
]

const SendButton = ({
  tokenInfo,
  onClick,
}: {
  tokenInfo: TokenInfo
  onClick: (tokenAddress: string) => void
}): ReactElement => {
  const spendingLimit = useSpendingLimit(tokenInfo)

  return (
    <CheckWallet allowSpendingLimit={!!spendingLimit}>
      {(isOk) => (
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={() => onClick(tokenInfo.address)}
          disabled={!isOk}
        >
          Send
        </Button>
      )}
    </CheckWallet>
  )
}

const AssetsTable = ({
  showHiddenAssets,
  setShowHiddenAssets,
}: {
  showHiddenAssets: boolean
  setShowHiddenAssets: (hidden: boolean) => void
}): ReactElement => {
  const hiddenAssets = useHiddenTokens()
  const { balances, loading } = useBalances()
  const { setTxFlow } = useContext(TxModalContext)

  const { isAssetSelected, toggleAsset, hidingAsset, hideAsset, cancel, deselectAll, saveChanges } = useHideAssets(() =>
    setShowHiddenAssets(false),
  )

  const visibleAssets = useMemo(
    () =>
      showHiddenAssets
        ? balances.items
        : balances.items?.filter((item) => !hiddenAssets.includes(item.tokenInfo.address)),
    [hiddenAssets, balances.items, showHiddenAssets],
  )

  const selectedAssetCount = visibleAssets?.filter((item) => isAssetSelected(item.tokenInfo.address)).length || 0

  const onSendClick = (tokenAddress: string) => {
    setTxFlow(<TokenTransferFlow tokenAddress={tokenAddress} />)
  }

  const rows = loading
    ? skeletonRows
    : (visibleAssets || []).map((item) => {
        const isNative = isNativeToken(item.tokenInfo)
        const isSelected = isAssetSelected(item.tokenInfo.address)

        return {
          key: item.tokenInfo.address,
          selected: isSelected,
          collapsed: item.tokenInfo.address === hidingAsset,
          cells: {
            asset: {
              rawValue: item.tokenInfo.name,
              collapsed: item.tokenInfo.address === hidingAsset,
              content: (
                <div className={css.token}>
                  <TokenIcon logoUri={item.tokenInfo.logoUri} tokenSymbol={item.tokenInfo.symbol} />

                  <Typography>{item.tokenInfo.name}</Typography>

                  {!isNative && <TokenExplorerLink address={item.tokenInfo.address} />}
                </div>
              ),
            },
            balance: {
              rawValue: Number(item.balance) / 10 ** item.tokenInfo.decimals,
              collapsed: item.tokenInfo.address === hidingAsset,
              content: (
                <TokenAmount
                  value={item.balance}
                  decimals={item.tokenInfo.decimals}
                  tokenSymbol={item.tokenInfo.symbol}
                />
              ),
            },
            actions: {
              rawValue: '',
              sticky: true,
              collapsed: item.tokenInfo.address === hidingAsset,
              content: (
                <Box display="flex" flexDirection="row" gap={1} alignItems="center">
                  <>
                    <SendButton tokenInfo={item.tokenInfo} onClick={() => onSendClick(item.tokenInfo.address)} />

                    {/* TODO(devanon): Only show this for assets the user has added */}
                    {showHiddenAssets ? (
                      <Checkbox size="small" checked={isSelected} onClick={() => toggleAsset(item.tokenInfo.address)} />
                    ) : (
                      <Tooltip title="Hide asset" arrow disableInteractive>
                        <IconButton
                          disabled={hidingAsset !== undefined}
                          size="medium"
                          onClick={() => hideAsset(item.tokenInfo.address)}
                        >
                          <VisibilityOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </>
                </Box>
              ),
            },
          },
        }
      })

  return (
    <>
      <TokenMenu
        saveChanges={saveChanges}
        cancel={cancel}
        deselectAll={deselectAll}
        selectedAssetCount={selectedAssetCount}
        showHiddenAssets={showHiddenAssets}
      />

      <div className={css.container}>
        <EnhancedTable rows={rows} headCells={headCells}>
          <AddToken columns={headCells.length} />
        </EnhancedTable>
      </div>
    </>
  )
}

export default AssetsTable
