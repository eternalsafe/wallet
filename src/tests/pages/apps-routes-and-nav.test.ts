import { AppRoutes } from '@/config/routes'
import { navItems } from '@/components/sidebar/SidebarNavigation/config'

describe('Safe Apps routing and navigation', () => {
  it('exposes routes for safe apps listing and opening', () => {
    expect(AppRoutes.apps.index).toBe('/apps')
    expect(AppRoutes.apps.open).toBe('/apps/open')
  })

  it('includes an Apps sidebar entry', () => {
    expect(navItems.some((item) => item.label === 'Apps' && item.href === AppRoutes.apps.index)).toBe(true)
  })
})
