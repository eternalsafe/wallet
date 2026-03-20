import { decodeSearchParamValue } from '@/hooks/useMagicNetwork'

describe('useMagicNetwork helpers', () => {
  it('decodes percent-encoded values', () => {
    const encoded = 'https%3A%2F%2Fetherscan.io%2Faddress%2F%7B%7Baddress%7D%7D'
    expect(decodeSearchParamValue(encoded)).toBe('https://etherscan.io/address/{{address}}')
  })

  it('returns undefined for missing values', () => {
    expect(decodeSearchParamValue(null)).toBeUndefined()
  })
})
