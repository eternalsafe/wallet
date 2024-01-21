import type { ReactElement } from 'react'
import type { SelectChangeEvent } from '@mui/material'
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/store'
import { selectCurrency, setCurrency } from '@/store/settingsSlice'
import useCurrencies from './useCurrencies'

const CurrencySelect = (): ReactElement => {
  const currency = useAppSelector(selectCurrency)
  const dispatch = useAppDispatch()
  const fiatCurrencies = useCurrencies() || [currency.toUpperCase()]

  const handleChange = (e: SelectChangeEvent<string>) => {
    const currency = e.target.value

    dispatch(setCurrency(currency.toLowerCase()))
  }

  return (
    <FormControl size="small">
      <InputLabel id="currency-label">Currency</InputLabel>

      <Select
        labelId="currency-label"
        id="currency"
        value={currency.toUpperCase()}
        label="Currency"
        onChange={handleChange}
      >
        {fiatCurrencies.map((item) => (
          <MenuItem key={item} value={item} sx={{ overflow: 'hidden' }}>
            {item.toUpperCase()}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default CurrencySelect
