import { Button } from '@mui/material'
import { AppRoutes } from '@/config/routes'

const NewSafe = () => {
  return (
    <Button
      href={AppRoutes.newSafe.create}
      sx={{ minHeight: '42px' }}
      variant="contained"
      size="small"
      disableElevation
      fullWidth
    >
      Create Safe
    </Button>
  )
}

export default NewSafe
