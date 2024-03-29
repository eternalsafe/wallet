import { useCallback, useState, type ReactElement } from 'react'
import { Box, Divider, Drawer, IconButton } from '@mui/material'
import ChevronRight from '@mui/icons-material/ChevronRight'

import ChainIndicator from '@/components/common/ChainIndicator'
import SidebarHeader from '@/components/sidebar/SidebarHeader'
import SafeList from '@/components/sidebar/SafeList'
import SidebarNavigation from '@/components/sidebar/SidebarNavigation'
import SidebarFooter from '@/components/sidebar/SidebarFooter'

import css from './styles.module.css'
import { DataWidget } from '@/components/welcome/SafeListDrawer/DataWidget'

const Sidebar = (): ReactElement => {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)

  const onDrawerToggle = useCallback(() => {
    setIsDrawerOpen((isOpen) => {
      return !isOpen
    })
  }, [])

  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  return (
    <div className={css.container}>
      <div className={css.scroll}>
        <ChainIndicator showLogo={false} />

        {/* Open the safes list */}
        <IconButton className={css.drawerButton} onClick={onDrawerToggle}>
          <ChevronRight />
        </IconButton>

        {/* Address, balance, copy button, etc */}
        <SidebarHeader />

        <Divider />

        {/* Nav menu */}
        <SidebarNavigation />

        <Box flex={1} />

        <Divider flexItem />

        {/* What's new + Need help? */}
        <SidebarFooter />
      </div>

      <Drawer variant="temporary" anchor="left" open={isDrawerOpen} onClose={onDrawerToggle}>
        <div className={css.drawer}>
          <SafeList closeDrawer={closeDrawer} />

          <div className={css.dataWidget}>
            <DataWidget />
          </div>
        </div>
      </Drawer>
    </div>
  )
}

export default Sidebar
