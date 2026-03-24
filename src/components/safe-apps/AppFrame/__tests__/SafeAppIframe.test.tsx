import { render, screen } from '@/tests/test-utils'
import SafeAppIframe from '@/components/safe-apps/AppFrame/SafeAppIframe'

describe('SafeAppIframe', () => {
  it('renders a safe app iframe with sandbox permissions', () => {
    render(
      <SafeAppIframe appUrl="https://tx-builder.safe.global" allowedFeaturesList="clipboard-read" title="Tx Builder" />,
    )

    const iframe = screen.getByTitle('Tx Builder')

    expect(iframe).toHaveAttribute('src', 'https://tx-builder.safe.global')
    expect(iframe).toHaveAttribute('sandbox', expect.stringContaining('allow-scripts'))
    expect(iframe).toHaveAttribute('allow', 'clipboard-read')
  })
})
