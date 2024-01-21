import type { ReactElement, MouseEvent } from 'react'
import { IconButton, Link, SvgIcon } from '@mui/material'
import ShareIcon from '@/public/images/common/share.svg'
import { AppRoutes } from '@/config/routes'
import { useRouter } from 'next/router'
import React, { useState } from 'react'

const TxShareLink = ({ id }: { id: string }): ReactElement => {
  const [isCopyEnabled, setIsCopyEnabled] = useState(true)

  const router = useRouter()
  const { safe = '' } = router.query
  const href = `${AppRoutes.transactions.tx}?safe=${safe}&id=${id}`

  const onClick = (e: MouseEvent) => {
    if (!e.ctrlKey && !e.metaKey) {
      e.preventDefault()
    }

    try {
      // copy href to clipboard
      navigator.clipboard.writeText(location.origin + href)
    } catch (error) {
      console.error(error)
      setIsCopyEnabled(false)
    }
  }

  return (
    <IconButton
      data-testid="share-btn"
      component={Link}
      aria-label="Share"
      href={href}
      onClick={onClick}
      disabled={!isCopyEnabled}
    >
      <SvgIcon component={ShareIcon} inheritViewBox fontSize="small" color="border" />
    </IconButton>
  )
}

export default TxShareLink
