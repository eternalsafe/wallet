import React from 'react'
import Typography from '@mui/material/Typography'

import PagePlaceholder from '@/components/common/PagePlaceholder'
import AddCustomAppIcon from '@/public/images/apps/add-custom-app.svg'

const SafeAppsZeroResultsPlaceholder = ({ searchQuery }: { searchQuery: string }) => {
  return (
    <PagePlaceholder
      img={<AddCustomAppIcon />}
      text={
        <Typography variant="body1" color="primary.light" m={2} maxWidth="600px">
          No custom Safe Apps found matching <strong>{searchQuery}</strong>. Add your app URL to use it in this Safe.
        </Typography>
      }
    />
  )
}

export default SafeAppsZeroResultsPlaceholder
