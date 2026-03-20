import React, { useEffect } from 'react'
import { type SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { FormProvider, useFieldArray, useForm } from 'react-hook-form'
import { Box, Button, Divider, Skeleton } from '@mui/material'

import type { StepRenderProps } from '@/components/new-safe/CardStepper/useCardStepper'
import type { LoadSafeFormData } from '@/components/new-safe/load'
import useAsync from '@/hooks/useAsync'
import useChainId from '@/hooks/useChainId'
import type { NamedAddress } from '@/components/new-safe/create/types'
import layoutCss from '@/components/new-safe/create/styles.module.css'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { OwnerRow } from '@/components/new-safe/OwnerRow'
import { useMultiWeb3ReadOnly } from '@/hooks/wallets/web3'
import { getSafeSDKAndImplementation } from '@/hooks/coreSDK/useInitSafeCoreSDK'
import { getSafeInfo } from '@/hooks/loadables/useLoadSafeInfo'
import ErrorMessage from '@/components/tx/ErrorMessage'

enum Field {
  owners = 'owners',
  threshold = 'threshold',
}

type FormData = {
  [Field.owners]: NamedAddress[]
  [Field.threshold]: number
}

const SafeOwnerStep = ({ data, onSubmit, onBack }: StepRenderProps<LoadSafeFormData>) => {
  const chainId = useChainId()
  const formMethods = useForm<FormData>({
    defaultValues: {
      owners: data.owners || [],
      threshold: data.threshold || 0,
    },
    mode: 'onChange',
  })
  const {
    handleSubmit,
    setValue,
    control,
    formState: { isValid },
    getValues,
  } = formMethods

  const { fields } = useFieldArray({
    control,
    name: Field.owners,
  })

  const web3ReadOnly = useMultiWeb3ReadOnly()

  const [safeInfo, error, loading] = useAsync<SafeInfo | undefined>(async () => {
    if (!web3ReadOnly) {
      throw new Error('Web3 not available, please check your RPC URL.')
    }

    if (data.address) {
      let [sdk, implementation] = await getSafeSDKAndImplementation(
        web3ReadOnly,
        data.address,
        chainId,
        data.multisendAddress,
        data.multisendCallOnlyAddress,
      )
      if (!sdk) {
        throw new Error('Unable to initialize Safe SDK')
      }
      return await getSafeInfo(sdk, implementation)
    }
  }, [data.address, data.multisendAddress, data.multisendCallOnlyAddress, web3ReadOnly, chainId])

  useEffect(() => {
    if (!safeInfo) return

    setValue(Field.threshold, safeInfo.threshold)

    const owners = safeInfo.owners.map((owner, i) => ({
      address: owner.value,
      name: getValues(`owners.${i}.name`) || '',
    }))

    setValue(Field.owners, owners)
  }, [getValues, safeInfo, setValue])

  const handleBack = () => {
    onBack(getValues())
  }

  return (
    <>
      <FormProvider {...formMethods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box className={layoutCss.row}>
            {loading ? (
              <>
                <Skeleton variant="text" height={80} />
                <Skeleton variant="text" height={80} />
              </>
            ) : error ? (
              <>
                <ErrorMessage error={error}>
                  Error loading Safe owners, please try again or change your RPC URL.
                </ErrorMessage>
              </>
            ) : (
              fields.map((field, index) => <OwnerRow key={field.id} index={index} groupName="owners" readOnly />)
            )}
          </Box>
          <Divider />
          <Box className={layoutCss.row}>
            <Box display="flex" flexDirection="row" justifyContent="space-between" gap={3}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleBack}
                startIcon={<ArrowBackIcon fontSize="small" />}
              >
                Back
              </Button>
              <Button type="submit" variant="contained" size="stretched" disabled={!isValid}>
                Next
              </Button>
            </Box>
          </Box>
        </form>
      </FormProvider>
    </>
  )
}

export default SafeOwnerStep
