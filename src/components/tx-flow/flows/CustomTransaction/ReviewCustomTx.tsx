import { useContext, useEffect } from 'react'
import type { CustomTransactionParams } from '.'
import { encodeAbiParameters, parseAbiParameters, type Hex } from 'viem'
import SignOrExecuteForm from '@/components/tx/SignOrExecuteForm'
import { SafeTxContext } from '../../SafeTxProvider'
import { createTx } from '@/services/tx/tx-sender'
import { useCurrentChain } from '@/hooks/useChains'
import useSafeInfo from '@/hooks/useSafeInfo'
import { parseUnits } from '@ethersproject/units'
import TxCard from '../../common/TxCard'
import { Box, Typography, Divider } from '@mui/material'
import { HexEncodedData } from '@/components/transactions/HexEncodedData'
import EthHashInfo from '@/components/common/EthHashInfo'
import { safeFormatUnits } from '@/utils/formatters'

const ReviewCustomTx = ({
  params,
  txNonce,
  onSubmit,
}: {
  params: CustomTransactionParams
  txNonce?: number
  onSubmit: () => void
}) => {
  const { setSafeTx, safeTxError, setSafeTxError } = useContext(SafeTxContext)
  const chain = useCurrentChain()
  const { safe } = useSafeInfo()

  useEffect(() => {
    if (!params.contractAddress || !chain || !safe) return

    const value = params.value || '0'
    const data = params.calldata || '0x'

    createTx({
      to: params.contractAddress,
      value: parseUnits(value, chain.nativeCurrency.decimals).toString(),
      data,
      nonce: txNonce,
    })
      .then(setSafeTx)
      .catch(setSafeTxError)
  }, [params, chain, safe, txNonce, setSafeTx, setSafeTxError])

  const displayValue = params.value && params.value !== '0' 
    ? `${params.value} ${chain?.nativeCurrency.symbol || 'ETH'}`
    : undefined

  return (
    <SignOrExecuteForm onSubmit={onSubmit}>
      <TxCard>
        <Typography variant="h6" mb={2}>
          Review transaction
        </Typography>

        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Contract
          </Typography>
          <EthHashInfo address={params.contractAddress} showCopyButton hasExplorer />
        </Box>

        {displayValue && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Value
            </Typography>
            <Typography variant="body1">{displayValue}</Typography>
          </Box>
        )}

        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Calldata
          </Typography>
          <HexEncodedData hexData={params.calldata} />
        </Box>

        {safeTxError && (
          <Box mt={2}>
            <Typography color="error" variant="body2">
              {safeTxError.message}
            </Typography>
          </Box>
        )}
      </TxCard>
    </SignOrExecuteForm>
  )
}

export default ReviewCustomTx