import { Button } from '@mui/material'
import { AppRoutes } from '@/config/routes'

const LoadSafe = () => {
  return (
    <Button
      href={AppRoutes.newSafe.load}
      sx={{ minHeight: '42px' }}
      variant="contained"
      size="small"
      disableElevation
      fullWidth
    >
      Load Safe
    </Button>
  )
}

export default LoadSafe
