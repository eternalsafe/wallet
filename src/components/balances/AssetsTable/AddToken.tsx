import type { BaseSyntheticEvent, ReactElement } from 'react'
import React, { useState } from 'react'
import Box from '@mui/material/Box'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import PlusIcon from '@/public/images/common/plus.svg'

import css from './styles.module.css'
import { Button, Collapse, DialogActions, DialogContent, SvgIcon, Typography } from '@mui/material'
import AddressInput from '@/components/common/AddressInput'
import { FormProvider, useForm } from 'react-hook-form'
import { useToken } from '@/hooks/useToken'

export type TokenEntry = {
  address: string
  name: string
  symbol: string
}

const AddToken = ({
  columns,
  defaultValues = {
    address: '',
    name: '',
    symbol: '',
  },
}: {
  columns: number
  defaultValues?: TokenEntry
}): ReactElement => {
  const [showAddToken, setShowAddToken] = useState<boolean>(false)

  const handleClickAddToken = () => {
    setShowAddToken(!showAddToken)
  }

  const methods = useForm<TokenEntry>({
    defaultValues,
    mode: 'onChange',
  })

  const { handleSubmit, formState, watch } = methods

  const submitCallback = handleSubmit((data: TokenEntry) => {})

  const onSubmit = (e: BaseSyntheticEvent) => {
    e.stopPropagation()
    // submitCallback(e)
  }

  const [data, error, loading] = useToken(watch('address'))

  console.log({ data })

  return (
    <TableRow>
      <TableCell colSpan={columns}>
        <div className={css['add-token']} onClick={handleClickAddToken}>
          <SvgIcon component={PlusIcon} inheritViewBox fontSize="small" sx={{ ml: 1 }} />

          <Typography>Add Token</Typography>
        </div>
        <Collapse in={showAddToken}>
          <FormProvider {...methods}>
            <form onSubmit={onSubmit}>
              <DialogContent>
                <Box>
                  <AddressInput name="address" label="Token Address" variant="outlined" autoFocus fullWidth required />
                </Box>
              </DialogContent>

              <Collapse in={!!data}>
                <Box>
                  <Typography>
                    {data?.name} ({data?.symbol})
                  </Typography>
                </Box>
              </Collapse>

              <DialogActions>
                <Button type="submit" variant="contained" disabled={!formState.isValid} disableElevation>
                  Add
                </Button>
              </DialogActions>
            </form>
          </FormProvider>
        </Collapse>
      </TableCell>
    </TableRow>
  )
}

export default AddToken
