describe('Uniswap token list gateway', () => {
  test('fetches the token list from dweb.link', async () => {
    const response = await fetch('https://dweb.link/ipns/tokens.uniswap.org')
    expect(response.ok).toBe(true)

    const body = (await response.json()) as {
      name?: string
      tokens?: Array<unknown>
    }
    const tokens = body.tokens ?? []

    expect(typeof body.name).toBe('string')
    expect(Array.isArray(tokens)).toBe(true)
    expect(tokens.length).toBeGreaterThan(0)
  }, 30_000)
})
