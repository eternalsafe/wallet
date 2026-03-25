import { renderHook, waitFor } from '@/tests/test-utils'
import { useRemoteSafeApps } from './useRemoteSafeApps'
import { getSafeApps } from '@safe-global/safe-gateway-typescript-sdk'

jest.mock('@/hooks/useChainId', () => jest.fn(() => '1'))

jest.mock('@safe-global/safe-gateway-typescript-sdk', () => ({
  ...jest.requireActual('@safe-global/safe-gateway-typescript-sdk'),
  getSafeApps: jest.fn(),
}))

const mockGetSafeApps = getSafeApps as jest.Mock

describe('useRemoteSafeApps', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('loads remote safe apps from the gateway API', async () => {
    const remoteApps = [{ id: 2, name: 'Remote app', tags: [] }] as any
    mockGetSafeApps.mockResolvedValue(remoteApps)

    const { result } = renderHook(() => useRemoteSafeApps())

    await waitFor(() => {
      expect(result.current[2]).toBe(false)
    })

    expect(mockGetSafeApps).toHaveBeenCalled()
    expect(result.current[0]).toEqual(remoteApps)
  })
})
