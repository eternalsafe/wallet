import type { TextFieldProps } from '@mui/material'
import { TextField } from '@mui/material'
import get from 'lodash/get'
import { type FieldError, type Validate, useFormContext } from 'react-hook-form'
import inputCss from '@/styles/inputs.module.css'

const NumberInput = ({
  name,
  validate,
  required = false,
  ...props
}: Omit<TextFieldProps, 'error' | 'variant' | 'ref' | 'fullWidth'> & {
  name: string
  validate?: Validate<string>
  required?: boolean
}) => {
  const { register, formState } = useFormContext() || {}
  // the name can be a path
  const fieldError = get(formState.errors, name) as FieldError | undefined

  return (
    <TextField
      {...props}
      autoComplete="off"
      variant="outlined"
      type="number"
      label={<>{fieldError?.type === 'maxLength' ? 'Maximum 5 symbols' : fieldError?.message || props.label}</>}
      error={Boolean(fieldError)}
      fullWidth
      required={required}
      className={inputCss.input}
      {...register(name, { maxLength: 5, required, valueAsNumber: true })}
    />
  )
}

export default NumberInput
