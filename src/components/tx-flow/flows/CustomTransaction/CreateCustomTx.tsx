import { type ReactElement } from 'react'
import { useForm } from 'react-hook-form'
import { Button, CardActions, Divider, FormControl, InputAdornment, TextField, Typography } from '@mui/material'
import TxCard from '@/components/tx-flow/common/TxCard'
import commonCss from '@/components/tx-flow/common/styles.module.css'
import { validateAddress, validateHexData } from '@/utils/validation'
import useBalances from '@/hooks/useBalances'
import { safeFormatUnits } from '@/utils/formatters'
import { parseUnits } from 'ethers/lib/utils'
import { useCurrentChain } from '@/hooks/useChains'
import type { CustomTransactionParams } from '.'

const CreateCustomTx = ({
  params,
  onSubmit,
}: {
  params: CustomTransactionParams
  onSubmit: (data: CustomTransactionParams) => void
  txNonce?: number
}): ReactElement => {
  const chain = useCurrentChain()
  const { balances } = useBalances()
  const nativeToken = balances.find((item) => item.tokenInfo.type === 'NATIVE_TOKEN')
  const nativeSymbol = chain?.nativeCurrency.symbol || 'ETH'
  const nativeDecimals = nativeToken?.tokenInfo.decimals ?? chain?.nativeCurrency.decimals ?? 18

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CustomTransactionParams>({
    defaultValues: {
      contractAddress: params.contractAddress,
      value: params.value || '0',
      calldata: params.calldata || '0x',
    },
    mode: 'onChange',
    delayError: 500,
  })

  const validateValue = (value: string) => {
    if (!value || value === '0') return

    try {
      const valueBN = parseUnits(value, nativeDecimals)

      if (nativeToken && valueBN.gt(nativeToken.balance)) {
        return 'Insufficient balance'
      }
    } catch (_error) {
      return 'Invalid amount'
    }
  }

  return (
    <TxCard>
      <form
        onSubmit={handleSubmit((data) =>
          onSubmit({
            ...data,
            value: data.value || '0',
            calldata: data.calldata || '0x',
          }),
        )}
        className={commonCss.form}
      >
        <Typography variant="body2">
          Interact with any contract by providing the target address and calldata.
        </Typography>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <TextField
            {...register('contractAddress', {
              required: 'Contract address is required',
              validate: (value) => validateAddress(value),
            })}
            label="Contract address"
            error={!!errors.contractAddress}
            helperText={errors.contractAddress?.message}
            autoFocus
          />
        </FormControl>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <TextField
            {...register('value', { validate: validateValue })}
            label="Value"
            error={!!errors.value}
            helperText={
              errors.value?.message ||
              (nativeToken
                ? `Balance: ${safeFormatUnits(nativeToken.balance, nativeToken.tokenInfo.decimals)} ${
                    nativeToken.tokenInfo.symbol
                  }`
                : undefined)
            }
            InputProps={{
              endAdornment: <InputAdornment position="end">{nativeSymbol}</InputAdornment>,
            }}
          />
        </FormControl>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <TextField
            {...register('calldata', {
              validate: (value) => validateHexData(value),
            })}
            label="Calldata"
            error={!!errors.calldata}
            helperText={errors.calldata?.message}
            multiline
            rows={4}
          />
        </FormControl>

        <Divider className={commonCss.nestedDivider} />

        <CardActions>
          <Button variant="contained" type="submit" disabled={!isValid}>
            Next
          </Button>
        </CardActions>
      </form>
    </TxCard>
  )
}

export default CreateCustomTx
