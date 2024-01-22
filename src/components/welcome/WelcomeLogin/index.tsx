import { Paper, Typography, Box } from '@mui/material'
import css from './styles.module.css'
import LoadSafe from './LoadSafe'

const WelcomeLogin = () => {
  return (
    <Paper className={css.loginCard} data-testid="welcome-login">
      <Box className={css.loginContent}>
        <Typography variant="h3" mt={6} fontWeight={700}>
          Eternal Safe
        </Typography>

        <Typography mb={2} textAlign="center">
          Eternal Safe does not support creating a Safe, you must have one already created.
        </Typography>
        <LoadSafe />
      </Box>
    </Paper>
  )
}

export default WelcomeLogin
