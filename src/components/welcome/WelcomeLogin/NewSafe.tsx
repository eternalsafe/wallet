import { Button } from '@mui/material'
import { AppRoutes } from '@/config/routes'

const LoadSafe = () => {
  return (
    <Button
      href={AppRoutes.newSafe.create}
      sx={{ minHeight: '42px' }}
      variant="contained"
      size="small"
      disableElevation
      fullWidth
    >
      Create new Safe
    </Button>
  )
}

export default LoadSafe
