import { useForm, FormProvider } from 'react-hook-form'
import { Paper, Grid, Typography, TextField, Button, Tooltip, IconButton, SvgIcon, Link, Box } from '@mui/material'
import InputAdornment from '@mui/material/InputAdornment'
import RotateLeftIcon from '@mui/icons-material/RotateLeft'
import { useAppDispatch, useAppSelector } from '@/store'
import { selectSettings, setIPFS, setRpc, setTenderly } from '@/store/settingsSlice'
import { CHAINLIST_URL } from '@/config/constants'
import useChainId from '@/hooks/useChainId'
import { useCurrentChain } from '@/hooks/useChains'
import InfoIcon from '@/public/images/notifications/info.svg'
import ExternalLink from '@/components/common/ExternalLink'
import ErrorMessage from '@/components/tx/ErrorMessage'
import { useEffect, useState } from 'react'

export enum EnvVariablesField {
  rpc = 'rpc',
  ipfs = 'ipfs',
  tenderlyOrgName = 'tenderlyOrgName',
  tenderlyProjectName = 'tenderlyProjectName',
  tenderlyToken = 'tenderlyToken',
}

export type EnvVariablesFormData = {
  [EnvVariablesField.rpc]: string
  [EnvVariablesField.ipfs]: string
  [EnvVariablesField.tenderlyOrgName]: string
  [EnvVariablesField.tenderlyProjectName]: string
  [EnvVariablesField.tenderlyToken]: string
}

const EnvironmentVariables = () => {
  const chainId = useChainId()
  const chain = useCurrentChain()
  const settings = useAppSelector(selectSettings)
  const dispatch = useAppDispatch()

  const formMethods = useForm<EnvVariablesFormData>({
    mode: 'onChange',
    values: {
      [EnvVariablesField.rpc]: settings.env?.rpc[chainId] ?? '',
      [EnvVariablesField.ipfs]: settings.env?.ipfs ?? '',
      [EnvVariablesField.tenderlyOrgName]: settings.env?.tenderly.orgName ?? '',
      [EnvVariablesField.tenderlyProjectName]: settings.env?.tenderly.projectName ?? '',
      [EnvVariablesField.tenderlyToken]: settings.env?.tenderly.accessToken ?? '',
    },
  })

  const { register, handleSubmit, formState, setValue, watch } = formMethods

  const rpc = watch(EnvVariablesField.rpc)
  const ipfs = watch(EnvVariablesField.ipfs)
  const tenderlyOrgName = watch(EnvVariablesField.tenderlyOrgName)
  const tenderlyProjectName = watch(EnvVariablesField.tenderlyProjectName)
  const tenderlyToken = watch(EnvVariablesField.tenderlyToken)

  const [tenderlyPartial, setTenderlyPartial] = useState<boolean>(false)

  useEffect(() => {
    if (!!tenderlyOrgName && !!tenderlyProjectName && !!tenderlyToken) {
      setTenderlyPartial(false)
    } else if (!!tenderlyOrgName || !!tenderlyProjectName || !!tenderlyToken) {
      setTenderlyPartial(true)
    } else {
      setTenderlyPartial(false)
    }
  }, [tenderlyOrgName, tenderlyProjectName, tenderlyToken])

  const onSubmit = handleSubmit((data) => {
    const rpcValue = data[EnvVariablesField.rpc].trim() === '' ? undefined : data[EnvVariablesField.rpc]

    dispatch(
      setRpc({
        chainId,
        rpc: rpcValue,
      }),
    )

    // strip ending slash if present
    if (data[EnvVariablesField.ipfs].endsWith('/')) {
      data[EnvVariablesField.ipfs] = data[EnvVariablesField.ipfs].slice(0, -1)
    }
    dispatch(setIPFS(data[EnvVariablesField.ipfs]))

    dispatch(
      setTenderly({
        orgName: data[EnvVariablesField.tenderlyOrgName],
        projectName: data[EnvVariablesField.tenderlyProjectName],
        accessToken: data[EnvVariablesField.tenderlyToken],
      }),
    )

    location.reload()
  })

  const onReset = (name: EnvVariablesField) => {
    setValue(name, '', { shouldValidate: true })
  }

  return (
    <Paper sx={{ padding: 4 }}>
      <Grid container direction="row" justifyContent="space-between" spacing={3} mb={2}>
        <Grid item lg={4} xs={12}>
          <Typography variant="h4" fontWeight={700}>
            Environment variables
          </Typography>
        </Grid>

        <Grid item xs>
          <Typography mb={3}>You can configure some of the default URLs here in case you need to.</Typography>

          <FormProvider {...formMethods}>
            <form onSubmit={onSubmit}>
              <Typography fontWeight={700} mb={2} mt={3}>
                RPC provider
                <Tooltip
                  placement="top"
                  arrow
                  title={
                    <Box alignItems="center" gap={1} padding={1}>
                      <span>
                        Any provider that implements the Ethereum JSON-RPC standard can be used. We recommend using a
                        private node for best performance.
                      </span>
                      <br />
                      <br />
                      <span>
                        Public URLs can be found on{' '}
                        <Link
                          href={`${CHAINLIST_URL}${chain ? `chain/${chain.chainId}` : ''}`}
                          color="primary"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Chainlist
                        </Link>
                        .
                      </span>
                    </Box>
                  }
                >
                  <span>
                    <SvgIcon
                      component={InfoIcon}
                      inheritViewBox
                      fontSize="small"
                      color="border"
                      sx={{ verticalAlign: 'middle', ml: 0.5 }}
                    />
                  </span>
                </Tooltip>
              </Typography>

              <TextField
                {...register(EnvVariablesField.rpc)}
                variant="outlined"
                type="url"
                InputProps={{
                  endAdornment: rpc ? null : (
                    <InputAdornment position="end">
                      <Tooltip title="Reset to default value">
                        <IconButton
                          onClick={() =>
                            setValue(
                              EnvVariablesField.rpc,
                              settings.env?.rpc[chainId] ?? chain?.publicRpcUri.value ?? '',
                              { shouldValidate: true },
                            )
                          }
                          size="small"
                          color="primary"
                        >
                          <RotateLeftIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
                fullWidth
              />

              <Typography fontWeight={700} mb={2} mt={3}>
                IPFS URL
                <Tooltip
                  placement="top"
                  arrow
                  title="By default Eternal Safe uses the Cloudflare IPFS gateway. This IPFS gateway is only used to load the Uniswap Token List."
                >
                  <span>
                    <SvgIcon
                      component={InfoIcon}
                      inheritViewBox
                      fontSize="small"
                      color="border"
                      sx={{ verticalAlign: 'middle', ml: 0.5 }}
                    />
                  </span>
                </Tooltip>
              </Typography>

              <TextField
                {...register(EnvVariablesField.ipfs)}
                variant="outlined"
                type="url"
                InputProps={{
                  endAdornment: ipfs ? (
                    <InputAdornment position="end">
                      <Tooltip title="Reset to default value">
                        <IconButton onClick={() => onReset(EnvVariablesField.ipfs)} size="small" color="primary">
                          <RotateLeftIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ) : null,
                }}
                fullWidth
              />

              <Typography fontWeight={700} mt={3}>
                Tenderly
                <Tooltip
                  placement="top"
                  arrow
                  title={
                    <>
                      You can use your own Tenderly project to keep track of all your transaction simulations.{' '}
                      <ExternalLink
                        color="secondary"
                        href="https://docs.tenderly.co/simulations-and-forks/simulation-api/configuration-of-api-access"
                      >
                        Read more
                      </ExternalLink>
                    </>
                  }
                >
                  <span>
                    <SvgIcon
                      component={InfoIcon}
                      inheritViewBox
                      fontSize="small"
                      color="border"
                      sx={{ verticalAlign: 'middle', ml: 0.5 }}
                    />
                  </span>
                </Tooltip>
                {tenderlyPartial && (
                  <ErrorMessage>Either all Tenderly fields must be filled or none at all.</ErrorMessage>
                )}
              </Typography>

              <Grid mt={2} container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    {...register(EnvVariablesField.tenderlyOrgName, { required: tenderlyPartial })}
                    variant="outlined"
                    label="Tenderly organization name"
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      endAdornment: tenderlyOrgName ? (
                        <InputAdornment position="end">
                          <Tooltip title="Reset to default value">
                            <IconButton
                              onClick={() => onReset(EnvVariablesField.tenderlyOrgName)}
                              size="small"
                              color="primary"
                            >
                              <RotateLeftIcon />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ) : null,
                    }}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    {...register(EnvVariablesField.tenderlyProjectName, { required: tenderlyPartial })}
                    variant="outlined"
                    label="Tenderly project name"
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      endAdornment: tenderlyProjectName ? (
                        <InputAdornment position="end">
                          <Tooltip title="Reset to default value">
                            <IconButton
                              onClick={() => onReset(EnvVariablesField.tenderlyProjectName)}
                              size="small"
                              color="primary"
                            >
                              <RotateLeftIcon />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ) : null,
                    }}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    {...register(EnvVariablesField.tenderlyToken, { required: tenderlyPartial })}
                    variant="outlined"
                    label="Tenderly access token"
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      endAdornment: tenderlyToken ? (
                        <InputAdornment position="end">
                          <Tooltip title="Reset to default value">
                            <IconButton
                              onClick={() => onReset(EnvVariablesField.tenderlyToken)}
                              size="small"
                              color="primary"
                            >
                              <RotateLeftIcon />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ) : null,
                    }}
                    fullWidth
                  />
                </Grid>
              </Grid>

              <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }} disabled={!formState.isValid}>
                Save
              </Button>
            </form>
          </FormProvider>
        </Grid>
      </Grid>
    </Paper>
  )
}

export default EnvironmentVariables
