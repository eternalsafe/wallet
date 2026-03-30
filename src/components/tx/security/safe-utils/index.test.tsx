import { render, screen } from '@/tests/test-utils'

import SafeUtilsLink, { SAFE_UTILS_URL } from './index'

describe('SafeUtilsLink', () => {
  it('renders the OpenZeppelin Safe Utils link', () => {
    render(<SafeUtilsLink />)

    expect(screen.getByText('OpenZeppelin Safe Utils')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Review transaction' })).toHaveAttribute('href', SAFE_UTILS_URL)
  })
})
