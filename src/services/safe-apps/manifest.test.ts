import { fetchSafeAppFromManifest } from './manifest'

describe('fetchSafeAppFromManifest', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'My App',
        description: 'desc',
        icons: [{ src: '/icon.png', sizes: '128x128' }],
      }),
    } as any)
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns a deterministic app id for the same app url', async () => {
    const app1 = await fetchSafeAppFromManifest('https://example.com', '1')
    const app2 = await fetchSafeAppFromManifest('https://example.com/', '1')

    expect(app1.id).toBe(app2.id)
  })
})
