import { useContext, useEffect } from 'react'
import { Typography } from '@mui/material'
import { parseUnits } from 'ethers/lib/utils'
import SignOrExecuteForm, { type SubmitCallback } from '@/components/tx/SignOrExecuteForm'
import SendToBlock from '@/components/tx/SendToBlock'
import FieldsGrid from '@/components/tx/FieldsGrid'
import { HexEncodedData } from '@/components/transactions/HexEncodedData'
import { createTx } from '@/services/tx/tx-sender'
import { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import { useCurrentChain } from '@/hooks/useChains'
import type { CustomTransactionParams } from '.'

const ReviewCustomTx = ({
  params,
  txNonce,
  onSubmit,
}: {
  params: CustomTransactionParams
  txNonce?: number
  onSubmit: SubmitCallback
}) => {
  const { setSafeTx, setSafeTxError, setNonce } = useContext(SafeTxContext)
  const chain = useCurrentChain()
  const calldata = (params.calldata || '').trim() || '0x'

  useEffect(() => {
    if (txNonce !== undefined) {
      setNonce(txNonce)
    }

    if (!chain || !params.contractAddress) return

    try {
      const value = parseUnits(params.value || '0', chain.nativeCurrency.decimals).toString()

      createTx(
        {
          to: params.contractAddress,
          value,
          data: calldata,
        },
        txNonce,
      )
        .then(setSafeTx)
        .catch(setSafeTxError)
    } catch (error) {
      setSafeTxError(error as Error)
    }
  }, [calldata, chain, params, setNonce, setSafeTx, setSafeTxError, txNonce])

  const hasValue = !!params.value && parseFloat(params.value) > 0
  const displayValue = `${params.value} ${chain?.nativeCurrency.symbol || 'ETH'}`

  return (
    <SignOrExecuteForm onSubmit={onSubmit}>
      <SendToBlock address={params.contractAddress} title="Contract" />

      {hasValue && (
        <FieldsGrid title="Value">
          <Typography variant="body2">{displayValue}</Typography>
        </FieldsGrid>
      )}

      <FieldsGrid title="Calldata">
        <HexEncodedData hexData={calldata} />
      </FieldsGrid>
    </SignOrExecuteForm>
  )
}

export default ReviewCustomTx
