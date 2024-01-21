import useSafeInfo from '@/hooks/useSafeInfo'
import { useContext, useEffect } from 'react'
import { Box, Divider, Typography } from '@mui/material'

import { createUpdateThresholdTx } from '@/services/tx/tx-sender'
import SignOrExecuteForm from '@/components/tx/SignOrExecuteForm'
import { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import { ChangeThresholdFlowFieldNames } from '@/components/tx-flow/flows/ChangeThreshold'
import type { ChangeThresholdFlowProps } from '@/components/tx-flow/flows/ChangeThreshold'

import commonCss from '@/components/tx-flow/common/styles.module.css'

const ReviewChangeThreshold = ({ params }: { params: ChangeThresholdFlowProps }) => {
  const { safe } = useSafeInfo()
  const newThreshold = params[ChangeThresholdFlowFieldNames.threshold]

  const { setSafeTx, setSafeTxError } = useContext(SafeTxContext)

  useEffect(() => {
    createUpdateThresholdTx(newThreshold).then(setSafeTx).catch(setSafeTxError)
  }, [newThreshold, setSafeTx, setSafeTxError])

  return (
    <SignOrExecuteForm>
      <div>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          Any transaction will require the confirmation of:
        </Typography>

        <Typography>
          <b>{newThreshold}</b> out of <b>{safe.owners.length} owner(s)</b>
        </Typography>
      </div>
      <Box my={1}>
        <Divider className={commonCss.nestedDivider} />
      </Box>
    </SignOrExecuteForm>
  )
}

export default ReviewChangeThreshold
