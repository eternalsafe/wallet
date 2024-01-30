import Link from 'next/link'
import { useRouter } from 'next/router'
import { Button, type ButtonProps } from '@mui/material'

import { AppRoutes } from '@/config/routes'
import { useContext } from 'react'
import { TxModalContext } from '..'

const buttonSx = {
  height: '58px',
  '& svg path': { fill: 'currentColor' },
}

export const SendTokensButton = ({ onClick, sx }: { onClick: () => void; sx?: ButtonProps['sx'] }) => {
  return (
    <Button onClick={onClick} variant="contained" sx={sx ?? buttonSx} fullWidth>
      Send tokens
    </Button>
  )
}

export const SendNFTsButton = () => {
  const router = useRouter()
  const { setTxFlow } = useContext(TxModalContext)

  const isNftPage = router.pathname === AppRoutes.balances.nfts
  const onClick = isNftPage ? () => setTxFlow(undefined) : undefined

  return (
    <Link href={{ pathname: AppRoutes.balances.nfts, query: { safe: router.query.safe } }} passHref legacyBehavior>
      <Button variant="contained" sx={buttonSx} fullWidth onClick={onClick}>
        Send NFTs
      </Button>
    </Link>
  )
}
