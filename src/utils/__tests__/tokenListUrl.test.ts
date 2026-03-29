import { resolveTokenListUrl } from '../tokenListUrl'

describe('resolveTokenListUrl', () => {
  test('resolves ipns:// URLs via IPFS gateway', () => {
    expect(resolveTokenListUrl('ipns://tokens.uniswap.org', 'https://my.gateway.example')).toBe(
      'https://my.gateway.example/ipns/tokens.uniswap.org',
    )
  })

  test('resolves ipfs:// URLs via IPFS gateway', () => {
    expect(resolveTokenListUrl('ipfs://bafybeigdyrzt4', 'https://dweb.link')).toBe(
      'https://dweb.link/ipfs/bafybeigdyrzt4',
    )
  })

  test('returns http URLs unchanged', () => {
    expect(resolveTokenListUrl('https://example.com/list.json', 'https://dweb.link')).toBe(
      'https://example.com/list.json',
    )
  })

  test('returns undefined for invalid URLs', () => {
    expect(resolveTokenListUrl('not-a-token-list-url', 'https://dweb.link')).toBeUndefined()
  })
})
