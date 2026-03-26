import https from 'https'

const fetchJsonWithRedirects = (
  url: string,
  timeoutMs: number,
  redirectsLeft = 3,
): Promise<Record<string, unknown>> => {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const statusCode = response.statusCode ?? 0
      const redirectLocation = response.headers.location

      if (statusCode >= 300 && statusCode < 400 && redirectLocation) {
        if (redirectsLeft <= 0) {
          reject(new Error(`Too many redirects while fetching ${url}`))
          return
        }
        response.resume()
        const redirectedUrl = new URL(redirectLocation, url).toString()
        resolve(fetchJsonWithRedirects(redirectedUrl, timeoutMs, redirectsLeft - 1))
        return
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.resume()
        reject(new Error(`Unexpected status code ${statusCode} while fetching ${url}`))
        return
      }

      const chunks: string[] = []
      response.setEncoding('utf8')
      response.on('data', (chunk: string) => chunks.push(chunk))
      response.on('end', () => {
        try {
          resolve(JSON.parse(chunks.join('')) as Record<string, unknown>)
        } catch (error) {
          reject(error)
        }
      })
    })

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Timed out after ${timeoutMs}ms while fetching ${url}`))
    })
    request.on('error', reject)
  })
}

describe('Uniswap token list gateway', () => {
  test('fetches the token list from dweb.link', async () => {
    const body = await fetchJsonWithRedirects('https://dweb.link/ipns/tokens.uniswap.org', 10_000)
    const tokens = (body.tokens ?? []) as unknown[]

    expect(typeof body.name).toBe('string')
    expect(Array.isArray(tokens)).toBe(true)
    expect(tokens.length).toBeGreaterThan(0)
  }, 30_000)
})
