import type { StepRenderProps } from '@/components/new-safe/CardStepper/useCardStepper'
import type { LoadSafeFormData } from '@/components/new-safe/load'
import { FormProvider, useForm } from 'react-hook-form'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  InputAdornment,
  SvgIcon,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import layoutCss from '@/components/new-safe/create/styles.module.css'
import NameInput from '@/components/common/NameInput'
import InfoIcon from '@/public/images/notifications/info.svg'
import css from '@/components/new-safe/create/steps/SetNameStep/styles.module.css'
import NetworkSelector from '@/components/common/NetworkSelector'
import { useMnemonicSafeName } from '@/hooks/useMnemonicName'
import { useAddressResolver } from '@/hooks/useAddressResolver'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddressInput from '@/components/common/AddressInput'
import React from 'react'
import useChainId from '@/hooks/useChainId'
import { useAppSelector } from '@/store'
import { selectAddedSafes } from '@/store/addedSafesSlice'
import { AppRoutes } from '@/config/routes'
import MUILink from '@mui/material/Link'
import Link from 'next/link'
import { getSafeSDKAndImplementation } from '@/hooks/coreSDK/useInitSafeCoreSDK'
import { useWeb3ReadOnly } from '@/hooks/wallets/web3'
import { ethers } from 'ethers'

enum Field {
  name = 'name',
  address = 'address',
  multisendAddress = 'multisendAddress',
  multisendCallOnlyAddress = 'multisendCallOnlyAddress',
}

type FormData = {
  [Field.name]: string
  [Field.address]: string
  [Field.multisendAddress]?: string
  [Field.multisendCallOnlyAddress]?: string
}

const SetAddressStep = ({ data, onSubmit, onBack }: StepRenderProps<LoadSafeFormData>) => {
  const currentChainId = useChainId()
  const addedSafes = useAppSelector((state) => selectAddedSafes(state, currentChainId))
  const formMethods = useForm<FormData>({
    mode: 'all',
    defaultValues: {
      [Field.name]: data.name,
      [Field.address]: data.address,
      [Field.multisendAddress]: data.multisendAddress || '',
      [Field.multisendCallOnlyAddress]: data.multisendCallOnlyAddress || '',
    },
  })

  const {
    handleSubmit,
    formState: { errors, isValid },
    watch,
    getValues,
    register,
  } = formMethods

  const safeAddress = watch(Field.address)
  const multisendAddress = watch(Field.multisendAddress)
  const multisendCallOnlyAddress = watch(Field.multisendCallOnlyAddress)

  const randomName = useMnemonicSafeName()
  const { ens, name, resolving } = useAddressResolver(safeAddress)

  const web3ReadOnly = useWeb3ReadOnly()

  // Address book, ENS, mnemonic
  const fallbackName = name || ens || randomName

  const validateSafeAddress = async (address: string) => {
    if (addedSafes && Object.keys(addedSafes).includes(address)) {
      return 'Safe Account is already added'
    }

    if (!web3ReadOnly) {
      return 'Web3 not available, please check your RPC URL.'
    }

    try {
      await getSafeSDKAndImplementation(
        web3ReadOnly,
        address,
        currentChainId,
        multisendAddress,
        multisendCallOnlyAddress,
      )
    } catch (error: any) {
      return 'Address given is not a valid Safe Account address on the current network.'
    }
  }

  const validateEthereumAddress = (address?: string) => {
    if (!address) {
      return true
    }

    return ethers.utils.isAddress(address) || 'Invalid Ethereum address'
  }

  const onFormSubmit = handleSubmit((data: FormData) => {
    onSubmit({
      ...data,
      [Field.name]: data[Field.name] || fallbackName,
    })
  })

  const handleBack = () => {
    const formData = getValues()
    onBack({
      ...formData,
      [Field.name]: formData.name || fallbackName,
    })
  }

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={onFormSubmit}>
        <Box className={layoutCss.row}>
          <Grid container spacing={[3, 1]} mb={3} pr="40px">
            <Grid item xs={12} md>
              <NameInput
                name={Field.name}
                label={errors?.[Field.name]?.message || 'Name'}
                placeholder={fallbackName}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: resolving ? (
                    <InputAdornment position="end">
                      <CircularProgress size={20} />
                    </InputAdornment>
                  ) : (
                    <Tooltip
                      title="This name is stored locally and will never be shared with us or any third parties."
                      arrow
                      placement="top"
                    >
                      <InputAdornment position="end">
                        <SvgIcon component={InfoIcon} inheritViewBox />
                      </InputAdornment>
                    </Tooltip>
                  ),
                }}
              />
            </Grid>
            <Grid item order={[-1, 1]}>
              <Box className={css.select}>
                <NetworkSelector />
              </Box>
            </Grid>
          </Grid>

          <AddressInput label="Safe Account" validate={validateSafeAddress} name={Field.address} />

          <Accordion sx={{ mt: 3 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="advanced-options-content">
              <Typography>Advanced options</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Only needed when your chain uses custom MultiSend contracts.
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    label="MultiSend Contract Address"
                    fullWidth
                    {...register(Field.multisendAddress, { validate: validateEthereumAddress })}
                    error={!!errors[Field.multisendAddress]}
                    helperText={
                      errors[Field.multisendAddress]?.message || 'Optional: custom MultiSend contract address'
                    }
                    placeholder="0x..."
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="MultiSendCallOnly Contract Address"
                    fullWidth
                    {...register(Field.multisendCallOnlyAddress, { validate: validateEthereumAddress })}
                    error={!!errors[Field.multisendCallOnlyAddress]}
                    helperText={
                      errors[Field.multisendCallOnlyAddress]?.message ||
                      'Optional: custom MultiSendCallOnly contract address'
                    }
                    placeholder="0x..."
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Typography mt={4}>
            By continuing, you agree to have read and understood the{' '}
            <Link href={AppRoutes.imprint} passHref legacyBehavior>
              <MUILink>legal imprint</MUILink>
            </Link>
            .
          </Typography>
        </Box>

        <Divider />

        <Box className={layoutCss.row}>
          <Box display="flex" flexDirection="row" justifyContent="space-between" gap={3}>
            <Button variant="outlined" size="small" onClick={handleBack} startIcon={<ArrowBackIcon fontSize="small" />}>
              Back
            </Button>
            <Button
              data-testid="load-safe-next-btn"
              type="submit"
              variant="contained"
              size="stretched"
              disabled={!isValid}
            >
              Next
            </Button>
          </Box>
        </Box>
      </form>
    </FormProvider>
  )
}

export default SetAddressStep
