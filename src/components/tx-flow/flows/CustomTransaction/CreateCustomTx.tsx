import { useCallback } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Button, Typography, Divider, Box, TextField, InputAdornment, Tooltip, IconButton, SvgIcon } from '@mui/material'
import AddressInput from '@/components/common/AddressInput'
import TxCard from '../../common/TxCard'
import { validateAddress, validateHexData } from '@/utils/validation'
import { parseUnits } from '@ethersproject/units'
import type { CustomTransactionParams } from '.'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useCurrentChain } from '@/hooks/useChains'
import useSafeInfo from '@/hooks/useSafeInfo'
import { safeFormatUnits } from '@/utils/formatters'
import useBalances from '@/hooks/useBalances'

export type CustomTxParams = {
  contractAddress: string
  value: string
  calldata: string
  nonce?: number
}

const CreateCustomTx = ({
  params,
  onSubmit,
  txNonce,
}: {
  params: CustomTransactionParams
  onSubmit: (data: CustomTxParams) => void
  txNonce?: number
}) => {
  const chain = useCurrentChain()
  const { safe } = useSafeInfo()
  const { balances } = useBalances()
  const nativeToken = balances.find((item) => item.tokenInfo.type === 'NATIVE_TOKEN')

  const formMethods = useForm<CustomTxParams>({
    defaultValues: {
      contractAddress: params.contractAddress,
      value: params.value,
      calldata: params.calldata || '0x',
      nonce: txNonce,
    },
    mode: 'onChange',
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = formMethods

  const contractAddress = watch('contractAddress')
  const value = watch('value')
  const calldata = watch('calldata')

  const validateValue = useCallback(
    (value: string) => {
      if (!value || value === '0') return
      
      try {
        const valueBN = parseUnits(value, nativeToken?.tokenInfo.decimals || 18)
        const balance = nativeToken?.balance || '0'
        
        if (valueBN.gt(balance)) {
          return 'Insufficient balance'
        }
      } catch (e) {
        return 'Invalid amount'
      }
    },
    [nativeToken],
  )

  const onCopyCalldata = () => {
    navigator.clipboard.writeText(calldata)
  }

  const handleFormSubmit = (data: CustomTxParams) => {
    onSubmit({
      ...data,
      value: data.value || '0',
    })
  }

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <TxCard>
          <Typography variant="body2" mb={2}>
            Interact with any contract by providing the address and calldata.
          </Typography>

          <AddressInput
            name="contractAddress"
            label="Contract address"
            validate={(value) => validateAddress(value) || undefined}
            required
          />

          <Box mt={2}>
            <TextField
              {...register('value', {
                validate: validateValue,
              })}
              label="Value (ETH)"
              fullWidth
              error={!!errors.value}
              helperText={
                errors.value?.message ||
                (nativeToken && (
                  <Typography variant="body2" color="text.secondary">
                    Balance: {safeFormatUnits(nativeToken.balance, nativeToken.tokenInfo.decimals)}{' '}
                    {nativeToken.tokenInfo.symbol}
                  </Typography>
                ))
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2">{chain?.nativeCurrency.symbol || 'ETH'}</Typography>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box mt={2}>
            <TextField
              {...register('calldata', {
                required: 'Calldata is required',
                validate: (value) => validateHexData(value),
              })}
              label="Calldata"
              multiline
              rows={4}
              fullWidth
              error={!!errors.calldata}
              helperText={errors.calldata?.message}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Copy calldata">
                      <IconButton onClick={onCopyCalldata} edge="end">
                        <SvgIcon component={ContentCopyIcon} fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
                sx: { alignItems: 'flex-start' },
              }}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" mt={1}>
            Tip: You can copy the transaction data to simulate it in external tools before execution.
          </Typography>

          <Divider sx={{ mt: 3, mb: 3 }} />

          <Button variant="contained" type="submit" disabled={!isValid} fullWidth>
            Next
          </Button>
        </TxCard>
      </form>
    </FormProvider>
  )
}

export default CreateCustomTx