import type { NextPage } from 'next'
import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { Box, Button, Checkbox, Container, FormControlLabel, Grid, TextField, Typography, Paper } from '@mui/material'

const CustomChain: NextPage = () => {
  const router = useRouter()
  const [formValues, setFormValues] = useState({
    chainId: '',
    chain: '',
    shortName: '',
    rpc: '',
    currency: '',
    symbol: '',
    logo: '',
    expAddr: '',
    expTx: '',
    l2: false,
    testnet: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormValues({
      ...formValues,
      [name]: type === 'checkbox' ? checked : value,
    })

    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Required fields
    if (!formValues.chainId) newErrors.chainId = 'Chain ID is required'
    else if (!/^\d+$/.test(formValues.chainId)) newErrors.chainId = 'Chain ID must be a number'

    if (!formValues.chain) newErrors.chain = 'Network name is required'

    if (!formValues.shortName) newErrors.shortName = 'Short name is required'
    else if (!/^[a-zA-Z0-9\-]+$/.test(formValues.shortName))
      newErrors.shortName = 'Short name can only contain letters, numbers, and hyphens'

    if (!formValues.rpc) newErrors.rpc = 'RPC URL is required'
    else if (!isValidUrl(formValues.rpc)) newErrors.rpc = 'Invalid URL format'

    if (!formValues.currency) newErrors.currency = 'Currency name is required'
    if (!formValues.symbol) newErrors.symbol = 'Currency symbol is required'

    // Optional URL validations
    if (formValues.logo && !isValidUrl(formValues.logo)) newErrors.logo = 'Invalid URL format'
    if (formValues.expAddr && !isValidUrl(formValues.expAddr)) newErrors.expAddr = 'Invalid URL format'
    if (formValues.expTx && !isValidUrl(formValues.expTx)) newErrors.expTx = 'Invalid URL format'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch (e) {
      return false
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    // Build the network URL with parameters
    const params = new URLSearchParams()
    params.append('chainId', formValues.chainId)
    params.append('chain', formValues.chain)
    params.append('shortName', formValues.shortName)
    params.append('rpc', encodeURIComponent(formValues.rpc))
    params.append('currency', formValues.currency)
    params.append('symbol', formValues.symbol)

    // Add optional parameters if they exist
    if (formValues.logo) params.append('logo', encodeURIComponent(formValues.logo))
    if (formValues.expAddr) params.append('expAddr', encodeURIComponent(formValues.expAddr))
    if (formValues.expTx) params.append('expTx', encodeURIComponent(formValues.expTx))
    if (formValues.l2) params.append('l2', 'true')
    if (formValues.testnet) params.append('testnet', 'true')

    // Let the magic network hook handle the rest by redirecting to the home page with the parameters
    const networkUrl = `/?${params.toString()}`
    router.push(networkUrl)
  }

  return (
    <>
      <Head>
        <title>Eternal Safe – Add Custom Network</title>
      </Head>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={2} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Add Custom Network
          </Typography>

          <Typography variant="body1" paragraph>
            Add a custom network to Eternal Safe by providing the required network parameters.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Required Parameters
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Chain ID"
                  name="chainId"
                  value={formValues.chainId}
                  onChange={handleChange}
                  error={!!errors.chainId}
                  helperText={errors.chainId || 'Numeric identifier for the blockchain network'}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Network Name"
                  name="chain"
                  value={formValues.chain}
                  onChange={handleChange}
                  error={!!errors.chain}
                  helperText={errors.chain || "Full name of the network (e.g. 'Ethereum Mainnet')"}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Short Name"
                  name="shortName"
                  value={formValues.shortName}
                  onChange={handleChange}
                  error={!!errors.shortName}
                  helperText={errors.shortName || "Short identifier for the network (e.g. 'mainnet')"}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="RPC URL"
                  name="rpc"
                  value={formValues.rpc}
                  onChange={handleChange}
                  error={!!errors.rpc}
                  helperText={errors.rpc || 'URL to connect to the network nodes'}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Currency Name"
                  name="currency"
                  value={formValues.currency}
                  onChange={handleChange}
                  error={!!errors.currency}
                  helperText={errors.currency || "Name of the native currency (e.g. 'Ether')"}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Currency Symbol"
                  name="symbol"
                  value={formValues.symbol}
                  onChange={handleChange}
                  error={!!errors.symbol}
                  helperText={errors.symbol || "Symbol of the native currency (e.g. 'ETH')"}
                  required
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Optional Parameters
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Currency Logo URL"
                  name="logo"
                  value={formValues.logo}
                  onChange={handleChange}
                  error={!!errors.logo}
                  helperText={errors.logo || 'URL to the currency logo image'}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Explorer URL (Addresses)"
                  name="expAddr"
                  value={formValues.expAddr}
                  onChange={handleChange}
                  error={!!errors.expAddr}
                  helperText={
                    errors.expAddr ||
                    "Block explorer URL template for addresses (e.g. 'https://etherscan.io/address/{{address}}')"
                  }
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Explorer URL (Transactions)"
                  name="expTx"
                  value={formValues.expTx}
                  onChange={handleChange}
                  error={!!errors.expTx}
                  helperText={
                    errors.expTx ||
                    "Block explorer URL template for transactions (e.g. 'https://etherscan.io/tx/{{hash}}')"
                  }
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={<Checkbox name="l2" checked={formValues.l2} onChange={handleChange} color="primary" />}
                  label="Layer 2 Network"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox name="testnet" checked={formValues.testnet} onChange={handleChange} color="primary" />
                  }
                  label="Testnet"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="button" variant="outlined" sx={{ mr: 2 }} onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" color="primary">
                Add Network
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </>
  )
}

export default CustomChain
