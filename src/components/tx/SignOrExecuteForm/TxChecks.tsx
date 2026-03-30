import { type ReactElement, useContext } from 'react'
import { TxSimulation, TxSimulationMessage } from '@/components/tx/security/tenderly'
import SafeUtilsLink from '@/components/tx/security/safe-utils'
import { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import { Box, Typography } from '@mui/material'

import css from './styles.module.css'

const TxChecks = ({ executionOwner }: { executionOwner?: string }): ReactElement => {
  const { safeTx } = useContext(SafeTxContext)

  return (
    <>
      <Typography variant="h5">Transaction checks</Typography>

      <SafeUtilsLink />
      <TxSimulation disabled={false} transactions={safeTx} executionOwner={executionOwner} />

      <Box className={css.mobileTxCheckMessages}>
        <TxSimulationMessage />
      </Box>
    </>
  )
}

export default TxChecks
